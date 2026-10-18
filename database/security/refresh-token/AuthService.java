package com.buildup.auth.service;

import com.buildup.auth.dto.LoginRequest;
import com.buildup.auth.dto.SignupRequest;
import com.buildup.auth.dto.TokenResponse;
import com.buildup.auth.dto.AuthUserResponse;
import com.buildup.auth.jwt.JwtTokenService;
import com.buildup.common.exception.AuthException;
import com.buildup.common.exception.ApiException;
import com.buildup.company.entity.Company;
import com.buildup.company.entity.CompanyMembership;
import com.buildup.company.entity.CompanyMembershipRole;
import com.buildup.company.repository.CompanyMembershipRepository;
import com.buildup.company.repository.CompanyRepository;
import com.buildup.user.entity.User;
import com.buildup.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.security.SecureRandom;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;
    private final AuthUserService authUserService;
    private final CompanyRepository companyRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            PasswordService passwordService,
            JwtTokenService jwtTokenService,
            RefreshTokenService refreshTokenService,
            AuthUserService authUserService,
            CompanyRepository companyRepository,
            CompanyMembershipRepository companyMembershipRepository
    ) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenService = refreshTokenService;
        this.authUserService = authUserService;
        this.companyRepository = companyRepository;
        this.companyMembershipRepository = companyMembershipRepository;
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

        validatePasswordBytes(request.password());
        String passwordHash = passwordService.hash(request.password());
        String signupRole = normalizeSignupRole(request.role());
        User user = userRepository.save(User.register(
                request.name().trim(),
                email,
                normalizeNullable(request.phone()),
                passwordHash,
                "admin".equals(signupRole) ? User.SITE_ADMIN_ROLE : User.DEFAULT_ROLE
        ));
        if ("hq".equals(signupRole)) {
            registerHeadquartersMembership(user, request.company(), request.companyCode());
        }
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
        AuthUserResponse userResponse = authUserService.get(validated.user());
        JwtTokenService.AccessToken accessToken =
                jwtTokenService.issueAccessToken(validated.user(), userResponse.role());

        return TokenResponse.bearer(
                userResponse,
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
        AuthUserResponse userResponse = authUserService.get(user);
        JwtTokenService.AccessToken accessToken = jwtTokenService.issueAccessToken(
                user,
                userResponse.role()
        );
        RefreshTokenService.IssuedRefreshToken refreshToken = refreshTokenService.issue(user);

        return TokenResponse.bearer(
                userResponse,
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

    private String normalizeSignupRole(String role) {
        return role == null || role.isBlank()
                ? "worker"
                : role.trim().toLowerCase(Locale.ROOT);
    }

    private void registerHeadquartersMembership(
            User user,
            String companyName,
            String companyCode
    ) {
        Company company;
        CompanyMembershipRole membershipRole;
        if (companyCode != null && !companyCode.isBlank()) {
            company = companyRepository.findByCode(companyCode.trim())
                    .orElseThrow(() -> new ApiException(
                            HttpStatus.NOT_FOUND,
                            "COMPANY_CODE_NOT_FOUND",
                            "본사 코드를 확인할 수 없습니다."
                    ));
            membershipRole = CompanyMembershipRole.HQ_MEMBER;
        } else {
            if (companyName == null || companyName.isBlank()) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "COMPANY_NAME_REQUIRED",
                        "새 본사를 등록하려면 본사명을 입력해야 합니다."
                );
            }
            company = companyRepository.save(Company.create(
                    companyName.trim(),
                    generateCompanyCode()
            ));
            membershipRole = CompanyMembershipRole.HQ_MANAGER;
        }
        companyMembershipRepository.save(CompanyMembership.join(company, user, membershipRole));
    }

    private String generateCompanyCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            String code = "%06d".formatted(secureRandom.nextInt(1_000_000));
            if (!companyRepository.existsByCode(code)) {
                return code;
            }
        }
        throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "COMPANY_CODE_GENERATION_FAILED",
                "본사 코드를 생성하지 못했습니다. 잠시 후 다시 시도해주세요."
        );
    }

    private void validatePasswordBytes(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new AuthException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PASSWORD",
                    "Password must not exceed 72 UTF-8 bytes"
            );
        }
    }

    private AuthException invalidCredentials() {
        return new AuthException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "Email or password is incorrect"
        );
    }
}
