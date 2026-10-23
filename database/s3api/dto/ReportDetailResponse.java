package com.buildup.report.dto;

import com.buildup.report.entity.Report;
import com.buildup.report.entity.ReportReviewStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static com.buildup.common.api.ApiResponseValues.stringId;
import static com.buildup.common.api.ApiResponseValues.utc;

public record ReportDetailResponse(
        String id,
        String siteId,
        String siteName,
        String processKey,
        String processName,
        String work,
        BigDecimal fromProgress,
        BigDecimal toProgress,
        String memo,
        String weather,
        Integer workers,
        String equipment,
        BigDecimal submitLatitude,
        BigDecimal submitLongitude,
        BigDecimal submitAccuracy,
        String authorId,
        String authorName,
        ReportReviewStatus reviewStatus,
        List<String> photoFileNames,
        List<ReportPhotoResponse> photos,
        List<ReportFileResponse> files,
        List<ReportCheckResponse> checks,
        List<ReportReviewEventResponse> reviewEvents,
        boolean canEdit,
        boolean canDelete,
        boolean canReview,
        Instant createdAt,
        Instant updatedAt
) {
    public static ReportDetailResponse from(
            Report report,
            List<ReportReviewEventResponse> reviewEvents,
            boolean canEdit,
            boolean canDelete,
            boolean canReview
    ) {
        return new ReportDetailResponse(
                stringId(report.getId()),
                stringId(report.getSite().getId()),
                report.getSite().getName(),
                report.getProcessKey(),
                report.getProcessName(),
                report.getWork(),
                report.getFromProgress(),
                report.getToProgress(),
                report.getMemo(),
                report.getWeather(),
                report.getWorkers(),
                report.getEquipment(),
                report.getSubmitLatitude(),
                report.getSubmitLongitude(),
                report.getSubmitAccuracy(),
                stringId(report.getAuthor().getId()),
                report.getAuthor().getName(),
                report.getReviewStatus(),
                report.getPhotos().stream().map(photo -> photo.getOriginalName()).toList(),
                report.getPhotos().stream().map(ReportPhotoResponse::from).toList(),
                report.getFiles().stream().map(ReportFileResponse::from).toList(),
                report.getChecks().stream().map(ReportCheckResponse::from).toList(),
                List.copyOf(reviewEvents),
                canEdit,
                canDelete,
                canReview,
                utc(report.getCreatedAt()),
                utc(report.getUpdatedAt())
        );
    }
}
