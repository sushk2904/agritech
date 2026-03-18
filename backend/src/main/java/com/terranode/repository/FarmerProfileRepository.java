package com.terranode.repository;

import com.terranode.entity.FarmerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FarmerProfileRepository extends JpaRepository<FarmerProfile, Long> {
    Optional<FarmerProfile> findByHashedFarmerId(String hashedFarmerId);
}
