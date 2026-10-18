package com.buildup.report.entity;

/**
 * 보고 검토 상태. DB에는 대문자(PENDING / APPROVED / REVISION), API(JSON)에는 소문자(pending / approved / revision).
 * 보완 요청 = REVISION (예전 이름 REJECTED는 V10에서 바꿈)
 */
public enum ReportReviewStatus {
    PENDING,
    APPROVED,
    REVISION;

    /** API로 주고받는 값: pending | approved | revision */
    public String apiValue() {
        return name().toLowerCase();
    }

    public static ReportReviewStatus fromApi(String value) {
        return valueOf(value.trim().toUpperCase());
    }
}
