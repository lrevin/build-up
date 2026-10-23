package com.buildup.storage.service;

import com.buildup.common.config.AwsProperties;
import com.buildup.report.repository.ReportFileRepository;
import com.buildup.report.repository.ReportPhotoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class S3OrphanCleanupService {

    private static final Logger log = LoggerFactory.getLogger(S3OrphanCleanupService.class);
    private static final String MANAGED_PREFIX = "reports/";
    private static final Pattern MANAGED_KEY = Pattern.compile(
            "^reports/\\d+/(photos|files)/[^/]+$"
    );

    private final S3Client s3Client;
    private final AwsProperties properties;
    private final ReportPhotoRepository photoRepository;
    private final ReportFileRepository fileRepository;

    public S3OrphanCleanupService(
            S3Client s3Client,
            AwsProperties properties,
            ReportPhotoRepository photoRepository,
            ReportFileRepository fileRepository
    ) {
        this.s3Client = s3Client;
        this.properties = properties;
        this.photoRepository = photoRepository;
        this.fileRepository = fileRepository;
    }

    @Scheduled(
            cron = "${aws.s3.orphan-cleanup-cron:0 0 4 * * *}",
            zone = "${aws.s3.orphan-cleanup-zone:Asia/Seoul}"
    )
    public void cleanupOrphans() {
        if (!properties.s3().orphanCleanupEnabled()) {
            return;
        }

        Set<String> referencedKeys = new HashSet<>(photoRepository.findAllStoredS3Keys());
        referencedKeys.addAll(fileRepository.findAllStoredS3Keys());
        Instant deleteBefore = Instant.now().minus(properties.s3().orphanCleanupGracePeriod());

        int scanned = 0;
        int deleted = 0;
        String continuationToken = null;
        try {
            do {
                ListObjectsV2Response response = s3Client.listObjectsV2(
                        ListObjectsV2Request.builder()
                                .bucket(properties.s3().bucket())
                                .prefix(MANAGED_PREFIX)
                                .continuationToken(continuationToken)
                                .build()
                );
                for (S3Object object : response.contents()) {
                    scanned++;
                    if (isDeletableOrphan(object, referencedKeys, deleteBefore)) {
                        s3Client.deleteObject(DeleteObjectRequest.builder()
                                .bucket(properties.s3().bucket())
                                .key(object.key())
                                .build());
                        deleted++;
                        log.info("event=s3.orphan.deleted key={} lastModified={}", object.key(), object.lastModified());
                    }
                }
                continuationToken = response.isTruncated()
                        ? response.nextContinuationToken()
                        : null;
            } while (continuationToken != null);

            log.info(
                    "event=s3.orphan.cleanup.completed scanned={} referenced={} deleted={}",
                    scanned,
                    referencedKeys.size(),
                    deleted
            );
        } catch (SdkException exception) {
            log.error(
                    "event=s3.orphan.cleanup.failed scanned={} deleted={} exception={}",
                    scanned,
                    deleted,
                    exception.getClass().getSimpleName()
            );
        }
    }

    private boolean isDeletableOrphan(
            S3Object object,
            Set<String> referencedKeys,
            Instant deleteBefore
    ) {
        return object.key() != null
                && MANAGED_KEY.matcher(object.key()).matches()
                && !referencedKeys.contains(object.key())
                && object.lastModified() != null
                && object.lastModified().isBefore(deleteBefore);
    }
}
