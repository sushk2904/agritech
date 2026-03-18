package com.terranode.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "farmer_profile")
public class FarmerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Cryptographic constraint: Never plaintext Aadhaar
    @Column(name = "hashed_farmer_id", unique = true, nullable = false)
    private String hashedFarmerId;

    public FarmerProfile() {}

    public FarmerProfile(String hashedFarmerId) {
        this.hashedFarmerId = hashedFarmerId;
    }

    public Long getId() { return id; }
    public String getHashedFarmerId() { return hashedFarmerId; }
    public void setHashedFarmerId(String hashedFarmerId) { this.hashedFarmerId = hashedFarmerId; }
}
