package com.terranode.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.KeyPair;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

public class CryptoServiceTest {

    private CryptoService cryptoService;

    @BeforeEach
    void setUp() {
        cryptoService = new CryptoService();
        cryptoService.init(); // triggers @PostConstruct
    }

    @Test
    void testHybridEncryptionDecryptionAndWiping() throws Exception {
        // 1. Mock the Frontend Encryption sequence
        KeyGenerator keyGen = KeyGenerator.getInstance("AES");
        keyGen.init(256);
        SecretKey aesKey = keyGen.generateKey();

        String sensitiveData = "FARMER_AADHAAR:1234-5678-9012";
        byte[] payloadData = sensitiveData.getBytes(StandardCharsets.UTF_8);

        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        Cipher aesCipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
        aesCipher.init(Cipher.ENCRYPT_MODE, aesKey, gcmSpec);
        
        byte[] encryptedPayload = aesCipher.doFinal(payloadData);

        java.lang.reflect.Field field = CryptoService.class.getDeclaredField("rsaKeyPair");
        field.setAccessible(true);
        KeyPair serverKeys = (KeyPair) field.get(cryptoService);

        Cipher rsaCipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
        rsaCipher.init(Cipher.ENCRYPT_MODE, serverKeys.getPublic());
        byte[] encapsulatedAesKey = rsaCipher.doFinal(aesKey.getEncoded());

        // 2. Perform the Decryption via the Target Method
        byte[] decryptedBytes = cryptoService.decryptPayload(encryptedPayload, iv, encapsulatedAesKey);

        assertArrayEquals(payloadData, decryptedBytes, "Decrypted bytes must absolutely match original payload.");
        assertEquals(sensitiveData, new String(decryptedBytes, StandardCharsets.UTF_8));

        // 3. Test Cryptographic Hygiene Rule
        cryptoService.wipeMemory(decryptedBytes);
        
        byte[] expectedZeroes = new byte[payloadData.length];
        Arrays.fill(expectedZeroes, (byte) 0);
        assertArrayEquals(expectedZeroes, decryptedBytes, "CRITICAL ALERT: Memory was not explicitly wiped after decrypting PII.");
    }
}
