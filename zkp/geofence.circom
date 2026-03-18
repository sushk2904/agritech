pragma circom 2.1.6;

include "node_modules/circomlib/circuits/comparators.circom";

/**
 * Geofence ZK-SNARK Circuit (Phase 2 MVP)
 * Ensures that a user's coordinate falls strictly within a provided Bounding Box (public geofence)
 * without revealing the actual longitude and latitude to the verifying smart contract or backend.
 */
template Geofence(n) {
    // -----------------------------------------------------
    // Private Inputs: The farmer's actual GPS point
    // Scaled by 10^7 (e.g., 20.5937000 -> 205937000) to represent floats as integers
    // -----------------------------------------------------
    signal input userLat;
    signal input userLng;

    // -----------------------------------------------------
    // Public Inputs: The bounds of the verified crop damage box
    // -----------------------------------------------------
    signal input minLat;
    signal input maxLat;
    signal input minLng;
    signal input maxLng;

    // Output condition (Used to explicitly constrain the circuit)
    signal output isInside;

    // 1. Latitude verification: minLat <= userLat <= maxLat
    component latMinCheck = GreaterEqThan(n);
    latMinCheck.in[0] <== userLat;
    latMinCheck.in[1] <== minLat;

    component latMaxCheck = LessEqThan(n);
    latMaxCheck.in[0] <== userLat;
    latMaxCheck.in[1] <== maxLat;

    // 2. Longitude verification: minLng <= userLng <= maxLng
    component lngMinCheck = GreaterEqThan(n);
    lngMinCheck.in[0] <== userLng;
    lngMinCheck.in[1] <== minLng;

    component lngMaxCheck = LessEqThan(n);
    lngMaxCheck.in[0] <== userLng;
    lngMaxCheck.in[1] <== maxLng;

    // 3. Multiplicative Combination (Logical AND)
    // All checks must evaluate to 1 (true)
    signal latValid;
    signal lngValid;

    latValid <== latMinCheck.out * latMaxCheck.out;
    lngValid <== lngMinCheck.out * lngMaxCheck.out;

    isInside <== latValid * lngValid;

    // -----------------------------------------------------
    // Cryptographic Constraint:
    // If isInside isn't 1, the proof generation and verification explicitly FAILS.
    // -----------------------------------------------------
    isInside === 1;
}

// Initialize template setting 64-bit bounds.
// A scaled coordinate (e.g. 180.0000000 * 10^7 = 1800000000) easily fits in 64 bits securely.
// Expose the boundary constraints mathematically to the public verifier key.
component main { public [minLat, maxLat, minLng, maxLng] } = Geofence(64);
