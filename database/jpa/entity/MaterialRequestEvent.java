package com.buildup.material.entity;

import com.buildup.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaterialRequestEvent {

    @Column(nullable = false, length = 30)
    private String status;

    @Column(nullable = false, length = 100)
    private String actor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actorUser;

    @Column(name = "by_hq", nullable = false)
    private boolean byHq;

    @Column(name = "at", nullable = false)
    private LocalDateTime at;

    public MaterialRequestEvent(
            MaterialRequestStatus status,
            User actorUser,
            boolean byHq,
            LocalDateTime at
    ) {
        this.status = status.name();
        this.actor = actorUser.getName();
        this.actorUser = actorUser;
        this.byHq = byHq;
        this.at = at;
    }
}
