"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  X,
  RotateCcw,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import type { ColumnVisibilityState, TransactionType } from "@/types/history";

export interface FilterState {
  searchQuery: string;
  typeFilter: "ALL" | TransactionType;
  startDate: string;
  endDate: string;
  sortOrder: "desc" | "asc"; // desc = Newest First, asc = Oldest First
}

interface HistoryFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  columnVisibility: ColumnVisibilityState;
  onColumnVisibilityChange: (newCols: ColumnVisibilityState) => void;
  onResetAll: () => void;
  totalResults: number;
}

const COLUMN_LABELS: { key: keyof ColumnVisibilityState; label: string }[] = [
  { key: "preview", label: "Preview (Quick View)" },
  { key: "signature", label: "Signature (Tx Hash)" },
  { key: "block", label: "Block" },
  { key: "time", label: "Time" },
  { key: "action", label: "Action / Method" },
  { key: "by", label: "By (From / To)" },
  { key: "tokens", label: "Tokens" },
  { key: "value", label: "Value (Amount)" },
  { key: "vkey", label: "Viewing Key (vkey_arc)" },
  { key: "status", label: "Status" },
];

export default function HistoryFilters({
  filters,
  onFilterChange,
  columnVisibility,
  onColumnVisibilityChange,
  onResetAll,
  totalResults,
}: HistoryFiltersProps) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [tempCols, setTempCols] = useState<ColumnVisibilityState>(columnVisibility);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync temp state when visibility changes externally
  useEffect(() => {
    setTempCols(columnVisibility);
  }, [columnVisibility]);

  // Close popup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    if (isFilterMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterMenuOpen]);

  const toggleSortOrder = () => {
    onFilterChange({
      ...filters,
      sortOrder: filters.sortOrder === "desc" ? "asc" : "desc",
    });
  };

  const handleApplyColumns = () => {
    onColumnVisibilityChange(tempCols);
    setIsFilterMenuOpen(false);
  };

  const handleResetColumns = () => {
    const allOn: ColumnVisibilityState = {
      preview: true,
      signature: true,
      block: true,
      time: true,
      action: true,
      by: true,
      tokens: true,
      value: true,
      vkey: true,
      status: true,
    };
    setTempCols(allOn);
    onColumnVisibilityChange(allOn);
  };

  const toggleTempCol = (key: keyof ColumnVisibilityState) => {
    setTempCols((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="rounded-2xl border border-[#21262d] bg-[#0d1117] p-5 shadow-2xl backdrop-blur-md">
      {/* Top Solscan Controls Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
            <Search className="h-4 w-4 text-zinc-500" />
          </div>
          <input
            type="text"
            placeholder="Search Signature, Address, or vkey_arc..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFilterChange({ ...filters, searchQuery: e.target.value })
            }
            className="w-full rounded-xl border border-[#21262d] bg-[#161b22] pl-10 pr-9 py-2.5 font-mono text-xs text-white placeholder-zinc-500 outline-none transition-all focus:border-emerald-500/50"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right Controls: Filter Popup, Sort Toggle, Reset */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter Select */}
          <select
            value={filters.typeFilter}
            onChange={(e) =>
              onFilterChange({ ...filters, typeFilter: e.target.value as any })
            }
            className="rounded-xl border border-[#21262d] bg-[#161b22] px-3.5 py-2.5 font-body text-xs text-white outline-none cursor-pointer transition-all hover:bg-white/5 [color-scheme:dark]"
          >
            <option value="ALL" className="bg-[#161b22] text-white py-1">All Actions</option>
            <option value="STANDARD_SEND" className="bg-[#161b22] text-white py-1">Standard Send</option>
            <option value="PRIVACY_SEND" className="bg-[#161b22] text-white py-1">Opt-in Privacy</option>
            <option value="UNIFIED_BALANCE" className="bg-[#161b22] text-white py-1">CCTP Bridge</option>
            <option value="AMM_BUY" className="bg-[#161b22] text-white py-1">AMM Buy</option>
            <option value="AMM_SELL" className="bg-[#161b22] text-white py-1">AMM Sell</option>
            <option value="AGENT_JOB" className="bg-[#161b22] text-white py-1">Agent Job</option>
          </select>

          {/* Sort Order Button (Solscan style) */}
          <button
            type="button"
            onClick={toggleSortOrder}
            className="flex items-center gap-2 rounded-xl border border-[#21262d] bg-[#161b22] px-3.5 py-2.5 text-xs font-display font-semibold text-zinc-300 transition-all hover:bg-white/5 hover:text-white active:scale-95"
            title="Toggle Sort Order"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-emerald-400" />
            <span>{filters.sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
          </button>

          {/* Solscan Filters Dropdown Button */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-display font-bold text-black transition-all hover:bg-emerald-400 active:scale-95 shadow-md shadow-emerald-950/20"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>

            {/* Solscan Style Filters Popover Menu */}
            {isFilterMenuOpen && (
              <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-[#21262d] bg-[#161b22] p-4 text-white shadow-2xl backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between border-b border-[#21262d] pb-2">
                  <span className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400">
                    Column Visibility
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {COLUMN_LABELS.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-body text-zinc-300 hover:bg-white/5 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={tempCols[col.key]}
                          onChange={() => toggleTempCol(col.key)}
                          className="h-3.5 w-3.5 rounded border-[#21262d] bg-black accent-emerald-500 cursor-pointer"
                        />
                        {col.label}
                      </span>
                      {tempCols[col.key] && (
                        <Check className="h-3 w-3 text-emerald-400" />
                      )}
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#21262d] pt-3">
                  <button
                    type="button"
                    onClick={handleResetColumns}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-display font-semibold text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyColumns}
                    className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-display font-bold text-black transition-colors hover:bg-emerald-400"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters */}
          {(filters.searchQuery || filters.typeFilter !== "ALL") && (
            <button
              type="button"
              onClick={onResetAll}
              className="flex items-center gap-1.5 rounded-xl border border-[#21262d] bg-[#161b22] px-3 py-2.5 text-xs font-display font-semibold text-zinc-400 transition-all hover:bg-white/5 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className="mt-4 flex items-center justify-between border-t border-[#21262d] pt-3 text-xs font-body text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-zinc-500">
            TOTAL RESULTS:
          </span>
          <span className="font-mono font-bold text-emerald-400">
            {totalResults} Transactions
          </span>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          Showing real-time Arc L1 data
        </span>
      </div>
    </div>
  );
}
