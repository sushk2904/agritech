"use client";

import React from "react";
import { useBhashiniWebSocket } from "@/hooks/useBhashiniWebSocket";
import { Button } from "@/components/ui/button";

// A lightweight mock of standard Shadcn Card components without explicit dependencies
// to ensure flawless hackathon velocity and layout containment
const StaticCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className || ""}`}>
    {children}
  </div>
);

export function BhashiniMic() {
  const { voiceState, transcription, intentResult, startListening, stopListening } = useBhashiniWebSocket();

  // Unified Toggle architecture mapped strictly to Native MediaRecorder capabilities
  const handleMicToggle = () => {
    if (voiceState === "IDLE") {
      startListening();
    } else if (voiceState === "LISTENING") {
      stopListening();
    }
  };

  return (
    <StaticCard className="w-full max-w-sm mx-auto shadow-xl border-2 border-primary/20 backdrop-blur-md bg-white/5 dark:bg-black/40">
      <div className="flex flex-col items-center justify-center p-8 space-y-8">
        
        {/* State Banner: Dynamic visual accessibility corresponding to Voice Modes */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Voice AI Gateway</h2>
          <p className="text-sm font-medium uppercase tracking-widest text-[#2ca02c] animate-in fade-in">
            {voiceState === "IDLE" && "Tap to Speak (Hindi)"}
            {voiceState === "LISTENING" && "Listening natively..."}
            {voiceState === "PROCESSING" && "Evaluating with Bhashini..."}
          </p>
        </div>

        {/* The Action Sphere: Scaling dynamically via Tailwind rendering lifecycle blocks */}
        <Button 
          variant={voiceState === "LISTENING" ? "destructive" : "default"}
          size="lg"
          onClick={handleMicToggle}
          disabled={voiceState === "PROCESSING"}
          className={`h-24 w-24 rounded-full font-bold transition-all duration-300 shadow-md ${
            voiceState === "LISTENING" ? "animate-pulse ring-8 ring-red-500/20 scale-110" : "ring-4 ring-primary/20 scale-100"
          } ${
            voiceState === "PROCESSING" ? "opacity-50 animate-bounce delay-150 cursor-wait" : ""
          }`}
        >
          {voiceState === "LISTENING" ? "STOP" : "MIC"}
        </Button>

        {/* Output HUD: Translates the Bhashini NLP into strictly structured logic for the App */}
        {transcription && (
          <div className="w-full mt-6 p-4 bg-muted/50 rounded-lg animate-in fade-in zoom-in-95 duration-200">
            <p className="text-sm mb-3 text-muted-foreground italic border-l-2 border-primary pl-3">
              "{transcription}"
            </p>
            {intentResult && (
              <div className="text-xs font-mono space-y-1.5 bg-background p-3 rounded-md border border-border">
                <div className="flex justify-between items-center">
                  <span className="opacity-70">INTENT:</span>
                  <span className="font-bold text-primary">{intentResult.intent}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-70">LANGUAGE:</span>
                  <span className="font-bold text-primary uppercase">{intentResult.language}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </StaticCard>
  );
}
