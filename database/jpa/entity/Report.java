package com.buildup.report.entity;

import com.buildup.site.entity.Site;
import com.buildup.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.Table;
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

    @Column(name = "process_key", length = 50)
    private String processKey;

    @Column(name = "process_name", length = 100)
    private String processName;

    @Column(nullable = false, length = 500)
    private String work;

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

    @Column(name = "submit_latitude", precision = 10, scale = 7)
    private BigDecimal submitLatitude;

    @Column(name = "submit_longitude", precision = 10, scale = 7)
    private BigDecimal submitLongitude;

    @Column(name = "submit_accuracy", precision = 10, scale = 2)
    private BigDecimal submitAccuracy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 20)
    private ReportReviewStatus reviewStatus = ReportReviewStatus.PENDING;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<ReportPhoto> photos = new ArrayList<>();

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<ReportFile> files = new ArrayList<>();

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<ReportCheck> checks = new ArrayList<>();

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
            List<ReportPhoto> photos,
            List<ReportFile> files,
            User author
    ) {
        this.site = site;
        this.processKey = processKey;
        this.processName = processName;
        this.work = work;
        this.fromProgress = fromProgress;
        this.toProgress = toProgress;
        this.memo = memo;
        this.weather = weather;
        this.workers = workers;
        this.equipment = equipment;
        this.submitLatitude = submitLatitude;
        this.submitLongitude = submitLongitude;
        this.submitAccuracy = submitAccuracy;
        photos.forEach(this::addPhoto);
        files.forEach(this::addFile);
        this.author = author;
        this.reviewStatus = ReportReviewStatus.PENDING;
    }

    public static Report submit(
            Site site,
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
            List<ReportPhoto> photos,
            List<ReportFile> files,
            User author
    ) {
        return new Report(
                site,
                processKey,
                processName,
                work,
                fromProgress,
                toProgress,
                memo,
                weather,
                workers,
                equipment,
                submitLatitude,
                submitLongitude,
                submitAccuracy,
                photos,
                files,
                author
        );
    }

    public void approve() {
        reviewStatus = ReportReviewStatus.APPROVED;
    }

    public void requestRevision() {
        reviewStatus = ReportReviewStatus.REVISION;
    }

    public void updateMemo(String memo) {
        this.memo = memo;
        if (reviewStatus == ReportReviewStatus.REVISION) {
            reviewStatus = ReportReviewStatus.PENDING;
        }
    }

    public boolean isEditable() {
        return reviewStatus == ReportReviewStatus.PENDING
                || reviewStatus == ReportReviewStatus.REVISION;
    }

    public boolean isPendingReview() {
        return reviewStatus == ReportReviewStatus.PENDING;
    }

    public void addPhoto(ReportPhoto photo) {
        int nextPosition = photos.stream()
                .mapToInt(ReportPhoto::getPosition)
                .max()
                .orElse(-1) + 1;
        photo.attachTo(this, nextPosition);
        photos.add(photo);
    }

    public void removePhoto(ReportPhoto photo) {
        removeChecksForPhoto(photo);
        photos.remove(photo);
    }

    public void removeChecksForPhoto(ReportPhoto photo) {
        checks.removeIf(check -> check.refersTo(photo));
    }

    public void addFile(ReportFile file) {
        int nextPosition = files.stream()
                .mapToInt(ReportFile::getPosition)
                .max()
                .orElse(-1) + 1;
        file.attachTo(this, nextPosition);
        files.add(file);
    }

    public void removeFile(ReportFile file) {
        files.remove(file);
    }

    public void addCheck(ReportCheck check) {
        if (!check.belongsTo(this)) {
            throw new IllegalArgumentException(
                    "Report check photo must belong to the same report"
            );
        }
        int nextPosition = checks.stream()
                .mapToInt(ReportCheck::getPosition)
                .max()
                .orElse(-1) + 1;
        check.attachTo(this, nextPosition);
        checks.add(check);
    }
}
