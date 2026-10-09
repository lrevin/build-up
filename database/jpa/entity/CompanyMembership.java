package com.buildup.company.entity;

import com.buildup.site.entity.MembershipStatus;
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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "company_memberships",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_company_memberships_company_user",
                columnNames = {"company_id", "user_id"}
        )
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CompanyMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CompanyMembershipRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipStatus status;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    private CompanyMembership(Company company, User user, CompanyMembershipRole role) {
        this.company = company;
        this.user = user;
        this.role = role;
        this.status = MembershipStatus.ACTIVE;
    }

    public static CompanyMembership join(
            Company company,
            User user,
            CompanyMembershipRole role
    ) {
        return new CompanyMembership(company, user, role);
    }

    public boolean isActiveManager() {
        return status == MembershipStatus.ACTIVE && role.canReviewReports();
    }
}
