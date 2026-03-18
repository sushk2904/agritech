package com.terranode.service;

import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Arrays;

/**
 * CryptoService for TerraNode.
 * Responsible for RSA-2048 key generation and decrypting AES-GCM payloads.
 * STRICT CRYPTO-HYGIENE: Memory for decrypted PII must use byte[] and be explicitly wiped.
 */
@Service
public class CryptoService {

    private KeyPair rsaKeyPair;

    @PostConstruct
    public void init() {
        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
            keyGen.initialize(2048);
            this.rsaKeyPair = keyGen.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("RSA algorithm not supported", e);
        }
    }

    public String getPublicKeyBase64() {
        if (this.rsaKeyPair == null) {
            throw new IllegalStateException("RSA KeyPair not initialized");
        }
        return Base64.getEncoder().encodeToString(this.rsaKeyPair.getPublic().getEncoded());
    }

    /**
     * Decrypts the AES-GCM payload using the encapsulated AES key and our Backend RSA Private Key.
     */
    public byte[] decryptPayload(byte[] encryptedPayloadWithTag, byte[] iv, byte[] encapsulatedAesKey) {
        byte[] aesKeyRaw = null;
        try {
            // 1. Decrypt encapsulated AES Key using RSA
            Cipher rsaCipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
            rsaCipher.init(Cipher.DECRYPT_MODE, this.rsaKeyPair.getPrivate());
            aesKeyRaw = rsaCipher.doFinal(encapsulatedAesKey);

            // 2. Decrypt Payload using AES-GCM
            Cipher aesCipher = Cipher.getInstance("AES/GCM/NoPadding");
            SecretKeySpec secretKeySpec = new SecretKeySpec(aesKeyRaw, "AES");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
            aesCipher.init(Cipher.DECRYPT_MODE, secretKeySpec, gcmSpec);

            return aesCipher.doFinal(encryptedPayloadWithTag);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        } finally {
            // Crypto Hygiene Rule: Explicitly zero out the AES key in memory
            wipeMemory(aesKeyRaw);
        }
    }

    /**
     * Utility method to explicitly overwrite sensitive byte arrays in memory with zeros.
     */
    public void wipeMemory(byte[] sensitiveData) {
        if (sensitiveData != null) {
            Arrays.fill(sensitiveData, (byte) 0);
        }
    }
}
