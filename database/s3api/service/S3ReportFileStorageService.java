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

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class S3ReportFileStorageService {

    private static final Logger log = LoggerFactory.getLogger(S3ReportFileStorageService.class);
    private static final int MAX_ZIP_ENTRIES_TO_INSPECT = 1000;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "csv", "doc", "docx", "xls", "xlsx"
    );
    private static final Map<String, String> DEFAULT_CONTENT_TYPES = Map.of(
            "pdf", "application/pdf",
            "csv", "text/csv",
            "doc", "application/msword",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xls", "application/vnd.ms-excel",
            "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final S3Client s3Client;
    private final AwsProperties properties;

    public S3ReportFileStorageService(S3Client s3Client, AwsProperties properties) {
        this.s3Client = s3Client;
        this.properties = properties;
    }

    public StoredFile upload(Long reportId, MultipartFile file) {
        validateSize(file);
        String originalName = normalizeOriginalName(file.getOriginalFilename());
        String extension = extension(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "REPORT_FILE_TYPE_NOT_ALLOWED",
                    "PDF, CSV, Word 또는 Excel 파일만 업로드할 수 있습니다."
            );
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw uploadFailed(reportId, null, exception);
        }
        validateSignature(extension, content);

        String contentType = DEFAULT_CONTENT_TYPES.get(extension);
        String s3Key = "reports/%d/files/%s.%s".formatted(
                reportId,
                UUID.randomUUID(),
                extension
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
                    "event=s3.report-file.uploaded reportId={} key={} sizeBytes={} contentType={}",
                    reportId,
                    s3Key,
                    content.length,
                    contentType
            );
            return new StoredFile(s3Key, originalName, contentType, (long) content.length);
        } catch (SdkException exception) {
            throw uploadFailed(reportId, s3Key, exception);
        }
    }

    public DownloadedFile download(Long reportId, String s3Key, String contentType) {
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
            return new DownloadedFile(response.asByteArray(), resolvedContentType);
        } catch (NoSuchKeyException exception) {
            log.warn("event=s3.report-file.missing reportId={} key={}", reportId, s3Key);
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "REPORT_FILE_CONTENT_NOT_FOUND",
                    "첨부파일을 찾을 수 없습니다."
            );
        } catch (SdkException exception) {
            log.error(
                    "event=s3.report-file.download.failed reportId={} key={} exception={}",
                    reportId,
                    s3Key,
                    exception.getClass().getSimpleName()
            );
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "S3_FILE_DOWNLOAD_FAILED",
                    "첨부파일을 불러오지 못했습니다."
            );
        }
    }

    public void deleteQuietly(Long reportId, String s3Key) {
        if (s3Key == null || s3Key.isBlank()) {
            return;
        }
        if (!hasExpectedKey(reportId, s3Key)) {
            log.warn("event=s3.report-file.delete.skipped reason=invalid_key reportId={} key={}", reportId, s3Key);
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(properties.s3().bucket())
                    .key(s3Key)
                    .build());
            log.info("event=s3.report-file.deleted reportId={} key={}", reportId, s3Key);
        } catch (SdkException exception) {
            log.error(
                    "event=s3.report-file.delete.failed reportId={} key={} exception={}",
                    reportId,
                    s3Key,
                    exception.getClass().getSimpleName()
            );
        }
    }

    private void validateSize(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "REPORT_FILE_EMPTY", "업로드할 첨부파일이 비어 있습니다.");
        }
        if (file.getSize() > properties.s3().maxFileSizeBytes()) {
            throw new ApiException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "REPORT_FILE_TOO_LARGE",
                    "첨부파일 크기가 허용 한도를 초과했습니다."
            );
        }
    }

    private String normalizeOriginalName(String rawName) {
        String name = rawName == null ? "" : rawName.trim().replace('\\', '/');
        int lastSlash = name.lastIndexOf('/');
        if (lastSlash >= 0) {
            name = name.substring(lastSlash + 1);
        }
        if (name.isBlank() || !name.contains(".")) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "REPORT_FILE_NAME_INVALID",
                    "확장자가 포함된 파일명이 필요합니다."
            );
        }
        name = name.replaceAll("[\\p{Cntrl}]", "_");
        return name.length() <= 255 ? name : name.substring(name.length() - 255);
    }

    private String extension(String originalName) {
        int dot = originalName.lastIndexOf('.');
        return originalName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private void validateSignature(String extension, byte[] content) {
        boolean valid = switch (extension) {
            case "pdf" -> startsWith(content, 0x25, 0x50, 0x44, 0x46);
            case "doc", "xls" -> startsWith(content, 0xD0, 0xCF, 0x11, 0xE0);
            case "docx" -> hasOoxmlStructure(content, "word/document.xml");
            case "xlsx" -> hasOoxmlStructure(content, "xl/workbook.xml");
            case "csv" -> content.length > 0 && !containsNullByte(content);
            default -> false;
        };
        if (!valid) {
            throw new ApiException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "REPORT_FILE_CONTENT_INVALID",
                    "파일 내용이 확장자 형식과 일치하지 않습니다."
            );
        }
    }

    private boolean startsWith(byte[] content, int... signature) {
        if (content.length < signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if ((content[index] & 0xFF) != signature[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean containsNullByte(byte[] content) {
        for (byte value : content) {
            if (value == 0) {
                return true;
            }
        }
        return false;
    }

    private boolean hasOoxmlStructure(byte[] content, String requiredDocumentEntry) {
        if (!startsWith(content, 0x50, 0x4B)) {
            return false;
        }

        boolean hasContentTypes = false;
        boolean hasDocumentRoot = false;
        int inspectedEntries = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(content))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                inspectedEntries++;
                if (inspectedEntries > MAX_ZIP_ENTRIES_TO_INSPECT) {
                    return false;
                }
                String name = entry.getName();
                if ("[Content_Types].xml".equals(name)) {
                    hasContentTypes = true;
                }
                if (requiredDocumentEntry.equals(name)) {
                    hasDocumentRoot = true;
                }
                if (hasContentTypes && hasDocumentRoot) {
                    return true;
                }
            }
        } catch (IOException exception) {
            return false;
        }
        return false;
    }

    private void requireExpectedKey(Long reportId, String s3Key) {
        if (!hasExpectedKey(reportId, s3Key)) {
            log.warn("event=s3.report-file.download.denied reason=invalid_key reportId={} key={}", reportId, s3Key);
            throw new ApiException(
                    HttpStatus.NOT_FOUND,
                    "REPORT_FILE_CONTENT_NOT_FOUND",
                    "첨부파일을 찾을 수 없습니다."
            );
        }
    }

    private boolean hasExpectedKey(Long reportId, String s3Key) {
        return reportId != null
                && s3Key != null
                && s3Key.startsWith("reports/" + reportId + "/files/");
    }

    private ApiException uploadFailed(Long reportId, String s3Key, Exception exception) {
        log.error(
                "event=s3.report-file.upload.failed reportId={} key={} exception={}",
                reportId,
                s3Key,
                exception.getClass().getSimpleName()
        );
        return new ApiException(
                HttpStatus.BAD_GATEWAY,
                "S3_FILE_UPLOAD_FAILED",
                "첨부파일 업로드에 실패했습니다."
        );
    }

    public record StoredFile(
            String s3Key,
            String originalName,
            String contentType,
            long sizeBytes
    ) {
    }

    public record DownloadedFile(byte[] content, String contentType) {
    }
}
