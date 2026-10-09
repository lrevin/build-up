package com.buildup.site.repository;

import com.buildup.site.entity.SiteProcess;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SiteProcessRepository extends JpaRepository<SiteProcess, Long> {

    List<SiteProcess> findAllBySiteIdOrderBySortOrderAscIdAsc(Long siteId);

    boolean existsBySiteIdAndProcessKey(Long siteId, String processKey);

    @Query("""
            select process
            from SiteProcess process
            where process.site.id = :siteId
              and process.processKey = :processKey
            """)
    Optional<SiteProcess> findForRead(
            @Param("siteId") Long siteId,
            @Param("processKey") String processKey
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SiteProcess> findByIdAndSiteId(Long id, Long siteId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SiteProcess> findBySiteIdAndProcessKey(Long siteId, String processKey);
}
