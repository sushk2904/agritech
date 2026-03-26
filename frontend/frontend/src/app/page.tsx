"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VisualClaimCamera } from "@/components/claims/VisualClaimCamera";
import { isLoggedIn, clearToken } from "@/lib/terranode-api";

const metrics = [
  { label: "Privacy", value: "ZK protected" },
  { label: "Payload", value: "Encrypted" },
  { label: "Flow", value: "One screen" },
];

export default function Home() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
    } else {
      setIsReady(true);
    }
  }, [router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-400/8 blur-[120px]" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10 lg:px-8 lg:py-12">
        <div className="absolute right-6 top-6 lg:right-8 lg:top-8">
          <button
            onClick={handleLogout}
            className="text-sm uppercase tracking-wider text-white/50 hover:text-white"
          >
            Logout
          </button>
        </div>

        <section className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-white/62">
            <span className="h-2 w-2 rounded-full bg-primary" />
            TerraNode
          </div>

          <h1 className="mt-8 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Private crop claims,
            <span className="block text-white/62">kept simple.</span>
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-white/62">
            Capture damage evidence, encrypt the payload, and submit it through one calm,
            minimal interface.
          </p>

          <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left"
              >
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-white/40">
                  {item.label}
                </p>
                <p className="mt-2 text-base font-medium text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="claim-console"
          className="glass-panel mx-auto mt-10 w-full max-w-5xl rounded-[2rem] p-4 sm:p-6"
        >
          <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-primary/76">
                Claim console
              </p>
              <h2 className="mt-3 text-2xl font-medium text-white">
                Capture. Encrypt. Submit.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-white/54">
              No extra sections, no dense dashboard, just one clear path through the flow.
            </p>
          </div>

          <VisualClaimCamera />
        </section>
      </main>
    </div>
  );
}
