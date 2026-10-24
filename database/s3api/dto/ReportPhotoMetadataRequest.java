package com.buildup.report.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record ReportPhotoMetadataRequest(
        Instant takenAt,
        BigDecimal latitude,
        BigDecimal longitude
) {
}
