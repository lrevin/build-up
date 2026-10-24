package com.buildup.report.service;

import com.buildup.common.exception.ApiException;
import com.buildup.report.dto.ReportFileResponse;
import com.buildup.report.entity.Report;
import com.buildup.report.entity.ReportFile;
import com.buildup.report.repository.ReportRepository;
import com.buildup.site.service.SiteAccessService;
import com.buildup.storage.service.S3ReportFileStorageService;
import com.buildup.storage.service.S3ReportFileStorageService.DownloadedFile;
import com.buildup.storage.service.S3ReportFileStorageService.StoredFile;
import com.buildup.user.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class ReportFileService {

    private static final int MAX_FILES_PER_REPORT = 20;

    private final ReportRepository reportRepository;
    private final SiteAccessService siteAccessService;
    private final S3ReportFileStorageService storageService;

    public ReportFileService(
            ReportRepository reportRepository,
            SiteAccessService siteAccessService,
            S3ReportFileStorageService storageService
    ) {
        this.reportRepository = reportRepository;
        this.siteAccessService = siteAccessService;
        this.storageService = storageService;
    }

    @Transactional
    public ReportFileResponse upload(User user, Long reportId, MultipartFile file) {
        Report report = requireForUpdate(reportId);
        requireEditable(user, report);
        requireRemainingCapacity(report, 1);
        ReportFile reportFile = uploadOne(report, file);
        reportRepository.flush();
        return ReportFileResponse.from(reportFile);
    }

    @Transactional
    public List<ReportFileResponse> uploadMany(
            User user,
            Long reportId,
            List<MultipartFile> files
    ) {
        requireFiles(files);
        Report report = requireForUpdate(reportId);
        requireEditable(user, report);
        requireRemainingCapacity(report, files.size());

        List<ReportFile> uploadedFiles = new java.util.ArrayList<>(files.size());
        for (MultipartFile file : files) {
            uploadedFiles.add(uploadOne(report, file));
        }
        reportRepository.flush();
        return uploadedFiles.stream()
                .map(ReportFileResponse::from)
                .toList();
    }

    @Transactional
    public ReportFileResponse replace(
            User user,
            Long reportId,
            Long fileId,
            MultipartFile file
    ) {
        Report report = requireForUpdate(reportId);
        requireEditable(user, report);
        ReportFile reportFile = requireFile(report, fileId);
        String oldS3Key = reportFile.getS3Key();

        StoredFile stored = storageService.upload(reportId, file);
        registerRollbackCleanup(reportId, stored.s3Key());
        reportFile.replaceStoredObject(
                stored.s3Key(),
                stored.originalName(),
                stored.contentType(),
                stored.sizeBytes()
        );
        reportRepository.flush();
        registerAfterCommitCleanup(reportId, oldS3Key);
        return ReportFileResponse.from(reportFile);
    }

    private ReportFile uploadOne(Report report, MultipartFile file) {
        StoredFile stored = storageService.upload(report.getId(), file);
        registerRollbackCleanup(report.getId(), stored.s3Key());

        ReportFile reportFile = ReportFile.uploaded(
                stored.s3Key(),
                stored.originalName(),
                stored.contentType(),
                stored.sizeBytes()
        );
        report.addFile(reportFile);
        return reportFile;
    }

    private void requireRemainingCapacity(Report report, int incomingCount) {
        if (report.getFiles().size() + incomingCount > MAX_FILES_PER_REPORT) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "REPORT_FILE_LIMIT_EXCEEDED",
                    "보고서에는 첨부파일을 최대 20개까지 등록할 수 있습니다."
            );
        }
    }

    private void requireFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "REPORT_FILE_BATCH_EMPTY",
                    "업로드할 첨부파일을 한 개 이상 선택해야 합니다."
            );
        }
    }

    @Transactional(readOnly = true)
    public List<ReportFileResponse> list(User user, Long reportId) {
        Report report = requireReport(reportId);
        requireReadable(user, report);
        return report.getFiles().stream().map(ReportFileResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public FileContent content(User user, Long reportId, Long fileId) {
        Report report = requireReport(reportId);
        requireReadable(user, report);
        ReportFile reportFile = requireFile(report, fileId);
        if (!reportFile.isStoredInS3()) {
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "REPORT_FILE_CONTENT_NOT_FOUND",
                    "첨부파일을 찾을 수 없습니다."
            );
        }
        DownloadedFile downloaded = storageService.download(
                reportId,
                reportFile.getS3Key(),
                reportFile.getContentType()
        );
        return new FileContent(
                downloaded.content(),
                downloaded.contentType(),
                reportFile.getOriginalName()
        );
    }

    @Transactional
    public void delete(User user, Long reportId, Long fileId) {
        Report report = requireForUpdate(reportId);
        requireEditable(user, report);
        ReportFile reportFile = requireFile(report, fileId);
        String s3Key = reportFile.getS3Key();
        report.removeFile(reportFile);
        registerAfterCommitCleanup(reportId, s3Key);
    }

    private Report requireReport(Long reportId) {
        return reportRepository.findDetailById(reportId)
                .orElseThrow(this::reportNotFound);
    }

    private Report requireForUpdate(Long reportId) {
        return reportRepository.findForFileUpdate(reportId)
                .orElseThrow(this::reportNotFound);
    }

    private ReportFile requireFile(Report report, Long fileId) {
        return report.getFiles().stream()
                .filter(file -> file.getId().equals(fileId))
                .findFirst()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "REPORT_FILE_NOT_FOUND",
                        "보고서 첨부파일을 찾을 수 없습니다."
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
                    "REPORT_FILE_EDIT_FORBIDDEN",
                    "보고서 첨부파일을 변경할 권한이 없습니다."
            );
        }
        if (!report.isPendingReview()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "REPORT_FILE_EDIT_NOT_ALLOWED",
                    "검토가 끝난 보고서의 첨부파일은 변경할 수 없습니다."
            );
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

    public record FileContent(byte[] content, String contentType, String originalName) {
    }
}
