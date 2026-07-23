"use client";

import React, { useState, useCallback } from "react";
import {
  Eye,
  Copy,
  Check,
  EyeOff,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  Zap,
  ArrowRightLeft,
  Bot,
  CheckCircle2,
  Clock,
  XCircle,
  Flame,
  Layers,
} from "lucide-react";
import type { ColumnVisibilityState, TransactionRecord } from "@/types/history";
import TxPreviewDrawer from "./TxPreviewDrawer";

interface HistoryTableProps {
  records: TransactionRecord[];
  isLoading?: boolean;
  columnVisibility: ColumnVisibilityState;
  pageSize: number;
  onPageSizeChange: (newSize: number) => void;
  currentPage: number;
  onPageChange: (newPage: number) => void;
}

function truncate(str: string, lead = 6, tail = 4): string {
  if (!str) return "-";
  if (str.length <= lead + tail) return str;
  return `${str.slice(0, lead)}...${str.slice(-tail)}`;
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

function ActionBadge({
  record,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  record: TransactionRecord;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}) {
  const tag = record.actionTag || record.type;
  const hoverStyle = isHovered
    ? "border-2 border-dashed border-amber-400 bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105 text-amber-200"
    : "cursor-pointer hover:border-amber-400/60 transition-all duration-150";

  let baseBadge: React.ReactNode;

  if (tag.includes("Buy")) {
    baseBadge = (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-display font-semibold text-emerald-400 ${hoverStyle}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        AMM: Buy <span className="text-[10px] text-emerald-300 font-mono">+1</span>
      </span>
    );
  } else if (tag.includes("Sell")) {
    baseBadge = (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-display font-semibold text-emerald-400 ${hoverStyle}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        AMM: Sell <span className="text-[10px] text-emerald-300 font-mono">+1</span>
      </span>
    );
  } else if (record.type === "PRIVACY_SEND" || tag.includes("Privacy")) {
    baseBadge = (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-display font-semibold text-purple-300 ${hoverStyle}`}>
        <Shield className="h-3 w-3 text-purple-400" />
        Opt-in: Privacy
      </span>
    );
  } else if (record.type === "UNIFIED_BALANCE" || tag.includes("Bridge")) {
    baseBadge = (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-sky-sync/30 bg-sky-sync/10 px-3 py-1 text-xs font-display font-semibold text-sky-sync ${hoverStyle}`}>
        <ArrowRightLeft className="h-3 w-3 text-sky-sync" />
        CCTP: Bridge
      </span>
    );
  } else if (record.type === "AGENT_JOB" || tag.includes("Agent")) {
    baseBadge = (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-display font-semibold text-amber-300 ${hoverStyle}`}>
        <Bot className="h-3 w-3 text-amber-400" />
        Agent: Executed
      </span>
    );
  } else if (tag.includes("Burn")) {
    baseBadge = (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-display font-semibold text-orange-400 ${hoverStyle}`}>
        <Flame className="h-3 w-3 text-orange-400" />
        Burn Token
      </span>
    );
  } else {
    baseBadge = (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-display font-semibold text-zinc-300 ${hoverStyle}`}>
        <Zap className="h-3 w-3 text-zinc-400" />
        {tag}
      </span>
    );
  }

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      title="Tıkla: Bu eyleme göre filtrele"
      className="inline-block cursor-pointer"
    >
      {baseBadge}
    </div>
  );
}

function VKeyCell({ vkeyArc }: { vkeyArc?: string }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!vkeyArc) return;
    try {
      await navigator.clipboard.writeText(vkeyArc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [vkeyArc]);

  if (!vkeyArc) {
    return <span className="text-xs font-mono text-zinc-600">-</span>;
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-purple-300">
      <span title={vkeyArc} className="truncate max-w-[130px]">
        {isRevealed ? vkeyArc : truncate(vkeyArc, 8, 4)}
      </span>
      <button
        type="button"
        onClick={() => setIsRevealed(!isRevealed)}
        className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-purple-500/20 hover:text-purple-200"
      >
        {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-purple-500/20 hover:text-purple-200"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

export default function HistoryTable({
  records,
  isLoading,
  columnVisibility,
  pageSize,
  onPageSizeChange,
  currentPage,
  onPageChange,
  onSelectSearchQuery,
  onSelectTypeFilter,
}: HistoryTableProps & {
  onSelectSearchQuery?: (query: string) => void;
  onSelectTypeFilter?: (typeFilter: TransactionRecord["type"]) => void;
}) {
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [copiedAddrId, setCopiedAddrId] = useState<string | null>(null);

  // Solscan synchronized hover states
  const [hoveredAddress, setHoveredAddress] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const handleCopyHash = async (id: string, hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHashId(id);
      setTimeout(() => setCopiedHashId(null), 2000);
    } catch {}
  };

  const handleCopyAddr = async (id: string, addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddrId(id);
      setTimeout(() => setCopiedAddrId(null), 2000);
    } catch {}
  };

  // Pagination calculation
  const totalItems = records.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRecords = records.slice(startIndex, startIndex + pageSize);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-[#21262d] bg-[#0d1117] p-8 text-center backdrop-blur-md">
        <Clock className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="mt-3 text-xs font-body text-zinc-400">Loading Solscan-style Arc L1 history...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-[#21262d] bg-[#0d1117] p-8 text-center backdrop-blur-md">
        <Layers className="h-10 w-10 text-zinc-600 mb-2" />
        <p className="text-sm font-display font-bold text-white">No Transactions Found</p>
        <p className="mt-1 text-xs text-zinc-500">No records match your active Solscan filters.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-hidden rounded-2xl border border-[#21262d] bg-[#0d1117] shadow-2xl">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#21262d] bg-[#161b22] text-[11px] font-display font-bold text-zinc-400">
                {columnVisibility.preview && <th className="py-4 px-6 w-12 text-center">👁️</th>}
                {columnVisibility.signature && <th className="py-4 px-6">Signature</th>}
                {columnVisibility.block && <th className="py-4 px-6">Block</th>}
                {columnVisibility.time && <th className="py-4 px-6">Time</th>}
                {columnVisibility.action && <th className="py-4 px-6">Action</th>}
                {columnVisibility.by && <th className="py-4 px-6">By (From)</th>}
                {columnVisibility.tokens && <th className="py-4 px-6">Tokens</th>}
                {columnVisibility.value && <th className="py-4 px-6">Value (USDC)</th>}
                {columnVisibility.vkey && <th className="py-4 px-6">View Key</th>}
                {columnVisibility.status && <th className="py-4 px-6 text-center">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] text-xs font-body">
              {paginatedRecords.map((item) => {
                const isAddressMatched = hoveredAddress && item.fromAddress === hoveredAddress;
                const actionTagKey = item.actionTag || item.type;
                const isActionMatched = hoveredAction && actionTagKey === hoveredAction;

                return (
                  <tr
                    key={item.id}
                    className="transition-colors duration-150 hover:bg-[#161b22]/70"
                  >
                    {/* Eye Preview Drawer Icon */}
                    {columnVisibility.preview && (
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTx(item)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#21262d] bg-[#161b22] text-zinc-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400"
                          title="Quick View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}

                    {/* Signature (Tx Hash) */}
                    {columnVisibility.signature && (
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <a
                            href={item.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs font-bold text-sky-sync hover:underline flex items-center gap-1"
                          >
                            <span>{truncate(item.txHash, 10, 4)}</span>
                            <ExternalLink className="h-3 w-3 text-zinc-500 opacity-60" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(item.id, item.txHash)}
                            className="text-zinc-500 hover:text-white transition-colors"
                            title="Signature Kopyala"
                          >
                            {copiedHashId === item.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}

                    {/* Block Number */}
                    {columnVisibility.block && (
                      <td className="py-4 px-6 whitespace-nowrap font-mono text-zinc-400">
                        #{item.blockNumber ?? 5042189}
                      </td>
                    )}

                    {/* Time (Relative + Tooltip) */}
                    {columnVisibility.time && (
                      <td className="py-4 px-6 whitespace-nowrap font-mono text-zinc-300">
                        <span title={new Date(item.timestamp).toLocaleString("tr-TR")}>
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </td>
                    )}

                    {/* Action Badge */}
                    {columnVisibility.action && (
                      <td className="py-4 px-6 whitespace-nowrap">
                        <ActionBadge
                          record={item}
                          isHovered={Boolean(isActionMatched)}
                          onMouseEnter={() => setHoveredAction(actionTagKey)}
                          onMouseLeave={() => setHoveredAction(null)}
                          onClick={() => {
                            if (onSelectTypeFilter) {
                              onSelectTypeFilter(item.type);
                            }
                          }}
                        />
                      </td>
                    )}

                    {/* By (From Address) — Solscan Dashed Yellow Hover Highlight & Click-to-Filter */}
                    {columnVisibility.by && (
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div
                          onMouseEnter={() => setHoveredAddress(item.fromAddress)}
                          onMouseLeave={() => setHoveredAddress(null)}
                          onClick={() => {
                            if (onSelectSearchQuery) {
                              onSelectSearchQuery(item.fromAddress);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 font-mono text-xs cursor-pointer transition-all duration-150 ${
                            isAddressMatched
                              ? "border-2 border-dashed border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.4)] rounded-lg px-2.5 py-1 font-bold animate-pulse"
                              : "text-zinc-300 hover:text-amber-300 hover:underline"
                          }`}
                          title="Tıkla: Bu adrese göre anında filtrele"
                        >
                          <span>{truncate(item.fromAddress, 8, 4)}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAddr(item.id, item.fromAddress);
                            }}
                            className="text-zinc-500 hover:text-white transition-colors ml-1"
                            title="Adresi Kopyala"
                          >
                            {copiedAddrId === item.id ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}

                  {/* Tokens */}
                  {columnVisibility.tokens && (
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded bg-black/40 px-2.5 py-1 font-mono text-[11px] text-zinc-300 border border-[#21262d]">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        {item.token}
                      </span>
                    </td>
                  )}

                  {/* Value (USDC) */}
                  {columnVisibility.value && (
                    <td className="py-4 px-6 whitespace-nowrap font-mono font-bold text-white text-sm">
                      {item.amount}
                    </td>
                  )}

                  {/* Viewing Key (vkey_arc) */}
                  {columnVisibility.vkey && (
                    <td className="py-4 px-6 whitespace-nowrap">
                      <VKeyCell vkeyArc={item.vkeyArc} />
                    </td>
                  )}

                  {/* Status Badge */}
                  {columnVisibility.status && (
                    <td className="py-4 px-6 whitespace-nowrap text-center">
                      {item.status === "SUCCESS" && (
                        <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-400" />
                      )}
                      {item.status === "PENDING" && (
                        <Clock className="h-4 w-4 mx-auto text-amber-400 animate-spin" />
                      )}
                      {item.status === "FAILED" && (
                        <XCircle className="h-4 w-4 mx-auto text-red-500" />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>

        {/* Solscan Pagination Footer */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[#21262d] bg-[#161b22] px-5 py-3 text-xs font-body text-zinc-400">
          {/* Rows per page selector */}
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="rounded-md border border-[#21262d] bg-[#0d1117] px-2 py-1 font-mono text-xs text-white outline-none cursor-pointer [color-scheme:dark]"
            >
              <option value={10} className="bg-[#161b22] text-white">10</option>
              <option value={25} className="bg-[#161b22] text-white">25</option>
              <option value={50} className="bg-[#161b22] text-white">50</option>
            </select>
            <span>per page</span>
          </div>

          {/* Page navigation info & buttons */}
          <div className="flex items-center gap-4">
            <span className="font-mono">
              Item {totalItems > 0 ? startIndex + 1 : 0} to{" "}
              {Math.min(startIndex + pageSize, totalItems)} of {totalItems}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#21262d] bg-[#0d1117] transition-all hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4 text-zinc-300" />
              </button>
              <span className="px-2 font-mono text-xs text-white font-bold">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#21262d] bg-[#0d1117] transition-all hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4 text-zinc-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Solscan Quick View Drawer */}
      <TxPreviewDrawer tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </>
  );
}
