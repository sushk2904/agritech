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
    payload
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
    rawAesKey
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
