# Product Requirements (TerraNode - Enterprise DPI Platform)

## Core Value
A federated, ZK-proof driven agricultural insurance platform integrating deep learning, spatial AI, and India's Digital Public Infrastructure (DPI). It enables illiterate or digitally native farmers to claim insurance via multilingual voice, without ever exposing their exact location or banking details to the central server.

## Must-Have Features (P0 - Critical Path)

1. **The Multilingual Voice Gateway (Bhashini Integration):**
   - Implement real-time streaming ASR, NLU, and TTS via Bhashini API. 
   - Users must be able to file claims or check status in regional languages via a voice-first conversational UI (using accessible UI overlays).

2. **DPI Ecosystem Sync (AgriStack & PFMS):**
   - Connect to AgriStack Unified Farmer Service Interface (UFSI) Sandbox.
   - Fetch Geo-Referenced Village Maps and Crop Sown data using Aadhaar-linked Farmer IDs.
   - Implement DEPA-compliant Consent Manager for data sharing.
   - Format payout triggers to be directly compatible with PMFBY Digiclaim and PFMS (Direct Benefit Transfer).

3. **Zero-Knowledge Geospatial Privacy (zk-SNARKs):**
   - Replace manual polygon drawing with verifiable location proofs.
   - Client generates a ZK proof (using `circom`/`snarkjs`) proving their farm's coordinates fall inside a mathematically defined "Zone of Truth" (disaster zone), without revealing the exact latitude/longitude.

4. **DeepTech Sensor Fusion Engine:**
   - Python microservice must ingest and fuse optical data (Sentinel-2/HLS) and Synthetic Aperture Radar (SAR from Sentinel-1) to bypass cloud cover.
   - Run a 1D-CNN/RNN model to calculate NDWI, NDVI, PSRI, and RUSLE indices for binary damage classification (>60% crop loss triggers geofence).

5. **Hyper-Local Micro-Accountability:**
   - Automated system that triggers localized SMS/WhatsApp updates to farmers via Bhashini when their polygon intersects an AI-verified damage geofence.

## Success Metrics
1. **Cryptographic Assurance:** Snark verification succeeds on-chain/backend; DB shows purely encrypted AES/RSA ciphertexts.
2. **AI Accuracy:** Sensor fusion model successfully classifies mock damage sets with >93% Kappa coefficient.
3. **Inclusive UX:** Voice-to-action latency for a rural farmer is under 2 seconds. The UI must be fully accessible (a11y compliant) with high contrast for outdoor visibility.