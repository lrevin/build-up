package com.buildup.report.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReportFile {

    @Column(nullable = false, length = 500)
    private String path;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    private ReportFile(String path, String originalName, Long sizeBytes) {
        this.path = path;
        this.originalName = originalName;
        this.sizeBytes = sizeBytes;
    }

    public static ReportFile of(String path, String originalName, Long sizeBytes) {
        return new ReportFile(path, originalName, sizeBytes);
    }
}
