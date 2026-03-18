package com.terranode;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.boot.autoconfigure.domain.EntityScan;

/**
 * TerraNode Backend Execution Kernel
 * Main entry point for the DPI Gateway orchestrating internal ZK Proofs and Python Machine Learning components.
 */
@SpringBootApplication
@EntityScan(basePackages = "com.terranode.entity")
@EnableJpaRepositories(basePackages = "com.terranode.repository")
public class BackendApplication {
    public static void main(String[] args) {
        System.out.println("\n[BOOT] Initializing TerraNode Hardware Sandbox Protocol...");
        SpringApplication.run(BackendApplication.class, args);
        System.out.println("[ONLINE] TerraNode DPI Orchestrator listening over internal zero-knowledge port structures...\n");
    }
}
