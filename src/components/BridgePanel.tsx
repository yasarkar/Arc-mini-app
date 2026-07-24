"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ArrowRightLeft,
  ArrowUpDown,
  Zap,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Shield,
  ShieldAlert,
  Send,
  X,
  History,
  FileSpreadsheet,
  Check,
  FlaskConical,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useBridge, type BridgeExecutionParams } from "@/hooks/useBridge";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import { BridgeTestHarness, type TestScenarioResult } from "@/lib/bridgeTestHarness";

// ---------------------------------------------------------------------------
// Supported Chain Definitions with Logos & Colors
// ---------------------------------------------------------------------------
export interface ChainOption {
  id: string;
  name: string;
  symbol: string;
  color: string;
  balanceKey: string;
}

export const BRIDGE_CHAINS: ChainOption[] = [
  { id: "Arc_Testnet", name: "Arc Testnet", symbol: "USDC", color: "#00D4AA", balanceKey: "arc" },
  { id: "Ethereum_Sepolia", name: "Ethereum Sepolia", symbol: "USDC", color: "#627EEA", balanceKey: "ethereum" },
  { id: "Polygon_Amoy_Testnet", name: "Polygon Amoy", symbol: "USDC", color: "#8247E5", balanceKey: "polygon" },
  { id: "Base_Sepolia", name: "Base Sepolia", symbol: "USDC", color: "#0052FF", balanceKey: "base" },
  { id: "Arbitrum_Sepolia", name: "Arbitrum Sepolia", symbol: "USDC", color: "#2D374B", balanceKey: "arbitrum" },
  { id: "HyperEVM_Testnet", name: "HyperEVM Testnet", symbol: "USDC", color: "#00FFA3", balanceKey: "hyperEvm" },
  { id: "Optimism_Sepolia", name: "OP Sepolia", symbol: "USDC", color: "#FF0420", balanceKey: "optimism" },
];

// ---------------------------------------------------------------------------
// BridgePanel Component — Phase 5 Final Integration
// ---------------------------------------------------------------------------
export default function BridgePanel() {
  const { isConnected } = useAccount();
  const { chains } = useUnifiedBalance();

  const {
    loading,
    error,
    stepStatus,
    lastResult,
    isEstimating,
    pendingRecoveryTx,
    historyLogs,
    executeBridge,
    retryBridge,
    estimateBridgeCosts,
    clearPendingTx,
    resetBridge,
    clearLogs,
  } = useBridge();

  // Form State
  const [fromChain, setFromChain] = useState<string>("Ethereum_Sepolia");
  const [toChain, setToChain] = useState<string>("Arc_Testnet");
  const [amountStr, setAmountStr] = useState<string>("");
  const [transferSpeed, setTransferSpeed] = useState<"FAST" | "SLOW">("FAST");
  const [useForwarder, setUseForwarder] = useState<boolean>(true);
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [customFeeAmount, setCustomFeeAmount] = useState<string>("");
  const [maxFee, setMaxFee] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [diagnosticResults, setDiagnosticResults] = useState<TestScenarioResult[] | null>(null);
  const [estimatedData, setEstimatedData] = useState<any | null>(null);

  // Source chain balance lookup
  const fromChainObj = useMemo(
    () => BRIDGE_CHAINS.find((c) => c.id === fromChain) || BRIDGE_CHAINS[0],
    [fromChain]
  );

  const fromChainBalance = useMemo(() => {
    const matched = chains.find((c) => c.id === fromChainObj.balanceKey);
    return matched ? matched.balance : 0;
  }, [chains, fromChainObj]);

  // Swap Source & Destination Chains
  const handleSwapChains = useCallback(() => {
    setFromChain(toChain);
    setToChain(fromChain);
    setEstimatedData(null);
  }, [fromChain, toChain]);

  // Set MAX amount
  const handleSetMax = useCallback(() => {
    setAmountStr(fromChainBalance.toFixed(2));
  }, [fromChainBalance]);

  // Calculate estimated costs
  const handleEstimateCosts = useCallback(async () => {
    if (!amountStr || parseFloat(amountStr) <= 0) return;
    try {
      const estimate = await estimateBridgeCosts({
        fromChain,
        toChain,
        amount: amountStr,
        recipientAddress: recipientAddress.trim() || undefined,
        useForwarder,
        transferSpeed,
        customFeeAmount: customFeeAmount.trim() || undefined,
        maxFee: maxFee.trim() || undefined,
      });
      setEstimatedData(estimate);
    } catch {
      // Error handled in hook
    }
  }, [amountStr, fromChain, toChain, recipientAddress, useForwarder, transferSpeed, customFeeAmount, maxFee, estimateBridgeCosts]);

  // Execute Bridge Submission
  const handleBridgeSubmit = useCallback(async () => {
    if (!amountStr || parseFloat(amountStr) <= 0) return;

    const params: BridgeExecutionParams = {
      fromChain,
      toChain,
      amount: amountStr,
      recipientAddress: recipientAddress.trim() || undefined,
      useForwarder,
      transferSpeed,
      customFeeAmount: customFeeAmount.trim() || undefined,
      maxFee: maxFee.trim() || undefined,
    };

    try {
      await executeBridge(params);
    } catch {
      // Error state handled inside useBridge
    }
  }, [fromChain, toChain, amountStr, recipientAddress, useForwarder, transferSpeed, customFeeAmount, maxFee, executeBridge]);

  // Run Diagnostic Harness Tests
  const handleRunDiagnostics = useCallback(async () => {
    const results = await BridgeTestHarness.runAllDiagnosticTests();
    setDiagnosticResults(results);
  }, []);

  const numAmount = parseFloat(amountStr) || 0;
  const numCustomFee = parseFloat(customFeeAmount) || 0;
  const numMaxFee = parseFloat(maxFee) || 0;
  const requiredBalance = numAmount + numCustomFee;
  const isArcMinViolation = fromChain === "Arc_Testnet" && numAmount > 0 && numAmount < 1.50;
  const isArcMaxFeeViolation = fromChain === "Arc_Testnet" && maxFee.trim() !== "" && numMaxFee >= numAmount;
  const isInsufficient = isConnected && requiredBalance > fromChainBalance;

  // Memoized dynamic fees extracted from SDK response
  const estimatedFees = useMemo(() => {
    if (!estimatedData || !estimatedData.fees) return null;
    const feesList = estimatedData.fees as { amount: string | null; type: string }[];
    const kitFee = parseFloat(feesList.find((f) => f.type === "kit")?.amount || "0");
    const providerFee = parseFloat(feesList.find((f) => f.type === "provider")?.amount || "0");
    const forwarderFee = parseFloat(feesList.find((f) => f.type === "forwarder")?.amount || "0");
    return { kitFee, providerFee, forwarderFee };
  }, [estimatedData]);

  const kitFee = estimatedFees?.kitFee ?? numCustomFee;
  const providerFee = estimatedFees?.providerFee ?? (transferSpeed === "SLOW" ? 0 : 0.0001);
  const forwarderFee = estimatedFees?.forwarderFee ?? (useForwarder ? 0.0002 : 0);
  const totalWalletDebit = numAmount + kitFee;
  const netReceived = Math.max(0, numAmount - providerFee - forwarderFee);

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* ------------------------------------------------------------------- */}
      {/* SECTION 1: Pending Recovery Banner (Top Priority UI)                */}
      {/* ------------------------------------------------------------------- */}
      {pendingRecoveryTx && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-5 shadow-2xl backdrop-blur-md animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-amber-300">
                  Tamamlanmamış Transfer Algılandı!
                </h3>
                <p className="mt-1 text-xs font-body text-zinc-300 leading-relaxed">
                  <span className="font-semibold text-white">
                    {pendingRecoveryTx.params.fromChain} → {pendingRecoveryTx.params.toChain}
                  </span>{" "}
                  arasında <span className="font-mono font-bold text-amber-300">{pendingRecoveryTx.params.amount} USDC</span> tutarında bir CCTP işlemi bekleniyor.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearPendingTx}
              className="text-zinc-500 hover:text-white transition-colors"
              title="Bildirimi Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => retryBridge(pendingRecoveryTx)}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-display font-bold text-black transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Transferi Sürdür (Resume)
            </button>
            <button
              type="button"
              onClick={clearPendingTx}
              className="rounded-xl border border-amber-500/30 px-3.5 py-2 text-xs font-display font-semibold text-amber-300 transition-colors hover:bg-amber-500/10"
            >
              Yoksay (Dismiss)
            </button>
          </div>
        </div>
      )}

      {/* Main Bridge Card */}
      <div className="overflow-hidden rounded-3xl border border-[#21262d] bg-[#0d1117] p-6 shadow-2xl backdrop-blur-md sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-[#21262d] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-sync/30 bg-sky-sync/10 text-sky-sync shadow-[0_0_15px_rgba(172,198,233,0.15)]">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold uppercase tracking-wider text-white">
                Circle CCTP Arc Bridge
              </h2>
              <p className="text-xs font-body text-zinc-400">
                Ağlar Arası Anında ve Güvenli USDC Transferi
              </p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-display font-bold uppercase tracking-wider text-emerald-400">
            CCTPv2 Native
          </span>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 2: Source & Destination Chain Selector                     */}
        {/* ----------------------------------------------------------------- */}
        <div className="relative mb-6 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          {/* From Chain */}
          <div className="rounded-2xl border border-[#21262d] bg-[#161b22] p-4 transition-all focus-within:border-sky-sync/50">
            <span className="block text-[11px] font-display font-bold uppercase tracking-wider text-zinc-500 mb-2">
              KAYNAK AĞ (FROM)
            </span>
            <select
              value={fromChain}
              onChange={(e) => {
                setFromChain(e.target.value);
                setEstimatedData(null);
              }}
              className="w-full bg-transparent font-display font-bold text-sm text-white outline-none cursor-pointer [color-scheme:dark]"
            >
              {BRIDGE_CHAINS.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#161b22] text-white">
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between text-xs font-mono text-zinc-400 border-t border-[#21262d] pt-2">
              <span>Bakiye:</span>
              <span className="font-bold text-white">{fromChainBalance.toFixed(2)} USDC</span>
            </div>
          </div>

          {/* Swap Chains Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSwapChains}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#21262d] bg-[#161b22] text-sky-sync shadow-lg transition-all hover:scale-110 hover:bg-sky-sync/20 active:scale-95"
              title="Ağların Yönünü Değiştir"
            >
              <ArrowUpDown className="h-4 w-4 sm:hidden" />
              <ArrowRightLeft className="h-4 w-4 hidden sm:block" />
            </button>
          </div>

          {/* To Chain */}
          <div className="rounded-2xl border border-[#21262d] bg-[#161b22] p-4 transition-all focus-within:border-sky-sync/50">
            <span className="block text-[11px] font-display font-bold uppercase tracking-wider text-zinc-500 mb-2">
              HEDEF AĞ (TO)
            </span>
            <select
              value={toChain}
              onChange={(e) => {
                setToChain(e.target.value);
                setEstimatedData(null);
              }}
              className="w-full bg-transparent font-display font-bold text-sm text-white outline-none cursor-pointer [color-scheme:dark]"
            >
              {BRIDGE_CHAINS.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#161b22] text-white">
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between text-xs font-mono text-zinc-400 border-t border-[#21262d] pt-2">
              <span>Hedef Yetkisi:</span>
              <span className="font-bold text-emerald-400">Otomatik Mint</span>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 3: Amount Input & Arc Testnet Validation Rule              */}
        {/* ----------------------------------------------------------------- */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400">
              KÖPRÜLENECEK TUTAR
            </label>
            <button
              type="button"
              onClick={handleSetMax}
              className="text-xs font-mono font-bold text-sky-sync hover:underline"
            >
              MAX ({fromChainBalance.toFixed(2)})
            </button>
          </div>

          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => {
                setAmountStr(e.target.value);
                setEstimatedData(null);
              }}
              className="w-full rounded-2xl border border-[#21262d] bg-[#161b22] px-4 py-3.5 pr-20 font-mono text-base font-bold text-white placeholder-zinc-600 outline-none transition-all focus:border-sky-sync/50"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-zinc-400">
              USDC
            </span>
          </div>

          {/* Arc Testnet Min 1.50 USDC Rule Alert */}
          {fromChain === "Arc_Testnet" && (
            <div className="flex items-center gap-2 rounded-xl border border-sky-sync/20 bg-sky-sync/10 p-3 text-xs text-sky-sync">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>
                ℹ️ Arc Testnet transfers require a minimum of 1.50 USDC due to CCTPv2 fee limits.
              </span>
            </div>
          )}

          {isArcMinViolation && (
            <p className="text-xs font-body text-red-400">
              ⚠️ Minimum transfer tutarı 1.50 USDC&apos;dir.
            </p>
          )}

          {isArcMaxFeeViolation && (
            <p className="text-xs font-body text-red-400">
              ⚠️ Arc Testnet transfers require the maximum fee to be less than the transfer amount.
            </p>
          )}

          {isInsufficient && (
            <p className="text-xs font-body text-red-400">
              ⚠️ Yetersiz bakiye ({fromChainObj.name} bakiyeniz: {fromChainBalance.toFixed(2)} USDC, Gerekli Toplam: {requiredBalance.toFixed(2)} USDC).
            </p>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 4: Advanced Settings Accordion                             */}
        {/* ----------------------------------------------------------------- */}
        <div className="mb-6 rounded-2xl border border-[#21262d] bg-[#161b22] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-xs font-display font-bold text-zinc-300 transition-colors hover:bg-white/5"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              GELIŞMIŞ KÖPRÜ AYARLARI (ADVANCED)
            </span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="border-t border-[#21262d] p-5 space-y-4 text-xs font-body">
              {/* Transfer Speed Option */}
              <div>
                <label className="block text-zinc-400 font-display font-semibold uppercase tracking-wider mb-2">
                  CCTP Transfer Hızı
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransferSpeed("FAST")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      transferSpeed === "FAST"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold"
                        : "border-[#21262d] bg-[#0d1117] text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-display font-bold">
                      <Zap className="h-3.5 w-3.5 text-emerald-400" />
                      ⚡ FAST (Anında)
                    </div>
                    <p className="mt-1 text-[11px] font-normal text-zinc-500">
                      Hızlı yakma ve attestation (&lt;1dk)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransferSpeed("SLOW")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      transferSpeed === "SLOW"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold"
                        : "border-[#21262d] bg-[#0d1117] text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-display font-bold">
                      <Shield className="h-3.5 w-3.5 text-blue-400" />
                      🐢 SLOW ($0 CCTP)
                    </div>
                    <p className="mt-1 text-[11px] font-normal text-zinc-500">
                      Standart onay süresi (Sıfır protokol ücreti)
                    </p>
                  </button>
                </div>
              </div>

              {/* Automated Minting Forwarder Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-[#21262d] bg-[#0d1117] p-3.5">
                <div>
                  <p className="font-display font-bold text-white">Otomatik Minting (Forwarder Service)</p>
                  <p className="text-[11px] text-zinc-500">
                    Hedef ağda ekstra imza atmadan USDC bakiyeniz otomatik cüzdanınıza yansır.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useForwarder}
                  onClick={() => setUseForwarder(!useForwarder)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ${
                    useForwarder ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${
                      useForwarder ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Custom Recipient Address */}
              <div>
                <label className="block text-zinc-400 font-display font-semibold uppercase tracking-wider mb-1.5">
                  Özel Alıcı Adresi (Custom Recipient)
                </label>
                <input
                  type="text"
                  placeholder="0x... (Boş bırakılırsa bağlı cüzdana gider)"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full rounded-xl border border-[#21262d] bg-[#0d1117] px-4 py-2.5 font-mono text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Custom Fee Amount */}
              <div>
                <label className="block text-zinc-400 font-display font-semibold uppercase tracking-wider mb-1.5">
                  Geliştirici Ücreti (Custom Developer Fee - USDC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={customFeeAmount}
                  onChange={(e) => {
                    setCustomFeeAmount(e.target.value);
                    setEstimatedData(null);
                  }}
                  className="w-full rounded-xl border border-[#21262d] bg-[#0d1117] px-4 py-2.5 font-mono text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Max Fee Amount */}
              {transferSpeed === "FAST" && (
                <div>
                  <label className="block text-zinc-400 font-display font-semibold uppercase tracking-wider mb-1.5">
                    Maksimum Protokol Ücreti Limiti (Max Fee - USDC)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Örn: 0.10 (Boş bırakılırsa sınırsız)"
                    value={maxFee}
                    onChange={(e) => {
                      setMaxFee(e.target.value);
                      setEstimatedData(null);
                    }}
                    className="w-full rounded-xl border border-[#21262d] bg-[#0d1117] px-4 py-2.5 font-mono text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500/50"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    CCTP Fast ücreti bu limiti aşarsa işlem otomatik SLOW (Standart) moda geçer.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 5: Fee Breakdown Card                                      */}
        {/* ----------------------------------------------------------------- */}
        <div className="mb-6 rounded-2xl border border-[#21262d] bg-[#161b22] p-4 text-xs font-body space-y-2.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Köprü Tutarı (Bridge Amount):</span>
            <span className="font-mono font-bold text-white">{numAmount.toFixed(2)} USDC</span>
          </div>

          {kitFee > 0 && (
            <div className="flex items-center justify-between text-zinc-400">
              <span>Geliştirici Ücreti (Custom Fee):</span>
              <span className="font-mono text-purple-400">+{kitFee.toFixed(4)} USDC</span>
            </div>
          )}

          <div className="flex items-center justify-between text-zinc-400">
            <span>CCTP Protokol Ücreti (CCTP Fee):</span>
            <span className="font-mono text-emerald-400">
              {providerFee === 0 ? "$0.00 (Standard)" : `~${providerFee.toFixed(4)} USDC`}
            </span>
          </div>

          {useForwarder && (
            <div className="flex items-center justify-between text-zinc-400">
              <span>Yönlendirici Ücreti (Forwarder Fee):</span>
              <span className="font-mono text-amber-400">
                {forwarderFee === 0 ? "Hesaplanıyor..." : `~${forwarderFee.toFixed(4)} USDC`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#21262d] pt-2 text-zinc-300 font-semibold">
            <span>Toplam Cüzdandan Düşecek Tutar (Total Wallet Debit):</span>
            <span className="font-mono text-white font-bold">{totalWalletDebit.toFixed(2)} USDC</span>
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-[#21262d] pt-2 font-display font-bold text-white text-sm">
            <span>Tahmini Alıcıya Ulaşacak Net Tutar:</span>
            <span className="font-mono text-emerald-400 text-base">
              {netReceived.toFixed(2)} USDC
            </span>
          </div>

          <button
            type="button"
            onClick={handleEstimateCosts}
            disabled={isEstimating || numAmount <= 0}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#21262d] bg-[#0d1117] py-2 font-display font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            {isEstimating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-sync" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 text-sky-sync" />
            )}
            <span>Ücretleri Yeniden Hesapla (Recalculate Fees)</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
            <XCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-display font-bold text-red-400">Hata Oluştu</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* OKX Wallet & Security Info Banner */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-200">
          <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-display font-bold text-amber-300 block mb-0.5">
              OKX Wallet & Cüzdan İzin Uyarısı Hakkında
            </span>
            OKX Wallet ve bazı cüzdanlar, testnet sözleşmelerindeki EIP-712 imza isteklerini (permit) otomatik olarak engelleyebilir. Bu durumu önlemek amacıyla, köprüleme işlemlerinde toplu imza yerine sıralı zincir üstü onay yöntemi (sequential approve &amp; burn) etkinleştirilmiştir. Böylece cüzdanınızdan standart onay işlemleri ile güvenli bir şekilde köprüleme yapabilirsiniz.
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 6: Action Button                                           */}
        {/* ----------------------------------------------------------------- */}
        <button
          type="button"
          disabled={!isConnected || numAmount <= 0 || isArcMinViolation || isArcMaxFeeViolation || isInsufficient || loading}
          onClick={handleBridgeSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 font-display font-bold text-black shadow-lg shadow-emerald-950/30 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>İşlem İşleniyor...</span>
            </>
          ) : !isConnected ? (
            <span>Cüzdanınızı Bağlayın</span>
          ) : numAmount <= 0 ? (
            <span>Tutar Girin</span>
          ) : isInsufficient ? (
            <span>Yetersiz Bakiye</span>
          ) : isArcMinViolation ? (
            <span>Minimum 1.50 USDC Gerekli</span>
          ) : isArcMaxFeeViolation ? (
            <span>Limit Hatası (Max Fee Limit)</span>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span>KÖPRÜLEMEYI (BRIDGE) BAŞLAT</span>
            </>
          )}
        </button>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 7: Compliance History Logs Accordion                       */}
        {/* ----------------------------------------------------------------- */}
        <div className="mt-6 rounded-2xl border border-[#21262d] bg-[#161b22] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-between px-5 py-3 text-xs font-display font-bold text-zinc-300 transition-colors hover:bg-white/5"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" />
              KÖPRÜ UYUMLULUK GÜNLÜĞÜ (COMPLIANCE LOGS — {historyLogs.length})
            </span>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showHistory && (
            <div className="border-t border-[#21262d] p-4 text-xs font-mono space-y-3 max-h-60 overflow-y-auto">
              {historyLogs.length === 0 ? (
                <p className="text-zinc-500 text-center py-2">Henüz kayıtlı bir köprüleme günlüğü yok.</p>
              ) : (
                historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-[#21262d] bg-[#0d1117] p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {log.fromChain} → {log.toChain}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : log.status === "PARTIAL_RETRY"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Tutar: {log.amount} USDC</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>

                    {log.burnExplorerUrl && (
                      <a
                        href={log.burnExplorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-sky-sync hover:underline"
                      >
                        <span>Burn Explorer: {log.burnTxHash?.slice(0, 10)}...</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))
              )}

              {historyLogs.length > 0 && (
                <button
                  type="button"
                  onClick={clearLogs}
                  className="w-full text-center text-[11px] text-red-400 hover:underline pt-1"
                >
                  Günlükleri Temizle
                </button>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 8: E2E Diagnostic Test Harness Accordion                   */}
        {/* ----------------------------------------------------------------- */}
        <div className="mt-4 rounded-2xl border border-[#21262d] bg-[#161b22] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex w-full items-center justify-between px-5 py-3 text-xs font-display font-bold text-zinc-400 transition-colors hover:bg-white/5"
          >
            <span className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-purple-400" />
              E2E TEŞHIS TEST HARNESS (DEV DIAGNOSTICS)
            </span>
            {showDiagnostics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDiagnostics && (
            <div className="border-t border-[#21262d] p-4 text-xs font-body space-y-3">
              <p className="text-zinc-400 text-[11px]">
                Phase 1-5 entegrasyon kurallarını (Arc Min 1.50 USDC, Fee Monetization, Soft Error Recovery) otomatik simüle edin.
              </p>

              <button
                type="button"
                onClick={handleRunDiagnostics}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600/20 border border-purple-500/40 py-2.5 font-display font-bold text-purple-300 hover:bg-purple-600/30 transition-colors"
              >
                <FlaskConical className="h-4 w-4 text-purple-400" />
                E2E Senaryo Testlerini Çalıştır
              </button>

              {diagnosticResults && (
                <div className="space-y-2 pt-2">
                  {diagnosticResults.map((res, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-3 text-xs ${
                        res.passed
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-red-500/30 bg-red-500/10 text-red-300"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold font-display">
                        <span>{res.scenarioName}</span>
                        <span>{res.passed ? "PASSED ✅" : "FAILED ❌"}</span>
                      </div>
                      <p className="mt-1 text-[11px] font-body text-zinc-300 leading-relaxed">
                        {res.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Stepper Modal Overlay */}
      {(loading || stepStatus || lastResult) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#21262d] bg-[#0d1117] p-6 shadow-2xl text-white">
            <div className="mb-4 flex items-center justify-between border-b border-[#21262d] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white">
                  CCTP Bridge Canlı İlerleme Durumu
                </h3>
              </div>
              {!loading && (
                <button
                  type="button"
                  onClick={resetBridge}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-4 py-2">
              {[
                { id: "approve", label: "USDC İzni (Approve)", desc: "Kaynak ağda USDC kullanımı onaylanıyor" },
                { id: "burn", label: "USDC Yakma (Burn)", desc: "Circle CCTP sözleşmesinde USDC yakılıyor" },
                { id: "fetchAttestation", label: "Attestation Alınıyor", desc: "Circle Iris sunucusundan kriptografik imza alınıyor" },
                { id: "mint", label: "USDC Basma (Mint)", desc: "Hedef ağda USDC cüzdanınıza aktarılıyor" },
              ].map((step, idx) => {
                const currentStepName = stepStatus?.stepName?.toLowerCase() || "";
                const isCurrent = currentStepName.includes(step.id.toLowerCase());
                const isSuccess = stepStatus?.state === "success" && idx === 3;
                const isError = stepStatus?.state === "error" && isCurrent;

                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {isError ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : isSuccess ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : isCurrent && loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-[10px] font-mono text-zinc-400">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={`text-xs font-display font-bold ${isCurrent ? "text-emerald-400" : "text-white"}`}>
                        {step.label}
                      </p>
                      <p className="text-[11px] font-body text-zinc-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {stepStatus?.message && (
              <div className="mt-4 rounded-xl border border-[#21262d] bg-[#161b22] p-3 text-xs font-mono text-zinc-300">
                {stepStatus.message}
              </div>
            )}

            {lastResult?.txHash && (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-display font-bold text-emerald-400">Köprüleme Başarıyla Tamamlandı!</p>
                <a
                  href={lastResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-sky-sync hover:underline"
                >
                  <span>Tx Hash: {lastResult.txHash.slice(0, 10)}...</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {!loading && (
              <button
                type="button"
                onClick={resetBridge}
                className="mt-5 w-full rounded-2xl border border-[#21262d] bg-[#161b22] py-3 text-xs font-display font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Pencereyi Kapat
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
