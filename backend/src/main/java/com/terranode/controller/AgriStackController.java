package com.terranode.controller;

import com.terranode.entity.FarmPlot;
import com.terranode.repository.FarmPlotRepository;
import com.terranode.repository.FarmerProfileRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.locationtech.jts.geom.Coordinate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/agristack")
public class AgriStackController {

    private final FarmerProfileRepository farmerProfileRepository;
    private final FarmPlotRepository farmPlotRepository;

    public AgriStackController(FarmerProfileRepository farmerProfileRepository, FarmPlotRepository farmPlotRepository) {
        this.farmerProfileRepository = farmerProfileRepository;
        this.farmPlotRepository = farmPlotRepository;
    }

    // Structuring standard GeoJSON format for the Next.js frontend to plot on maplibre-gl
    public record GeoJsonPolygon(String type, List<List<double[]>> coordinates) {}

    @GetMapping("/farmer/{hashedFarmerId}/plot")
    public ResponseEntity<GeoJsonPolygon> getFarmerPlot(@PathVariable String hashedFarmerId) {
        return farmerProfileRepository.findByHashedFarmerId(hashedFarmerId)
                .flatMap(farmPlotRepository::findByFarmerProfile)
                .map(plot -> {
                    Coordinate[] coords = plot.getBoundaries().getCoordinates();
                    List<double[]> points = new ArrayList<>();
                    for (Coordinate coord : coords) {
                        // GeoJSON standard: [longitude, latitude]
                        points.add(new double[]{coord.x, coord.y});
                    }
                    List<List<double[]>> coordinates = new ArrayList<>();
                    coordinates.add(points);
                    
                    return ResponseEntity.ok(new GeoJsonPolygon("Polygon", coordinates));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
