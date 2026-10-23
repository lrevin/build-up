package com.buildup.report.dto;

import java.util.List;

public record ReportPhotoBatchMetadataRequest(
        List<ReportPhotoMetadataRequest> items
) {
    public ReportPhotoBatchMetadataRequest {
        items = items == null ? List.of() : List.copyOf(items);
    }
}
