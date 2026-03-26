package com.terranode.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "claims")
public class Claim {

    @Id
    private String id = UUID.randomUUID().toString();

    @Column(name = "farmer_id", nullable = false)
    private String farmerId;

    @Column(name = "damage_type")
    private String damageType;

    @Column(name = "status")
    private String status; // PENDING, APPROVED, REJECTED

    @Column(name = "blockchain_tx")
    private String blockchainTx;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "damage_reason")
    private String damageReason;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFarmerId() { return farmerId; }
    public void setFarmerId(String farmerId) { this.farmerId = farmerId; }

    public String getDamageType() { return damageType; }
    public void setDamageType(String damageType) { this.damageType = damageType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBlockchainTx() { return blockchainTx; }
    public void setBlockchainTx(String blockchainTx) { this.blockchainTx = blockchainTx; }

    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }

    public String getDamageReason() { return damageReason; }
    public void setDamageReason(String damageReason) { this.damageReason = damageReason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
