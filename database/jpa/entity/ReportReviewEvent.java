package com.buildup.report.entity;

import com.buildup.user.entity.User;
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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "report_review_events")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReportReviewEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportReviewStatus status;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private ReportReviewEvent(
            Report report,
            User reviewer,
            ReportReviewStatus status,
            String comment
    ) {
        this.report = report;
        this.reviewer = reviewer;
        this.status = status;
        this.comment = normalizeComment(comment);
    }

    public static ReportReviewEvent approved(Report report, User reviewer, String comment) {
        return new ReportReviewEvent(report, reviewer, ReportReviewStatus.APPROVED, comment);
    }

    public static ReportReviewEvent rejected(Report report, User reviewer, String comment) {
        return new ReportReviewEvent(report, reviewer, ReportReviewStatus.REJECTED, comment);
    }

    private static String normalizeComment(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
