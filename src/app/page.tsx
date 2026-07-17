"use client";

import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "@/config/arcChain";

// =========================================================================
// Utility — truncate an address for display
// =========================================================================
function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// =========================================================================
// WalletIndicator — shows network / gas badges when connected
// =========================================================================
function WalletIndicator() {
  return (
    <div className="flex items-center gap-3">
      <span className="badge-active">
        <span className="h-1.5 w-1.5 rounded-full bg-arc-green shadow-[0_0_6px_#22C55E]" />
        Active Network: Arc Testnet
      </span>
      <span className="badge-info">Gas Token: USDC</span>
    </div>
  );
}

// =========================================================================
// UnifiedBalance — large premium balance display
// =========================================================================
function UnifiedBalance({ isConnected }: { isConnected: boolean }) {
  const { address } = useAccount();
  const { data: balance, isLoading } = useBalance({
    address,
    chainId: arcTestnet.id,
  });

  const displayAmount =
    !isConnected || isLoading
      ? "—.—"
      : balance
        ? Number(balance.formatted).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })
        : "0.00";

  return (
    <div className="text-center">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/40">
        Toplam Birleşik Bakiye
      </p>
      <h1 className="balance-value text-gradient">${displayAmount}</h1>
      {isConnected && balance && (
        <p className="mt-2 text-sm text-white/30">
          ≈ {displayAmount} USDC
        </p>
      )}
    </div>
  );
}

// =========================================================================
// BalanceBreakdown — shows USDC details when connected
// =========================================================================
function BalanceBreakdown({ isConnected }: { isConnected: boolean }) {
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: arcTestnet.id,
  });

  if (!isConnected) return null;

  const rawValue = balance
    ? Number(balance.formatted).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })
    : "0.00";

  return (
    <div className="glass-panel mx-auto mt-8 max-w-md divide-y divide-white/[0.06]">
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-sm text-white/50">USDC (ERC-20)</span>
        <span className="text-sm font-medium text-white">{rawValue} USDC</span>
      </div>
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-sm text-white/50">Network</span>
        <span className="text-sm font-medium text-white">Arc Testnet</span>
      </div>
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-sm text-white/50">Chain ID</span>
        <span className="text-sm font-medium text-white font-mono">
          {arcTestnet.id}
        </span>
      </div>
    </div>
  );
}

// =========================================================================
// ConnectWallet — connect / disconnect button
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
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => disconnect()}
          className="wallet-button-ghost"
        >
          <span className="h-2 w-2 rounded-full bg-arc-green shadow-[0_0_8px_#22C55E]" />
          {truncateAddress(address)}
          <svg
            className="h-3.5 w-3.5 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
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
          // user cancelled or connector unavailable — silent
        }
      }}
      className="wallet-button-primary"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
        />
      </svg>
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
      <p className="text-xs text-white/[0.18]">
        ArcFlow — Built on{" "}
        <a
          href="https://testnet.arcscan.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/30 underline underline-offset-2 hover:text-white/50 transition-colors"
        >
          Arc Testnet
        </a>
      </p>
    </footer>
  );
}

// =========================================================================
// Page — ArcFlow Dashboard
// =========================================================================
export default function Home() {
  const { isConnected, address } = useAccount();

  return (
    <div className="flex min-h-screen flex-col">
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
        <UnifiedBalance isConnected={isConnected} />
        <BalanceBreakdown isConnected={isConnected} />
      </main>

      <Footer />
    </div>
  );
}
