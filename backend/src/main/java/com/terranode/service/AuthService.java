package com.terranode.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.terranode.entity.Farmer;
import com.terranode.repository.FarmerRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    
    private final FarmerRepository farmerRepository;
    private final JavaMailSender mailSender;

    // Minimum HMAC key of 256 bits required
    @Value("${jwt.secret:1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7A8B9C0D1E2F}")
    private String jwtSecret;

    // Fast exp token (30 days for hackathon DPI)
    private static final long EXPIRATION_TIME = 864_000_000; 

    public AuthService(FarmerRepository farmerRepository, JavaMailSender mailSender) {
        this.farmerRepository = farmerRepository;
        this.mailSender = mailSender;
    }

    public String requestOtp(String email) {
        final String formattedEmail = email.trim().toLowerCase();

        return farmerRepository.findByEmail(formattedEmail)
            .map(this::generateAndSaveOtp)
            .orElseGet(() -> {
                Farmer newFarmer = new Farmer();
                newFarmer.setEmail(formattedEmail);
                newFarmer.setWalletAddress("0xGen" + UUID.randomUUID().toString().substring(0, 10));
                farmerRepository.save(newFarmer);
                return generateAndSaveOtp(newFarmer);
            });
    }

    private String generateAndSaveOtp(Farmer farmer) {
        String otp = String.format("%04d", ThreadLocalRandom.current().nextInt(1000, 10000));
        farmer.setCurrentOtp(otp);
        farmer.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        farmerRepository.save(farmer);

        sendRealEmail(farmer.getEmail(), otp);
        return "OTP sent securely to your email";
    }

    private void sendRealEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("TerraNode Verification Code");
            message.setText("Your TerraNode AgriStack verification code is: " + otp + "\n\nIt expires in 5 minutes.\n\nDo not share this code with anyone.");
            
            mailSender.send(message);
            log.info("[OTP GATEWAY] Real verification email seamlessly dispatched to {}.", toEmail);
        } catch (Exception e) {
            log.error("[OTP GATEWAY] Exception while sending email OTP: {}", e.getMessage());
            throw new RuntimeException("Email delivery failed: Check your SMTP credentials in the .env file.");
        }
    }

    public String verifyOtpAndLogin(String email, String otp) {
        final String formattedEmail = email.trim().toLowerCase();
        
        Farmer farmer = farmerRepository.findByEmail(formattedEmail)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (farmer.getCurrentOtp() == null || !farmer.getCurrentOtp().equals(otp)) {
            log.warn("[AUTH] Invalid OTP attempt structure caught.");
            throw new RuntimeException("Invalid OTP provided.");
        }

        if (farmer.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired.");
        }

        farmer.setCurrentOtp(null);
        farmer.setOtpExpiry(null);
        farmerRepository.save(farmer);

        return generateSecureToken(farmer.getId(), farmer.getWalletAddress());
    }

    private String generateSecureToken(String farmerId, String wallet) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        return Jwts.builder()
                .subject(farmerId)
                .claim("wallet", wallet)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key)
                .compact();
    }
}
