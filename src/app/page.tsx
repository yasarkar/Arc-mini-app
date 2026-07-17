"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  Wallet,
  Unplug,
  ArrowDownToLine,
  Circle,
  ExternalLink,
} from "lucide-react";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import type { ChainBalance } from "@/hooks/useUnifiedBalance";

// =========================================================================
// Utility
// =========================================================================
function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// =========================================================================
// Badge — network / gas indicators
// =========================================================================
function WalletIndicator() {
  return (
    <div className="flex items-center gap-3">
      <span className="badge-active">
        <span className="h-1.5 w-1.5 rounded-full bg-arc-green shadow-[0_0_6px_#22C55E]" />
        Arc Testnet
      </span>
      <span className="badge-info">Gas: USDC</span>
    </div>
  );
}

// =========================================================================
// Unified Balance — hero area
// =========================================================================
function UnifiedBalanceDisplay({
  total,
  isLoading,
  isConnected,
}: {
  total: number;
  isLoading: boolean;
  isConnected: boolean;
}) {
  const display =
    !isConnected || isLoading
      ? "—.—"
      : total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        });

  return (
    <div className="text-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
        Toplam Birleşik Bakiye
      </p>
      <h1 className="balance-value text-gradient">${display}</h1>
      {isConnected && (
        <p className="mt-2 text-sm text-zinc-500">
          ≈ {display} USDC —{" "}
          <span className="text-zinc-600">tüm ağlar</span>
        </p>
      )}
    </div>
  );
}

// =========================================================================
// ChainRow — single row in the breakdown list
// =========================================================================
function ChainRow({ chain }: { chain: ChainBalance }) {
  return (
    <div className="group flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-200 hover:bg-white/[0.04]">
      <div className="flex items-center gap-3">
        {/* Colour dot */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${chain.color}18` }}
        >
          <Circle
            className="h-4 w-4"
            style={{ color: chain.color, fill: chain.color }}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{chain.name}</span>
            {chain.isReal && (
              <span className="rounded-full bg-arc-green/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-arc-green ring-1 ring-arc-green/20">
                Real
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-500">{chain.symbol}</span>
        </div>
      </div>

      <span className="text-sm font-semibold tabular-nums text-white">
        {chain.balance.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        })}{" "}
        <span className="font-normal text-zinc-400">USDC</span>
      </span>
    </div>
  );
}

// =========================================================================
// Chain Breakdown Card
// =========================================================================
function ChainBreakdown({
  chains,
  isConnected,
}: {
  chains: ChainBalance[];
  isConnected: boolean;
}) {
  if (!isConnected) return null;

  return (
    <div className="glass-panel mx-auto mt-8 w-full max-w-md overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
          Network Breakdown
        </h2>
      </div>
      <div className="divide-y divide-white/[0.04] px-2 py-1">
        {chains.map((chain) => (
          <ChainRow key={chain.id} chain={chain} />
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// Add Funds Card
// =========================================================================
function AddFundsCard({ isConnected }: { isConnected: boolean }) {
  if (!isConnected) return null;

  return (
    <div className="mx-auto mt-4 w-full max-w-md">
      <button
        type="button"
        className="group glass-panel flex w-full items-center justify-between px-5 py-4 transition-all duration-300 hover:bg-white/[0.06] hover:shadow-[0_0_32px_-8px_#0052FF33] active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-arc-blue/10">
            <ArrowDownToLine className="h-5 w-5 text-arc-blue" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Add Funds via CCTP</p>
            <p className="text-xs text-zinc-500">
              Bridge USDC from Ethereum, Base, Arbitrum, Solana
            </p>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-400" />
      </button>
    </div>
  );
}

// =========================================================================
// Connect / Disconnect Button
// =========================================================================
function ConnectWallet({
  isConnected,
  address,
}: {
  isConnected: boolean;
  address?: string;
}) {
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={() => disconnect()}
          className="wallet-button-ghost"
        >
          <span className="h-2 w-2 rounded-full bg-arc-green shadow-[0_0_8px_#22C55E]" />
          {truncateAddress(address)}
          <Unplug className="h-3.5 w-3.5 text-white/40" />
        </button>

        <WalletIndicator />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await connectAsync({ connector: injected() });
        } catch {
          // user cancelled — silent
        }
      }}
      className="wallet-button-primary"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </button>
  );
}

// =========================================================================
// Footer
// =========================================================================
function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.04] px-6 py-6 text-center">
      <p className="text-xs text-zinc-700">
        ArcFlow — Built on{" "}
        <a
          href="https://testnet.arcscan.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-300"
        >
          Arc Testnet
        </a>
        <span className="mx-2 text-zinc-700">·</span>
        Cross-chain preview mode
      </p>
    </footer>
  );
}

// =========================================================================
// Page — ArcFlow Dashboard
// =========================================================================
export default function Home() {
  const { isConnected, address } = useAccount();
  const { totalUnified, chains, isLoading } = useUnifiedBalance();

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0B0F]">
      {/* -------------------------------------------------- */}
      {/* Top bar */}
      {/* -------------------------------------------------- */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-lg font-semibold tracking-tight text-white">
          <span className="text-gradient">ArcFlow</span>
        </span>

        <ConnectWallet isConnected={isConnected} address={address} />
      </header>

      {/* -------------------------------------------------- */}
      {/* Main content */}
      {/* -------------------------------------------------- */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 sm:px-10">
        <UnifiedBalanceDisplay
          total={totalUnified}
          isLoading={isLoading}
          isConnected={isConnected}
        />

        <ChainBreakdown chains={chains} isConnected={isConnected} />

        <AddFundsCard isConnected={isConnected} />
      </main>

      <Footer />
    </div>
  );
}