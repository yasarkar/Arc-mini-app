"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { arcTestnet } from "@/config/arcChain";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Wagmi — Web3 connection config (Arc Testnet only)
// ---------------------------------------------------------------------------
const config = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
  },
});

// ---------------------------------------------------------------------------
// TanStack Query client (shared across the app)
// ---------------------------------------------------------------------------
const queryClient = new QueryClient();

// ---------------------------------------------------------------------------
// Root provider — wraps the entire app with Wagmi + TanStack Query
// ---------------------------------------------------------------------------
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
