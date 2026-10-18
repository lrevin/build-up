package com.buildup.auth.dto;

import java.time.Instant;

public record TokenResponse(
        AuthUserResponse user,
        String tokenType,
        String accessToken,
        String refreshToken,
        Instant accessTokenExpiresAt,
        Instant refreshTokenExpiresAt
) {

    public static TokenResponse bearer(
            AuthUserResponse user,
            String accessToken,
            String refreshToken,
            Instant accessTokenExpiresAt,
            Instant refreshTokenExpiresAt
    ) {
        return new TokenResponse(
                user,
                "Bearer",
                accessToken,
                refreshToken,
                accessTokenExpiresAt,
                refreshTokenExpiresAt
        );
    }
}
