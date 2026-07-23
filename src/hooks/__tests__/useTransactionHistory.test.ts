import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactionHistory, getStoredTransactions, saveTransactions } from "../useTransactionHistory";

describe("useTransactionHistory Hook", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize with initial mock transactions if localStorage is empty", () => {
    const { result } = renderHook(() => useTransactionHistory());
    expect(result.current.transactions.length).toBeGreaterThan(0);
    expect(result.current.transactions[0].token).toBe("USDC");
  });

  it("should add a new transaction record to front of history", () => {
    const { result } = renderHook(() => useTransactionHistory());

    act(() => {
      result.current.addTransaction({
        txHash: "0x123abc...",
        type: "STANDARD_SEND",
        amount: "99.00",
        token: "USDC",
        fromAddress: "0xSender...",
        toAddress: "0xRecipient...",
        status: "SUCCESS",
        explorerUrl: "https://testnet.arcscan.app/tx/0x123abc...",
      });
    });

    expect(result.current.transactions[0].txHash).toBe("0x123abc...");
    expect(result.current.transactions[0].amount).toBe("99.00");
  });

  it("should clear history when clearHistory is called", () => {
    const { result } = renderHook(() => useTransactionHistory());

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.transactions).toEqual([]);
    expect(getStoredTransactions()).toEqual([]);
  });
});
