package com.buildup.report.repository;

import com.buildup.report.entity.ReportFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReportFileRepository extends JpaRepository<ReportFile, Long> {

    @Query("select file.s3Key from ReportFile file where file.s3Key is not null")
    List<String> findAllStoredS3Keys();
}
