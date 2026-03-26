package com.terranode.repository;

import com.terranode.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, String> {
    List<Claim> findByFarmerIdOrderByCreatedAtDesc(String farmerId);
}
