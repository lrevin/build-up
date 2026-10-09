package com.buildup.device.repository;

import com.buildup.device.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByToken(String token);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            delete from DeviceToken token
             where token.token = :token
               and token.user.id = :userId
            """)
    int deleteOwnedToken(@Param("token") String token, @Param("userId") Long userId);
}
