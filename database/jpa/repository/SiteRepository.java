package com.buildup.site.repository;

import com.buildup.site.entity.Site;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SiteRepository extends JpaRepository<Site, Long> {

    boolean existsByCode(String code);

    @EntityGraph(attributePaths = {"owner", "company"})
    Optional<Site> findByCode(String code);
}
