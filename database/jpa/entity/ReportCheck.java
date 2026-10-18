package com.buildup.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "report_checks",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_report_checks_report_position",
                columnNames = {"report_id", "position"}
        )
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReportCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "photo_id")
    private ReportPhoto photo;

    @Column(nullable = false)
    private int position;

    @Enumerated(EnumType.STRING)
    @Column(name = "check_type", nullable = false, length = 30)
    private ReportCheckType type;

    @Column(nullable = false, length = 500)
    private String message;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private ReportCheck(ReportPhoto photo, ReportCheckType type, String message) {
        this.photo = photo;
        this.type = type;
        this.message = message;
    }

    public static ReportCheck forReport(ReportCheckType type, String message) {
        return new ReportCheck(null, type, message);
    }

    public static ReportCheck forPhoto(
            ReportPhoto photo,
            ReportCheckType type,
            String message
    ) {
        return new ReportCheck(photo, type, message);
    }

    public void attachTo(Report report, int position) {
        this.report = report;
        this.position = position;
    }

    public boolean refersTo(ReportPhoto target) {
        if (photo == target) {
            return true;
        }
        return photo != null
                && photo.getId() != null
                && photo.getId().equals(target.getId());
    }

    public boolean belongsTo(Report targetReport) {
        if (photo == null || photo.getReport() == targetReport) {
            return true;
        }
        Report photoReport = photo.getReport();
        return photoReport != null
                && photoReport.getId() != null
                && photoReport.getId().equals(targetReport.getId());
    }
}
