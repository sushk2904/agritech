# TerraNode DPI - Backend Endpoint Cheat Sheet

This document maps the exact REST API endpoints running on your Spring Boot Backend (`http://localhost:8080`).

---

## ⚡ Quickstart — Use the Pre-Built API Client (Recommended)

Instead of writing raw `fetch()` calls yourself, a **ready-made TypeScript API client** has already been created at:

```
frontend/src/lib/terranode-api.ts
```

Just import the function you need and call it — token management, `Authorization` headers, and error handling are all handled internally.

### Available Functions

| Function | Endpoint | Description |
|---|---|---|
| `requestOtp(email, fullName)` | `POST /auth/request-otp` | Send OTP, auto-creates account |
| `verifyOtp(email, otp)` | `POST /auth/verify-otp` | Verify OTP, **auto-saves JWT** |
| `getProfile()` | `GET /auth/profile` | Fetch full profile for profile page |
| `updateProfile(fullName)` | `PUT /auth/profile` | Update name, **auto-saves fresh JWT** |
| `submitClaim(blob, type, proof, signals)` | `POST /claims/submit` | Full AI + ZK claim pipeline |
| `getFarmerPlot(farmerId)` | `GET /agristack/farmer/{id}/plot` | Farm geofence map data |
| `getPublicKey()` | `GET /crypto/public-key` | RSA key for client-side encryption |
| `decodeToken()` | *(local)* | Read `name`, `wallet` from JWT without an API call |
| `isLoggedIn()` | *(local)* | Returns `true` if token exists and is not expired |

### Usage Examples

```typescript
import {
  requestOtp, verifyOtp,
  getProfile, updateProfile,
  submitClaim, isLoggedIn, decodeToken
} from "@/lib/terranode-api";

// ── Login / Signup ──────────────────────────────
await requestOtp("farmer@example.com", "Aryan Sharma");
await verifyOtp("farmer@example.com", "4892"); // JWT auto-saved

// ── Read profile instantly from token (no API call) ──
const { name, wallet } = decodeToken()!;

// ── Profile Page ────────────────────────────────
const profile = await getProfile();   // { id, fullName, email, walletAddress }
await updateProfile("New Name");      // fresh JWT auto-saved to sessionStorage

// ── Protect a page ──────────────────────────────
if (!isLoggedIn()) router.push("/login");

// ── Submit a Claim ──────────────────────────────
await submitClaim(imageBlob, "DROUGHT", snarkProof, publicSignals);
```

> **Note:** The API client reads the JWT automatically from `sessionStorage` using the key `"terranode_jwt"`.  
> After `verifyOtp()` or `updateProfile()`, the fresh token is saved automatically — you don't need to do anything.

---

## Raw Endpoint Reference (for manual use)

## 1. Authentication Gateway (Email OTP)

These two endpoints merge **Login** and **Signup** into one flow. If the email doesn't exist, the backend auto-creates the Farmer and their internal Ethereum wallet address.

### A. Request OTP
Triggers the JavaMailSender to securely dispatch a 4-digit code to the user's email.
- **Endpoint:** `POST /api/v1/auth/request-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body (JSON):**
  ```json
  {
    "email": "farmer@example.com",
    "fullName": "Aryan Sharma"
  }
  ```
- **Success Response:** `200 OK`
  ```json
  {
    "message": "OTP sent securely to your email"
  }
  ```

### B. Verify OTP
Validates the code and generates your stateless JWT (JSON Web Token) containing the Farmer ID and Web3 Wallet Address.
- **Endpoint:** `POST /api/v1/auth/verify-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body (JSON):**
  ```json
  {
    "email": "farmer@example.com",
    "otp": "4892"
  }
  ```
- **Success Response:** `200 OK`
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
  ```
*(Note: You must store this `token` in `sessionStorage` or `localStorage` on your frontend and attach it to the `Authorization` header for all following requests).*

### C. Get Profile
Fetches full farmer profile (name, email, wallet). Call this when your profile page loads.
- **Endpoint:** `GET /api/v1/auth/profile`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Success Response:** `200 OK`
  ```json
  {
    "id": "uuid-here",
    "fullName": "Aryan Sharma",
    "email": "farmer@example.com",
    "walletAddress": "0xGen1a2b3c4d5e"
  }
  ```

### D. Update Profile
Updates the farmer's display name. Returns a **fresh JWT** with the new name baked in — save it to replace the old token.
- **Endpoint:** `PUT /api/v1/auth/profile`
- **Headers:**
  - `Authorization: Bearer <YOUR_JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  { "fullName": "New Display Name" }
  ```
- **Success Response:** `200 OK`
  ```json
  { "token": "eyJhbGci..." }
  ```

---

## 2. Core DPI Processing

### A. Fetch Registered Geofence
Pulls the legal farm geofence boundaries (polygon arrays) for the map rendering.
- **Endpoint:** `GET /api/v1/agristack/farmer/{hashedFarmerId}/plot`
- **Headers:** 
  - `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Response:** `200 OK` (Returns standard JSON array of Longitude/Latitude points).

### B. Submit Claim (The AI & Crypto Gate) 🚨 REQUIRED FOR MAIN PAGE 🚨
This endpoint processes the image through Gemini Vision AI (checking for 0.85+ confidence and environmental validity), verifies the ZK-SNARK WebAssembly proof, and immediately anchors it to the Ethereum Smart Contract.
- **Endpoint:** `POST /api/v1/claims/submit`
- **Headers:** 
  - `Authorization: Bearer <YOUR_JWT_TOKEN>`
  - *(Do NOT set Content-Type manually! Let the browser set `multipart/form-data` with boundaries).*
- **Request Body (FormData):**
  You must build a `FormData` object in javascript:
  ```javascript
  const formData = new FormData();
  formData.append("image", fileBlob); // The captured camera photo
  formData.append("damageType", "DROUGHT"); // Example damage
  formData.append("proof", JSON.stringify(snarkProof)); // The snarkjs generated proof
  formData.append("publicSignals", JSON.stringify(snarkPublicSignals)); // The snarkjs signals
  ```
- **Success Response:** `200 OK`
  ```text
  "Claim anchored immutably to EVM Blockchain."
  ```
- **Failure Response:** `400 Bad Request` 
  *(The backend will return explicit failure text, such as "AI Confidence too low" or "Invalid cryptographic proof").*
