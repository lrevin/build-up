package com.buildup.storage.controller;

import com.buildup.storage.service.S3ConnectionService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
@ConditionalOnProperty(
        prefix = "aws.s3",
        name = "connection-check-enabled",
        havingValue = "true"
)
public class S3ConnectionController {

    private final S3ConnectionService s3ConnectionService;

    public S3ConnectionController(S3ConnectionService s3ConnectionService) {
        this.s3ConnectionService = s3ConnectionService;
    }

    @GetMapping("/s3")
    public S3ConnectionResponse checkConnection() {
        s3ConnectionService.checkConnection();
        return new S3ConnectionResponse("ok", "S3 connection is available");
    }

    public record S3ConnectionResponse(
            String status,
            String message
    ) {
    }
}
