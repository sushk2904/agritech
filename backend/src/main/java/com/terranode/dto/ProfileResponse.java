package com.terranode.dto;

/**
 * Immutable profile DTO returned to the frontend after GET /api/v1/auth/profile.
 * Contains publicly safe fields only — email is decrypted from DB, never the AES key.
 */
public record ProfileResponse(
        String id,
        String fullName,
        String email,
        String walletAddress
) {}
