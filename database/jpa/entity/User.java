package com.buildup.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    public static final String DEFAULT_ROLE = "USER";
    public static final String SITE_ADMIN_ROLE = "ADMIN";
    public static final String SYSTEM_ADMIN_ROLE = "SYSTEM_ADMIN";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(nullable = false, length = 30)
    private String role;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private User(String name, String email, String phone, String passwordHash) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.role = DEFAULT_ROLE;
        this.passwordHash = passwordHash;
    }

    public static User register(String name, String email, String phone, String passwordHash) {
        return new User(name, email, phone, passwordHash);
    }

    public static User register(
            String name,
            String email,
            String phone,
            String passwordHash,
            String requestedRole
    ) {
        User user = new User(name, email, phone, passwordHash);
        if (SITE_ADMIN_ROLE.equals(requestedRole)) {
            user.role = SITE_ADMIN_ROLE;
        }
        return user;
    }

    public boolean isSystemAdmin() {
        return SYSTEM_ADMIN_ROLE.equals(role);
    }

    public boolean isSiteAdmin() {
        return SITE_ADMIN_ROLE.equals(role);
    }
}
