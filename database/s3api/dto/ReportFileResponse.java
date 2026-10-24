package com.buildup.report.dto;

import com.buildup.report.entity.ReportFile;

import java.time.Instant;

import static com.buildup.common.api.ApiResponseValues.stringId;
import static com.buildup.common.api.ApiResponseValues.utc;

public record ReportFileResponse(
        String id,
        String originalName,
        String contentType,
        Long sizeBytes,
        String contentUrl,
        Instant createdAt
) {
    public static ReportFileResponse from(ReportFile file) {
        String contentUrl = file.isStoredInS3()
                ? "/api/reports/%d/files/%d/content".formatted(
                        file.getReport().getId(),
                        file.getId()
                )
                : null;
        return new ReportFileResponse(
                stringId(file.getId()),
                file.getOriginalName(),
                file.getContentType(),
                file.getSizeBytes(),
                contentUrl,
                utc(file.getCreatedAt())
        );
    }
}
