"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
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
  Shield,
  EyeOff,
  Copy,
  Check,
  KeyRound,
  Search,
  Bot,
  Sparkles,
  SendHorizonal,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Ban,
} from "lucide-react";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import { useUniversalSend } from "@/hooks/useUniversalSend";
import { usePrivacyTransfer } from "@/hooks/usePrivacyTransfer";
import { useArcAgent } from "@/hooks/useArcAgent";
import WalletModal from "@/components/WalletModal";
import type { ChainBalance } from "@/hooks/useUnifiedBalance";
import type { SendStatus } from "@/hooks/useUniversalSend";
import type { PrivateTxDetails } from "@/hooks/usePrivacyTransfer";
import type { Message, ArcJob } from "@/hooks/useArcAgent";

// =========================================================================
// Utility
// =========================================================================
function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
// Privacy Toggle
// =========================================================================
function PrivacyToggle({
  isPrivateMode,
  onToggle,
}: {
  isPrivateMode: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-300 ${
        isPrivateMode
          ? "border-purple-500/30 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.12)]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 ${
            isPrivateMode ? "bg-purple-500/20" : "bg-zinc-800"
          }`}
        >
          {isPrivateMode ? (
            <Shield className="h-4 w-4 text-purple-400" />
          ) : (
            <EyeOff className="h-4 w-4 text-zinc-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">Gizli Gönderim</p>
          <p className="text-xs text-zinc-500">Opt-in Privacy ile koru</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPrivateMode}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-out focus:outline-none ${
          isPrivateMode ? "bg-purple-500" : "bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
            isPrivateMode ? "translate-x-[22px]" : "translate-x-[3px]"
          }`}
          style={{ height: "18px", width: "18px" }}
        />
      </button>
    </div>
  );
}

// =========================================================================
// Stepper
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

function Stepper({
  status,
  isPrivateMode,
}: {
  status: SendStatus;
  isPrivateMode: boolean;
}) {
  const isActive = status !== "idle" && status !== "success" && status !== "error";
  const isError = status === "error";
  const isSuccess = status === "success";
  const accentColor = isPrivateMode ? "text-purple-400" : "text-arc-blue";

  return (
    <div className="space-y-3">
      {STEP_DEFS.map((step, idx) => {
        const stepIndex = STEP_DEFS.findIndex((s) => s.key === status);
        const isCurrentStep = step.key === status;
        const isPastStep = !isError && !isSuccess && stepIndex >= 0 && idx < stepIndex;

        let icon: React.ReactNode;
        let rowClass = "opacity-40";

        if (isSuccess) {
          icon = <CheckCircle2 className="h-5 w-5 text-arc-green" />;
          rowClass = "opacity-100";
        } else if (isError && isCurrentStep) {
          icon = <XCircle className="h-5 w-5 text-red-500" />;
          rowClass = "opacity-100";
        } else if (isCurrentStep) {
          icon = <Loader2 className={`h-5 w-5 animate-spin ${accentColor}`} />;
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

      {isSuccess && (
        <div className="mt-4 rounded-xl bg-arc-green/10 p-4 text-center ring-1 ring-arc-green/20 transition-all duration-500">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-arc-green" />
          <p className="text-sm font-medium text-arc-green">İşlem Başarılı!</p>
          <p className="mt-1 text-xs text-zinc-400">
            Arc ağında &lt;1 saniyede kesinleşti.
          </p>
        </div>
      )}

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
// Viewing Key Display
// =========================================================================
function ViewingKeyDisplay({ viewingKey }: { viewingKey: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(viewingKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  }, [viewingKey]);

  return (
    <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Shield className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-medium text-purple-300">
          Bu işlem Seçmeli Gizlilik (Opt-in Privacy) ile korundu.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-purple-500/15 bg-black/30 px-3 py-2 font-mono text-xs text-purple-200">
          {viewingKey}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-500/15 transition-colors hover:bg-purple-500/10"
        >
          {copied ? (
            <Check className="h-4 w-4 text-arc-green" />
          ) : (
            <Copy className="h-4 w-4 text-purple-300" />
          )}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">
        Bu anahtarı denetçinizle veya bir üçüncü partiyle paylaşarak işlem
        detaylarını doğrulatabilirsiniz.
      </p>
    </div>
  );
}

// =========================================================================
// Send Funds
// =========================================================================
function SendFunds({
  isConnected,
  totalUnified,
  realArcBalance,
  isPrivateMode,
  onTogglePrivacy,
  generateViewingKey,
}: {
  isConnected: boolean;
  totalUnified: number;
  realArcBalance: number;
  isPrivateMode: boolean;
  onTogglePrivacy: () => void;
  generateViewingKey: (txHash: string, details: PrivateTxDetails) => string;
}) {
  const [toAddress, setToAddress] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [lastViewingKey, setLastViewingKey] = useState<string | null>(null);
  const [txCompleted, setTxCompleted] = useState(false);

  const { sendStatus, sendError, executeSend, resetSend } =
    useUniversalSend(totalUnified, realArcBalance, isConnected);

  if (sendStatus === "success" && !txCompleted && isPrivateMode) {
    const mockDetails: PrivateTxDetails = {
      txHash: `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("")}`,
      sender: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      recipient: toAddress.trim(),
      amount: parseFloat(amountStr) || 0,
      symbol: "USDC",
      timestamp: Date.now(),
    };
    const vkey = generateViewingKey(mockDetails.txHash, mockDetails);
    setLastViewingKey(vkey);
    setTxCompleted(true);
  }

  const handleSend = useCallback(async () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    setTxCompleted(false);
    setLastViewingKey(null);
    await executeSend(toAddress.trim(), amount);
  }, [amountStr, toAddress, executeSend]);

  const amount = parseFloat(amountStr) || 0;
  const insufficient = isConnected && amount > totalUnified;

  if (!isConnected) return null;

  const accentBorder = isPrivateMode ? "border-purple-500/30" : "border-white/[0.06]";
  const accentHeader = isPrivateMode ? "text-purple-400" : "text-zinc-500";

  return (
    <div className="mx-auto mt-8 w-full max-w-md">
      <div
        className={`glass-panel overflow-hidden transition-all duration-300 ${
          isPrivateMode ? "shadow-[0_0_15px_rgba(168,85,247,0.08)]" : ""
        }`}
      >
        <div className={`border-b px-5 py-3.5 transition-colors duration-300 ${accentBorder}`}>
          <h2 className={`text-xs font-medium uppercase tracking-[0.15em] transition-colors duration-300 ${accentHeader}`}>
            Para Gönder
          </h2>
        </div>
        <div className="p-5">
          <div className="mb-4">
            <PrivacyToggle isPrivateMode={isPrivateMode} onToggle={onTogglePrivacy} />
          </div>
          {sendStatus === "idle" || sendStatus === "error" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Alıcı Adresi</label>
                <input
                  type="text"
                  placeholder="0x... veya cüzdan adresi"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-blue-500/50 focus:shadow-[0_0_12px_-4px_#0052FF]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Gönderilecek Tutar</label>
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
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500">USDC</span>
                </div>
                {amount > 0 && <p className="mt-1 text-xs text-zinc-600">Available: {totalUnified.toFixed(2)} USDC</p>}
              </div>
              {sendError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <p className="text-xs text-red-300">{sendError}</p>
                </div>
              )}
              <button
                type="button"
                disabled={!toAddress.trim() || amount <= 0 || insufficient}
                onClick={handleSend}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 ${
                  isPrivateMode
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-[0_0_24px_-4px_#7c3aed]"
                    : "bg-arc-blue hover:bg-arc-blue/90 hover:shadow-[0_0_24px_-4px_#0052FF]"
                }`}
              >
                <Send className="h-4 w-4" />
                {insufficient ? "Yetersiz Bakiye" : "Evrensel Gönderimi Başlat"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <Stepper status={sendStatus} isPrivateMode={isPrivateMode} />
              {sendStatus === "success" && lastViewingKey && <ViewingKeyDisplay viewingKey={lastViewingKey} />}
              {sendStatus === "success" && (
                <button
                  type="button"
                  onClick={() => { setToAddress(""); setAmountStr(""); setLastViewingKey(null); resetSend(); }}
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
// Auditor Panel
// =========================================================================
function AuditorPanel({
  storedKeys,
  revealTransactionDetails,
}: {
  storedKeys: { key: string; details: PrivateTxDetails }[];
  revealTransactionDetails: (key: string) => PrivateTxDetails | null;
}) {
  const [inputKey, setInputKey] = useState("");
  const [revealedTx, setRevealedTx] = useState<PrivateTxDetails | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);

  const handleReveal = useCallback(() => {
    const trimmed = inputKey.trim();
    if (!trimmed) return;
    const result = revealTransactionDetails(trimmed);
    if (result) { setRevealedTx(result); setRevealError(null); }
    else { setRevealedTx(null); setRevealError("Geçersiz veya süresi dolmuş görüntüleme anahtarı."); }
  }, [inputKey, revealTransactionDetails]);

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div className="glass-panel overflow-hidden border border-amber-500/10">
        <div className="border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-zinc-500" />
            <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">Gizli İşlem Denetleme Paneli</h2>
          </div>
          <p className="mt-1 text-[10px] text-zinc-600">Auditor Tools — Bir Viewing Key girerek gizli işlem detaylarını doğrulayın.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="text" placeholder="vkey_arc_..." value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReveal()}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 font-mono text-xs text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-amber-500/30 focus:shadow-[0_0_12px_-4px_#f59e0b]"
            />
            <button
              type="button" onClick={handleReveal} disabled={!inputKey.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600/80 px-4 py-2.5 text-xs font-medium text-white transition-all duration-200 hover:bg-amber-600 active:scale-[0.97] disabled:opacity-30"
            >
              <KeyRound className="h-3.5 w-3.5" /> Reveal
            </button>
          </div>
          {revealError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20">
              <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{revealError}</p>
            </div>
          )}
          {revealedTx && (
            <div className="rounded-xl border border-arc-green/20 bg-arc-green/5 p-4 transition-all duration-500">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-arc-green" />
                <span className="text-xs font-medium text-arc-green">Doğrulandı</span>
              </div>
              <div className="space-y-2">
                {[{ l: "Gönderen", v: truncateAddress(revealedTx.sender) }, { l: "Alıcı", v: truncateAddress(revealedTx.recipient) }, { l: "Tutar", v: `${revealedTx.amount.toFixed(2)} ${revealedTx.symbol}` }, { l: "Zaman", v: formatTime(revealedTx.timestamp) }].map((r) => (
                  <div key={r.l} className="flex justify-between">
                    <span className="text-[11px] text-zinc-500">{r.l}</span>
                    <span className="text-xs font-mono text-white">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {storedKeys.length > 0 && <p className="text-[10px] text-zinc-700 text-center">{storedKeys.length} görüntüleme anahtarı kullanılabilir</p>}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// AI Agent — Active Jobs Bar
// =========================================================================
function ActiveJobsBar({ jobs }: { jobs: ArcJob[] }) {
  const active = jobs.filter((j) => j.status === "running" || j.status === "escrowed");
  if (active.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">
        Otonom Görevler
      </p>
      <div className="space-y-2">
        {active.map((job) => (
          <div
            key={job.jobId}
            className="flex items-center gap-3 rounded-xl border border-cyan-500/15 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 px-4 py-2.5"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-white">
                {job.description.slice(0, 50)}
              </p>
              <p className="text-[10px] text-cyan-300/70">
                ERC-8183 · {job.frequency ?? "one-time"} · {job.amount > 0 ? `${job.amount} USDC` : "Değişken"}
              </p>
            </div>
            <Activity className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// AI Agent — Job Approval Card
// =========================================================================
function JobApprovalCard({
  job,
  onApprove,
  onReject,
}: {
  job: ArcJob;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleApprove = useCallback(() => {
    setApproving(true);
    setTimeout(() => {
      onApprove(job.jobId);
      setApproving(false);
    }, 1200);
  }, [job.jobId, onApprove]);

  const handleReject = useCallback(() => {
    setRejecting(true);
    setTimeout(() => {
      onReject(job.jobId);
      setRejecting(false);
    }, 600);
  }, [job.jobId, onReject]);

  return (
    <div className="mt-3 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-4 transition-all duration-300">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-semibold text-cyan-300">ERC-8183 Job Escrow</span>
      </div>

      <div className="mb-3 space-y-1.5">
        <p className="text-sm font-medium text-white">{job.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          {job.amount > 0 && <span>💰 Bütçe: {job.amount > 50 ? `${job.amount} USDC` : `%${job.amount}`}</span>}
          {job.sourceChain && <span>⛓ Kaynak: {job.sourceChain}</span>}
          {job.targetChain && <span>🎯 Hedef: {job.targetChain}</span>}
          {job.frequency && <span>🔄 {job.frequency}</span>}
          {job.privacyMode && <span>🔒 Gizli Mod</span>}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={approving || rejecting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-arc-green/80 px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-arc-green active:scale-[0.97] disabled:opacity-50"
        >
          {approving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Onaylanıyor...</>
          ) : (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Görevi Zincir Üstünde Onayla</>
          )}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={approving || rejecting}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 transition-all duration-200 hover:bg-red-500/10 active:scale-[0.97] disabled:opacity-50"
        >
          {rejecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Ban className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// AI Agent — Chat Message
// =========================================================================
function ChatMessage({
  msg,
  jobs,
  onApprove,
  onReject,
}: {
  msg: Message;
  jobs: ArcJob[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const isUser = msg.role === "user";
  const linkedJob = msg.jobId ? jobs.find((j) => j.jobId === msg.jobId) : null;
  const isPendingApproval = linkedJob?.status === "pending_approval";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-arc-blue/20" : "bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
        }`}
      >
        {isUser ? (
          <span className="text-xs font-bold text-arc-blue">U</span>
        ) : (
          <Bot className="h-4 w-4 text-cyan-400" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-arc-blue/10 text-white"
              : "bg-zinc-800/60 text-zinc-200"
          }`}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {msg.text}

          {/* Job approval card embedded */}
          {isPendingApproval && linkedJob && (
            <JobApprovalCard job={linkedJob} onApprove={onApprove} onReject={onReject} />
          )}
        </div>
        <p className="mt-1 text-[10px] text-zinc-700">
          {msg.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          {!isUser && <span className="ml-2 text-cyan-500/50">ERC-8004 Agent</span>}
        </p>
      </div>
    </div>
  );
}

// =========================================================================
// AI Agent — Chat Input
// =========================================================================
function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled: boolean }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  }, [input, disabled, onSend]);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  return (
    <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3">
      <input
        ref={inputRef}
        type="text"
        placeholder="Ajana finansal bir görev verin..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        disabled={disabled}
        className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-cyan-500/30 focus:shadow-[0_0_12px_-4px_#06b6d4] disabled:opacity-30"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!input.trim() || disabled}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 transition-all duration-200 hover:shadow-[0_0_16px_-4px_#06b6d4] active:scale-[0.93] disabled:opacity-30"
      >
        <SendHorizonal className="h-4 w-4 text-white" />
      </button>
    </div>
  );
}

// =========================================================================
// AI Agent — Full Panel
// =========================================================================
function ArcAgentPanel() {
  const { messages, activeJobs, sendMessage, approveJob, rejectJob, isChatOpen, toggleChat } = useArcAgent();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isSending = false; // messages are instant

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div className="glass-panel overflow-hidden border border-cyan-500/10">
        {/* Header — clickable to collapse */}
        <button
          type="button"
          onClick={toggleChat}
          className="flex w-full items-center justify-between border-b border-white/[0.06] px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-left">
              <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-400">
                Arc Assistant
              </h2>
              <p className="text-[10px] text-zinc-600">ERC-8004 Onchain AI Agent</p>
            </div>
          </div>
          {isChatOpen ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
        </button>

        {/* Collapsible content */}
        {isChatOpen && (
          <>
            {/* Active Jobs */}
            {activeJobs.filter((j) => j.status === "running" || j.status === "escrowed").length > 0 && (
              <div className="border-b border-white/[0.04] px-5 py-4">
                <ActiveJobsBar jobs={activeJobs} />
              </div>
            )}

            {/* Messages */}
            <div className="h-80 space-y-4 overflow-y-auto px-5 py-4 scrollbar-thin">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  jobs={activeJobs}
                  onApprove={approveJob}
                  onReject={rejectJob}
                />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <ChatInput onSend={sendMessage} disabled={false} />
          </>
        )}
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
  onOpenModal,
}: {
  isConnected: boolean;
  address?: string;
  onOpenModal: () => void;
}) {
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex flex-col items-end gap-3">
        <button type="button" onClick={() => disconnect()} className="wallet-button-ghost">
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
      onClick={onOpenModal}
      className="wallet-button-primary"
    >
      <Wallet className="h-4 w-4" /> Connect Wallet
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
        <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer"
           className="text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-300">
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
  const {
    isPrivateMode, togglePrivacy, generateViewingKey,
    revealTransactionDetails, storedKeys,
  } = usePrivacyTransfer();

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const arcChain = chains.find((c) => c.id === "arc");
  const realArcBalance = arcChain?.balance ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0B0F]">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-lg font-semibold tracking-tight text-white">
          <span className="text-gradient">ArcFlow</span>
        </span>
        <ConnectWallet
          isConnected={isConnected}
          address={address}
          onOpenModal={() => setIsWalletModalOpen(true)}
        />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 sm:px-10">
        <UnifiedBalanceDisplay total={totalUnified} isLoading={isLoading} isConnected={isConnected} />
        <ChainBreakdown chains={chains} isConnected={isConnected} />
        <SendFunds
          isConnected={isConnected} totalUnified={totalUnified} realArcBalance={realArcBalance}
          isPrivateMode={isPrivateMode} onTogglePrivacy={togglePrivacy} generateViewingKey={generateViewingKey}
        />
        <AddFundsCard isConnected={isConnected} />
        <AuditorPanel storedKeys={storedKeys} revealTransactionDetails={revealTransactionDetails} />
        <ArcAgentPanel />
      </main>

      <Footer />

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  );
}