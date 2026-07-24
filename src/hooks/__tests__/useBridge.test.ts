import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBridge } from "../useBridge";

// Mock dependencies
vi.mock("@/lib/appKitClient", () => ({
  appKit: {
    bridge: vi.fn(),
    estimateBridge: vi.fn(),
    on: vi.fn(() => () => {}),
    off: vi.fn(),
  },
  ARC_BRIDGE_CONFIG: {
    feeRecipientAddress: "0x0000000000000000000000000000000000000000",
    arcRpcUrl: "https://rpc.testnet.arc.network",
    sepoliaRpcUrl: "https://rpc.ankr.com/eth_sepolia",
    usdcDecimals: 6,
  },
  isFeeRecipientConfigured: vi.fn(() => false),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    isConnected: true,
    connector: {
      getProvider: vi.fn(() => Promise.resolve({})),
    },
  }),
  useSwitchChain: () => ({
    switchChainAsync: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock("@/lib/walletDiscovery", () => ({
  getPrimaryEVMAdapter: vi.fn(() => Promise.resolve({ adapterType: "viem" })),
}));

describe("useBridge Hook", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize with default idle state", () => {
    const { result } = renderHook(() => useBridge());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.stepStatus).toBeNull();
    expect(result.current.lastResult).toBeNull();
    expect(result.current.isEstimating).toBe(false);
  });

  it("should enforce Arc Testnet minimum 1.50 USDC validation rule", async () => {
    const { result } = renderHook(() => useBridge());

    await act(async () => {
      try {
        await result.current.executeBridge({
          fromChain: "Arc_Testnet",
          toChain: "Ethereum_Sepolia",
          amount: "1.00",
        });
      } catch (err: any) {
        expect(err.message).toContain("minimum of 1.50 USDC");
      }
    });

    expect(result.current.error).toContain("minimum of 1.50 USDC");
  });

  it("should enforce Arc Testnet maxFee < amount validation rule", async () => {
    const { result } = renderHook(() => useBridge());

    await act(async () => {
      try {
        await result.current.executeBridge({
          fromChain: "Arc_Testnet",
          toChain: "Ethereum_Sepolia",
          amount: "5.00",
          maxFee: "5.50",
        });
      } catch (err: any) {
        expect(err.message).toContain("maximum fee to be less than the transfer amount");
      }
    });

    expect(result.current.error).toContain("maximum fee to be less than the transfer amount");
  });

  it("should throw error if source and destination chains are identical", async () => {
    const { result } = renderHook(() => useBridge());

    await expect(
      result.current.executeBridge({
        fromChain: "Arc_Testnet",
        toChain: "Arc_Testnet",
        amount: "5.00",
      })
    ).rejects.toThrow("Kaynak ağ ile hedef ağ aynı olamaz.");
  });

  it("should detect pending recovery transaction from localStorage on mount", () => {
    const mockPendingTx = {
      timestamp: Date.now(),
      params: {
        fromChain: "Ethereum_Sepolia",
        toChain: "Arc_Testnet",
        amount: "10.00",
      },
      result: { state: "error", errorMessage: "Network timeout" },
    };

    localStorage.setItem("arc_bridge_pending_tx_v1", JSON.stringify(mockPendingTx));

    const { result } = renderHook(() => useBridge());

    expect(result.current.pendingRecoveryTx).not.toBeNull();
    expect(result.current.pendingRecoveryTx?.params.amount).toBe("10.00");
  });

  it("should clear pending recovery transaction when clearPendingTx is called", () => {
    const mockPendingTx = {
      timestamp: Date.now(),
      params: {
        fromChain: "Ethereum_Sepolia",
        toChain: "Arc_Testnet",
        amount: "10.00",
      },
      result: { state: "error" },
    };

    localStorage.setItem("arc_bridge_pending_tx_v1", JSON.stringify(mockPendingTx));

    const { result } = renderHook(() => useBridge());

    act(() => {
      result.current.clearPendingTx();
    });

    expect(result.current.pendingRecoveryTx).toBeNull();
    expect(localStorage.getItem("arc_bridge_pending_tx_v1")).toBeNull();
  });

  it("should initialize historyLogs and clear them using clearLogs()", () => {
    const mockLog = {
      id: "log_1",
      timestamp: Date.now(),
      fromChain: "Ethereum_Sepolia",
      toChain: "Arc_Testnet",
      amount: "5.00",
      recipientAddress: "0x123",
      status: "SUCCESS" as const,
      stepsSummary: [],
    };

    localStorage.setItem("arc_bridge_compliance_history_v1", JSON.stringify([mockLog]));

    const { result } = renderHook(() => useBridge());

    expect(result.current.historyLogs.length).toBe(1);
    expect(result.current.historyLogs[0].amount).toBe("5.00");

    act(() => {
      result.current.clearLogs();
    });

    expect(result.current.historyLogs.length).toBe(0);
    expect(localStorage.getItem("arc_bridge_compliance_history_v1")).toBeNull();
  });

  it("should reset state correctly when resetBridge is called", () => {
    const { result } = renderHook(() => useBridge());

    act(() => {
      result.current.resetBridge();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.stepStatus).toBeNull();
  });
});
