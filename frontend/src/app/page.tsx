import { BhashiniMic } from "@/components/voice/BhashiniMic";
import { ClaimSubmissionDialog } from "@/components/claims/ClaimSubmissionDialog";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center space-y-12 p-8 overflow-hidden relative">
      
      {/* Decorative ambient background replicating TerraNode standard style rules */}
      <div className="absolute top-0 -z-10 h-full w-full bg-white [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)] dark:opacity-20 opacity-5"></div>

      <div className="text-center space-y-4 max-w-2xl mx-auto z-10">
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
          TerraNode DPI
        </h1>
        <p className="text-xl text-muted-foreground">
          Zero-Knowledge Agricultural Claim Gateway ensuring strict privacy scaling via Bhashini NLP.
        </p>
      </div>

      <div className="z-10 grid gap-8 lg:grid-cols-2 w-full max-w-4xl">
        {/* Render the Voice Accessibility Pod */}
        <BhashiniMic />

        {/* Render the ZKP Submit Proxy Modal directly linked adjacent to Voice component */}
        <div className="flex flex-col justify-center items-center p-8 border border-primary/20 bg-card rounded-xl shadow-lg backdrop-blur-md bg-black/40">
          <h3 className="text-lg font-semibold tracking-wide uppercase text-muted-foreground mb-6">Cryptographic Execution Payload</h3>
          <ClaimSubmissionDialog />
        </div>
      </div>
      
    </div>
  );
}
