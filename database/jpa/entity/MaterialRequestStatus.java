package com.buildup.material.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;
import java.util.Set;

public enum MaterialRequestStatus {
    REQUESTED,
    APPROVED,
    REJECTED,
    ORDERED,
    DELIVERED;

    @JsonValue
    public String apiValue() {
        return name().toLowerCase(Locale.ROOT);
    }

    @JsonCreator
    public static MaterialRequestStatus fromApiValue(String value) {
        if (value == null) {
            return null;
        }
        return valueOf(value.trim().toUpperCase(Locale.ROOT));
    }

    public boolean canTransitionTo(MaterialRequestStatus next) {
        return switch (this) {
            case REQUESTED -> Set.of(APPROVED, REJECTED).contains(next);
            case APPROVED -> next == ORDERED;
            case ORDERED -> next == DELIVERED;
            case REJECTED, DELIVERED -> false;
        };
    }
}
