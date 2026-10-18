package com.buildup.company.entity;

public enum CompanyMembershipRole {
    HQ_MANAGER,
    HQ_MEMBER;

    public boolean canReviewReports() {
        return this == HQ_MANAGER;
    }

    /** API(/api/auth/me의 hqRole)로 주는 값: manager | member */
    public String apiValue() {
        return this == HQ_MANAGER ? "manager" : "member";
    }
}
