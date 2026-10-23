package com.buildup.report.dto;

import com.buildup.report.entity.ReportPhoto;

import java.math.BigDecimal;
import java.time.Instant;

import static com.buildup.common.api.ApiResponseValues.stringId;
import static com.buildup.common.api.ApiResponseValues.utc;

public record ReportPhotoResponse(
        String id,
        String originalName,
        String contentType,
        Long sizeBytes,
        Instant takenAt,
        BigDecimal latitude,
        BigDecimal longitude,
        String contentUrl,
        Instant createdAt
) {
    public static ReportPhotoResponse from(ReportPhoto photo) {
        String contentUrl = photo.isStoredInS3()
                ? "/api/reports/%d/photos/%d/content".formatted(
                        photo.getReport().getId(),
                        photo.getId()
                )
                : null;
        return new ReportPhotoResponse(
                stringId(photo.getId()),
                photo.getOriginalName(),
                photo.getContentType(),
                photo.getSizeBytes(),
                utc(photo.getTakenAt()),
                photo.getLatitude(),
                photo.getLongitude(),
                contentUrl,
                utc(photo.getCreatedAt())
        );
    }
}
