"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { wagmiAdapter, wagmiConfig, projectId, coston2 } from "@/lib/wagmi";
import { useState, type ReactNode, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ModelProvider } from "@/components/chat/model-context";
import { createAppKit } from "@reown/appkit/react";

function useAppKitInit() {
  const initialized = useRef(false);
  if (!initialized.current && typeof window !== "undefined") {
    createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: [coston2],
      metadata: {
        name: "Flare TEE Marketplace",
        description: "Verifiable AI inference marketplace powered by Flare TEE",
        url: window.location.origin,
        icons: [],
      },
      features: {
        analytics: false,
      },
    });
    initialized.current = true;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  useAppKitInit();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ModelProvider>
            {children}
          </ModelProvider>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
