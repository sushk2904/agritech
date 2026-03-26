package com.terranode.controller;

import com.terranode.repository.FarmPlotRepository;
import com.terranode.repository.FarmerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.locationtech.jts.geom.Coordinate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/agristack")
@CrossOrigin(origins = "http://localhost:3000")
public class AgriStackController {

    private final FarmerRepository farmerRepository;
    private final FarmPlotRepository farmPlotRepository;

    public AgriStackController(FarmerRepository farmerRepository, FarmPlotRepository farmPlotRepository) {
        this.farmerRepository = farmerRepository;
        this.farmPlotRepository = farmPlotRepository;
    }

    // Structuring standard GeoJSON format for the Next.js frontend to plot on maplibre-gl
    public record GeoJsonPolygon(String type, List<List<double[]>> coordinates) {}

    @GetMapping("/farmer/{farmerId}/plot")
    public ResponseEntity<GeoJsonPolygon> getFarmerPlot(@PathVariable String farmerId) {
        if (farmerId == null) return ResponseEntity.badRequest().build();
        return farmerRepository.findById(farmerId)
                .flatMap(farmPlotRepository::findByFarmer)
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
