package com.buildup.company.entity;

public enum CompanyMembershipRole {
    HQ_MANAGER,
    HQ_MEMBER;

    public boolean canReviewReports() {
        return this == HQ_MANAGER;
    }

    public String apiValue() {
        return this == HQ_MANAGER ? "manager" : "member";
    }
}
