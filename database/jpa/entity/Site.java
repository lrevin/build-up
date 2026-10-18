package com.buildup.site.entity;

import com.buildup.company.entity.Company;
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
import java.math.BigDecimal;

@Getter
@Entity
@Table(name = "sites")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Site {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(name = "work_type", length = 100)
    private String workType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @Enumerated(EnumType.STRING)
    @Column(name = "progress_calculation_mode", nullable = false, length = 30)
    private ProgressCalculationMode progressCalculationMode;

    private Site(
            String name,
            String address,
            String workType,
            User owner,
            String code,
            Company company,
            BigDecimal latitude,
            BigDecimal longitude,
            ProgressCalculationMode progressCalculationMode
    ) {
        this.name = name;
        this.address = address;
        this.workType = workType;
        this.owner = owner;
        this.code = code;
        this.company = company;
        this.latitude = latitude;
        this.longitude = longitude;
        this.progressCalculationMode = progressCalculationMode;
    }

    public static Site create(
            String name,
            String address,
            String workType,
            User owner,
            String code,
            Company company,
            BigDecimal latitude,
            BigDecimal longitude,
            ProgressCalculationMode progressCalculationMode
    ) {
        return new Site(name, address, workType, owner, code, company, latitude, longitude, progressCalculationMode);
    }

    public static Site create(
            String name,
            String address,
            String workType,
            User owner,
            String code,
            Company company,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        return create(
                name,
                address,
                workType,
                owner,
                code,
                company,
                latitude,
                longitude,
                ProgressCalculationMode.PROCESS_WEIGHTED
        );
    }

    public void updateDetails(
            String name,
            String address,
            String workType,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        this.name = name;
        this.address = address;
        this.workType = workType;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public void changeProgressCalculationMode(ProgressCalculationMode mode) {
        this.progressCalculationMode = mode;
    }
}
