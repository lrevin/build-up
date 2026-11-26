package com.buildup.server.material;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MaterialRequestRepository extends JpaRepository<MaterialRequest, Long> {

    @EntityGraph(attributePaths = {"author", "site"})
    List<MaterialRequest> findBySiteIdOrderByCreatedAtDescIdDesc(Long siteId);

    /** 본사 화면: 연결된 여러 현장의 요청 */
    @EntityGraph(attributePaths = {"author", "site"})
    List<MaterialRequest> findBySiteIdInOrderByCreatedAtDescIdDesc(List<Long> siteIds);

    long countBySiteIdAndStatus(Long siteId, String status);

    /** 처리를 기다리는 요청 수: ownerAuthored=true면 현장 관리자가 올린 것(본사가 처리), false면 작업자가 올린 것(현장 관리자가 처리) */
    @org.springframework.data.jpa.repository.Query("select count(m) from MaterialRequest m where m.site.id = :siteId"
            + " and m.status = :status and ((:ownerAuthored = true and m.author = m.site.owner)"
            + " or (:ownerAuthored = false and m.author <> m.site.owner))")
    long countPending(Long siteId, String status, boolean ownerAuthored);

    long countByStatus(String status);

    @Query("select m from MaterialRequest m where m.site.id = :siteId")
    List<MaterialRequest> findAllBySiteId(Long siteId);
}
