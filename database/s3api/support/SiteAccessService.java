package com.buildup.site.service;

import com.buildup.company.entity.CompanyMembershipRole;
import com.buildup.company.repository.CompanyMembershipRepository;
import com.buildup.site.entity.MembershipStatus;
import com.buildup.site.entity.Site;
import com.buildup.site.entity.SiteMember;
import com.buildup.site.repository.SiteMemberRepository;
import com.buildup.user.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class SiteAccessService {

    private final SiteMemberRepository siteMemberRepository;
    private final CompanyMembershipRepository companyMembershipRepository;

    public SiteAccessService(
            SiteMemberRepository siteMemberRepository,
            CompanyMembershipRepository companyMembershipRepository
    ) {
        this.siteMemberRepository = siteMemberRepository;
        this.companyMembershipRepository = companyMembershipRepository;
    }

    @Transactional(readOnly = true)
    public boolean canReviewReports(User user, Site site) {
        if (user.isSystemAdmin() || site.getOwner().getId().equals(user.getId())) {
            return true;
        }

        Optional<SiteMember> membership = siteMemberRepository
                .findBySiteIdAndUserIdAndStatus(
                        site.getId(),
                        user.getId(),
                        MembershipStatus.ACTIVE
                );
        boolean siteManager = membership
                .map(member -> member.getMemberRole().canManageReports())
                .orElse(false);

        if (siteManager || site.getCompany() == null) {
            return siteManager;
        }

        return membership.isPresent()
                && companyMembershipRepository.existsByCompanyIdAndUserIdAndRoleAndStatus(
                        site.getCompany().getId(),
                        user.getId(),
                        CompanyMembershipRole.HQ_MANAGER,
                        MembershipStatus.ACTIVE
                );
    }

    @Transactional(readOnly = true)
    public boolean canManageSite(User user, Site site) {
        if (user.isSystemAdmin() || site.getOwner().getId().equals(user.getId())) {
            return true;
        }

        return siteMemberRepository
                .findBySiteIdAndUserIdAndStatus(
                        site.getId(),
                        user.getId(),
                        MembershipStatus.ACTIVE
                )
                .map(member -> member.getMemberRole().canManageReports())
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean canSubmitReports(User user, Site site) {
        if (user.isSystemAdmin()) {
            return true;
        }

        return siteMemberRepository
                .findBySiteIdAndUserIdAndStatus(
                        site.getId(),
                        user.getId(),
                        MembershipStatus.ACTIVE
                )
                .map(member -> member.getMemberRole().canSubmitReports())
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean canAccessSite(User user, Site site) {
        if (user.isSystemAdmin()) {
            return true;
        }

        return siteMemberRepository
                .findBySiteIdAndUserIdAndStatus(
                        site.getId(),
                        user.getId(),
                        MembershipStatus.ACTIVE
                )
                .isPresent();
    }

    @Transactional(readOnly = true)
    public boolean canManageMaterialRequests(User user, Site site) {
        if (user.isSystemAdmin() || site.getOwner().getId().equals(user.getId())) {
            return true;
        }

        Optional<SiteMember> membership = siteMemberRepository
                .findBySiteIdAndUserIdAndStatus(
                        site.getId(),
                        user.getId(),
                        MembershipStatus.ACTIVE
                );
        boolean siteManager = membership
                .map(member -> member.getMemberRole().canManageReports())
                .orElse(false);
        return siteManager || (membership.isPresent() && isHqManager(user, site));
    }

    @Transactional(readOnly = true)
    public boolean isHqManager(User user, Site site) {
        if (user.isSystemAdmin()) {
            return true;
        }
        if (site.getCompany() == null) {
            return false;
        }
        return companyMembershipRepository.existsByCompanyIdAndUserIdAndRoleAndStatus(
                site.getCompany().getId(),
                user.getId(),
                CompanyMembershipRole.HQ_MANAGER,
                MembershipStatus.ACTIVE
        );
    }

    @Transactional(readOnly = true)
    public boolean canSubmitMaterialRequests(User user, Site site) {
        return canSubmitReports(user, site);
    }
}
