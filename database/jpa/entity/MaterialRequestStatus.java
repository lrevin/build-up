package com.buildup.material.entity;

import java.util.Set;

public enum MaterialRequestStatus {
    REQUESTED,
    APPROVED,
    REJECTED,
    ORDERED,
    DELIVERED;

    public boolean canTransitionTo(MaterialRequestStatus next) {
        return switch (this) {
            case REQUESTED -> Set.of(APPROVED, REJECTED).contains(next);
            case APPROVED -> next == ORDERED;
            case ORDERED -> next == DELIVERED;
            case REJECTED, DELIVERED -> false;
        };
    }
}
