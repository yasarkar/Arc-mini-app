"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
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
  ChevronRight,
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

// Smooth number interpolation hook for balance changes
function useAnimatedNumber(targetValue: number, duration = 600) {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const prevValueRef = useRef(targetValue);
  const startTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = targetValue;
    if (startValue === endValue) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestampRef.current) startTimestampRef.current = timestamp;
      const progress = Math.min((timestamp - startTimestampRef.current) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const nextValue = startValue + (endValue - startValue) * easeProgress;
      setCurrentValue(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = endValue;
        startTimestampRef.current = null;
      }
    };

    startTimestampRef.current = null;
    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration]);

  return currentValue;
}

// =========================================================================
// Unified Balance
// =========================================================================
function UnifiedBalanceDisplay({
  total,
  isArcLoading,
  isConnected,
}: {
  total: number;
  isLoading?: boolean;
  isArcLoading?: boolean;
  isConnected: boolean;
}) {
  const animatedTotal = useAnimatedNumber(total, 600);

  const display = animatedTotal.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const showInitialSkeleton = isConnected && isArcLoading;

  return (
    <div className="text-center select-none flex flex-col items-center">
      <p className="mb-3 text-[11px] font-display font-bold uppercase tracking-[0.25em] text-zinc-500">
        UNIFIED BALANCE
      </p>

      {showInitialSkeleton ? (
        <div className="h-16 sm:h-20 w-64 sm:w-80 rounded-2xl bg-white/[0.03] animate-pulse border border-white/10 flex items-center justify-center my-1">
          <span className="text-2xl font-mono text-zinc-500 font-bold tracking-widest">$ •••.••</span>
        </div>
      ) : (
        <h1 className="text-6xl sm:text-7xl font-display font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all duration-300">
          ${display}
        </h1>
      )}

      {isConnected && !showInitialSkeleton && (
        <p className="mt-3 text-sm font-body text-zinc-400">
          ≈ {display} USDC —{" "}
          <span className="text-zinc-600">tüm ağlar birleşik</span>
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
    <div className="group flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-300 hover:bg-white/[0.04]">
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
            <span className="text-sm font-body font-semibold text-white">{chain.name}</span>
            <span className="rounded-[5px] bg-[#22C55E]/10 px-2 py-0.5 text-[10px] font-display font-bold uppercase tracking-wider text-arc-green border border-[#22C55E]/20">
              Canlı
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-500">{chain.symbol}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold font-mono tabular-nums text-white">
          {chain.balance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })}{" "}
          <span className="font-normal font-mono text-zinc-400">{chain.symbol}</span>
        </span>
      </div>
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
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isConnected) return null;

  // Sort chains descending by USDC balance
  const sortedChains = [...chains].sort((a, b) => b.balance - a.balance);

  // Take top 5 or all if expanded
  const visibleChains = isExpanded ? sortedChains : sortedChains.slice(0, 5);
  const hasMore = sortedChains.length > 5;

  return (
    <div className="mx-auto mt-8 w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-white/[0.02] backdrop-blur-md shadow-[0_0_24px_rgba(255,255,255,0.06)] transition-all duration-300">
      <div className="border-b border-white/10 px-5 py-3.5 flex items-center justify-between">
        <h2 className="text-xs font-display font-bold uppercase tracking-[0.15em] text-zinc-400">
          NETWORK BREAKDOWN
        </h2>
        <span className="text-[10px] font-mono text-zinc-500">
          {sortedChains.length} Ağ
        </span>
      </div>
      <div className="divide-y divide-white/10 px-2 py-1">
        {visibleChains.map((chain) => (
          <ChainRow key={chain.id} chain={chain} />
        ))}
      </div>
      {hasMore && (
        <div className="border-t border-white/10 bg-white/[0.01] p-1.5 text-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-display font-semibold uppercase tracking-wider text-zinc-400 transition-all duration-300 hover:bg-white/[0.05] hover:text-white active:scale-[0.98]"
          >
            <span>{isExpanded ? "Daha Az Görüntüle" : "Daha Fazlasını Görüntüle"}</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-sky-sync transition-transform" />
            ) : (
              <ChevronDown className="h-4 w-4 text-sky-sync transition-transform" />
            )}
          </button>
        </div>
      )}
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
        className="group glass-panel flex w-full items-center justify-between px-5 py-4 border border-white/20 transition-all duration-300 hover:bg-white/[0.04] hover:shadow-[0_0_32px_rgba(172,198,233,0.1)] active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-sync/10 border border-sky-sync/20">
            <ArrowDownToLine className="h-5 w-5 text-sky-sync" />
          </div>
          <div className="text-left font-body">
            <p className="text-sm font-semibold text-white">Add Funds via CCTP</p>
            <p className="text-xs text-zinc-400">
              Bridge USDC from Ethereum, Base, Arbitrum, Solana
            </p>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-zinc-300" />
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
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-300 ${isPrivateMode
          ? "border-purple-500/30 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.12)]"
          : "border-white/[0.06] bg-white/[0.02]"
        }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 ${isPrivateMode ? "bg-purple-500/20" : "bg-zinc-800"
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
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-out focus:outline-none ${isPrivateMode ? "bg-purple-500" : "bg-zinc-700"
          }`}
      >
        <span
          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${isPrivateMode ? "translate-x-[22px]" : "translate-x-[3px]"
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
      {isPrivateMode && isActive && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-[11px] text-purple-300 animate-pulse text-left">
          <Shield className="h-4 w-4 text-purple-400 flex-shrink-0" />
          <span>ZK Proof: Kriptografik Sıfır Bilgi kanıtı üretiliyor...</span>
        </div>
      )}
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
// Send Funds — Supports Dynamic Source Chain & Circle Gateway Unified Balance
// =========================================================================
const SUPPORTED_SOURCE_CHAINS = [
  { id: "Arc_Testnet", name: "Arc Testnet", chainId: 5042002, balanceKey: "arc" },
  { id: "Polygon_Amoy", name: "Polygon Amoy", chainId: 80002, balanceKey: "polygon" },
  { id: "Ethereum_Sepolia", name: "Ethereum Sepolia", chainId: 11155111, balanceKey: "ethereum" },
  { id: "Base_Sepolia", name: "Base Sepolia", chainId: 84532, balanceKey: "base" },
  { id: "Arbitrum_Sepolia", name: "Arbitrum Sepolia", chainId: 421614, balanceKey: "arbitrum" },
  { id: "HyperEVM_Testnet", name: "HyperEVM Testnet", chainId: 998, balanceKey: "hyperEvm" },
  { id: "Optimism_Sepolia", name: "OP Sepolia", chainId: 11155420, balanceKey: "optimism" },
];

function SendFunds({
  isConnected,
  totalUnified,
  realArcBalance,
  isPrivateMode,
  onTogglePrivacy,
  generateViewingKey,
  executeSend,
  sendStatus,
  sendError,
  resetSend,
  chains = [],
}: {
  isConnected: boolean;
  totalUnified: number;
  realArcBalance: number;
  isPrivateMode: boolean;
  onTogglePrivacy: () => void;
  generateViewingKey: (txHash: string, details: PrivateTxDetails) => Promise<string>;
  executeSend: (
    toAddress: string,
    amount: number,
    sourceChain?: string,
    useUnifiedBalance?: boolean
  ) => Promise<void>;
  sendStatus: SendStatus;
  sendError: string | null;
  resetSend: () => void;
  chains?: ChainBalance[];
}) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [toAddress, setToAddress] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [sourceChain, setSourceChain] = useState<string>("Arc_Testnet");
  const [useUnifiedBalance, setUseUnifiedBalance] = useState<boolean>(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const [lastViewingKey, setLastViewingKey] = useState<string | null>(null);
  const [txCompleted, setTxCompleted] = useState(false);

  // Selected source chain balance helper
  const selectedChainObj = SUPPORTED_SOURCE_CHAINS.find((c) => c.id === sourceChain) || SUPPORTED_SOURCE_CHAINS[0];
  const selectedChainBalance = useMemo(() => {
    const matched = chains.find((c) => c.id === selectedChainObj.balanceKey);
    return matched ? matched.balance : 0;
  }, [chains, selectedChainObj]);

  useEffect(() => {
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

      setTxCompleted(true);
      generateViewingKey(mockDetails.txHash, mockDetails)
        .then((vkey) => {
          setLastViewingKey(vkey);
        })
        .catch((e) => {
          console.error("Failed to generate viewing key in SendFunds:", e);
        });
    }
  }, [sendStatus, txCompleted, isPrivateMode, toAddress, amountStr, generateViewingKey]);

  const handleSend = useCallback(async () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    setTxCompleted(false);
    setLastViewingKey(null);
    setSwitchError(null);

    // Network Switching Check if not using Unified Balance
    if (!useUnifiedBalance && chainId && selectedChainObj.chainId && chainId !== selectedChainObj.chainId) {
      if (switchChainAsync) {
        try {
          await switchChainAsync({ chainId: selectedChainObj.chainId });
        } catch (err: any) {
          setSwitchError(`Lütfen cüzdanınızda ${selectedChainObj.name} ağına geçişi onaylayın.`);
          return;
        }
      }
    }

    await executeSend(toAddress.trim(), amount, sourceChain, useUnifiedBalance);
  }, [amountStr, toAddress, executeSend, sourceChain, useUnifiedBalance, chainId, selectedChainObj, switchChainAsync]);

  const amount = parseFloat(amountStr) || 0;
  const availableBalance = useUnifiedBalance ? totalUnified : selectedChainBalance;
  const insufficient = isConnected && amount > availableBalance;

  if (!isConnected) return null;

  const accentBorder = isPrivateMode ? "border-purple-500/30" : "border-white/20";
  const accentHeader = isPrivateMode
    ? "text-purple-400 font-display font-bold uppercase tracking-wider"
    : "text-zinc-400 font-display font-bold uppercase tracking-wider";

  return (
    <div className="mx-auto mt-8 w-full max-w-md">
      <div
        className={`glass-panel overflow-hidden transition-all duration-300 border border-white/20 bg-white/[0.02] backdrop-blur-md ${
          isPrivateMode
            ? "shadow-[0_0_24px_rgba(168,85,247,0.1)] border-purple-500/20"
            : "shadow-[0_0_24px_rgba(255,255,255,0.03)]"
        }`}
      >
        <div className={`border-b px-5 py-3.5 transition-colors duration-300 ${accentBorder}`}>
          <h2 className={`text-xs transition-colors duration-300 ${accentHeader}`}>
            PARA GÖNDER (EVRENSEL TRANSFER)
          </h2>
        </div>
        <div className="p-5">
          <div className="mb-4 space-y-3">
            <PrivacyToggle isPrivateMode={isPrivateMode} onToggle={onTogglePrivacy} />

            {/* Circle Gateway Unified Balance Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-sky-sync/20 bg-sky-sync/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-sync/20">
                  <Zap className="h-4 w-4 text-sky-sync" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Circle Gateway</p>
                  <p className="text-xs text-zinc-400">Unified Balance (Tüm Ağlar)</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useUnifiedBalance}
                onClick={() => setUseUnifiedBalance(!useUnifiedBalance)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-out focus:outline-none ${
                  useUnifiedBalance ? "bg-sky-sync" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
                    useUnifiedBalance ? "translate-x-[22px]" : "translate-x-[3px]"
                  }`}
                  style={{ height: "18px", width: "18px" }}
                />
              </button>
            </div>
          </div>

          {sendStatus === "idle" || sendStatus === "error" ? (
            <div className="space-y-4">
              {/* Source Chain Selector */}
              {!useUnifiedBalance ? (
                <div>
                  <label className="mb-1.5 block text-xs font-display font-semibold uppercase tracking-wider text-zinc-400">
                    Kaynak Ağ (From Network)
                  </label>
                  <select
                    value={sourceChain}
                    onChange={(e) => setSourceChain(e.target.value)}
                    className="w-full rounded-[5px] border border-white/10 bg-[#161b22] px-4 py-2.5 text-xs font-body text-white outline-none cursor-pointer transition-all duration-300 focus:border-sky-sync/50 [color-scheme:dark]"
                  >
                    {SUPPORTED_SOURCE_CHAINS.map((c) => {
                      const matched = chains.find((ch) => ch.id === c.balanceKey);
                      const bal = matched ? matched.balance : 0;
                      return (
                        <option key={c.id} value={c.id} className="bg-[#161b22] text-white">
                          {c.name} — {bal.toFixed(2)} USDC
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  <span>Tüm desteklenen ağlardaki USDC bakiyeleri otomatik birleştirilerek gönderilecektir.</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-display font-semibold uppercase tracking-wider text-zinc-400">
                  Alıcı Adresi
                </label>
                <input
                  type="text"
                  placeholder="0x... veya cüzdan adresi"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  className="w-full rounded-[5px] border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm font-body text-white placeholder-zinc-600 outline-none transition-all duration-300 focus:border-sky-sync/50 focus:shadow-[0_0_12px_rgba(172,198,233,0.15)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-display font-semibold uppercase tracking-wider text-zinc-400">
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
                    className="w-full rounded-[5px] border border-white/10 bg-white/[0.02] px-4 py-2.5 pr-16 text-sm font-mono text-white placeholder-zinc-600 outline-none transition-all duration-300 focus:border-sky-sync/50 focus:shadow-[0_0_12px_rgba(172,198,233,0.15)]"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-zinc-500">
                    USDC
                  </span>
                </div>
                {amount > 0 && (
                  <p className="mt-1.5 text-xs font-mono text-zinc-500">
                    Kullanılabilir: {availableBalance.toFixed(2)} USDC (
                    {useUnifiedBalance ? "Birleşik Bakiye" : selectedChainObj.name})
                  </p>
                )}
              </div>

              {(sendError || switchError) && (
                <div className="flex items-start gap-2 rounded-[5px] bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 border border-red-500/10">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <p className="text-xs font-body text-red-300">{sendError || switchError}</p>
                </div>
              )}

              <button
                type="button"
                disabled={!toAddress.trim() || amount <= 0 || insufficient}
                onClick={handleSend}
                className={`flex w-full items-center justify-center gap-2 rounded-[5px] px-5 py-3 text-sm font-display font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 ${
                  isPrivateMode
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-[0_0_20px_rgba(124,58,237,0.25)]"
                    : "bg-gradient-to-r from-validator-blue to-sky-sync hover:shadow-[0_0_20px_rgba(172,198,233,0.25)]"
                }`}
              >
                <Send className="h-4 w-4" />
                {insufficient ? "Yetersiz Bakiye" : "EVRENSEL GÖNDERİMİ BAŞLAT"}
              </button>
            </div>
          ) : (
            <div className="space-y-4 font-body">
              <Stepper status={sendStatus} isPrivateMode={isPrivateMode} />
              {sendStatus === "success" && lastViewingKey && (
                <ViewingKeyDisplay viewingKey={lastViewingKey} />
              )}
              {sendStatus === "success" && (
                <button
                  type="button"
                  onClick={() => {
                    setToAddress("");
                    setAmountStr("");
                    setLastViewingKey(null);
                    resetSend();
                  }}
                  className="mt-2 w-full rounded-[5px] border border-white/10 px-5 py-2.5 text-sm font-display font-bold text-zinc-400 transition-all duration-300 hover:border-white/20 hover:text-white active:scale-[0.98]"
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
  revealTransactionDetails: (key: string) => Promise<PrivateTxDetails | null>;
}) {
  const [inputKey, setInputKey] = useState("");
  const [revealedTx, setRevealedTx] = useState<PrivateTxDetails | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);

  const handleReveal = useCallback(async () => {
    const trimmed = inputKey.trim();
    if (!trimmed) return;
    const result = await revealTransactionDetails(trimmed);
    if (result) { setRevealedTx(result); setRevealError(null); }
    else { setRevealedTx(null); setRevealError("Geçersiz veya süresi dolmuş görüntüleme anahtarı."); }
  }, [inputKey, revealTransactionDetails]);

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div className="glass-panel overflow-hidden border border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.03)]">
        <div className="border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-zinc-500" />
            <h2 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400">Gizli İşlem Denetleme Paneli</h2>
          </div>
          <p className="mt-1 text-[10px] font-body text-zinc-500">Auditor Tools — Bir Viewing Key girerek gizli işlem detaylarını doğrulayın.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="text" placeholder="vkey_arc_..." value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReveal()}
              className="flex-1 rounded-[5px] border border-white/10 bg-white/[0.02] px-4 py-2.5 font-mono text-xs text-white placeholder-zinc-600 outline-none transition-all duration-300 focus:border-amber-500/50 focus:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            />
            <button
              type="button" onClick={handleReveal} disabled={!inputKey.trim()}
              className="flex items-center gap-1.5 rounded-[5px] bg-[#e9a13f] px-4 py-2.5 text-xs font-display font-bold text-black transition-all duration-300 hover:bg-[#e9a13f]/90 active:scale-[0.97] disabled:opacity-30"
            >
              <KeyRound className="h-3.5 w-3.5" /> Reveal
            </button>
          </div>
          {revealError && (
            <div className="flex items-start gap-2 rounded-[5px] bg-red-500/10 px-3 py-2.5 ring-1 ring-red-500/20 border border-red-500/10">
              <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
              <p className="text-xs font-body text-red-300">{revealError}</p>
            </div>
          )}
          {revealedTx && (
            <div className="rounded-[5px] border border-[#22C55E]/20 bg-[#22C55E]/5 p-4 transition-all duration-500">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-arc-green" />
                <span className="text-xs font-display font-bold text-arc-green">DOĞRULANDI</span>
              </div>
              <div className="space-y-2">
                {[{ l: "Gönderen", v: truncateAddress(revealedTx.sender) }, { l: "Alıcı", v: truncateAddress(revealedTx.recipient) }, { l: "Tutar", v: `${revealedTx.amount.toFixed(2)} ${revealedTx.symbol}` }, { l: "Zaman", v: formatTime(revealedTx.timestamp) }].map((r) => (
                  <div key={r.l} className="flex justify-between">
                    <span className="text-[11px] font-body text-zinc-500">{r.l}</span>
                    <span className="text-xs font-mono text-white">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {storedKeys.length > 0 && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="mb-2 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500 text-left">
                Üretilen Görüntüleme Anahtarlarım
              </p>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {storedKeys.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setInputKey(item.key)}
                    className="group flex w-full items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2 text-left transition-all hover:bg-white/[0.05] hover:border-purple-500/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[10px] text-zinc-400 group-hover:text-purple-300">
                        {item.key}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono">
                        {item.details.amount} USDC → {truncateAddress(item.details.recipient)}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-purple-300" />
                  </button>
                ))}
              </div>
            </div>
          )}
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
      <p className="text-[10px] font-display font-bold uppercase tracking-wider text-zinc-400">
        OTONOM GÖREVLER
      </p>
      <div className="space-y-2">
        {active.map((job) => (
          <div
            key={job.jobId}
            className="flex items-center gap-3 rounded-[5px] border border-white/10 bg-white/[0.02] px-4 py-2.5"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-sync opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-sync" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-body font-semibold text-white">
                {job.description.slice(0, 50)}
              </p>
              <p className="text-[10px] font-mono text-zinc-400">
                ERC-8183 · {job.actionType ? (job.actionType === "bridge" ? "Bridge" : job.actionType === "swap" ? `Takas (${job.fromToken}→${job.toToken})` : job.actionType === "stake" ? "Staking" : "Transfer") : "Transfer"} · {job.frequency ?? "one-time"} · {job.amount > 0 ? `${job.amount} ${job.fromToken || "USDC"}` : "Değişken"}
              </p>
            </div>
            <Activity className="h-3.5 w-3.5 flex-shrink-0 text-[#acc6e9]" />
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
    <div className="mt-3 rounded-[5px] border border-[#acc6e9]/20 bg-gradient-to-br from-[#2f578c]/5 to-[#acc6e9]/5 p-4 transition-all duration-300">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-[#e9a13f]" />
        <span className="text-xs font-display font-bold uppercase tracking-wider text-sky-sync">ERC-8183 Job Escrow</span>
      </div>

      <div className="mb-3 space-y-1.5 text-left">
        <p className="text-sm font-body font-semibold text-white">{job.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-mono text-zinc-400">
          <span>⚙️ İşlem: {job.actionType ? (job.actionType === "bridge" ? "Bridge" : job.actionType === "swap" ? "Takas (Swap)" : job.actionType === "stake" ? "Staking" : "Transfer") : "Transfer"}</span>
          {job.amount > 0 ? (
            <span>💰 Bütçe: {job.amount > 50 ? `${job.amount} ${job.fromToken || "USDC"}` : `%${job.amount}`}</span>
          ) : (
            <span>💰 Bütçe: Tüm {job.fromToken || "USDC"}</span>
          )}
          {job.actionType === "swap" && <span>🔄 Değişim: {job.fromToken} → {job.toToken}</span>}
          {job.sourceChain && <span>⛓ Kaynak: {job.sourceChain}</span>}
          {job.targetChain && job.actionType !== "swap" && job.actionType !== "stake" && <span>🎯 Hedef: {job.targetChain}</span>}
          {job.conditionType && job.conditionAmount && (
            <span>⏱ Tetikleyici: {job.conditionType === "balance" ? `Bakiye > ${job.conditionAmount} USDC` : `Fiyat < ${job.conditionAmount} USD`}</span>
          )}
          {job.frequency && <span>🔄 Sıklık: {job.frequency}</span>}
          {job.privacyMode && <span>🔒 Gizli Mod</span>}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={approving || rejecting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-[#22C55E]/80 px-3 py-2 text-xs font-display font-bold text-white transition-all duration-300 hover:bg-[#22C55E] active:scale-[0.97] disabled:opacity-50"
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
          className="flex items-center justify-center gap-1.5 rounded-[5px] border border-red-500/30 px-3 py-2 text-xs font-display font-bold text-red-300 transition-all duration-300 hover:bg-red-500/10 active:scale-[0.97] disabled:opacity-50"
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
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isUser ? "bg-arc-blue/20" : "bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
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
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
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
    <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
      <input
        ref={inputRef}
        type="text"
        placeholder="Ajana finansal bir görev verin..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        disabled={disabled}
        className="flex-1 rounded-[5px] border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm font-body text-white placeholder-zinc-600 outline-none transition-all duration-300 focus:border-sky-sync/50 focus:shadow-[0_0_12px_rgba(172,198,233,0.15)] disabled:opacity-30"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!input.trim() || disabled}
        className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-gradient-to-r from-validator-blue to-sky-sync transition-all duration-300 hover:shadow-[0_0_16px_rgba(172,198,233,0.3)] active:scale-[0.93] disabled:opacity-30"
      >
        <SendHorizonal className="h-4 w-4 text-white" />
      </button>
    </div>
  );
}

// =========================================================================
// AI Agent — Full Panel
// =========================================================================
function ArcAgentPanel({
  isConnected,
  activeAddress,
  chains,
  executeSend,
  sendStatus,
  sendError,
  connectedChainId,
}: {
  isConnected: boolean;
  activeAddress: string | null;
  chains: any[];
  executeSend: (toAddress: string, amount: number) => Promise<void>;
  sendStatus: string;
  sendError: string | null;
  connectedChainId: number | null;
}) {
  const { messages, activeJobs, sendMessage, approveJob, rejectJob, isChatOpen, toggleChat } = useArcAgent({
    isConnected,
    activeAddress,
    chains,
    executeSend,
    sendStatus,
    sendError,
    connectedChainId,
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div className="glass-panel overflow-hidden border border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.03)]">
        {/* Header — clickable to collapse */}
        <button
          type="button"
          onClick={toggleChat}
          className="flex w-full items-center justify-between border-b border-white/10 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
              <Sparkles className="h-3.5 w-3.5 text-sky-sync" />
            </div>
            <div className="text-left">
              <h2 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400">
                Arc Assistant
              </h2>
              <p className="text-[10px] font-body text-zinc-500">ERC-8004 Onchain AI Agent</p>
            </div>
          </div>
          {isChatOpen ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
        </button>

        {/* Collapsible content */}
        {isChatOpen && (
          <>
            {/* Active Jobs */}
            {activeJobs.filter((j) => j.status === "running" || j.status === "escrowed").length > 0 && (
              <div className="border-b border-white/10 px-5 py-4">
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

  const handleDisconnect = () => {
    disconnect();
    if (typeof window !== "undefined") {
      localStorage.removeItem("solana_address");
      localStorage.removeItem("cosmos_address");
      window.dispatchEvent(new Event("wallet-connection-update"));
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex flex-col items-end gap-3">
        <button type="button" onClick={handleDisconnect} className="wallet-button-ghost">
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
  const { totalUnified, chains, isLoading, isArcLoading, isConnected, activeAddress, connectedChainId } = useUnifiedBalance();
  const {
    isPrivateMode, togglePrivacy, generateViewingKey,
    revealTransactionDetails, storedKeys,
  } = usePrivacyTransfer();

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const arcChain = chains.find((c) => c.id === "arc");
  const realArcBalance = arcChain?.balance ?? 0;

  const { sendStatus, sendError, executeSend, resetSend } =
    useUniversalSend(totalUnified, realArcBalance, isConnected);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-arc-bg-gradient-start to-arc-bg-gradient-end">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-lg font-display font-bold tracking-tight text-white uppercase">
          <span className="bg-gradient-to-r from-white via-sky-sync to-white/70 bg-clip-text text-transparent">ArcFlow</span>
        </span>
        <div className="flex items-center gap-3">
          <a
            href="/history"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-display font-bold text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
          >
            <Shield className="h-4 w-4 text-purple-400" />
            <span>İşlem Geçmişi</span>
          </a>
          <ConnectWallet
            isConnected={isConnected}
            address={activeAddress ?? undefined}
            onOpenModal={() => setIsWalletModalOpen(true)}
          />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-8 sm:px-10">
        <UnifiedBalanceDisplay total={totalUnified} isLoading={isLoading} isArcLoading={isArcLoading} isConnected={isConnected} />
        <ChainBreakdown chains={chains} isConnected={isConnected} />
        <SendFunds
          isConnected={isConnected}
          totalUnified={totalUnified}
          realArcBalance={realArcBalance}
          isPrivateMode={isPrivateMode}
          onTogglePrivacy={togglePrivacy}
          generateViewingKey={generateViewingKey}
          executeSend={executeSend}
          sendStatus={sendStatus}
          sendError={sendError}
          resetSend={resetSend}
          chains={chains}
        />
        <AddFundsCard isConnected={isConnected} />
        <AuditorPanel storedKeys={storedKeys} revealTransactionDetails={revealTransactionDetails} />
        <ArcAgentPanel
          isConnected={isConnected}
          activeAddress={activeAddress}
          chains={chains}
          executeSend={executeSend}
          sendStatus={sendStatus}
          sendError={sendError}
          connectedChainId={connectedChainId}
        />
      </main>

      <Footer />

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  );
}