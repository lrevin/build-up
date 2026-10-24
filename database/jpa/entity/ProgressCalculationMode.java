package com.buildup.site.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum ProgressCalculationMode {
    PROCESS_WEIGHTED("auto"),
    MANUAL_INPUT("manual");

    private final String apiValue;

    ProgressCalculationMode(String apiValue) {
        this.apiValue = apiValue;
    }

    @JsonValue
    public String apiValue() {
        return apiValue;
    }

    @JsonCreator
    public static ProgressCalculationMode fromApiValue(String value) {
        if (value == null) {
            return null;
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "auto" -> PROCESS_WEIGHTED;
            case "manual" -> MANUAL_INPUT;
            default -> throw new IllegalArgumentException("Unknown progress mode: " + value);
        };
    }
}
