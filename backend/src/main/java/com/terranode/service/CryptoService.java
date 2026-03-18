package com.terranode.service;

import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import java.nio.file.*;
import java.security.*;
import java.security.spec.*;
import java.util.Arrays;
import java.util.Base64;

/**
 * CryptoService for TerraNode.
 * Responsible for RSA-2048 key generation and decrypting AES-GCM payloads.
 *
 * PERSISTENCE: The RSA keypair is persisted to /app/keys/ on first boot and
 * reloaded on subsequent restarts. This prevents BadPaddingException caused by
 * the frontend holding a public key that no longer matches the backend private key.
 *
 * STRICT CRYPTO-HYGIENE: Memory for decrypted PII uses byte[] and is explicitly wiped.
 */
@Service
public class CryptoService {

    // Path inside the Docker volume — survives container restarts
    private static final Path KEY_DIR       = Path.of("/app/keys");
    private static final Path PRIVATE_KEY_PATH = KEY_DIR.resolve("rsa_private.key");
    private static final Path PUBLIC_KEY_PATH  = KEY_DIR.resolve("rsa_public.key");

    private KeyPair rsaKeyPair;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(KEY_DIR);

            if (Files.exists(PRIVATE_KEY_PATH) && Files.exists(PUBLIC_KEY_PATH)) {
                // ── RELOAD persisted keypair ────────────────────────────────────
                System.out.println("[CRYPTO] Loading persisted RSA keypair from /app/keys/");
                byte[] privateBytes = Files.readAllBytes(PRIVATE_KEY_PATH);
                byte[] publicBytes  = Files.readAllBytes(PUBLIC_KEY_PATH);

                KeyFactory kf = KeyFactory.getInstance("RSA");
                PrivateKey privateKey = kf.generatePrivate(new PKCS8EncodedKeySpec(privateBytes));
                PublicKey  publicKey  = kf.generatePublic(new X509EncodedKeySpec(publicBytes));

                this.rsaKeyPair = new KeyPair(publicKey, privateKey);
                System.out.println("[CRYPTO] RSA keypair loaded successfully. Fingerprint stable across restarts.");

            } else {
                // ── GENERATE and persist new keypair ────────────────────────────
                System.out.println("[CRYPTO] No persisted keypair found. Generating new RSA-2048 keypair...");
                KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
                keyGen.initialize(2048);
                this.rsaKeyPair = keyGen.generateKeyPair();

                // Write raw DER-encoded bytes (not Base64) to disk
                Files.write(PRIVATE_KEY_PATH, rsaKeyPair.getPrivate().getEncoded());
                Files.write(PUBLIC_KEY_PATH,  rsaKeyPair.getPublic().getEncoded());
                System.out.println("[CRYPTO] RSA-2048 keypair generated and persisted to /app/keys/");
            }

        } catch (Exception e) {
            throw new RuntimeException("RSA KeyPair initialization failed", e);
        }
    }

    public String getPublicKeyBase64() {
        if (this.rsaKeyPair == null) {
            throw new IllegalStateException("RSA KeyPair not initialized");
        }
        return Base64.getEncoder().encodeToString(this.rsaKeyPair.getPublic().getEncoded());
    }

    /**
     * Detects if the encapsulated AES key is the frontend's offline mock placeholder (all-zero bytes).
     * When the frontend cannot reach the backend for the RSA public key, it sends 256 zero bytes.
     */
    private boolean isMockKey(byte[] encapsulatedAesKey) {
        if (encapsulatedAesKey == null || encapsulatedAesKey.length == 0) return true;
        for (byte b : encapsulatedAesKey) {
            if (b != 0) return false;
        }
        return true;
    }

    /**
     * Decrypts the AES-GCM payload using the encapsulated AES key and the persisted RSA Private Key.
     *
     * Returns null in two cases:
     *   1. The frontend sent the all-zero mock key (was offline during RSA key fetch)
     *   2. ANY decryption failure — falls back gracefully to mock demo pipeline
     *
     * NEVER throws for a BadPaddingException in demo mode. The orchestrator handles null → mock path.
     */
    public byte[] decryptPayload(byte[] encryptedPayloadWithTag, byte[] iv, byte[] encapsulatedAesKey) {
        // MOCK MODE: all-zero key = frontend was offline
        if (isMockKey(encapsulatedAesKey)) {
            System.out.println("\n[WARN] All-zero mock AES key detected. Engaging mock pipeline.\n");
            return null;
        }

        byte[] aesKeyRaw = null;
        try {
            // 1. Decrypt encapsulated AES Key using RSA-OAEP (SHA-256)
            Cipher rsaCipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
            rsaCipher.init(Cipher.DECRYPT_MODE, this.rsaKeyPair.getPrivate());
            aesKeyRaw = rsaCipher.doFinal(encapsulatedAesKey);

            // 2. Decrypt Payload using AES-GCM (auth tag is appended by WebCrypto)
            Cipher aesCipher = Cipher.getInstance("AES/GCM/NoPadding");
            SecretKeySpec secretKeySpec = new SecretKeySpec(aesKeyRaw, "AES");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
            aesCipher.init(Cipher.DECRYPT_MODE, secretKeySpec, gcmSpec);

            return aesCipher.doFinal(encryptedPayloadWithTag);

        } catch (javax.crypto.BadPaddingException e) {
            // Key mismatch: this should no longer happen with persisted keys,
            // but we degrade gracefully to mock mode rather than crashing.
            System.err.println("[CRYPTO WARN] BadPaddingException caught — RSA key mismatch. " +
                               "This is unexpected with persisted keys. Falling back to mock pipeline.");
            return null;

        } catch (Exception e) {
            System.err.println("[CRYPTO ERROR] Decryption failed: " + e.getMessage());
            return null; // Degrade gracefully — never crash the demo pipeline

        } finally {
            // CRYPTO HYGIENE: Zero the raw AES key bytes immediately
            wipeMemory(aesKeyRaw);
        }
    }

    /**
     * Explicitly overwrites sensitive byte arrays in memory with zeros.
     */
    public void wipeMemory(byte[] sensitiveData) {
        if (sensitiveData != null) {
            Arrays.fill(sensitiveData, (byte) 0);
        }
    }
}
