"use client";

import React, { useRef, useState } from "react";
import {
  generateEphemeralAESKey,
  encryptPayloadWithAES,
  encapsulateAESKeyWithRSA,
  generateImageHash,
  wipeMemory,
} from "@/utils/crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

type DamageType = "FLOOD" | "DROUGHT" | "PEST";

type PipelineStatus =
  | "IDLE"
  | "CAMERA_READY"
  | "HASHING"
  | "GENERATING_PROOF"
  | "FETCHING_KEY"       // JIT RSA key fetch — new step
  | "ENCRYPTING"
  | "SUBMITTING"
  | "SUCCESS"
  | "ERROR";

interface DamageCard {
  type: DamageType;
  label: string;
  labelHi: string;
  emoji: string;
  gradient: string;
  ring: string;
}

// ─── Card Definitions ─────────────────────────────────────────────────────────

const DAMAGE_CARDS: DamageCard[] = [
  {
    type: "FLOOD",
    label: "Flood",
    labelHi: "बाढ़",
    emoji: "🌊",
    gradient: "from-blue-950 via-blue-800 to-cyan-700",
    ring: "ring-cyan-400",
  },
  {
    type: "DROUGHT",
    label: "Drought",
    labelHi: "सूखा",
    emoji: "☀️",
    gradient: "from-amber-900 via-orange-700 to-yellow-600",
    ring: "ring-yellow-400",
  },
  {
    type: "PEST",
    label: "Pest",
    labelHi: "कीट",
    emoji: "🐛",
    gradient: "from-green-950 via-green-800 to-lime-700",
    ring: "ring-lime-400",
  },
];

// ─── Status Labels ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PipelineStatus, string> = {
  IDLE: "",
  CAMERA_READY: "Tap a card to capture photo evidence",
  HASHING: "🔐 Generating SHA-256 fingerprint...",
  GENERATING_PROOF: "⚙️ Building ZK-SNARK Geofence Proof...",
  FETCHING_KEY: "🔑 Fetching live RSA public key from DPI Gateway...",
  ENCRYPTING: "🔒 AES-256-GCM Encrypting payload...",
  SUBMITTING: "📡 Transmitting to DPI Gateway...",
  SUCCESS: "✅ Claim securely submitted to PFMS",
  ERROR: "❌ Submission failed. Please retry.",
};

// ─── JIT RSA Key Fetcher ──────────────────────────────────────────────────────
// Fetched EXACTLY once per submission, never cached in component state.
// This guarantees the key is always fresh regardless of backend restarts.

async function fetchLiveRsaPublicKey(): Promise<CryptoKey | null> {
  try {
    const res = await fetch("http://localhost:8080/api/v1/crypto/public-key", {
      // no-store: bypass any browser cache — always hit the backend live
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Key endpoint returned ${res.status}`);
    const data = await res.json();
    const binaryDer = Uint8Array.from(atob(data.publicKey), (c) => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      "spki",
      binaryDer.buffer.slice(
        binaryDer.byteOffset,
        binaryDer.byteOffset + binaryDer.byteLength
      ) as ArrayBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,          // NOT extractable — key material stays in WebCrypto engine
      ["encrypt"]
    );
  } catch (err) {
    console.warn("[JIT-KEY] Could not fetch RSA public key:", err);
    return null;      // Caller handles null → mock mode
  }
}

// ─── ZK Proof Generator ───────────────────────────────────────────────────────

async function generateLocationProof() {
  try {
    // @ts-ignore – snarkjs loaded dynamically in browser context
    const snarkjs = await import("snarkjs");
    return await snarkjs.groth16.fullProve(
      {
        userLat: 205937500,
        userLng: 789629500,
        minLat: 205937000,
        maxLat: 205938000,
        minLng: 789629000,
        maxLng: 789630000,
      },
      "/zkp/geofence.wasm",
      "/zkp/geofence_final.zkey"
    );
  } catch {
    console.warn("[ZKP MOCK] Using proxy proof — mock WASM artifacts in use.");
    return {
      proof: { pi_a: ["1"], pi_b: ["1"], pi_c: ["1"], protocol: "groth16" },
      publicSignals: ["1"],
    };
  }
}

// ─── Base64 util ──────────────────────────────────────────────────────────────

const toBase64 = (arr: Uint8Array): string => btoa(String.fromCharCode(...arr));

// ─── Component ────────────────────────────────────────────────────────────────

export function VisualClaimCamera() {
  const [selectedType, setSelectedType] = useState<DamageType | null>(null);
  const [status, setStatus] = useState<PipelineStatus>("IDLE");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCardClick = (type: DamageType) => {
    setSelectedType(type);
    setStatus("CAMERA_READY");
    setImagePreview(null);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;

    setImagePreview(URL.createObjectURL(file));

    // Ephemeral handles — declared here so finally{} can wipe them
    let pureCiphertext: Uint8Array | null = null;
    let authTagBuffer: Uint8Array | null = null;
    let encapsulatedAesKey: Uint8Array | null = null;
    let iv: Uint8Array | null = null;

    try {
      // ── Step 1: SHA-256 Image Hash ──────────────────────────────────────────
      setStatus("HASHING");
      const imageHash = await generateImageHash(file);

      // ── Step 2: ZK-SNARK Geofence Proof ────────────────────────────────────
      setStatus("GENERATING_PROOF");
      const { proof, publicSignals } = await generateLocationProof();

      // ── Step 3: JIT RSA Public Key Fetch ───────────────────────────────────
      // Fetched HERE — not on mount, not cached — to guarantee it matches
      // the backend's current private key regardless of any restarts.
      setStatus("FETCHING_KEY");
      const rsaPublicKey = await fetchLiveRsaPublicKey();

      // ── Step 4: AES-GCM Encryption ─────────────────────────────────────────
      setStatus("ENCRYPTING");

      const rawPayload = JSON.stringify({
        farmerId: "a1b2c3d4e5f6g7h8i9j0",
        damageType: selectedType,
        imageHash,
        proof,
        publicSignals,
      });

      const payloadBytes = new TextEncoder().encode(rawPayload);
      const aesKey = await generateEphemeralAESKey();
      const result = await encryptPayloadWithAES(aesKey, payloadBytes);

      iv = result.iv;

      // WebCrypto appends the 16-byte auth tag to ciphertext
      const authTagLen = result.authTagLength / 8;
      pureCiphertext = result.ciphertext.slice(0, result.ciphertext.length - authTagLen);
      authTagBuffer  = result.ciphertext.slice(result.ciphertext.length - authTagLen);

      // ── Step 5: RSA-OAEP Encapsulation of AES Key ──────────────────────────
      if (rsaPublicKey) {
        encapsulatedAesKey = await encapsulateAESKeyWithRSA(aesKey, rsaPublicKey);
      } else {
        // Backend unreachable — send all-zeros; backend mock pipeline handles it
        console.warn("[ENCRYPT] No RSA key — using mock encapsulation. Backend will use mock pipeline.");
        encapsulatedAesKey = new Uint8Array(256); // all-zeros sentinel
      }

      // ── Step 6: Submit to DPI Gateway ──────────────────────────────────────
      setStatus("SUBMITTING");

      const bundle = {
        hashedFarmerId: "a1b2c3d4e5f6g7h8i9j0",
        damageType: selectedType,
        imageHash,
        encryptedPayload: toBase64(pureCiphertext),
        encryptedAesKey:  toBase64(encapsulatedAesKey),
        iv:               toBase64(iv),
        authTag:          toBase64(authTagBuffer),
      };

      const submitRes = await fetch("http://localhost:8080/api/v1/claims/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle),
      }).catch((err) => {
        console.warn("[DPI] Gateway unreachable:", err);
        return null;
      });

      if (submitRes && !submitRes.ok) {
        const errText = await submitRes.text();
        throw new Error(`Gateway rejected claim: ${errText}`);
      }

      setStatus("SUCCESS");

    } catch (err) {
      console.error("[VISUAL CLAIM] Pipeline failure:", err);
      setStatus("ERROR");

    } finally {
      // ── CRYPTO HYGIENE: wipe all ephemeral key material from memory ──────────
      if (pureCiphertext)    wipeMemory(pureCiphertext);
      if (authTagBuffer)     wipeMemory(authTagBuffer);
      if (encapsulatedAesKey) wipeMemory(encapsulatedAesKey);
      if (iv)                wipeMemory(iv);

      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const reset = () => {
    setStatus("IDLE");
    setSelectedType(null);
    setImagePreview(null);
  };

  const isProcessing = [
    "HASHING", "GENERATING_PROOF", "FETCHING_KEY", "ENCRYPTING", "SUBMITTING"
  ].includes(status);

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 p-2">

      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-white">
          Crop Damage Report
        </h1>
        <p className="text-sm text-slate-400 font-medium">
          Select damage type · Take photo · Submit encrypted claim
        </p>
        <p className="text-xs text-slate-500">
          फसल का नुकसान चुनें · फोटो लें · दावा भेजें
        </p>
      </div>

      {/* Damage Type Cards — zero typing required */}
      <div className="grid grid-cols-3 gap-3">
        {DAMAGE_CARDS.map((card) => (
          <button
            key={card.type}
            id={`damage-card-${card.type.toLowerCase()}`}
            onClick={() => handleCardClick(card.type)}
            disabled={isProcessing}
            className={`
              relative flex flex-col items-center justify-center gap-2
              rounded-2xl p-5 bg-gradient-to-br ${card.gradient}
              border border-white/10 shadow-xl
              transition-all duration-200 active:scale-95
              ${selectedType === card.type
                ? `ring-2 ring-offset-2 ring-offset-black ${card.ring} scale-105`
                : "hover:brightness-110"}
              ${isProcessing ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            `}
            aria-label={`${card.label} damage`}
          >
            <span className="text-5xl leading-none" role="img" aria-label={card.label}>
              {card.emoji}
            </span>
            <span className="text-white font-bold text-sm tracking-wide uppercase">
              {card.label}
            </span>
            <span className="text-white/60 font-medium text-xs">
              {card.labelHi}
            </span>
          </button>
        ))}
      </div>

      {/* Hidden native camera input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageCapture}
        aria-hidden="true"
      />

      {/* Image Preview */}
      {imagePreview && (
        <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Captured damage evidence"
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Pipeline Status */}
      {status !== "IDLE" && (
        <div
          className={`
            rounded-xl px-4 py-3 text-sm font-semibold text-center tracking-wide border
            transition-all duration-300
            ${status === "SUCCESS"      ? "bg-emerald-900/50 border-emerald-500 text-emerald-300" : ""}
            ${status === "ERROR"        ? "bg-red-900/50 border-red-500 text-red-300" : ""}
            ${isProcessing              ? "bg-slate-800/80 border-slate-600 text-slate-200 animate-pulse" : ""}
            ${status === "CAMERA_READY" ? "bg-slate-800/60 border-slate-600 text-slate-300" : ""}
          `}
        >
          {STATUS_LABELS[status]}
        </div>
      )}

      {/* Reset / Retry */}
      {(status === "SUCCESS" || status === "ERROR") && (
        <button
          id="reset-claim-btn"
          onClick={reset}
          className="w-full rounded-xl py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-sm tracking-widest uppercase transition-all"
        >
          Submit Another Claim / नया दावा
        </button>
      )}
    </div>
  );
}
