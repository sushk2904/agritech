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
    @JoinColumn(name = "farmer_id", nullable = false)
    private Farmer farmer;

    // Uses JTS Topology Suite for PostGIS geometry configuration
    @Column(columnDefinition = "geometry(Polygon,4326)")
    private Polygon boundaries;

    public FarmPlot() {}

    public FarmPlot(Farmer farmer, Polygon boundaries) {
        this.farmer = farmer;
        this.boundaries = boundaries;
    }

    public Long getId() { return id; }
    public Farmer getFarmer() { return farmer; }
    public void setFarmer(Farmer farmer) { this.farmer = farmer; }
    public Polygon getBoundaries() { return boundaries; }
    public void setBoundaries(Polygon boundaries) { this.boundaries = boundaries; }
}
