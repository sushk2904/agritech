package com.terranode.client;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Polygon;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * RestClient explicitly managing the transmission of raw geometries 
 * to the Python Spatial Truth Microservice without exposing local DPI metadata.
 */
@Component
public class SpatialTruthClient {

    private final RestTemplate restTemplate = new RestTemplate();

    // Mapping strictly to the Pydantic 'DamageEvaluationResponse' model
    public record AIAnalysisResult(boolean is_damaged, double confidence_score, double kappa_coefficient, Map<String, Double> metrics) {}

    // Mapping specifically to the 'GeoJSONPolygon' Pydantic model
    public record GeoJsonPolygon(String type, List<List<double[]>> coordinates) {}

    /**
     * Translates a protected JTS Topology Polygon logically to GeoJSON standard for AI Evaluation.
     */
    public AIAnalysisResult evaluateCropDamage(Polygon jtsPolygon) {
        Coordinate[] coords = jtsPolygon.getCoordinates();
        List<double[]> points = new ArrayList<>();
        
        for (Coordinate coord : coords) {
            points.add(new double[]{coord.x, coord.y});
        }
        
        List<List<double[]>> coordinates = new ArrayList<>();
        coordinates.add(points);

        GeoJsonPolygon payload = new GeoJsonPolygon("Polygon", coordinates);

        // Docker inter-container networking: use service name, NOT localhost
        // 'localhost' inside the backend container resolves to itself, not the Python service
        String microserviceUrl = "http://microservice:8000/api/v1/analyze-polygon";
        
        return restTemplate.postForObject(microserviceUrl, payload, AIAnalysisResult.class);
    }
}
