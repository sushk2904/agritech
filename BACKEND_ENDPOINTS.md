# TerraNode DPI - Backend Endpoint Cheat Sheet

This document maps the exact REST API endpoints currently running on your Spring Boot Backend (`http://localhost:8080`). 
You can use these definitions to perfectly wire up your custom frontend UI.

---

## 1. Authentication Gateway (Email OTP)

These two endpoints merge **Login** and **Signup** into one flow. If the email doesn't exist, the backend auto-creates the Farmer and their internal Ethereum wallet address.

### A. Request OTP
Triggers the JavaMailSender to securely dispatch a 4-digit code to the user's email.
- **Endpoint:** `POST /api/v1/auth/request-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body (JSON):**
  ```json
  {
    "email": "farmer@example.com"
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
