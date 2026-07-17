"use client";

import { useState, useCallback } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  Wallet,
  Unplug,
  ArrowDownToLine,
  Circle,
  ExternalLink,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import { useUniversalSend } from "@/hooks/useUniversalSend";
import type { ChainBalance } from "@/hooks/useUnifiedBalance";
import type { SendStatus } from "@/hooks/useUniversalSend";

// =========================================================================
// Constant
// =========================================================================
const ARC_CHAIN_ID = 111_111;

// =========================================================================
// Utility
// =========================================================================
function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// =========================================================================
// Badge
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
// Unified Balance
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
// Chain Row
// =========================================================================
function ChainRow({ chain }: { chain: ChainBalance }) {
  return (
    <div className="group flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-200 hover:bg-white/[0.04]">
      <div className="flex items-center gap-3">
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
// Chain Breakdown
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
// Stepper — animated transaction progress
// =========================================================================
const STEP_DEFS: {
  key: SendStatus;
  label: string;
  description: string;
}[] = [
  {
    key: "aggregating",
    label: "Likidite Toplanıyor",
    description: "Diğer ağlardan USDC bakiyeleri toplanıyor...",
  },
  {
    key: "bridging",
    label: "Circle CCTP Köprüleme",
    description: "Base / Arbitrum / Solana → Arc L1 köprüsü kuruluyor",
  },
  {
    key: "finalizing",
    label: "Arc L1 Onayı",
    description: "Nihai transfer Arc ağında kesinleşiyor (&lt;1s)",
  },
];

function Stepper({ status }: { status: SendStatus }) {
  const isActive = status !== "idle" && status !== "success" && status !== "error";
  const isError = status === "error";
  const isSuccess = status === "success";

  return (
    <div className="space-y-3">
      {STEP_DEFS.map((step, idx) => {
        // Determine step state
        const stepIndex = STEP_DEFS.findIndex((s) => s.key === status);
        const isCurrentStep = step.key === status;
        const isPastStep = !isError && !isSuccess && stepIndex >= 0 && idx < stepIndex;
        const isPending = isActive && !isCurrentStep && !isPastStep;

        let icon: React.ReactNode;
        let rowClass = "opacity-40";

        if (isSuccess) {
          icon = <CheckCircle2 className="h-5 w-5 text-arc-green" />;
          rowClass = "opacity-100";
        } else if (isError && isCurrentStep) {
          icon = <XCircle className="h-5 w-5 text-red-500" />;
          rowClass = "opacity-100";
        } else if (isCurrentStep) {
          icon = <Loader2 className="h-5 w-5 text-arc-blue animate-spin" />;
          rowClass = "opacity-100";
        } else if (isPastStep) {
          icon = <CheckCircle2 className="h-5 w-5 text-arc-green" />;
          rowClass = "opacity-70";
        } else {
          icon = <Circle className="h-5 w-5 text-zinc-600" />;
        }

        return (
          <div
            key={step.key}
            className={`flex items-center gap-3 transition-all duration-500 ${rowClass}`}
          >
            <div className="flex-shrink-0">{icon}</div>
            <div>
              <p className="text-sm font-medium text-white">{step.label}</p>
              <p className="text-xs text-zinc-500">{step.description}</p>
            </div>
          </div>
        );
      })}

      {/* Success banner */}
      {isSuccess && (
        <div className="mt-4 rounded-xl bg-arc-green/10 p-4 text-center ring-1 ring-arc-green/20 transition-all duration-500">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-arc-green" />
          <p className="text-sm font-medium text-arc-green">İşlem Başarılı!</p>
          <p className="mt-1 text-xs text-zinc-400">
            Arc ağında &lt;1 saniyede kesinleşti.
          </p>
        </div>
      )}

      {/* Error banner */}
      {isError && (
        <div className="mt-4 rounded-xl bg-red-500/10 p-4 text-center ring-1 ring-red-500/20 transition-all duration-500">
          <XCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
          <p className="text-sm font-medium text-red-400">İşlem Başarısız</p>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Send Funds — form + stepper
// =========================================================================
function SendFunds({
  isConnected,
  totalUnified,
  realArcBalance,
}: {
  isConnected: boolean;
  totalUnified: number;
  realArcBalance: number;
}) {
  const [toAddress, setToAddress] = useState("");
  const [amountStr, setAmountStr] = useState("");

  const { sendStatus, sendError, executeSend, resetSend } =
    useUniversalSend(totalUnified, realArcBalance, isConnected);

  const isBusy = sendStatus !== "idle" && sendStatus !== "success" && sendStatus !== "error";

  const handleSend = useCallback(async () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    await executeSend(toAddress.trim(), amount);
  }, [amountStr, toAddress, executeSend]);

  const handleReset = useCallback(() => {
    setToAddress("");
    setAmountStr("");
    resetSend();
  }, [resetSend]);

  const amount = parseFloat(amountStr) || 0;
  const insufficient = isConnected && amount > totalUnified;

  if (!isConnected) return null;

  return (
    <div className="mx-auto mt-8 w-full max-w-md">
      <div className="glass-panel overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/[0.06] px-5 py-3.5">
          <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
            Para Gönder
          </h2>
        </div>

        {/* Body */}
        <div className="p-5">
          {sendStatus === "idle" || sendStatus === "error" ? (
            /* ── Form ── */
            <div className="space-y-4">
              {/* Recipient */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Alıcı Adresi
                </label>
                <input
                  type="text"
                  placeholder="0x... veya cüzdan adresi"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-blue-500/50 focus:shadow-[0_0_12px_-4px_#0052FF]"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Gönderilecek Tutar
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 pr-16 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-blue-500/50 focus:shadow-[0_0_12px_-4px_#0052FF]"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500">
                    USDC
                  </span>
                </div>
                {amount > 0 && (
                  <p className="mt-1 text-xs text-zinc-600">
                    Available: {totalUnified.toFixed(2)} USDC
                  </p>
                )}
              </div>

              {/* Error message */}
              {sendError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <p className="text-xs text-red-300">{sendError}</p>
                </div>
              )}

              {/* Send button */}
              <button
                type="button"
                disabled={!toAddress.trim() || amount <= 0 || insufficient}
                onClick={handleSend}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-arc-blue px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-arc-blue/90 hover:shadow-[0_0_24px_-4px_#0052FF] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
                {insufficient
                  ? "Yetersiz Bakiye"
                  : "Evrensel Gönderimi Başlat"}
              </button>
            </div>
          ) : (
            /* ── Stepper / Result ── */
            <div className="space-y-4">
              <Stepper status={sendStatus} />

              {/* Reset button on success */}
              {sendStatus === "success" && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-2 w-full rounded-xl border border-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-400 transition-all duration-200 hover:border-zinc-700 hover:text-white active:scale-[0.98]"
                >
                  Yeni Gönderim
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Connect / Disconnect
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

  // Extract real Arc balance from chains
  const arcChain = chains.find((c) => c.id === "arc");
  const realArcBalance = arcChain?.balance ?? 0;

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

        <SendFunds
          isConnected={isConnected}
          totalUnified={totalUnified}
          realArcBalance={realArcBalance}
        />

        <AddFundsCard isConnected={isConnected} />
      </main>

      <Footer />
    </div>
  );
}