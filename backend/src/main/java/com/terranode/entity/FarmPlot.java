package com.terranode.entity;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Polygon;

@Entity
@Table(name = "farm_plot")
public class FarmPlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_profile_id", nullable = false)
    private FarmerProfile farmerProfile;

    // Uses JTS Topology Suite for PostGIS geometry configuration
    @Column(columnDefinition = "geometry(Polygon,4326)")
    private Polygon boundaries;

    public FarmPlot() {}

    public FarmPlot(FarmerProfile farmerProfile, Polygon boundaries) {
        this.farmerProfile = farmerProfile;
        this.boundaries = boundaries;
    }

    public Long getId() { return id; }
    public FarmerProfile getFarmerProfile() { return farmerProfile; }
    public void setFarmerProfile(FarmerProfile farmerProfile) { this.farmerProfile = farmerProfile; }
    public Polygon getBoundaries() { return boundaries; }
    public void setBoundaries(Polygon boundaries) { this.boundaries = boundaries; }
}
