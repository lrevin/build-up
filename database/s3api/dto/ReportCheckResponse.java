package com.buildup.report.dto;

import com.buildup.report.entity.ReportCheck;

import java.time.Instant;
import java.util.Locale;

import static com.buildup.common.api.ApiResponseValues.stringId;
import static com.buildup.common.api.ApiResponseValues.utc;

public record ReportCheckResponse(
        String id,
        String photoId,
        String type,
        String message,
        Instant createdAt
) {
    public static ReportCheckResponse from(ReportCheck check) {
        return new ReportCheckResponse(
                stringId(check.getId()),
                check.getPhoto() == null ? null : stringId(check.getPhoto().getId()),
                check.getType().name().toLowerCase(Locale.ROOT),
                check.getMessage(),
                utc(check.getCreatedAt())
        );
    }
}
