package com.buildup.device.repository;

import com.buildup.device.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.time.LocalDateTime;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByToken(String token);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            INSERT INTO device_tokens (token, user_id, updated_at)
            VALUES (:token, :userId, :updatedAt)
            ON DUPLICATE KEY UPDATE
                user_id = :userId,
                updated_at = :updatedAt
            """, nativeQuery = true)
    int upsert(
            @Param("token") String token,
            @Param("userId") Long userId,
            @Param("updatedAt") LocalDateTime updatedAt
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            delete from DeviceToken token
             where token.token = :token
               and token.user.id = :userId
            """)
    int deleteOwnedToken(@Param("token") String token, @Param("userId") Long userId);
}
