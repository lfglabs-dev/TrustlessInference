"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { coston2 } from "@/lib/wagmi";

export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  if (!isConnected || chainId === coston2.id) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border-border mx-4 w-full max-w-md rounded-xl border p-6 shadow-xl">
        <h2 className="text-foreground mb-2 text-lg font-semibold">
          Wrong Network
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          This app only works on Flare Coston2 testnet. Please switch your
          network to continue.
        </p>
        <button
          onClick={() => switchChain({ chainId: coston2.id })}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Switch to Flare Coston2
        </button>
      </div>
    </div>
  );
}
