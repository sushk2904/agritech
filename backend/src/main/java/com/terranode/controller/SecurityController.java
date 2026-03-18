package com.terranode.controller;

import com.terranode.service.CryptoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@RequestMapping("/api/v1/crypto")
@CrossOrigin(origins = "http://localhost:3000")
public class SecurityController {

    private final CryptoService cryptoService;

    public SecurityController(CryptoService cryptoService) {
        this.cryptoService = cryptoService;
    }

    // Explicitly typed DTO instead of generic Map<String, Object>
    public record PublicKeyResponse(String publicKey) {}

    @GetMapping("/public-key")
    public PublicKeyResponse getPublicKey() {
        // Returns the RSA Public Key Base64 encoded so Next.js can fetch it for encapsulation
        return new PublicKeyResponse(cryptoService.getPublicKeyBase64());
    }
}
