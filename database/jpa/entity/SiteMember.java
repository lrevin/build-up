package com.buildup.site.entity;

import com.buildup.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
        name = "site_members",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_site_members_site_user",
                columnNames = {"site_id", "user_id"}
        )
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SiteMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false, length = 30)
    private SiteMemberRole memberRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipStatus status;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    private SiteMember(Site site, User user, SiteMemberRole memberRole) {
        this.site = site;
        this.user = user;
        this.memberRole = memberRole;
        this.status = MembershipStatus.ACTIVE;
    }

    public static SiteMember join(Site site, User user, SiteMemberRole memberRole) {
        return new SiteMember(site, user, memberRole);
    }

    public boolean isActive() {
        return status == MembershipStatus.ACTIVE;
    }

    public void activateAs(SiteMemberRole memberRole) {
        this.memberRole = memberRole;
        this.status = MembershipStatus.ACTIVE;
    }

    public void changeRole(SiteMemberRole memberRole) {
        this.memberRole = memberRole;
    }
}
