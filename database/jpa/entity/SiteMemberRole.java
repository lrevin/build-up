package com.buildup.site.entity;

public enum SiteMemberRole {
    OWNER,
    MANAGER,
    WORKER,
    VIEWER;

    public boolean canManageReports() {
        return this == OWNER || this == MANAGER;
    }

    public boolean canViewMembers() {
        return this == OWNER || this == MANAGER;
    }

    public boolean canSubmitReports() {
        return this != VIEWER;
    }
}
