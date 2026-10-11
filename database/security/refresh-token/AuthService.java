package com.buildup.auth.service;

import com.buildup.auth.dto.LoginRequest;
import com.buildup.auth.dto.SignupRequest;
import com.buildup.auth.dto.TokenResponse;
import com.buildup.auth.jwt.JwtTokenService;
import com.buildup.common.exception.AuthException;
import com.buildup.user.entity.User;
import com.buildup.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(
            UserRepository userRepository,
            PasswordService passwordService,
            JwtTokenService jwtTokenService,
            RefreshTokenService refreshTokenService
    ) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public TokenResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new AuthException(
                    HttpStatus.CONFLICT,
                    "EMAIL_ALREADY_EXISTS",
                    "Email is already registered"
            );
        }

        String passwordHash = passwordService.hash(request.password());
        User user = userRepository.save(User.register(
                request.name().trim(),
                email,
                normalizeNullable(request.phone()),
                passwordHash
        ));
        return issueTokenPair(user);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(this::invalidCredentials);

        if (!passwordService.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }

        TokenResponse response = issueTokenPair(user);
        log.info("event=auth.login.succeeded userId={}", user.getId());
        return response;
    }

    public TokenResponse refresh(String rawRefreshToken) {
        RefreshTokenService.ValidatedRefreshToken validated =
                refreshTokenService.validate(rawRefreshToken);
        JwtTokenService.AccessToken accessToken =
                jwtTokenService.issueAccessToken(validated.user());

        return TokenResponse.bearer(
                accessToken.value(),
                rawRefreshToken,
                accessToken.expiresAt(),
                validated.expiresAt()
        );
    }

    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    private TokenResponse issueTokenPair(User user) {
        JwtTokenService.AccessToken accessToken = jwtTokenService.issueAccessToken(user);
        RefreshTokenService.IssuedRefreshToken refreshToken = refreshTokenService.issue(user);

        return TokenResponse.bearer(
                accessToken.value(),
                refreshToken.value(),
                accessToken.expiresAt(),
                refreshToken.expiresAt()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private AuthException invalidCredentials() {
        return new AuthException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "Email or password is incorrect"
        );
    }
}
