package com.buildup.report.repository;

import com.buildup.report.entity.ReportReviewEvent;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportReviewEventRepository extends JpaRepository<ReportReviewEvent, Long> {

    @EntityGraph(attributePaths = {"reviewer"})
    List<ReportReviewEvent> findAllByReportIdOrderByCreatedAtAscIdAsc(Long reportId);
}
