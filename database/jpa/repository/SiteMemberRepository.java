package com.buildup.site.repository;

import com.buildup.site.entity.MembershipStatus;
import com.buildup.site.entity.SiteMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SiteMemberRepository extends JpaRepository<SiteMember, Long> {

    @Query("""
            select sm
            from SiteMember sm
            join fetch sm.site s
            join fetch s.owner
            left join fetch s.company
            where sm.user.id = :userId
              and sm.status = :status
            order by s.name asc, s.id asc
            """)
    List<SiteMember> findAllAccessibleSites(
            @Param("userId") Long userId,
            @Param("status") MembershipStatus status
    );

    @EntityGraph(attributePaths = {"site", "site.owner", "site.company"})
    Optional<SiteMember> findBySiteIdAndUserIdAndStatus(
            Long siteId,
            Long userId,
            MembershipStatus status
    );

    Optional<SiteMember> findBySiteIdAndUserId(Long siteId, Long userId);

    @EntityGraph(attributePaths = {"user"})
    List<SiteMember> findAllBySiteIdAndStatusOrderByJoinedAtAscIdAsc(
            Long siteId,
            MembershipStatus status
    );
}
