package com.buildup.report.controller;

import com.buildup.report.dto.ReportFileResponse;
import com.buildup.report.service.ReportFileService;
import com.buildup.report.service.ReportFileService.FileContent;
import com.buildup.user.service.CurrentUserService;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
public class ReportFileController {

    private final CurrentUserService currentUserService;
    private final ReportFileService reportFileService;

    public ReportFileController(
            CurrentUserService currentUserService,
            ReportFileService reportFileService
    ) {
        this.currentUserService = currentUserService;
        this.reportFileService = reportFileService;
    }

    @PostMapping(
            value = "/api/reports/{reportId}/files",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @ResponseStatus(HttpStatus.CREATED)
    public ReportFileResponse upload(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @RequestPart("file") MultipartFile file
    ) {
        return reportFileService.upload(currentUserService.require(jwt), reportId, file);
    }

    @PostMapping(
            value = "/api/reports/{reportId}/files/batch",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @ResponseStatus(HttpStatus.CREATED)
    public List<ReportFileResponse> uploadMany(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @RequestPart("files") List<MultipartFile> files
    ) {
        return reportFileService.uploadMany(currentUserService.require(jwt), reportId, files);
    }

    @PutMapping(
            value = "/api/reports/{reportId}/files/{fileId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ReportFileResponse replace(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @PathVariable Long fileId,
            @RequestPart("file") MultipartFile file
    ) {
        return reportFileService.replace(
                currentUserService.require(jwt),
                reportId,
                fileId,
                file
        );
    }

    @GetMapping("/api/reports/{reportId}/files")
    public List<ReportFileResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId
    ) {
        return reportFileService.list(currentUserService.require(jwt), reportId);
    }

    @GetMapping("/api/reports/{reportId}/files/{fileId}/content")
    public ResponseEntity<byte[]> content(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @PathVariable Long fileId
    ) {
        FileContent content = reportFileService.content(
                currentUserService.require(jwt),
                reportId,
                fileId
        );
        MediaType mediaType = content.contentType() == null
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(content.contentType());
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(content.originalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(content.content().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(content.content());
    }

    @DeleteMapping("/api/reports/{reportId}/files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long reportId,
            @PathVariable Long fileId
    ) {
        reportFileService.delete(currentUserService.require(jwt), reportId, fileId);
    }
}
