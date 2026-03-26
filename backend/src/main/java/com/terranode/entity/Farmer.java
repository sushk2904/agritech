package com.terranode.entity;

import com.terranode.security.PiiAttributeConverter;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "farmers")
public class Farmer {

    @Id
    private String id = UUID.randomUUID().toString();

    @Column(name = "full_name")
    private String fullName;

    // Sensitive field, encrypted in Postgres via AES
    @Convert(converter = PiiAttributeConverter.class)
    @Column(name = "email", unique = true, nullable = false)
    private String email;

    // Ephemeral OTP stored briefly
    @Column(name = "current_otp")
    private String currentOtp;

    @Column(name = "otp_expiry")
    private LocalDateTime otpExpiry;

    // EVM Web3 Wallet auto-generated for the user upon sign-up
    @Column(name = "wallet_address")
    private String walletAddress;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getCurrentOtp() { return currentOtp; }
    public void setCurrentOtp(String currentOtp) { this.currentOtp = currentOtp; }

    public LocalDateTime getOtpExpiry() { return otpExpiry; }
    public void setOtpExpiry(LocalDateTime otpExpiry) { this.otpExpiry = otpExpiry; }

    public String getWalletAddress() { return walletAddress; }
    public void setWalletAddress(String walletAddress) { this.walletAddress = walletAddress; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
