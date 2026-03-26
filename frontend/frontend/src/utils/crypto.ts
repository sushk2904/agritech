/**
 * TerraNode Cryptographic Protocol Utils
 * Strict Hybrid Encryption Pipeline:
 * - Client generates Ephemeral AES-256-GCM key
 * - Payload is encrypted using the AES key
 * - AES key is encapsulated via RSA-OAEP (SHA-256) using Backend Public Key
 */

export async function generateEphemeralAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // Must be extractable for RSA encapsulation
    ["encrypt", "decrypt"]
  );
}

export async function encryptPayloadWithAES(
  key: CryptoKey,
  payload: Uint8Array
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array; authTagLength: number }> {
  // 12-byte IV is standard for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv, tagLength: 128 },
    key,
    payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) as ArrayBuffer
  );
  
  const ciphertext = new Uint8Array(encryptedBuffer);
  return { ciphertext, iv, authTagLength: 128 };
}

export async function encapsulateAESKeyWithRSA(
  aesKey: CryptoKey,
  rsaPublicKey: CryptoKey
): Promise<Uint8Array> {
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
  
  const encapsulatedBuffer = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPublicKey,
    rawAesKey.slice(0) // slice(0) produces a plain ArrayBuffer, not SharedArrayBuffer
  );
  
  // Wipe the raw exported key from memory immediately
  const rawAesKeyArray = new Uint8Array(rawAesKey);
  wipeMemory(rawAesKeyArray);

  return new Uint8Array(encapsulatedBuffer);
}

export function wipeMemory(buffer: Uint8Array): void {
  if (buffer && typeof buffer.fill === "function") {
    buffer.fill(0);
  }
}

/**
 * Generates a SHA-256 cryptographic fingerprint of a damage photo.
 * Executed 100% locally on the client — the raw image bytes never leave the device.
 * The resulting hash binds the visual evidence to the ZK-Proof payload.
 *
 * @param file The captured image File from the native device camera.
 * @returns A Base64-encoded SHA-256 digest of the image content.
 */
export async function generateImageHash(file: File): Promise<string> {
  const arrayBuffer: ArrayBuffer = await file.arrayBuffer();

  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);

  // Convert to Base64 for safe serialization in the JSON claim payload
  const hashBytes = new Uint8Array(hashBuffer);
  const binaryString = String.fromCharCode(...hashBytes);
  const base64Hash = btoa(binaryString);

  // HYGIENE: wipe the raw hash bytes after encoding
  wipeMemory(hashBytes);

  return base64Hash;
}
