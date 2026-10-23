package com.buildup.report.repository;

import com.buildup.report.entity.ReportPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReportPhotoRepository extends JpaRepository<ReportPhoto, Long> {

    @Query("select photo.s3Key from ReportPhoto photo where photo.s3Key is not null")
    List<String> findAllStoredS3Keys();
}
