package com.buildup.report.service;

import com.buildup.report.entity.Report;
import com.buildup.report.entity.ReportCheck;
import com.buildup.report.entity.ReportCheckType;
import com.buildup.report.entity.ReportPhoto;
import com.buildup.site.entity.Site;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class ReportCheckService {

    static final double FAR_DISTANCE_METERS = 500.0;
    static final Duration OLD_PHOTO_AGE = Duration.ofHours(24);

    public void addSubmissionChecks(Report report) {
        Site site = report.getSite();
        if (report.getSubmitLatitude() == null || report.getSubmitLongitude() == null) {
            report.addCheck(ReportCheck.forReport(
                    ReportCheckType.NO_LOCATION,
                    "보고서 제출 위치가 기록되지 않았습니다."
            ));
            return;
        }
        if (site.getLatitude() != null && site.getLongitude() != null) {
            double distance = distanceMeters(
                    site.getLatitude(),
                    site.getLongitude(),
                    report.getSubmitLatitude(),
                    report.getSubmitLongitude()
            );
            if (distance > FAR_DISTANCE_METERS) {
                report.addCheck(ReportCheck.forReport(
                        ReportCheckType.FAR_SUBMIT,
                        "보고서 제출 위치가 현장에서 %.0fm 떨어져 있습니다.".formatted(distance)
                ));
            }
        }
    }

    public void addPhotoChecks(
            Report report,
            ReportPhoto photo,
            LocalDateTime now
    ) {
        LocalDateTime takenAt = photo.getTakenAt();
        BigDecimal latitude = photo.getLatitude();
        BigDecimal longitude = photo.getLongitude();
        if (takenAt != null && takenAt.isBefore(now.minus(OLD_PHOTO_AGE))) {
            report.addCheck(ReportCheck.forPhoto(
                    photo,
                    ReportCheckType.OLD_PHOTO,
                    "촬영 후 24시간이 지난 사진입니다."
            ));
        }
        if (latitude == null || longitude == null) {
            report.addCheck(ReportCheck.forPhoto(
                    photo,
                    ReportCheckType.NO_LOCATION,
                    "사진 촬영 위치가 기록되지 않았습니다."
            ));
            return;
        }
        Site site = report.getSite();
        if (site.getLatitude() != null && site.getLongitude() != null) {
            double distance = distanceMeters(
                    site.getLatitude(),
                    site.getLongitude(),
                    latitude,
                    longitude
            );
            if (distance > FAR_DISTANCE_METERS) {
                report.addCheck(ReportCheck.forPhoto(
                        photo,
                        ReportCheckType.FAR_PHOTO,
                        "사진 촬영 위치가 현장에서 %.0fm 떨어져 있습니다.".formatted(distance)
                ));
            }
        }
    }

    private double distanceMeters(
            BigDecimal latitudeA,
            BigDecimal longitudeA,
            BigDecimal latitudeB,
            BigDecimal longitudeB
    ) {
        double radius = 6_371_000.0;
        double latA = Math.toRadians(latitudeA.doubleValue());
        double latB = Math.toRadians(latitudeB.doubleValue());
        double deltaLat = latB - latA;
        double deltaLon = Math.toRadians(longitudeB.doubleValue() - longitudeA.doubleValue());
        double haversine = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
                + Math.cos(latA) * Math.cos(latB)
                * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        return 2 * radius * Math.asin(Math.sqrt(haversine));
    }
}
