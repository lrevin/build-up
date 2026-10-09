package com.buildup.auth.service;

import com.buildup.auth.entity.RefreshToken;
import com.buildup.auth.jwt.JwtProperties;
import com.buildup.auth.repository.RefreshTokenRepository;
import com.buildup.common.exception.AuthException;
import com.buildup.user.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            JwtProperties properties
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.properties = properties;
    }

    @Transactional
    public IssuedRefreshToken issue(User user) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String rawToken = generateToken();
        LocalDateTime expiresAt = now.plus(properties.refreshTokenTtl());

        refreshTokenRepository.save(RefreshToken.issue(user, hash(rawToken), expiresAt));
        return new IssuedRefreshToken(rawToken, expiresAt.toInstant(ZoneOffset.UTC));
    }

    @Transactional(noRollbackFor = AuthException.class)
    public ValidatedRefreshToken validate(String rawToken) {
        String tokenHash = hash(rawToken);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        RefreshToken current = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(this::invalidRefreshToken);

        if (current.isRevoked()) {
            throw invalidRefreshToken();
        }

        if (current.isExpired(now)) {
            current.revoke(now);
            throw invalidRefreshToken();
        }

        return new ValidatedRefreshToken(
                current.getUser(),
                current.getExpiresAt().toInstant(ZoneOffset.UTC)
        );
    }

    @Transactional
    public void revoke(String rawToken) {
        String tokenHash = hash(rawToken);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(token -> token.revoke(now));
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalidRefreshToken();
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private AuthException invalidRefreshToken() {
        return new AuthException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_REFRESH_TOKEN",
                "Refresh token is invalid or expired"
        );
    }

    public record IssuedRefreshToken(String value, Instant expiresAt) {
    }

    public record ValidatedRefreshToken(User user, Instant expiresAt) {
    }
}
