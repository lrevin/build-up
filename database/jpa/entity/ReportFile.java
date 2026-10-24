package com.buildup.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
        name = "report_files",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_report_files_report_position",
                        columnNames = {"report_id", "position"}
                ),
                @UniqueConstraint(name = "uq_report_files_s3_key", columnNames = "s3_key")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReportFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @Column(nullable = false)
    private int position;

    @Column(name = "path", length = 500)
    private String legacyPath;

    @Column(name = "s3_key", unique = true, length = 500)
    private String s3Key;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private ReportFile(
            String legacyPath,
            String s3Key,
            String originalName,
            String contentType,
            Long sizeBytes
    ) {
        this.legacyPath = legacyPath;
        this.s3Key = s3Key;
        this.originalName = originalName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
    }

    public static ReportFile legacy(String path, String originalName, Long sizeBytes) {
        return new ReportFile(path, null, originalName, null, sizeBytes);
    }

    public static ReportFile uploaded(
            String s3Key,
            String originalName,
            String contentType,
            Long sizeBytes
    ) {
        return new ReportFile(null, s3Key, originalName, contentType, sizeBytes);
    }

    public void attachTo(Report report, int position) {
        this.report = report;
        this.position = position;
    }

    public boolean isStoredInS3() {
        return s3Key != null && !s3Key.isBlank();
    }

    public void replaceStoredObject(
            String s3Key,
            String originalName,
            String contentType,
            Long sizeBytes
    ) {
        this.legacyPath = null;
        this.s3Key = s3Key;
        this.originalName = originalName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
    }
}
