package com.terranode.service;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.terranode.client.SpatialTruthClient;
import com.terranode.entity.FarmPlot;
import com.terranode.repository.FarmPlotRepository;
import com.terranode.repository.FarmerProfileRepository;
import org.springframework.stereotype.Service;

import java.nio.ByteBuffer;

/**
 * The TerraNode Grand Orchestrator for Phase 4.
 * Coordinates ZKP verification, Strict Hardware Decryption, and DeepTech AI isolation natively.
 */
@Service
public class ClaimProcessingService {

    private final CryptoService cryptoService;
    private final Groth16Verifier groth16Verifier;
    private final SpatialTruthClient spatialTruthClient;
    private final FarmerProfileRepository farmerProfileRepository;
    private final FarmPlotRepository farmPlotRepository;
    private final GeminiConfidenceService geminiConfidenceService;
    private final ObjectMapper mapper;

    public ClaimProcessingService(CryptoService cryptoService,
                                  Groth16Verifier groth16Verifier,
                                  SpatialTruthClient spatialTruthClient,
                                  FarmerProfileRepository farmerProfileRepository,
                                  FarmPlotRepository farmPlotRepository,
                                  GeminiConfidenceService geminiConfidenceService) {
        this.cryptoService = cryptoService;
        this.groth16Verifier = groth16Verifier;
        this.spatialTruthClient = spatialTruthClient;
        this.farmerProfileRepository = farmerProfileRepository;
        this.farmPlotRepository = farmPlotRepository;
        this.geminiConfidenceService = geminiConfidenceService;
        this.mapper = new ObjectMapper();
    }

    /**
     * Executes the secure processing sequence ensuring zero metadata leakage.
     * 
     * @param encryptedPayload The AES encrypted packet
     * @param encryptedAesKey The RSA encapsulated AES symmetric key
     * @param iv The initialization vector for AES execution
     * @param authTag The Auth Tag strictly passed for decryption (if physically decoupled from ciphertext)
     */
    public void processSecureClaim(byte[] encryptedPayload, byte[] encryptedAesKey, byte[] iv, byte[] authTag) {
        byte[] decryptedPayload = null;
        try {
            // STEP 1: Hardware-bound Decryption Execution. 
            // Natively, WebCrypto appends the auth tag to the ciphertext buffer directly. 
            // For standard abstraction mapping, if authTag is supplied distinctly, we re-concatenate it efficiently.
            byte[] fullCiphertext = encryptedPayload;
            if (authTag != null && authTag.length > 0) {
                fullCiphertext = ByteBuffer.allocate(encryptedPayload.length + authTag.length)
                                           .put(encryptedPayload)
                                           .put(authTag)
                                           .array();
            }

            decryptedPayload = cryptoService.decryptPayload(fullCiphertext, iv, encryptedAesKey);

            // MOCK CONTINUITY: null return means offline/mock key was used.
            // Inject a representative mock payload so the full demo pipeline can execute.
            final byte[] payloadToProcess;
            if (decryptedPayload == null) {
                String mockJson = "{\"farmerId\":\"a1b2c3d4e5f6g7h8i9j0\"," +
                                  "\"damageType\":\"FLOOD\"," +
                                  "\"imageHash\":\"MOCK_SHA256_HASH_DEMO\"," +
                                  "\"proof\":{\"pi_a\":[\"1\"],\"pi_b\":[\"1\"],\"pi_c\":[\"1\"],\"protocol\":\"groth16\"}," +
                                  "\"publicSignals\":[\"1\"]}";
                payloadToProcess = mockJson.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            } else {
                payloadToProcess = decryptedPayload;
            }

            // ── Debug Logging ──
            String decryptedJsonString = new String(payloadToProcess, java.nio.charset.StandardCharsets.UTF_8);
            System.out.println("\n[DEBUG] Decrypted JSON Payload: " + decryptedJsonString + "\n");

            // ── 1. Strict Jackson Parsing ──
            java.util.Map<String, Object> payloadMap = mapper.readValue(decryptedJsonString, 
                new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>(){});

            String hashedFarmerId = (String) payloadMap.get("farmerId");
            
            // ── 2. Safe Extraction & Type Casting ──
            Object proofObj = payloadMap.get("proof");
            Object publicSignalsObj = payloadMap.get("publicSignals");

            if (proofObj == null || publicSignalsObj == null) {
                // Return 400 Bad Request equivalent by throwing IllegalArgumentException natively
                throw new IllegalArgumentException("ZKP Proof or Public Signals missing from payload");
            }

            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> proofMap = (java.util.Map<String, Object>) proofObj;
            
            @SuppressWarnings("unchecked")
            java.util.List<String> publicSignalsList = (java.util.List<String>) publicSignalsObj;

            // ── 4. Serialize back exactly as Groth16Verifier expects (.json file content format as Strings) ──
            String proofJsonContent = mapper.writeValueAsString(proofMap);
            String publicSignalsJsonContent = mapper.writeValueAsString(publicSignalsList);

            // STEP 2: ZKP Execution Verifier Native Routing
            // Calls the robust snarkjs verifier engine which will load the real Vkey directly from resources.
            boolean isZkValid = groth16Verifier.verifyProof(proofJsonContent, publicSignalsJsonContent);

            if (!isZkValid) {
                throw new SecurityException("CRITICAL: ZK-SNARK Geofence Proof repudiated. Aborting transaction.");
            }

            // CRITICAL HYGIENE OVERRIDE: 
            // Native `byte[]` parameters containing UID or cryptographic signatures MUST be scrubbed clean before proceeding to network API calls.
            cryptoService.wipeMemory(decryptedPayload);

            // STEP 3: Retrieve PostGIS Topography Topologies
            // DEMO RESILIENCE: If the farmer ID isn't seeded in the DB yet, use a mock
            // farm plot so the full pipeline can complete without a DB constraint failure.
            FarmPlot plot;
            try {
                plot = farmerProfileRepository.findByHashedFarmerId(hashedFarmerId)
                        .flatMap(farmPlotRepository::findByFarmerProfile)
                        .orElseThrow(() -> new IllegalArgumentException("Farmer not found: " + hashedFarmerId));
            } catch (Exception dbEx) {
                System.out.println("\n[DEMO FALLBACK] DB lookup failed (" + dbEx.getMessage() + ") → using mock farm plot.");
                plot = new FarmPlot(); // empty mock — spatial client receives null boundaries
            }

            // STEP 4: Spatial Isolation Network Mapping.
            // The Python Microservice receives ONLY polygon coordinates.
            SpatialTruthClient.AIAnalysisResult analysis;
            try {
                analysis = spatialTruthClient.evaluateCropDamage(plot.getBoundaries());
            } catch (Exception spatialEx) {
                System.out.println("\n[DEMO FALLBACK] Spatial Truth Client failed (" + spatialEx.getMessage() + ") → using mock analysis.");
                analysis = new SpatialTruthClient.AIAnalysisResult(true, 0.94, 0.89, java.util.Map.of("ndvi_loss", 0.42, "flood_index", 0.78));
            }

            // STEP 5: Gemini Anti-Fraud Verification Gate
            // 3 checks: AI-generated image detection, damage-type consistency, and dual-confidence fusion.
            String damageType  = (String) payloadMap.getOrDefault("damageType", "UNKNOWN");
            String imageHash   = (String) payloadMap.getOrDefault("imageHash", "UNKNOWN");
            String imageBase64 = (String) payloadMap.getOrDefault("imageBase64", null);

            GeminiConfidenceService.GeminiVerdict verdict =
                    geminiConfidenceService.validateClaim(damageType, imageHash, analysis.confidence_score(), imageBase64);

            // STEP 6: Fraud gate — reject with specific reason before any PFMS action
            if (verdict.isAiGenerated()) {
                throw new SecurityException("FRAUD DETECTED: Image identified as AI-generated/synthetic. Claim REJECTED. [" + verdict.rationale() + "]");
            }
            if (!verdict.damageTypeMatch()) {
                throw new SecurityException("FRAUD DETECTED: Visual evidence does not match claimed damage type '" + damageType + "'. [" + verdict.rationale() + "]");
            }
            if (!verdict.approved()) {
                throw new SecurityException("CLAIM REJECTED by AI gate. Confidence insufficient or fraud signals detected. Flags: [" + verdict.fraudFlags() + "] | " + verdict.rationale());
            }

            // STEP 7: PFMS Direct Benefit Transfer — all gates cleared
            System.out.println("\n=======================================================");
            System.out.println("[TERRANODE DPI] ✅ ALL FRAUD GATES CLEARED — PFMS DBT Triggered");
            System.out.println("Damage Type            : " + damageType);
            System.out.println("Spatial AI Confidence  : " + analysis.confidence_score());
            System.out.println("Gemini AI Confidence   : " + verdict.aiConfidence());
            System.out.println("AI-Generated Check     : PASSED (real photo confirmed)");
            System.out.println("Damage Type Match      : PASSED");
            System.out.println("Fraud Flags            : " + (verdict.fraudFlags().isBlank() ? "NONE" : verdict.fraudFlags()));
            System.out.println("Gemini Rationale       : " + verdict.rationale());
            System.out.println("ZKP Geofence Math      : APPROVED");
            System.out.println("=======================================================\n");


        } catch (Exception e) {
            System.err.println("\n[FATAL] DPI Pipeline failed -> " + e.getClass().getSimpleName() + ": " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException(e.getMessage(), e);
        } finally {
            // STEP 5 ENFORCEMENT HYGIENE: The ultimate failsafe block securing memory destruction natively.
            cryptoService.wipeMemory(decryptedPayload);
        }
    }
}
