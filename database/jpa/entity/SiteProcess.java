package com.buildup.site.entity;

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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "site_processes",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_site_processes_site_key",
                columnNames = {"site_id", "process_key"}
        )
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SiteProcess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @Column(name = "process_key", nullable = false, length = 50)
    private String processKey;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal progress;

    @Column(name = "last_reported_at")
    private LocalDateTime lastReportedAt;

    @Column(name = "plan_start")
    private LocalDate planStart;

    @Column(name = "plan_end")
    private LocalDate planEnd;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    private SiteProcess(
            Site site,
            String processKey,
            String name,
            BigDecimal weight,
            Integer sortOrder
    ) {
        this.site = site;
        this.processKey = processKey;
        this.name = name;
        this.weight = weight;
        this.progress = BigDecimal.ZERO;
        this.sortOrder = sortOrder;
    }

    public static SiteProcess create(
            Site site,
            String processKey,
            String name,
            BigDecimal weight,
            Integer sortOrder
    ) {
        return new SiteProcess(site, processKey, name, weight, sortOrder);
    }

    public void applyApprovedProgress(BigDecimal approvedProgress, LocalDateTime approvedAt) {
        this.progress = approvedProgress;
        this.lastReportedAt = approvedAt;
    }

    public void updateDefinition(
            String name,
            BigDecimal weight,
            LocalDate planStart,
            LocalDate planEnd,
            Integer sortOrder
    ) {
        this.name = name;
        this.weight = weight;
        this.planStart = planStart;
        this.planEnd = planEnd;
        this.sortOrder = sortOrder;
    }
}
