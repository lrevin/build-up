package com.buildup.company.repository;

import com.buildup.company.entity.CompanyMembership;
import com.buildup.company.entity.CompanyMembershipRole;
import com.buildup.site.entity.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;

public interface CompanyMembershipRepository extends JpaRepository<CompanyMembership, Long> {

    boolean existsByCompanyIdAndUserIdAndRoleAndStatus(
            Long companyId,
            Long userId,
            CompanyMembershipRole role,
            MembershipStatus status
    );

    boolean existsByCompanyIdAndUserIdAndStatus(
            Long companyId,
            Long userId,
            MembershipStatus status
    );

    @EntityGraph(attributePaths = "company")
    List<CompanyMembership> findAllByUserIdAndStatusOrderByJoinedAtAscIdAsc(
            Long userId,
            MembershipStatus status
    );
}
