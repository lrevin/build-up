package com.buildup.report.repository;

import com.buildup.report.entity.Report;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {

    boolean existsBySiteIdAndProcessKeyAndReviewStatus(
            Long siteId,
            String processKey,
            com.buildup.report.entity.ReportReviewStatus reviewStatus
    );

    @EntityGraph(attributePaths = {"author"})
    @Query("""
            select report
            from Report report
            where report.site.id = :siteId
              and (:processKey is null or report.processKey = :processKey)
              and (:reviewStatus is null or report.reviewStatus = :reviewStatus)
            """)
    Page<Report> search(
            @Param("siteId") Long siteId,
            @Param("processKey") String processKey,
            @Param("reviewStatus") com.buildup.report.entity.ReportReviewStatus reviewStatus,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"site", "site.owner", "site.company", "author"})
    @Query("select report from Report report where report.id = :reportId")
    Optional<Report> findDetailById(@Param("reportId") Long reportId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"site", "site.owner", "site.company", "author"})
    @Query("select report from Report report where report.id = :reportId")
    Optional<Report> findForReview(@Param("reportId") Long reportId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"site", "site.owner", "site.company", "author"})
    @Query("select report from Report report where report.id = :reportId")
    Optional<Report> findForPhotoUpdate(@Param("reportId") Long reportId);
}
