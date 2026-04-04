"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { wagmiAdapter, wagmiConfig, projectId, coston2 } from "@/lib/wagmi";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { createAppKit } from "@reown/appkit/react";

const metadata = {
  name: "Flare TEE Marketplace",
  description: "Verifiable AI inference marketplace powered by Flare TEE",
  url: typeof window !== "undefined" ? window.location.origin : "https://localhost:3000",
  icons: [],
};

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [coston2],
  metadata,
  features: {
    analytics: false,
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
