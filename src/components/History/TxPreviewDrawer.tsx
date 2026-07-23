"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Shield,
  Clock,
  Box,
  Layers,
  ArrowRight,
  Zap,
} from "lucide-react";
import type { TransactionRecord } from "@/types/history";

interface TxPreviewDrawerProps {
  tx: TransactionRecord | null;
  onClose: () => void;
}

function formatRelativeTime(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHour < 24) {
    return remMin > 0 ? `${diffHour}h ${remMin}m ago` : `${diffHour}h ago`;
  }
  const diffDay = Math.floor(diffHour / 24);
  const remHour = diffHour % 24;
  return remHour > 0 ? `${diffDay}d ${remHour}h ago` : `${diffDay}d ago`;
}

export default function TxPreviewDrawer({ tx, onClose }: TxPreviewDrawerProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedVkey, setCopiedVkey] = useState(false);

  if (!tx) return null;

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(tx.txHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {}
  };

  const handleCopyVkey = async () => {
    if (!tx.vkeyArc) return;
    try {
      await navigator.clipboard.writeText(tx.vkeyArc);
      setCopiedVkey(true);
      setTimeout(() => setCopiedVkey(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Drawer */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#0d1117] border-l border-[#21262d] p-6 text-white shadow-2xl overflow-y-auto font-body scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#21262d] pb-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-white">
              Transaction Overview
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#21262d] bg-[#161b22] transition-colors hover:bg-white/10"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-emerald-400">
              {tx.status} ON ARC TESTNET
            </span>
            <span className="text-xs font-mono text-emerald-300">
              {formatRelativeTime(tx.timestamp)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400">
            Confirmed with finality in &lt;1 second on Arc Layer 1.
          </p>
        </div>

        {/* Details Grid */}
        <div className="mt-6 space-y-4">
          {/* Signature / TxHash */}
          <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-3.5">
            <p className="mb-1 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500">
              Signature (Tx Hash)
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-sky-sync font-bold">
                {tx.txHash}
              </span>
              <button
                type="button"
                onClick={handleCopyHash}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-white/5 transition-colors hover:bg-white/10"
                title="Signature Kopyala"
              >
                {copiedHash ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          {/* Action / Method & Program */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-3.5">
              <p className="mb-1 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500">
                Action / Method
              </p>
              <span className="inline-block rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-display font-bold text-emerald-400">
                {tx.actionTag ?? tx.type}
              </span>
            </div>
            <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-3.5">
              <p className="mb-1 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500">
                Block Number
              </p>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
                <Box className="h-3.5 w-3.5 text-zinc-400" />
                <span>#{tx.blockNumber ?? 5042189}</span>
              </div>
            </div>
          </div>

          {/* Value & Gas Fee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-3.5">
              <p className="mb-1 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500">
                Value (Amount)
              </p>
              <p className="font-mono text-sm font-bold text-white">
                {tx.amount} <span className="text-xs font-normal text-zinc-400">{tx.token}</span>
              </p>
            </div>
            <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-3.5">
              <p className="mb-1 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500">
                Transaction Fee
              </p>
              <p className="font-mono text-xs font-medium text-zinc-300">
                {tx.fee ?? "0.00015 USDC"}
              </p>
            </div>
          </div>

          {/* Addresses: From -> To */}
          <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-3.5 space-y-3">
            <div>
              <p className="mb-1 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500">
                From (Sender)
              </p>
              <p className="font-mono text-xs text-zinc-300 truncate">
                {tx.fromAddress}
              </p>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="h-4 w-4 text-zinc-600 rotate-90" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500">
                To (Recipient)
              </p>
              <p className="font-mono text-xs text-white font-semibold truncate">
                {tx.toAddress}
              </p>
            </div>
          </div>

          {/* Opt-in Privacy Section */}
          {tx.vkeyArc && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-display font-bold text-purple-300">
                  Opt-in Privacy Viewing Key
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-purple-500/20 bg-black/40 px-3 py-2">
                <span className="font-mono text-[11px] text-purple-200 truncate">
                  {tx.vkeyArc}
                </span>
                <button
                  type="button"
                  onClick={handleCopyVkey}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-purple-300 hover:bg-purple-500/20"
                >
                  {copiedVkey ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-purple-300" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Program / Protocol */}
          <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-3.5">
            <p className="mb-1 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500">
              Invoked Program / Protocol
            </p>
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
              <Layers className="h-3.5 w-3.5 text-zinc-500" />
              <span>{tx.program ?? "Arc Core Token Standard"}</span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="rounded-xl border border-[#21262d] bg-[#161b22] p-3.5">
            <p className="mb-1 text-[10px] font-display font-semibold uppercase tracking-wider text-zinc-500">
              Timestamp
            </p>
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span>{new Date(tx.timestamp).toLocaleString("tr-TR")}</span>
            </div>
          </div>
        </div>

        {/* Bottom External Link Button */}
        <div className="mt-8 pt-4 border-t border-[#21262d]">
          <a
            href={tx.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-display font-bold text-black transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            <span>View on ArcScan Explorer</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
