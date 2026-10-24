package com.buildup.report.service;

import com.buildup.common.exception.ApiException;
import com.buildup.report.dto.ReportPhotoMetadataRequest;
import com.buildup.report.dto.ReportPhotoResponse;
import com.buildup.report.entity.Report;
import com.buildup.report.entity.ReportPhoto;
import com.buildup.report.repository.ReportRepository;
import com.buildup.site.service.SiteAccessService;
import com.buildup.storage.service.S3PhotoStorageService;
import com.buildup.storage.service.S3PhotoStorageService.DownloadedPhoto;
import com.buildup.storage.service.S3PhotoStorageService.StoredPhoto;
import com.buildup.user.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class ReportPhotoService {

    private static final int MAX_PHOTOS_PER_REPORT = 20;

    private final ReportRepository reportRepository;
    private final SiteAccessService siteAccessService;
    private final S3PhotoStorageService storageService;
    private final ReportCheckService reportCheckService;

    public ReportPhotoService(
            ReportRepository reportRepository,
            SiteAccessService siteAccessService,
            S3PhotoStorageService storageService,
            ReportCheckService reportCheckService
    ) {
        this.reportRepository = reportRepository;
        this.siteAccessService = siteAccessService;
        this.storageService = storageService;
        this.reportCheckService = reportCheckService;
    }

    @Transactional
    public ReportPhotoResponse upload(
            User user,
            Long reportId,
            MultipartFile file,
            Instant takenAt,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        Report report = requireForUpdate(reportId);
        requireEditable(user, report);
        requireRemainingCapacity(report, 1);
        ReportPhoto photo = uploadOne(
                report,
                file,
                new ReportPhotoMetadataRequest(takenAt, latitude, longitude)
        );
        reportRepository.flush();
        return ReportPhotoResponse.from(photo);
    }

    @Transactional
    public List<ReportPhotoResponse> uploadMany(
            User user,
            Long reportId,
            List<MultipartFile> files,
            List<ReportPhotoMetadataRequest> metadata
    ) {
        requireFiles(files);
        List<ReportPhotoMetadataRequest> normalizedMetadata = normalizeMetadata(files, metadata);
        Report report = requireForUpdate(reportId);
        requireEditable(user, report);
        requireRemainingCapacity(report, files.size());

        List<ReportPhoto> uploadedPhotos = new java.util.ArrayList<>(files.size());
        for (int index = 0; index < files.size(); index++) {
            ReportPhoto photo = uploadOne(report, files.get(index), normalizedMetadata.get(index));
            uploadedPhotos.add(photo);
        }
        reportRepository.flush();
        return uploadedPhotos.stream()
                .map(ReportPhotoResponse::from)
                .toList();
    }

    @Transactional
    public ReportPhotoResponse replace(
            User user,
            Long reportId,
            Long photoId,
            MultipartFile file,
            ReportPhotoMetadataRequest metadata
    ) {
        Report report = requireForUpdate(reportId);
        requireEditable(user, report);
        ReportPhoto photo = requirePhoto(report, photoId);
        validateLocation(metadata.latitude(), metadata.longitude());

        String oldS3Key = photo.getS3Key();
        StoredPhoto stored = storageService.upload(reportId, file);
        registerRollbackCleanup(reportId, stored.s3Key());

        report.removeChecksForPhoto(photo);
        photo.replaceStoredObject(
                stored.s3Key(),
                stored.originalName(),
                stored.contentType(),
                stored.sizeBytes(),
                toLocalDateTime(metadata.takenAt()),
                metadata.latitude(),
                metadata.longitude()
        );
        reportCheckService.addPhotoChecks(report, photo, LocalDateTime.now());
        reportRepository.flush();
        registerAfterCommitCleanup(reportId, oldS3Key);
        return ReportPhotoResponse.from(photo);
    }

    private ReportPhoto uploadOne(
            Report report,
            MultipartFile file,
            ReportPhotoMetadataRequest metadata
    ) {
        validateLocation(metadata.latitude(), metadata.longitude());

        StoredPhoto stored = storageService.upload(report.getId(), file);
        registerRollbackCleanup(report.getId(), stored.s3Key());

        ReportPhoto photo = ReportPhoto.uploaded(
                stored.s3Key(),
                stored.originalName(),
                stored.contentType(),
                stored.sizeBytes(),
                toLocalDateTime(metadata.takenAt()),
                metadata.latitude(),
                metadata.longitude()
        );
        report.addPhoto(photo);
        reportCheckService.addPhotoChecks(report, photo, LocalDateTime.now());
        return photo;
    }

    private void requireRemainingCapacity(Report report, int incomingCount) {
        if (report.getPhotos().size() + incomingCount > MAX_PHOTOS_PER_REPORT) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "REPORT_PHOTO_LIMIT_EXCEEDED",
                    "보고서에는 사진을 최대 20장까지 등록할 수 있습니다."
            );
        }
    }

    private void requireFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "PHOTO_BATCH_EMPTY",
                    "업로드할 사진을 한 장 이상 선택해야 합니다."
            );
        }
    }

    private List<ReportPhotoMetadataRequest> normalizeMetadata(
            List<MultipartFile> files,
            List<ReportPhotoMetadataRequest> metadata
    ) {
        if (metadata == null || metadata.isEmpty()) {
            return java.util.Collections.nCopies(
                    files.size(),
                    new ReportPhotoMetadataRequest(null, null, null)
            );
        }
        if (metadata.size() != files.size()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "PHOTO_BATCH_METADATA_MISMATCH",
                    "사진 파일 수와 메타데이터 수가 일치해야 합니다."
            );
        }
        return List.copyOf(metadata);
    }

    private LocalDateTime toLocalDateTime(Instant takenAt) {
        return takenAt == null
                ? null
                : LocalDateTime.ofInstant(takenAt, ZoneId.systemDefault());
    }

    @Transactional(readOnly = true)
    public List<ReportPhotoResponse> list(User user, Long reportId) {
        Report report = requireReport(reportId);
        requireReadable(user, report);
        return report.getPhotos().stream().map(ReportPhotoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PhotoContent content(User user, Long reportId, Long photoId) {
        Report report = requireReport(reportId);
        requireReadable(user, report);
        ReportPhoto photo = requirePhoto(report, photoId);
        if (!photo.isStoredInS3()) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "REPORT_PHOTO_CONTENT_NOT_FOUND",
                    "사진 파일을 찾을 수 없습니다."
            );
        }
        DownloadedPhoto downloaded = storageService.download(
                reportId,
                photo.getS3Key(),
                photo.getContentType()
        );
        return new PhotoContent(
                downloaded.content(),
                downloaded.contentType(),
                photo.getOriginalName()
        );
    }

    @Transactional
    public void delete(User user, Long reportId, Long photoId) {
        Report report = requireForUpdate(reportId);
        requireEditable(user, report);
        ReportPhoto photo = requirePhoto(report, photoId);
        String s3Key = photo.getS3Key();
        report.removePhoto(photo);
        registerAfterCommitCleanup(reportId, s3Key);
    }

    private Report requireReport(Long reportId) {
        return reportRepository.findDetailById(reportId)
                .orElseThrow(this::reportNotFound);
    }

    private Report requireForUpdate(Long reportId) {
        return reportRepository.findForPhotoUpdate(reportId)
                .orElseThrow(this::reportNotFound);
    }

    private ReportPhoto requirePhoto(Report report, Long photoId) {
        return report.getPhotos().stream()
                .filter(photo -> photo.getId().equals(photoId))
                .findFirst()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "REPORT_PHOTO_NOT_FOUND",
                        "보고서 사진을 찾을 수 없습니다."
                ));
    }

    private void requireReadable(User user, Report report) {
        if (!siteAccessService.canAccessSite(user, report.getSite())) {
            throw reportNotFound();
        }
    }

    private void requireEditable(User user, Report report) {
        boolean author = report.getAuthor().getId().equals(user.getId());
        boolean manager = siteAccessService.canManageSite(user, report.getSite());
        if (!author && !manager && !user.isSystemAdmin()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "REPORT_PHOTO_EDIT_FORBIDDEN",
                    "보고서 사진을 변경할 권한이 없습니다."
            );
        }
        if (!report.isPendingReview()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "REPORT_PHOTO_EDIT_NOT_ALLOWED",
                    "검토가 끝난 보고서의 사진은 변경할 수 없습니다."
            );
        }
    }

    private void validateLocation(BigDecimal latitude, BigDecimal longitude) {
        if ((latitude == null) != (longitude == null)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "PHOTO_LOCATION_INCOMPLETE",
                    "사진 위치는 위도와 경도를 함께 입력해야 합니다."
            );
        }
        if (latitude != null
                && (latitude.compareTo(BigDecimal.valueOf(-90)) < 0
                || latitude.compareTo(BigDecimal.valueOf(90)) > 0)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PHOTO_LATITUDE_INVALID", "사진 위도가 올바르지 않습니다.");
        }
        if (longitude != null
                && (longitude.compareTo(BigDecimal.valueOf(-180)) < 0
                || longitude.compareTo(BigDecimal.valueOf(180)) > 0)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PHOTO_LONGITUDE_INVALID", "사진 경도가 올바르지 않습니다.");
        }
    }

    private void registerRollbackCleanup(Long reportId, String s3Key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    storageService.deleteQuietly(reportId, s3Key);
                }
            }
        });
    }

    private void registerAfterCommitCleanup(Long reportId, String s3Key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                storageService.deleteQuietly(reportId, s3Key);
            }
        });
    }

    private ApiException reportNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "REPORT_NOT_FOUND", "보고서를 찾을 수 없습니다.");
    }

    public record PhotoContent(byte[] content, String contentType, String originalName) {
    }
}
