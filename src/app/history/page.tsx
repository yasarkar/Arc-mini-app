"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileCheck2,
  Trash2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import HistoryFilters, { FilterState } from "@/components/History/HistoryFilters";
import HistoryTable from "@/components/History/HistoryTable";
import { exportToCSV, exportToPDF } from "@/utils/export";
import type { ColumnVisibilityState } from "@/types/history";

export default function HistoryPage() {
  const { address } = useAccount();
  const { transactions, isLoading, clearHistory, refetch } = useTransactionHistory();

  // Filters & Sorting state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    typeFilter: "ALL",
    startDate: "",
    endDate: "",
    sortOrder: "desc", // Solscan default: Newest First
  });

  // Solscan Column Visibility State
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({
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
  });

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      typeFilter: "ALL",
      startDate: "",
      endDate: "",
      sortOrder: "desc",
    });
    setCurrentPage(1);
  };

  // Filter & Sort logic
  const processedRecords = useMemo(() => {
    let result = transactions.filter((rec) => {
      // 1. Type Filter
      if (filters.typeFilter !== "ALL" && rec.type !== filters.typeFilter) {
        return false;
      }

      // 2. Date Range Filter
      if (filters.startDate) {
        const startTs = new Date(filters.startDate).setHours(0, 0, 0, 0);
        if (rec.timestamp < startTs) return false;
      }
      if (filters.endDate) {
        const endTs = new Date(filters.endDate).setHours(23, 59, 59, 999);
        if (rec.timestamp > endTs) return false;
      }

      // 3. Search Query Filter
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.trim().toLowerCase();
        const matchesTxHash = rec.txHash?.toLowerCase().includes(q);
        const matchesFrom = rec.fromAddress?.toLowerCase().includes(q);
        const matchesTo = rec.toAddress?.toLowerCase().includes(q);
        const matchesVKey = rec.vkeyArc?.toLowerCase().includes(q);

        if (!matchesTxHash && !matchesFrom && !matchesTo && !matchesVKey) {
          return false;
        }
      }

      return true;
    });

    // Sort order (desc = Newest First, asc = Oldest First)
    result = result.sort((a, b) => {
      if (filters.sortOrder === "asc") {
        return a.timestamp - b.timestamp;
      }
      return b.timestamp - a.timestamp;
    });

    return result;
  }, [transactions, filters]);

  const handleExportCSV = () => {
    exportToCSV(processedRecords);
  };

  const handleExportPDF = () => {
    exportToPDF(processedRecords, address);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#080b11] text-white">
      {/* Solscan Style Header */}
      <header className="border-b border-[#21262d] bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#21262d] bg-[#161b22] transition-all hover:bg-white/10 hover:text-white"
              title="Dashboard"
            >
              <ArrowLeft className="h-4 w-4 text-zinc-300" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-400" />
                <h1 className="text-lg font-display font-bold uppercase tracking-wider text-white">
                  Arc Explorer — Transaction History
                </h1>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Solscan-Inspired Arc L1 Transaction & Opt-in Privacy Inspector
              </p>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={processedRecords.length === 0}
              className="flex items-center gap-2 rounded-xl border border-[#21262d] bg-[#161b22] px-4 py-2.5 text-xs font-display font-bold text-white transition-all hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>CSV Export</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={processedRecords.length === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-display font-bold text-white shadow-lg shadow-purple-950/40 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileCheck2 className="h-4 w-4 text-purple-200" />
              <span>PDF Audit Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
        {/* Filters Bar */}
        <HistoryFilters
          filters={filters}
          onFilterChange={setFilters}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onResetAll={handleResetFilters}
          totalResults={processedRecords.length}
        />

        {/* Data Table */}
        <HistoryTable
          records={processedRecords}
          isLoading={isLoading}
          columnVisibility={columnVisibility}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onSelectSearchQuery={(q) =>
            setFilters((prev) => ({ ...prev, searchQuery: q }))
          }
          onSelectTypeFilter={(t) =>
            setFilters((prev) => ({ ...prev, typeFilter: t }))
          }
        />

        {/* Bottom Actions Footer */}
        {transactions.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#21262d] pt-4 text-xs font-body text-zinc-500">
            <button
              type="button"
              onClick={refetch}
              className="flex items-center gap-1.5 transition-colors hover:text-zinc-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh Feed
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm("Are you sure you want to clear all transaction history?")) {
                  clearHistory();
                }
              }}
              className="flex items-center gap-1.5 text-red-400/80 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear History
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
