const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export const DEMO_HASHED_FARMER_ID = "a1b2c3d4e5f6g7h8i9j0";

export function getApiBaseUrl() {
  return DEFAULT_API_BASE_URL.replace(/\/$/, "");
}

export function isValidEmail(value) {
  return /\S+@\S+\.\S+/.test(String(value || "").trim());
}

export function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The backend request could not be completed.";
}

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function parseJwtPart(part) {
  if (!part) {
    return null;
  }

  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  try {
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function decodeJwt(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const [, payload] = token.split(".");
  return parseJwtPart(payload);
}

export function createSessionFromToken(token, email = "", currentSession = {}) {
  const payload = decodeJwt(token) || {};
  const farmerId = typeof payload.sub === "string" ? payload.sub : currentSession.farmerId || "";
  const wallet = typeof payload.wallet === "string" ? payload.wallet : currentSession.wallet || "";
  const exp = typeof payload.exp === "number" ? payload.exp : currentSession.exp || null;
  const fullName =
    typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim()
      : typeof currentSession.fullName === "string"
        ? currentSession.fullName
        : "";

  return {
    token,
    email: String(email || currentSession.email || "").trim().toLowerCase(),
    farmerId,
    wallet,
    exp,
    fullName,
    hashedFarmerId:
      typeof currentSession.hashedFarmerId === "string" && currentSession.hashedFarmerId
        ? currentSession.hashedFarmerId
        : resolveHashedFarmerId(farmerId)
  };
}

export function resolveHashedFarmerId(farmerId) {
  if (typeof farmerId === "string" && farmerId.length === DEMO_HASHED_FARMER_ID.length) {
    return farmerId;
  }

  return DEMO_HASHED_FARMER_ID;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    ...rest,
    headers: normalizeHeaders(headers)
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const message =
      (body && typeof body === "object" && typeof body.message === "string" && body.message) ||
      (typeof body === "string" && body) ||
      `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return body;
}

export async function requestOtp(email, fullName = "") {
  return request("/api/v1/auth/request-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: String(email || "").trim().toLowerCase()
    })
  });
}

export async function verifyOtp(email, otp) {
  const result = await request("/api/v1/auth/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: String(email || "").trim().toLowerCase(),
      otp: String(otp || "").trim()
    })
  });

  if (!result || typeof result !== "object" || typeof result.token !== "string") {
    throw new Error("The backend did not return a valid session token.");
  }

  return {
    token: result.token,
    session: createSessionFromToken(result.token, email)
  };
}

export async function fetchProfile(token) {
  const result = await request("/api/v1/auth/profile", {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined
    }
  });

  if (!result || typeof result !== "object") {
    throw new Error("The profile response was incomplete.");
  }

  return {
    id: typeof result.id === "string" ? result.id : "",
    fullName: typeof result.fullName === "string" ? result.fullName : "",
    email: typeof result.email === "string" ? result.email : "",
    walletAddress: typeof result.walletAddress === "string" ? result.walletAddress : ""
  };
}

export async function updateProfile(fullName, currentSession) {
  const result = await request("/api/v1/auth/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: currentSession?.token ? `Bearer ${currentSession.token}` : undefined
    },
    body: JSON.stringify({
      fullName: String(fullName || "").trim()
    })
  });

  if (!result || typeof result !== "object" || typeof result.token !== "string") {
    throw new Error("The backend did not return a fresh session token.");
  }

  return {
    token: result.token,
    session: createSessionFromToken(result.token, currentSession?.email, currentSession)
  };
}

export async function fetchPublicKey() {
  const result = await request("/api/v1/crypto/public-key");

  if (!result || typeof result !== "object" || typeof result.publicKey !== "string") {
    throw new Error("The backend public key response was incomplete.");
  }

  return result.publicKey;
}

export async function fetchFarmerPlot({ token, hashedFarmerId }) {
  if (!hashedFarmerId) {
    throw new Error("A hashed farmer id is required to fetch the plot.");
  }

  const result = await request(`/api/v1/agristack/farmer/${encodeURIComponent(hashedFarmerId)}/plot`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined
    }
  });

  if (!result || typeof result !== "object" || !Array.isArray(result.coordinates)) {
    throw new Error("The plot response did not include coordinates.");
  }

  return result;
}

export async function submitClaimBundle(bundle, token) {
  const result = await request("/api/v1/claims/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : undefined
    },
    body: JSON.stringify(bundle)
  });

  return typeof result === "string" ? result : "Claim submitted successfully.";
}
