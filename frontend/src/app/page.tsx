import { VisualClaimCamera } from "@/components/claims/VisualClaimCamera";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-blue-900/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-emerald-900/20 blur-[100px]" />
      </div>

      {/* TerraNode Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-semibold tracking-widest uppercase">
            TerraNode DPI · Agri-Trust Protocol
          </span>
        </div>
        <p className="text-slate-500 text-xs max-w-xs mx-auto">
          Zero-Knowledge · End-to-End Encrypted · Privacy-First
        </p>
      </div>

      {/* Main UI */}
      <VisualClaimCamera />
    </div>
  );
}
