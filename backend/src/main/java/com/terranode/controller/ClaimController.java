package com.terranode.controller;

import com.terranode.entity.Claim;
import com.terranode.repository.ClaimRepository;
import com.terranode.service.ClaimProcessingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Base64;
import java.util.List;

/**
 * Enterprise API Gateway establishing the secure bridge from Next.js 
 * isolating all crypto logic away from standard external networks.
 */
@RestController
@RequestMapping("/api/v1/claims")
public class ClaimController {

    private final ClaimProcessingService claimService;
    private final ClaimRepository claimRepository;

    public ClaimController(ClaimProcessingService claimService, ClaimRepository claimRepository) {
        this.claimService = claimService;
        this.claimRepository = claimRepository;
    }

    // Strictly mapping to the JSON schema from VisualClaimCamera.tsx
    // imageHash is the SHA-256 fingerprint of the damage photo generated client-side
    public record ClaimPayload(
            String hashedFarmerId,
            String damageType,
            String imageHash,
            String encryptedPayload,
            String encryptedAesKey,
            String iv,
            String authTag
    ) {}

    @PostMapping("/submit")
    public ResponseEntity<String> submitSecureClaim(@RequestBody ClaimPayload payload) {
        try {
            // Natively decrypting the Base64 JSON structures into deterministic byte[] structures
            byte[] encPayloadBytes = Base64.getDecoder().decode(payload.encryptedPayload());
            byte[] encAesKeyBytes = Base64.getDecoder().decode(payload.encryptedAesKey());
            byte[] ivBytes = Base64.getDecoder().decode(payload.iv());
            byte[] authTagBytes = Base64.getDecoder().decode(payload.authTag());

            // Orchestrator seamlessly invokes the JVM AES-GCM decryption matrix
            claimService.processSecureClaim(encPayloadBytes, encAesKeyBytes, ivBytes, authTagBytes);

            return ResponseEntity.ok("Claim Successfully Decrypted, Verified by ZK-SNARK, and Analyzed spatially.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Pipeline error: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<Claim>> getClaimsByFarmer(@RequestParam String farmerId) {
        return ResponseEntity.ok(claimRepository.findByFarmerIdOrderByCreatedAtDesc(farmerId));
    }
}
