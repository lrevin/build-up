package com.buildup.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "aws")
public record AwsProperties(
        String region,
        S3 s3
) {

    public AwsProperties {
        if (region == null || region.isBlank()) {
            throw new IllegalStateException("AWS region must be configured");
        }
        if (s3 == null) {
            throw new IllegalStateException("AWS S3 settings must be configured");
        }
    }

    public record S3(
            String bucket,
            boolean connectionCheckEnabled,
            long maxPhotoSizeBytes,
            long maxFileSizeBytes,
            boolean orphanCleanupEnabled,
            Duration orphanCleanupGracePeriod
    ) {

        public S3 {
            if (bucket == null || bucket.isBlank()) {
                throw new IllegalStateException("AWS S3 bucket must be configured");
            }
            if (maxPhotoSizeBytes <= 0) {
                throw new IllegalStateException("AWS S3 maximum photo size must be positive");
            }
            if (maxFileSizeBytes <= 0) {
                throw new IllegalStateException("AWS S3 maximum file size must be positive");
            }
            if (orphanCleanupGracePeriod == null
                    || orphanCleanupGracePeriod.isNegative()
                    || orphanCleanupGracePeriod.isZero()) {
                throw new IllegalStateException("AWS S3 orphan cleanup grace period must be positive");
            }
        }
    }
}
