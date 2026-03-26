package com.terranode.repository;

import com.terranode.entity.FarmPlot;
import com.terranode.entity.Farmer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FarmPlotRepository extends JpaRepository<FarmPlot, Long> {
    Optional<FarmPlot> findByFarmer(Farmer farmer);
}
