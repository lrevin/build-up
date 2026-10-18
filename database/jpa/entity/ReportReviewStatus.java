package com.buildup.report.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum ReportReviewStatus {
    PENDING,
    APPROVED,
    REVISION;

    @JsonValue
    public String apiValue() {
        return name().toLowerCase(Locale.ROOT);
    }

    @JsonCreator
    public static ReportReviewStatus fromApiValue(String value) {
        if (value == null) {
            return null;
        }
        return valueOf(value.trim().toUpperCase(Locale.ROOT));
    }
}
