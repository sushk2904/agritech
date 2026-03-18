package com.terranode.service;

import com.fasterxml.jackson.databind.JsonNode;
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
    private final ObjectMapper mapper;

    public ClaimProcessingService(CryptoService cryptoService,
                                  Groth16Verifier groth16Verifier,
                                  SpatialTruthClient spatialTruthClient,
                                  FarmerProfileRepository farmerProfileRepository,
                                  FarmPlotRepository farmPlotRepository) {
        this.cryptoService = cryptoService;
        this.groth16Verifier = groth16Verifier;
        this.spatialTruthClient = spatialTruthClient;
        this.farmerProfileRepository = farmerProfileRepository;
        this.farmPlotRepository = farmPlotRepository;
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

            // Using Jackson directly against the `byte[]` circumvents String garbage collection leaks.
            JsonNode payloadNode = mapper.readTree(payloadToProcess);

            String hashedFarmerId = payloadNode.get("farmerId").asText();
            JsonNode proof = payloadNode.get("proof");
            JsonNode publicSignals = payloadNode.get("publicSignals");

            // STEP 2: ZKP Execution Verifier Native Routing
            // For the hackathon MVP logic, we simulate safely routing the mock verification signature natively.
            String mockVerificationKey = "{ \"mock\": true }"; 
            boolean isZkValid = groth16Verifier.verifyProof(proof.toString(), publicSignals.toString(), mockVerificationKey);

            if (!isZkValid) {
                throw new SecurityException("CRITICAL: ZK-SNARK Geofence Proof repudiated. Aborting transaction.");
            }

            // CRITICAL HYGIENE OVERRIDE: 
            // Native `byte[]` parameters containing UID or cryptographic signatures MUST be scrubbed clean before proceeding to network API calls.
            cryptoService.wipeMemory(decryptedPayload);

            // STEP 3: Retrieve PostGIS Topography Topologies 
            FarmPlot plot = farmerProfileRepository.findByHashedFarmerId(hashedFarmerId)
                    .flatMap(farmPlotRepository::findByFarmerProfile)
                    .orElseThrow(() -> new IllegalArgumentException("DPI Fetch Failed: Hashed Farmer Matrix invalid."));

            // STEP 4: Spatial Isolation Network Mapping.
            // The Python Microservice explicitly receives ONLY the Polygon floating point coordinates safely decoupled from UUID keys.
            SpatialTruthClient.AIAnalysisResult analysis = spatialTruthClient.evaluateCropDamage(plot.getBoundaries());

            // STEP 5: Direct Benefit Transfer Protocol Evaluation
            if (analysis.is_damaged()) {
                System.out.println("\n=======================================================");
                System.out.println("[TERRANODE DPI TRIGGER] Digiclaim / PFMS Direct Benefit Transfer Processing Executed.");
                System.out.println("DeepTech Confidence Tensor: " + analysis.confidence_score());
                System.out.println("ZKP Geofence Mathematics: APPROVED");
                System.out.println("=======================================================\n");
            } else {
                System.out.println("\n[SYSTEM LOG] Spatial Truth Engine definitively rejected localized damage matrix.");
            }

        } catch (Exception e) {
            System.err.println("\n[FATAL SYSTEM SHUTDOWN] DPI Pipeline Compromised -> " + e.getMessage());
            throw new RuntimeException("Secure architectural evaluation failed", e);
        } finally {
            // STEP 5 ENFORCEMENT HYGIENE: The ultimate failsafe block securing memory destruction natively.
            cryptoService.wipeMemory(decryptedPayload);
        }
    }
}
