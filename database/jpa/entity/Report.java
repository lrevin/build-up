package com.buildup.report.entity;

import com.buildup.site.entity.Site;
import com.buildup.user.entity.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(name = "reports")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @Column(name = "process_key", nullable = false, length = 50)
    private String processKey;

    @Column(name = "process_name", nullable = false, length = 100)
    private String processName;

    @Column(name = "from_progress", nullable = false, precision = 5, scale = 2)
    private BigDecimal fromProgress;

    @Column(name = "to_progress", nullable = false, precision = 5, scale = 2)
    private BigDecimal toProgress;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(length = 100)
    private String weather;

    private Integer workers;

    @Column(columnDefinition = "TEXT")
    private String equipment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private ReportReviewStatus reviewStatus = ReportReviewStatus.PENDING;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<ReportPhoto> photos = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "report_files",
            joinColumns = @JoinColumn(name = "report_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uq_report_files_report_position",
                    columnNames = {"report_id", "position"}
            )
    )
    @OrderColumn(name = "position", nullable = false)
    private List<ReportFile> files = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private Report(
            Site site,
            String processKey,
            String processName,
            BigDecimal fromProgress,
            BigDecimal toProgress,
            String memo,
            String weather,
            Integer workers,
            String equipment,
            List<ReportPhoto> photos,
            List<ReportFile> files,
            User author
    ) {
        this.site = site;
        this.processKey = processKey;
        this.processName = processName;
        this.fromProgress = fromProgress;
        this.toProgress = toProgress;
        this.memo = memo;
        this.weather = weather;
        this.workers = workers;
        this.equipment = equipment;
        photos.forEach(this::addPhoto);
        this.files.addAll(files);
        this.author = author;
        this.reviewStatus = ReportReviewStatus.PENDING;
    }

    public static Report submit(
            Site site,
            String processKey,
            String processName,
            BigDecimal fromProgress,
            BigDecimal toProgress,
            String memo,
            String weather,
            Integer workers,
            String equipment,
            List<ReportPhoto> photos,
            List<ReportFile> files,
            User author
    ) {
        return new Report(
                site,
                processKey,
                processName,
                fromProgress,
                toProgress,
                memo,
                weather,
                workers,
                equipment,
                photos,
                files,
                author
        );
    }

    public void approve() {
        reviewStatus = ReportReviewStatus.APPROVED;
    }

    public void reject() {
        reviewStatus = ReportReviewStatus.REJECTED;
    }

    public boolean isPendingReview() {
        return reviewStatus == ReportReviewStatus.PENDING;
    }

    public void addPhoto(ReportPhoto photo) {
        photo.attachTo(this, photos.size());
        photos.add(photo);
    }

    public void removePhoto(ReportPhoto photo) {
        photos.remove(photo);
        for (int index = 0; index < photos.size(); index++) {
            photos.get(index).moveTo(index);
        }
    }
}
