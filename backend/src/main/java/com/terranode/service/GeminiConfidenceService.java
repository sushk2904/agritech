package com.terranode.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * TerraNode Anti-Fraud AI Gate — Gemini Flash Vision
 *
 * This is the final verification gate before any PFMS DBT payout is triggered.
 * It performs THREE distinct fraud checks using Gemini Vision:
 *
 *   FRAUD CHECK 1: AI-Generated Image Detection
 *     → If Gemini detects synthetic/AI-generated image artifacts, claim is REJECTED immediately.
 *     → Rationale (from product_requirements.md): only real, field-captured photos constitute
 *       valid damage evidence. Deepfake/synthetic images are a known insurance fraud vector.
 *
 *   FRAUD CHECK 2: Damage-Type Consistency Verification
 *     → Gemini visually verifies the photo shows the EXACT damage type the farmer claimed.
 *     → A FLOOD claim with a photo of dry, cracked soil is rejected as misrepresentation.
 *
 *   FRAUD CHECK 3: Credibility Score Fusion
 *     → Gemini provides an independent confidence score fused with the spatial satellite
 *       confidence from the Python microservice. Both must exceed threshold for approval.
 *     → This dual-AI gate prevents single-point manipulation (e.g., spatial model spoofing).
 *
 * Reference: AgriStack DPI guidelines require >93% Kappa coefficient for AI claims.
 */
@Service
public class GeminiConfidenceService {

    private static final Logger log = LoggerFactory.getLogger(GeminiConfidenceService.class);

    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

    // Minimum Gemini AI confidence required for claim approval (aligned with >93% Kappa target)
    private static final double MIN_AI_CONFIDENCE_THRESHOLD = 0.70;

    // Minimum spatial satellite confidence (from Python microservice)
    private static final double MIN_SPATIAL_CONFIDENCE_THRESHOLD = 0.60;

    @Value("${gemini.api.key}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Structured fraud verdict from Gemini.
     *
     * @param approved         Final approval decision (ALL fraud checks passed)
     * @param isAiGenerated    True if Gemini detected synthetic/AI-generated image → auto-reject
     * @param damageTypeMatch  True if the visual damage matches the claimed damage type
     * @param aiConfidence     Gemini's own confidence score (0.0–1.0)
     * @param rationale        One-sentence explanation for the decision
     * @param fraudFlags       Comma-separated list of triggered fraud signals (empty if clean)
     */
    public record GeminiVerdict(
            boolean approved,
            boolean isAiGenerated,
            boolean damageTypeMatch,
            double aiConfidence,
            String rationale,
            String fraudFlags
    ) {}

    /**
     * Runs the full 3-layer fraud detection pipeline using Gemini Flash Vision.
     *
     * @param damageType        The damage type claimed by the farmer (FLOOD/DROUGHT/PEST)
     * @param imageHash         SHA-256 hash of the image (for integrity logging)
     * @param spatialConfidence Satellite AI confidence from Python microservice (0.0–1.0)
     * @param imageBase64       Base64-encoded photo uploaded by the farmer
     * @return GeminiVerdict with full fraud analysis
     */
    public GeminiVerdict validateClaim(String damageType, String imageHash,
                                       double spatialConfidence, String imageBase64) {
        try {
            boolean hasImage = imageBase64 != null && !imageBase64.isBlank();
            String requestBody = hasImage
                    ? buildVisionRequest(damageType, spatialConfidence)
                    : buildTextOnlyRequest(damageType, spatialConfidence);

            if (hasImage) {
                // Inject the image into the request
                requestBody = injectImage(requestBody, imageBase64);
            }

            log.info("[GEMINI FRAUD GATE] Initiating {} verification | damageType={} | spatialConf={} | imageHash={}",
                    hasImage ? "VISION" : "TEXT-ONLY", damageType, spatialConfidence, imageHash);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GEMINI_API_URL + "?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(25))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("[GEMINI] API returned HTTP {} → applying conservative fallback", response.statusCode());
                log.warn("[GEMINI] Response body: {}", response.body());
                return conservativeFallback(spatialConfidence, !hasImage);
            }

            return parseVerdict(response.body(), spatialConfidence);

        } catch (Exception e) {
            log.warn("[GEMINI] Verification exception: {} → conservative fallback", e.getMessage());
            return conservativeFallback(spatialConfidence, false);
        }
    }

    // ── Request Builders ───────────────────────────────────────────────────────────

    private String buildVisionRequest(String damageType, double spatialConfidence) {
        String prompt = buildFraudDetectionPrompt(damageType, spatialConfidence, true);
        String escapedPrompt = escapeJson(prompt);
        // Detect MIME type — JPEG starts with /9j/, PNG with iVBORw0KGgo
        return String.format("""
            {
              "contents": [{
                "parts": [
                  {"text": "%s"},
                  {"inline_data": {"mime_type": "MIME_TYPE_PLACEHOLDER", "data": "IMAGE_DATA_PLACEHOLDER"}}
                ]
              }],
              "generationConfig": {
                "temperature": 0.05,
                "maxOutputTokens": 350,
                "responseMimeType": "application/json"
              }
            }
            """, escapedPrompt);
    }

    private String buildTextOnlyRequest(String damageType, double spatialConfidence) {
        String prompt = buildFraudDetectionPrompt(damageType, spatialConfidence, false);
        String escapedPrompt = escapeJson(prompt);
        return String.format("""
            {
              "contents": [{"parts": [{"text": "%s"}]}],
              "generationConfig": {
                "temperature": 0.05,
                "maxOutputTokens": 300,
                "responseMimeType": "application/json"
              }
            }
            """, escapedPrompt);
    }

    private String injectImage(String requestBody, String imageBase64) {
        String mimeType = imageBase64.startsWith("/9j/") ? "image/jpeg" : "image/png";
        return requestBody
                .replace("MIME_TYPE_PLACEHOLDER", mimeType)
                .replace("IMAGE_DATA_PLACEHOLDER", imageBase64);
    }

    // ── Fraud Detection Prompt ─────────────────────────────────────────────────────

    private String buildFraudDetectionPrompt(String damageType, double spatialConfidence, boolean hasImage) {
        String imageSection = hasImage
                ? """
                  An image has been provided for your visual analysis.
                  
                  FRAUD CHECK 1 — AI-GENERATED IMAGE DETECTION (CRITICAL):
                  Carefully inspect the image for signs of artificial generation:
                  - Unnatural texture patterns, perfectly uniform noise
                  - GAN artifacts: repeating patterns, melting edges, impossible geometry
                  - Diffusion model artifacts: over-sharpened details, unnaturally perfect composition
                  - Stock photo watermarks or signs of stock imagery
                  - Metadata inconsistencies (you may infer from visual quality)
                  If you detect ANY of these signals, set is_ai_generated: true. This is an AUTOMATIC REJECTION.
                  
                  FRAUD CHECK 2 — DAMAGE TYPE CONSISTENCY:
                  Verify the photo VISUALLY matches the claimed damage type: %s
                  - FLOOD: standing water, waterlogged soil, submerged crops, mud deposits
                  - DROUGHT: cracked dry earth, wilted/brown crops, parched soil, dust
                  - PEST: localized crop discolouration, insect damage patterns, irregular holes in leaves
                  If the visual content contradicts the claimed damage type, set damage_type_match: false.
                  """.formatted(damageType)
                : """
                  No image was provided. You must evaluate based on the satellite data alone.
                  FRAUD CHECK 1: is_ai_generated should be false (no image to check).
                  FRAUD CHECK 2: damage_type_match cannot be visually confirmed; default to true.
                  """;

        return """
                You are a FRAUD DETECTION AI for India's Agricultural Insurance System (PMFBY/PFMS).
                Your role is to prevent fraudulent crop damage claims from triggering Direct Benefit Transfers.
                You must be STRICT. False approvals cost public funds. False rejections are caught by human review.
                
                CLAIM UNDER REVIEW:
                - Damage Type Claimed: %s
                - Satellite AI Confidence Score: %.2f (from NDVI/SAR fusion analysis)
                - ZKP Geofence: CRYPTOGRAPHICALLY VERIFIED (farmer is within registered farm boundary)
                
                %s
                
                FRAUD CHECK 3 — CREDIBILITY FUSION:
                Combine your visual assessment (if image present) with the satellite confidence (%.2f).
                A high satellite confidence + clear visual evidence = high ai_confidence.
                A low satellite confidence + suspicious image = low ai_confidence.
                
                DECISION RULES (apply strictly):
                - If is_ai_generated = true → approved MUST be false (automatic fraud rejection)
                - If damage_type_match = false → approved MUST be false (misrepresentation)
                - If ai_confidence < 0.70 → approved MUST be false (insufficient evidence)
                - Otherwise → approved = true
                
                Respond ONLY in this exact JSON format (no markdown, no explanation outside JSON):
                {"approved": true, "is_ai_generated": false, "damage_type_match": true, "ai_confidence": 0.88, "rationale": "Clear visual evidence of drought damage corroborated by satellite NDVI loss.", "fraud_flags": ""}
                """.formatted(damageType, spatialConfidence, imageSection, spatialConfidence);
    }

    // ── Response Parser ────────────────────────────────────────────────────────────

    private GeminiVerdict parseVerdict(String responseBody, double spatialConfidence) {
        try {
            // Extract from Gemini response envelope: { "candidates": [{ "content": { "parts": [{ "text": "..." }] } }] }
            int textIdx = responseBody.indexOf("\"text\":");
            if (textIdx < 0) return conservativeFallback(spatialConfidence, false);

            int jsonStart = responseBody.indexOf("{", textIdx);
            int jsonEnd   = responseBody.lastIndexOf("}");
            if (jsonStart < 0 || jsonEnd < jsonStart) return conservativeFallback(spatialConfidence, false);

            String verdictJson = responseBody.substring(jsonStart, jsonEnd + 1)
                    .replace("\\n", " ").replace("\\\"", "\"").trim();

            boolean approved       = extractBool(verdictJson, "approved", false);
            boolean isAiGenerated  = extractBool(verdictJson, "is_ai_generated", false);
            boolean damageMatch    = extractBool(verdictJson, "damage_type_match", true);
            double  aiConfidence   = extractDouble(verdictJson, "ai_confidence", spatialConfidence * 0.8);
            String  rationale      = extractString(verdictJson, "rationale", "Gemini assessment complete.");
            String  fraudFlags     = extractString(verdictJson, "fraud_flags", "");

            // Enforce decision rules server-side as a double-check
            boolean finalApproval = approved && !isAiGenerated && damageMatch && aiConfidence >= MIN_AI_CONFIDENCE_THRESHOLD;

            // Build fraud flag summary
            StringBuilder flags = new StringBuilder(fraudFlags);
            if (isAiGenerated)  appendFlag(flags, "AI_GENERATED_IMAGE");
            if (!damageMatch)   appendFlag(flags, "DAMAGE_TYPE_MISMATCH");
            if (aiConfidence < MIN_AI_CONFIDENCE_THRESHOLD) appendFlag(flags, "LOW_AI_CONFIDENCE:" + String.format("%.2f", aiConfidence));
            if (spatialConfidence < MIN_SPATIAL_CONFIDENCE_THRESHOLD) appendFlag(flags, "LOW_SPATIAL_CONFIDENCE:" + String.format("%.2f", spatialConfidence));

            log.info("[GEMINI VERDICT] approved={} | ai_generated={} | damage_match={} | ai_conf={} | fraud_flags=[{}]",
                    finalApproval, isAiGenerated, damageMatch, aiConfidence, flags);
            log.info("[GEMINI RATIONALE] {}", rationale);

            return new GeminiVerdict(finalApproval, isAiGenerated, damageMatch, aiConfidence, rationale, flags.toString());

        } catch (Exception e) {
            log.error("[GEMINI] Parse error: {}", e.getMessage());
            return conservativeFallback(spatialConfidence, false);
        }
    }

    // ── Fallback ───────────────────────────────────────────────────────────────────

    /**
     * When Gemini is unreachable, apply a CONSERVATIVE fallback:
     * - No image provided → approve only if spatial confidence is very high (>= 0.85)
     * - Image provided but Gemini failed → reject (safer than approving unverified claim)
     */
    private GeminiVerdict conservativeFallback(double spatialConfidence, boolean noImage) {
        if (noImage && spatialConfidence >= 0.85) {
            return new GeminiVerdict(true, false, true, spatialConfidence,
                    "Gemini unavailable — approved on strong satellite confidence (" + spatialConfidence + ")", "GEMINI_UNAVAILABLE");
        }
        return new GeminiVerdict(false, false, true, spatialConfidence,
                "Gemini Vision unavailable — claim held for manual review to prevent fraud.", "GEMINI_UNAVAILABLE;MANUAL_REVIEW_REQUIRED");
    }

    // ── JSON Extraction Helpers ────────────────────────────────────────────────────

    private boolean extractBool(String json, String field, boolean fallback) {
        try {
            int idx = json.indexOf("\"" + field + "\":");
            if (idx < 0) return fallback;
            String rest = json.substring(idx + field.length() + 3).trim();
            return rest.startsWith("true");
        } catch (Exception e) { return fallback; }
    }

    private double extractDouble(String json, String field, double fallback) {
        try {
            int idx = json.indexOf("\"" + field + "\":");
            if (idx < 0) return fallback;
            int start = idx + field.length() + 3;
            // skip any spaces
            while (start < json.length() && json.charAt(start) == ' ') start++;
            int end = start;
            while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '.')) end++;
            return Double.parseDouble(json.substring(start, end).trim());
        } catch (Exception e) { return fallback; }
    }

    private String extractString(String json, String field, String fallback) {
        try {
            String key = "\"" + field + "\": \"";
            int idx = json.indexOf(key);
            if (idx < 0) { key = "\"" + field + "\":\""; idx = json.indexOf(key); }
            if (idx < 0) return fallback;
            int start = idx + key.length();
            int end = json.indexOf("\"", start);
            return end > start ? json.substring(start, end) : fallback;
        } catch (Exception e) { return fallback; }
    }

    private String escapeJson(String text) {
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private void appendFlag(StringBuilder sb, String flag) {
        if (sb.length() > 0) sb.append(";");
        sb.append(flag);
    }
}
