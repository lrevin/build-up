package com.buildup.auth.dto;

public record AuthUserResponse(
        String id,
        String name,
        String email,
        String phone,
        String role,
        String company,
        String companyCode,
        String hqName,
        String hqRole,
        boolean canReviewReports
) {
}
