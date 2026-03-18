# TerraNode ZKP Cryptographic Key Infrastructure

## ⚠️ CRITICAL WARNING: MOCK ENTRUSTED ⚠️

The cryptographic files currently residing in this directory:
- `geofence_js/geofence.wasm`
- `geofence_final.zkey`
- `verification_key.json`

Are **MOCK PLACEHOLDERS**. They exist strictly to unblock parallel Java/React logic engineering where the exact elliptic pairing is temporarily simulated. 

**DO NOT DEPLOY THIS TO PRODUCTION.**

### Resolution Required:
Before compiling the final hackathon binary, the Lead Developer MUST execute the Trusted Setup pipeline on a host natively containing the Rust `circom` toolchain.

1. Ensure `circom` is exposed in your system PATH.
2. Navigate to this directory using a native terminal.
3. Completely overwrite the mock files by running:
   ```bash
   node setup.js
   ```

Doing so will run the mathematical Powers of Tau ceremonials and generate the legally binding Proving and Verification keys.
