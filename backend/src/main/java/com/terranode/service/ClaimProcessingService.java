package com.terranode.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.terranode.entity.Claim;
import com.terranode.repository.ClaimRepository;
import com.terranode.repository.FarmPlotRepository;
import com.terranode.repository.FarmerRepository;
import org.springframework.stereotype.Service;
import org.locationtech.jts.geom.Coordinate;
import java.util.ArrayList;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

/**
 * The TerraNode Grand Orchestrator for Phase 4.
 * Coordinates ZKP verification, Strict Hardware Decryption, and DeepTech AI isolation natively.
 */
@Service
public class ClaimProcessingService {

    private final CryptoService cryptoService;
    private final Groth16Verifier groth16Verifier;
    private final FarmerRepository farmerRepository;
    private final FarmPlotRepository farmPlotRepository;
    private final GeminiConfidenceService geminiConfidenceService;
    private final SentinelSatelliteService sentinelService;
    private final BlockchainService blockchainService;
    private final ClaimRepository claimRepository;
    private final ObjectMapper mapper;

    public ClaimProcessingService(CryptoService cryptoService,
                                   Groth16Verifier groth16Verifier,
                                   FarmerRepository farmerRepository,
                                   FarmPlotRepository farmPlotRepository,
                                   GeminiConfidenceService geminiConfidenceService,
                                   SentinelSatelliteService sentinelService,
                                   BlockchainService blockchainService,
                                   ClaimRepository claimRepository) {
        this.cryptoService = cryptoService;
        this.groth16Verifier = groth16Verifier;
        this.farmerRepository = farmerRepository;
        this.farmPlotRepository = farmPlotRepository;
        this.geminiConfidenceService = geminiConfidenceService;
        this.sentinelService = sentinelService;
        this.blockchainService = blockchainService;
        this.claimRepository = claimRepository;
        this.mapper = new ObjectMapper();
    }

    /**
     * Executes the secure processing sequence ensuring zero metadata leakage.
     */
    public void processSecureClaim(byte[] encryptedPayload, byte[] encryptedAesKey, byte[] iv, byte[] authTag) {
        byte[] decryptedPayload = null;
        Claim claim = new Claim();
        
        try {
            // STEP 1: Hardware-bound Decryption Execution. 
            byte[] fullCiphertext = encryptedPayload;
            if (authTag != null && authTag.length > 0) {
                fullCiphertext = ByteBuffer.allocate(encryptedPayload.length + authTag.length)
                                           .put(encryptedPayload)
                                           .put(authTag)
                                           .array();
            }

            decryptedPayload = cryptoService.decryptPayload(fullCiphertext, iv, encryptedAesKey);
            if (decryptedPayload == null) throw new SecurityException("Unable to decrypt cryptographic payload.");

            String json = new String(decryptedPayload, StandardCharsets.UTF_8);
            Map<String, Object> payloadMap = mapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>(){});

            String farmerId = (String) payloadMap.get("farmerId");
            if (farmerId == null) throw new SecurityException("Farmer ID missing.");
            String damageType = (String) payloadMap.getOrDefault("damageType", "OTHER");
            String imageHash = (String) payloadMap.get("imageHash");
            String imageBase64 = (String) payloadMap.get("imageBase64");

            claim.setFarmerId(farmerId);
            claim.setDamageType(damageType);
            claim.setStatus("PENDING");
            
            // STEP 2: ZKP Verification
            String proofJson = mapper.writeValueAsString(payloadMap.get("proof"));
            String signalsJson = mapper.writeValueAsString(payloadMap.get("publicSignals"));
            if (!groth16Verifier.verifyProof(proofJson, signalsJson)) {
                 throw new SecurityException("ZKP Geofence Proof repudiated. Aborting.");
            }

            // STEP 3: Retrieve and verify Geofence mapping for the farmer
            List<Map<String, Double>> boundaries = farmerRepository.findById(farmerId)
                .flatMap(farmPlotRepository::findByFarmer)
                .map(plot -> {
                    List<Map<String, Double>> coords = new ArrayList<>();
                    for (Coordinate c : plot.getBoundaries().getCoordinates()) {
                        Map<String, Double> point = new HashMap<>();
                        point.put("lng", c.x);
                        point.put("lat", c.y);
                        coords.add(point);
                    }
                    return coords;
                })
                .orElse(List.of());

            // STEP 4: Sentinel Satellite Verification
            SentinelSatelliteService.SatelliteVerdict satVerdict = sentinelService.verifySatelliteData(damageType, boundaries);
            if (!satVerdict.confirmed()) {
                 throw new SecurityException("Sentinel Satellite imagery shows contradiction with claimed damage. [" + satVerdict.reason() + "]");
            }

            // STEP 5: Gemini AI Visual Analysis
            GeminiConfidenceService.GeminiVerdict aiVerdict = 
                geminiConfidenceService.validateClaim(damageType, imageHash, satVerdict.ndvi(), imageBase64);

            if (!aiVerdict.approved()) {
                throw new SecurityException("AI Analysis Gate failed: " + aiVerdict.rationale());
            }

            // STEP 6: Blockchain Anchoring
            String txHash = blockchainService.anchorClaim(farmerId, damageType, aiVerdict.aiConfidence());

            // FINAL STEP: Persist Success
            claim.setStatus("APPROVED");
            claim.setBlockchainTx(txHash);
            claim.setConfidenceScore(aiVerdict.aiConfidence());
            claim.setDamageReason(aiVerdict.rationale());
            claimRepository.save(claim);

            System.out.println("[TERRANODE DPI] ✅ CLAIM SECURED: " + txHash);

        } catch (Exception e) {
            claim.setStatus("REJECTED");
            claim.setDamageReason(e.getMessage());
            claimRepository.save(claim);
            throw new RuntimeException(e.getMessage(), e);
        } finally {
            cryptoService.wipeMemory(decryptedPayload);
        }
    }
}
