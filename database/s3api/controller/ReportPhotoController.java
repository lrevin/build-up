package com.buildup.report.controller;

import com.buildup.report.dto.ReportPhotoBatchMetadataRequest;
import com.buildup.report.dto.ReportPhotoMetadataRequest;
import com.buildup.report.dto.ReportPhotoResponse;
import com.buildup.report.service.ReportPhotoService;
import com.buildup.report.service.ReportPhotoService.PhotoContent;
import com.buildup.user.entity.User;
import com.buildup.user.service.CurrentUserService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

@RestController
public class ReportPhotoController {

    private final CurrentUserService currentUserService;
    private final ReportPhotoService reportPhotoService;

    public ReportPhotoController(
            CurrentUserService currentUserService,
            ReportPhotoService reportPhotoService
    ) {
        this.currentUserService = currentUserService;
        this.reportPhotoService = reportPhotoService;
    }

    @PostMapping(
            value = "/api/reports/{reportId}/photos",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @ResponseStatus(HttpStatus.CREATED)
    public ReportPhotoResponse upload(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant takenAt,
            @RequestParam(required = false) BigDecimal latitude,
            @RequestParam(required = false) BigDecimal longitude
    ) {
        return reportPhotoService.upload(
                currentUserService.require(jwt),
                reportId,
                file,
                takenAt,
                latitude,
                longitude
        );
    }

    @PostMapping(
            value = "/api/reports/{reportId}/photos/batch",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @ResponseStatus(HttpStatus.CREATED)
    public List<ReportPhotoResponse> uploadMany(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @RequestPart("files") List<MultipartFile> files,
            @RequestPart(value = "metadata", required = false)
            ReportPhotoBatchMetadataRequest metadata
    ) {
        return reportPhotoService.uploadMany(
                currentUserService.require(jwt),
                reportId,
                files,
                metadata == null ? List.of() : metadata.items()
        );
    }

    @PutMapping(
            value = "/api/reports/{reportId}/photos/{photoId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ReportPhotoResponse replace(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @PathVariable Long photoId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant takenAt,
            @RequestParam(required = false) BigDecimal latitude,
            @RequestParam(required = false) BigDecimal longitude
    ) {
        return reportPhotoService.replace(
                currentUserService.require(jwt),
                reportId,
                photoId,
                file,
                new ReportPhotoMetadataRequest(takenAt, latitude, longitude)
        );
    }

    @GetMapping("/api/reports/{reportId}/photos")
    public List<ReportPhotoResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId
    ) {
        return reportPhotoService.list(currentUserService.require(jwt), reportId);
    }

    @GetMapping("/api/reports/{reportId}/photos/{photoId}/content")
    public ResponseEntity<byte[]> content(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @PathVariable Long photoId
    ) {
        User user = currentUserService.require(jwt);
        PhotoContent content = reportPhotoService.content(user, reportId, photoId);
        MediaType mediaType = MediaType.parseMediaType(content.contentType());
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(content.originalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(content.content().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(content.content());
    }

    @DeleteMapping("/api/reports/{reportId}/photos/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @PathVariable Long photoId
    ) {
        reportPhotoService.delete(currentUserService.require(jwt), reportId, photoId);
    }
}
