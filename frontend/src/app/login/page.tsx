"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"EMAIL" | "OTP">("EMAIL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return setError("Invalid email address.");
    if (fullName.length < 2) return setError("Please enter your full name.");
    
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/v1/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName }),
      });
      if (!res.ok) throw new Error("Failed to send Email OTP");
      setStep("OTP");
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return setError("Invalid verification code.");
    
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      
      if (!res.ok) throw new Error("Invalid or Expired OTP");
      const data = await res.json();
      
      // Save stateless token bridging to Farmer wallet
      sessionStorage.setItem("terranode_jwt", data.token);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black/95 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-900 via-[#0a0f1c] to-black px-4">
      <div className="mx-auto w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 sm:p-8 backdrop-blur-md">
        
        <div className="mb-8 text-center">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-primary/80">
            {step === "EMAIL" ? "DPI Farmer Gateway" : "Secure Verification"}
          </p>
          <h1 className="mt-3 text-2xl font-medium text-white">
            {step === "EMAIL" ? "Access Agristack" : "Enter Email Code"}
          </h1>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-200">
            {error}
          </div>
        )}

        {step === "EMAIL" ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/50">Full Name</label>
              <div className="flex items-center rounded-xl border border-white/10 bg-white/5 pr-4 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50">
                <input
                  type="text"
                  autoFocus
                  value={fullName}
                  placeholder="John Doe"
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent p-4 text-white focus:outline-none placeholder:text-white/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/50">Email Address</label>
              <div className="flex items-center rounded-xl border border-white/10 bg-white/5 pr-4 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50">
                <input
                  type="email"
                  value={email}
                  placeholder="name@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent p-4 text-white focus:outline-none placeholder:text-white/20"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || !email.includes("@") || fullName.length < 2}
              className="w-full h-12 rounded-full uppercase tracking-[0.18em]"
            >
              {loading ? "Requesting..." : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/50">4-Digit Auth Code</label>
              <input
                type="text"
                autoFocus
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[1em] rounded-xl border border-white/10 bg-white/5 p-4 text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full h-12 rounded-full uppercase tracking-[0.18em]"
            >
              {loading ? "Verifying..." : "Verify & Connect Wallet"}
            </Button>
            <button 
              type="button" 
              onClick={() => {setStep("EMAIL"); setOtp("");}}
              className="w-full pt-4 text-[0.7rem] uppercase tracking-wider text-white/40 hover:text-white"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
