package com.buildup.company.entity;

public enum CompanyMembershipRole {
    HQ_MANAGER,
    HQ_MEMBER;

    public boolean canReviewReports() {
        return this == HQ_MANAGER;
    }
}
