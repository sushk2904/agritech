function toPlainArrayBuffer(view) {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

export function wipeMemory(buffer) {
  if (buffer && typeof buffer.fill === "function") {
    buffer.fill(0);
  }
}

export async function generateEphemeralAESKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function encryptPayloadWithAES(key, payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    toPlainArrayBuffer(payload)
  );

  return {
    ciphertext: new Uint8Array(encryptedBuffer),
    iv,
    authTagLength: 128
  };
}

export async function importRsaPublicKey(publicKeyBase64) {
  const binaryDer = Uint8Array.from(atob(publicKeyBase64), (character) => character.charCodeAt(0));

  return crypto.subtle.importKey(
    "spki",
    toPlainArrayBuffer(binaryDer),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
}

export async function encapsulateAESKeyWithRSA(aesKey, rsaPublicKey) {
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
  const rawAesKeyBytes = new Uint8Array(rawAesKey);

  try {
    const encryptedBuffer = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaPublicKey, rawAesKey.slice(0));
    return new Uint8Array(encryptedBuffer);
  } finally {
    wipeMemory(rawAesKeyBytes);
  }
}

export async function generateImageHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashBytes = new Uint8Array(hashBuffer);

  try {
    return uint8ArrayToBase64(hashBytes);
  } finally {
    wipeMemory(hashBytes);
  }
}

export function uint8ArrayToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function fileToBase64(file) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  try {
    return uint8ArrayToBase64(bytes);
  } finally {
    wipeMemory(bytes);
  }
}

let snarkJsPromise = null;

async function loadSnarkJs() {
  if (typeof window === "undefined") {
    throw new Error("snarkjs can only load in the browser.");
  }

  if (globalThis.snarkjs?.groth16) {
    return globalThis.snarkjs;
  }

  if (!snarkJsPromise) {
    snarkJsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-snarkjs-bundle="true"]');

      const handleLoad = () => {
        if (globalThis.snarkjs?.groth16) {
          resolve(globalThis.snarkjs);
          return;
        }

        reject(new Error("snarkjs loaded, but the groth16 runtime was not found."));
      };

      const handleError = () => {
        reject(new Error("The snarkjs browser bundle could not be loaded."));
      };

      if (existingScript) {
        existingScript.addEventListener("load", handleLoad, { once: true });
        existingScript.addEventListener("error", handleError, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "/vendor/snarkjs.min.js";
      script.async = true;
      script.dataset.snarkjsBundle = "true";
      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      document.head.appendChild(script);
    });
  }

  return snarkJsPromise;
}

export async function generateGeofenceProof(latitude = 20.59375, longitude = 78.96295) {
  const snarkjs = await loadSnarkJs();
  const scale = 10000000;

  const input = {
    userLat: Math.floor(latitude * scale),
    userLng: Math.floor(longitude * scale),
    minLat: 205937000,
    maxLat: 205938000,
    minLng: 789629000,
    maxLng: 789630000
  };

  return snarkjs.groth16.fullProve(input, "/zkp/geofence.wasm", "/zkp/geofence_final.zkey");
}

export async function prepareSecureClaimBundle({
  file,
  damageType,
  hashedFarmerId,
  publicKeyBase64,
  onStageChange
}) {
  onStageChange?.("HASHING");
  const imageHash = await generateImageHash(file);

  onStageChange?.("GENERATING_PROOF");
  const { proof, publicSignals } = await generateGeofenceProof();

  onStageChange?.("ENCRYPTING");
  const rsaPublicKey = await importRsaPublicKey(publicKeyBase64);
  const imageBase64 = await fileToBase64(file);
  const payloadBytes = new TextEncoder().encode(
    JSON.stringify({
      farmerId: hashedFarmerId,
      damageType,
      imageHash,
      imageBase64,
      proof,
      publicSignals
    })
  );

  let encryptedPayload = null;
  let iv = null;
  let authTag = null;
  let encryptedAesKey = null;

  try {
    const aesKey = await generateEphemeralAESKey();
    const encryptionResult = await encryptPayloadWithAES(aesKey, payloadBytes);
    const authTagLength = encryptionResult.authTagLength / 8;

    iv = encryptionResult.iv;
    encryptedPayload = encryptionResult.ciphertext.slice(0, encryptionResult.ciphertext.length - authTagLength);
    authTag = encryptionResult.ciphertext.slice(encryptionResult.ciphertext.length - authTagLength);
    encryptedAesKey = await encapsulateAESKeyWithRSA(aesKey, rsaPublicKey);

    return {
      hashedFarmerId,
      damageType,
      imageHash,
      encryptedPayload: uint8ArrayToBase64(encryptedPayload),
      encryptedAesKey: uint8ArrayToBase64(encryptedAesKey),
      iv: uint8ArrayToBase64(iv),
      authTag: uint8ArrayToBase64(authTag)
    };
  } finally {
    wipeMemory(payloadBytes);
    wipeMemory(encryptedPayload);
    wipeMemory(iv);
    wipeMemory(authTag);
    wipeMemory(encryptedAesKey);
  }
}
