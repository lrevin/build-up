package com.buildup.user.service;

import com.buildup.common.exception.AuthException;
import com.buildup.user.entity.User;
import com.buildup.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public User require(Jwt jwt) {
        Long userId;
        try {
            userId = Long.valueOf(jwt.getSubject());
        } catch (RuntimeException exception) {
            throw unauthorized();
        }

        return userRepository.findById(userId).orElseThrow(this::unauthorized);
    }

    private AuthException unauthorized() {
        return new AuthException(
                HttpStatus.UNAUTHORIZED,
                "INVALID_ACCESS_TOKEN",
                "Access token does not identify an active user"
        );
    }
}
