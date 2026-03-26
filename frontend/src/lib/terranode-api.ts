/**
 * TerraNode API Client
 * =====================
 * Drop this file into your frontend project's `lib/` or `utils/` folder.
 * It provides typed, ready-to-use functions for every backend endpoint.
 *
 * Usage:
 *   import { requestOtp, verifyOtp, getProfile, updateProfile, submitClaim } from './terranode-api';
 *
 * The JWT token is automatically read from sessionStorage after login.
 * Every protected call sends `Authorization: Bearer <token>` for you.
 */

const BASE_URL = "http://localhost:8080/api/v1";

// ─── Token Helpers ────────────────────────────────────────────────────────────

export const saveToken = (token: string) =>
  sessionStorage.setItem("terranode_jwt", token);

export const getToken = () =>
  sessionStorage.getItem("terranode_jwt");

export const clearToken = () =>
  sessionStorage.removeItem("terranode_jwt");

/** Decodes the JWT payload WITHOUT verifying the signature (for display only). */
export const decodeToken = (token?: string | null) => {
  const t = token ?? getToken();
  if (!t) return null;
  try {
    const payload = t.split(".")[1];
    return JSON.parse(atob(payload)) as {
      sub: string;        // farmerId
      name: string;       // fullName
      wallet: string;     // ethWalletAddress
      exp: number;        // expiry timestamp
    };
  } catch {
    return null;
  }
};

/** Returns true if the stored JWT exists and hasn't expired. */
export const isLoggedIn = () => {
  const decoded = decodeToken();
  if (!decoded) return false;
  return decoded.exp * 1000 > Date.now();
};

// ─── Auth Headers Helper ──────────────────────────────────────────────────────

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// ─── 1. Authentication ────────────────────────────────────────────────────────

/**
 * Step 1 of Login/Signup.
 * Sends an OTP to the user's email. If the email is new, a Farmer account
 * is automatically created with the provided fullName.
 */
export const requestOtp = async (email: string, fullName: string) => {
  const res = await fetch(`${BASE_URL}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, fullName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to send OTP");
  return data as { message: string };
};

/**
 * Step 2 of Login/Signup.
 * Verifies the OTP and returns a JWT. Automatically saves it to sessionStorage.
 */
export const verifyOtp = async (email: string, otp: string) => {
  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Invalid OTP");
  saveToken(data.token);
  return data as { token: string };
};

// ─── 2. Profile ───────────────────────────────────────────────────────────────

/**
 * Fetches the logged-in farmer's full profile from the database.
 * Call this when your Profile page mounts.
 */
export const getProfile = async () => {
  const res = await fetch(`${BASE_URL}/auth/profile`, {
    method: "GET",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Unauthorized");
  return data as {
    id: string;
    fullName: string;
    email: string;
    walletAddress: string;
  };
};

/**
 * Updates the farmer's display name.
 * Automatically saves the fresh JWT (with updated name claim) to sessionStorage.
 */
export const updateProfile = async (fullName: string) => {
  const res = await fetch(`${BASE_URL}/auth/profile`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ fullName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Update failed");
  saveToken(data.token); // persist fresh token with updated name
  return data as { token: string };
};

// ─── 3. Claim Submission ──────────────────────────────────────────────────────

/**
 * Submits a verified crop damage claim through the AI + ZK-SNARK pipeline.
 *
 * @param imageBlob    - The captured camera image as a Blob
 * @param damageType   - E.g. "DROUGHT", "FLOOD", "PEST"
 * @param proof        - The snarkjs groth16 proof object
 * @param publicSignals - The snarkjs publicSignals array
 */
export const submitClaim = async (
  imageBlob: Blob,
  damageType: string,
  proof: object,
  publicSignals: string[]
) => {
  const formData = new FormData();
  formData.append("image", imageBlob);
  formData.append("damageType", damageType);
  formData.append("proof", JSON.stringify(proof));
  formData.append("publicSignals", JSON.stringify(publicSignals));

  const res = await fetch(`${BASE_URL}/claims/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` }, // no Content-Type: browser sets multipart boundary
    body: formData,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text ?? "Claim submission failed");
  return text; // "Claim anchored immutably to EVM Blockchain."
};

// ─── 4. AgriStack Geofence ────────────────────────────────────────────────────

/**
 * Fetches the legal geofence polygon (farm boundary) for a specific farmer.
 * Use the farmerId from `decodeToken().sub` or from `getProfile().id`.
 */
export const getFarmerPlot = async (farmerId: string) => {
  const res = await fetch(`${BASE_URL}/agristack/farmer/${farmerId}/plot`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Could not fetch farm plot data");
  return res.json(); // Returns GeoJSON polygon array
};

// ─── 5. RSA Public Key (for client-side encryption) ──────────────────────────

/**
 * Fetches the server's RSA public key for hybrid encryption.
 * The frontend uses this to encrypt sensitive data before transmission.
 */
export const getPublicKey = async () => {
  const res = await fetch(`${BASE_URL}/crypto/public-key`);
  if (!res.ok) throw new Error("Could not fetch public key");
  return res.text(); // PEM formatted RSA public key string
};

// ── 6. Claim History ──────────────────────────────────────────────────────────

/**
 * Fetches the claim history for the logged-in farmer.
 * Includes status, blockchain TX hash, and AI feedback.
 */
export const getHistory = async () => {
  const decoded = decodeToken();
  if (!decoded) throw new Error("User not logged in");
  
  const res = await fetch(`${BASE_URL}/claims?farmerId=${decoded.sub}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Could not fetch history");
  return data as Array<{
    id: string;
    damageType: string;
    status: string;
    blockchainTx: string;
    confidenceScore: number;
    damageReason: String;
    createdAt: string;
  }>;
};
