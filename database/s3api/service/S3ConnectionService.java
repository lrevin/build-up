package com.buildup.storage.service;

import com.buildup.common.config.AwsProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;

@Service
public class S3ConnectionService {

    private static final Logger log = LoggerFactory.getLogger(S3ConnectionService.class);

    private final S3Client s3Client;
    private final AwsProperties properties;

    public S3ConnectionService(S3Client s3Client, AwsProperties properties) {
        this.s3Client = s3Client;
        this.properties = properties;
    }

    public void checkConnection() {
        s3Client.headBucket(HeadBucketRequest.builder()
                .bucket(properties.s3().bucket())
                .build());
        log.info("event=s3.connection.succeeded bucket={}", properties.s3().bucket());
    }
}
