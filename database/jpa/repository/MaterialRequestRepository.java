package com.buildup.material.repository;

import com.buildup.material.entity.MaterialRequest;
import com.buildup.material.entity.MaterialRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MaterialRequestRepository extends JpaRepository<MaterialRequest, Long> {

    @EntityGraph(attributePaths = {"author"})
    @Query("""
            select request
            from MaterialRequest request
            where request.site.id = :siteId
              and (:processKey is null or request.processKey = :processKey)
              and (:status is null or request.status = :status)
            """)
    Page<MaterialRequest> search(
            @Param("siteId") Long siteId,
            @Param("processKey") String processKey,
            @Param("status") MaterialRequestStatus status,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"site", "site.owner", "site.company", "author"})
    @Query("select request from MaterialRequest request where request.id = :requestId")
    Optional<MaterialRequest> findDetailById(@Param("requestId") Long requestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"site", "site.owner", "site.company", "author"})
    @Query("select request from MaterialRequest request where request.id = :requestId")
    Optional<MaterialRequest> findForUpdate(@Param("requestId") Long requestId);
}
