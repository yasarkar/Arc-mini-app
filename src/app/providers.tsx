"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { arcTestnet, hyperEvmTestnet, sonicTestnet } from "@/config/arcChain";
import {
  baseSepolia,
  arbitrumSepolia,
  sepolia,
  avalancheFuji,
  optimismSepolia,
  seiTestnet,
  unichainSepolia,
  worldchainSepolia,
  polygonAmoy,
} from "viem/chains";
import { WalletAdapterProvider } from "@/context/WalletAdapterContext";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Wagmi — Web3 connection config with multi-wallet support
// ---------------------------------------------------------------------------
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID";

const config = createConfig({
  chains: [
    arcTestnet,
    baseSepolia,
    arbitrumSepolia,
    sepolia,
    avalancheFuji,
    optimismSepolia,
    seiTestnet,
    unichainSepolia,
    worldchainSepolia,
    hyperEvmTestnet,
    sonicTestnet,
    polygonAmoy,
  ],
  connectors: [
    injected({ target: "metaMask" }),
    injected({ target: "okxWallet" }),
    injected({ target: "rainbow" }),
    coinbaseWallet({ appName: "ArcFlow" }),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
  transports: {
    [arcTestnet.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [sepolia.id]: http(),
    [avalancheFuji.id]: http(),
    [optimismSepolia.id]: http(),
    [seiTestnet.id]: http(),
    [unichainSepolia.id]: http(),
    [worldchainSepolia.id]: http(),
    [hyperEvmTestnet.id]: http(),
    [sonicTestnet.id]: http(),
    [polygonAmoy.id]: http(),
  },
});

// ---------------------------------------------------------------------------
// TanStack Query client (shared across the app)
// ---------------------------------------------------------------------------
const queryClient = new QueryClient();

// ---------------------------------------------------------------------------
// Root provider — wraps the entire app with Wagmi + TanStack Query + WalletAdapter
// ---------------------------------------------------------------------------
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletAdapterProvider>{children}</WalletAdapterProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}