package com.buildup.storage.service;

import com.buildup.common.config.AwsProperties;
import com.buildup.common.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class S3PhotoStorageService {

    private static final Logger log = LoggerFactory.getLogger(S3PhotoStorageService.class);
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");

    private final S3Client s3Client;
    private final AwsProperties properties;

    public S3PhotoStorageService(S3Client s3Client, AwsProperties properties) {
        this.s3Client = s3Client;
        this.properties = properties;
    }

    public StoredPhoto upload(Long reportId, MultipartFile file) {
        validateSize(file);
        String contentType = normalizeContentType(file.getContentType());

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw uploadFailed(reportId, null, exception);
        }
        validateSignature(contentType, content);

        String originalName = normalizeOriginalName(file.getOriginalFilename(), contentType);
        String s3Key = "reports/%d/photos/%s.%s".formatted(
                reportId,
                UUID.randomUUID(),
                extension(contentType)
        );

        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(properties.s3().bucket())
                            .key(s3Key)
                            .contentType(contentType)
                            .contentLength((long) content.length)
                            .build(),
                    RequestBody.fromBytes(content)
            );
            log.info(
                    "event=s3.photo.uploaded reportId={} key={} sizeBytes={} contentType={}",
                    reportId,
                    s3Key,
                    content.length,
                    contentType
            );
            return new StoredPhoto(s3Key, originalName, contentType, (long) content.length);
        } catch (SdkException exception) {
            throw uploadFailed(reportId, s3Key, exception);
        }
    }

    public DownloadedPhoto download(Long reportId, String s3Key, String contentType) {
        requireExpectedKey(reportId, s3Key);
        try {
            ResponseBytes<GetObjectResponse> response = s3Client.getObjectAsBytes(
                    GetObjectRequest.builder()
                            .bucket(properties.s3().bucket())
                            .key(s3Key)
                            .build()
            );
            String resolvedContentType = response.response().contentType();
            if (resolvedContentType == null || resolvedContentType.isBlank()) {
                resolvedContentType = contentType;
            }
            return new DownloadedPhoto(response.asByteArray(), resolvedContentType);
        } catch (NoSuchKeyException exception) {
            log.warn("event=s3.photo.missing reportId={} key={}", reportId, s3Key);
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "REPORT_PHOTO_CONTENT_NOT_FOUND",
                    "사진 파일을 찾을 수 없습니다."
            );
        } catch (SdkException exception) {
            log.error(
                    "event=s3.photo.download.failed reportId={} key={} exception={}",
                    reportId,
                    s3Key,
                    exception.getClass().getSimpleName()
            );
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "S3_DOWNLOAD_FAILED",
                    "사진 파일을 불러오지 못했습니다."
            );
        }
    }

    public void deleteQuietly(Long reportId, String s3Key) {
        if (s3Key == null || s3Key.isBlank()) {
            return;
        }
        if (!hasExpectedKey(reportId, s3Key)) {
            log.warn("event=s3.photo.delete.skipped reason=invalid_key reportId={} key={}", reportId, s3Key);
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(properties.s3().bucket())
                    .key(s3Key)
                    .build());
            log.info("event=s3.photo.deleted reportId={} key={}", reportId, s3Key);
        } catch (SdkException exception) {
            log.error(
                    "event=s3.photo.delete.failed reportId={} key={} exception={}",
                    reportId,
                    s3Key,
                    exception.getClass().getSimpleName()
            );
        }
    }

    private void validateSize(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PHOTO_EMPTY", "업로드할 사진이 비어 있습니다.");
        }
        if (file.getSize() > properties.s3().maxPhotoSizeBytes()) {
            throw new ApiException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "PHOTO_TOO_LARGE",
                    "사진 파일 크기가 허용 한도를 초과했습니다."
            );
        }
    }

    private String normalizeContentType(String contentType) {
        String normalized = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(normalized)) {
            normalized = "image/jpeg";
        }
        if (!ALLOWED_CONTENT_TYPES.contains(normalized)) {
            throw new ApiException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "PHOTO_TYPE_NOT_ALLOWED",
                    "JPG 또는 PNG 사진만 업로드할 수 있습니다."
            );
        }
        return normalized;
    }

    private void validateSignature(String contentType, byte[] content) {
        boolean valid = switch (contentType) {
            case "image/jpeg" -> content.length >= 3
                    && unsigned(content[0]) == 0xFF
                    && unsigned(content[1]) == 0xD8
                    && unsigned(content[2]) == 0xFF;
            case "image/png" -> content.length >= 8
                    && unsigned(content[0]) == 0x89
                    && unsigned(content[1]) == 0x50
                    && unsigned(content[2]) == 0x4E
                    && unsigned(content[3]) == 0x47
                    && unsigned(content[4]) == 0x0D
                    && unsigned(content[5]) == 0x0A
                    && unsigned(content[6]) == 0x1A
                    && unsigned(content[7]) == 0x0A;
            default -> false;
        };
        if (!valid) {
            throw new ApiException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "PHOTO_CONTENT_INVALID",
                    "파일 내용이 JPG 또는 PNG 형식과 일치하지 않습니다."
            );
        }
    }

    private String normalizeOriginalName(String originalName, String contentType) {
        String name = originalName == null ? "" : originalName.trim().replace('\\', '/');
        int lastSlash = name.lastIndexOf('/');
        if (lastSlash >= 0) {
            name = name.substring(lastSlash + 1);
        }
        if (name.isBlank()) {
            name = "photo." + extension(contentType);
        }
        name = name.replaceAll("[\\p{Cntrl}]", "_");
        return name.length() <= 255 ? name : name.substring(name.length() - 255);
    }

    private void requireExpectedKey(Long reportId, String s3Key) {
        if (!hasExpectedKey(reportId, s3Key)) {
            log.warn("event=s3.photo.download.denied reason=invalid_key reportId={} key={}", reportId, s3Key);
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "REPORT_PHOTO_CONTENT_NOT_FOUND",
                    "사진 파일을 찾을 수 없습니다."
            );
        }
    }

    private boolean hasExpectedKey(Long reportId, String s3Key) {
        return reportId != null
                && s3Key != null
                && s3Key.startsWith("reports/" + reportId + "/photos/");
    }

    private String extension(String contentType) {
        return "image/png".equals(contentType) ? "png" : "jpg";
    }

    private int unsigned(byte value) {
        return value & 0xFF;
    }

    private ApiException uploadFailed(Long reportId, String s3Key, Exception exception) {
        log.error(
                "event=s3.photo.upload.failed reportId={} key={} exception={}",
                reportId,
                s3Key,
                exception.getClass().getSimpleName()
        );
        return new ApiException(
                HttpStatus.BAD_GATEWAY,
                "S3_UPLOAD_FAILED",
                "사진 업로드에 실패했습니다."
        );
    }

    public record StoredPhoto(
            String s3Key,
            String originalName,
            String contentType,
            long sizeBytes
    ) {
    }

    public record DownloadedPhoto(byte[] content, String contentType) {
    }
}
