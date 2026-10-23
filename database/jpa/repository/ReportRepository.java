package com.buildup.report.repository;

import com.buildup.report.entity.Report;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {

    boolean existsBySiteId(Long siteId);

    boolean existsBySiteIdAndProcessKeyAndReviewStatus(
            Long siteId,
            String processKey,
            com.buildup.report.entity.ReportReviewStatus reviewStatus
    );

    boolean existsBySiteIdAndProcessKeyIsNullAndReviewStatus(
            Long siteId,
            com.buildup.report.entity.ReportReviewStatus reviewStatus
    );

    Optional<Report> findFirstBySiteIdAndProcessKeyIsNullAndReviewStatusOrderByCreatedAtDescIdDesc(
            Long siteId,
            com.buildup.report.entity.ReportReviewStatus reviewStatus
    );

    @EntityGraph(attributePaths = {"author"})
    @Query("""
            select report
            from Report report
            where report.site.id = :siteId
              and (:processKey is null or report.processKey = :processKey)
              and (:reviewStatus is null or report.reviewStatus = :reviewStatus)
            order by report.createdAt desc, report.id desc
            """)
    List<Report> searchAll(
            @Param("siteId") Long siteId,
            @Param("processKey") String processKey,
            @Param("reviewStatus") com.buildup.report.entity.ReportReviewStatus reviewStatus
    );

    @EntityGraph(attributePaths = {"author"})
    @Query("""
            select report
            from Report report
            where report.site.id = :siteId
              and (:processKey is null or report.processKey = :processKey)
              and (:reviewStatus is null or report.reviewStatus = :reviewStatus)
              and (
                    :cursorCreatedAt is null
                    or report.createdAt < :cursorCreatedAt
                    or (report.createdAt = :cursorCreatedAt and report.id < :cursorId)
              )
            order by report.createdAt desc, report.id desc
            """)
    List<Report> searchAfter(
            @Param("siteId") Long siteId,
            @Param("processKey") String processKey,
            @Param("reviewStatus") com.buildup.report.entity.ReportReviewStatus reviewStatus,
            @Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
            @Param("cursorId") Long cursorId,
            Pageable pageable
    );

    @Query("""
            select count(report)
            from Report report
            where report.site.id = :siteId
              and (:processKey is null or report.processKey = :processKey)
              and (:reviewStatus is null or report.reviewStatus = :reviewStatus)
            """)
    long countSearch(
            @Param("siteId") Long siteId,
            @Param("processKey") String processKey,
            @Param("reviewStatus") com.buildup.report.entity.ReportReviewStatus reviewStatus
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"site", "site.owner", "site.company", "author"})
    @Query("select report from Report report where report.id = :reportId")
    Optional<Report> findForFileUpdate(@Param("reportId") Long reportId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"site", "site.owner", "site.company", "author"})
    @Query("select report from Report report where report.id = :reportId")
    Optional<Report> findForUpdate(@Param("reportId") Long reportId);
}
