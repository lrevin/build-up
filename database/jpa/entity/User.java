package com.buildup.user.entity;

import com.buildup.company.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

    @Column(length = 100)
    private String company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hq_company_id")
    private Company hqCompany;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_company_id")
    private Company managerCompany;

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

    public boolean isSystemAdmin() {
        return SYSTEM_ADMIN_ROLE.equals(role);
    }
}
