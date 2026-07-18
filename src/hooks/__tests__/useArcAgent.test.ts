import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useArcAgent } from "../useArcAgent";

describe("useArcAgent Hook", () => {
  const mockExecuteSend = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with default welcome message", () => {
    const { result } = renderHook(() =>
      useArcAgent({
        isConnected: false,
        activeAddress: null,
        chains: [],
        executeSend: mockExecuteSend,
        sendStatus: "idle",
        sendError: null,
        connectedChainId: null,
      })
    );

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].role).toBe("agent");
    expect(result.current.messages[0].text).toContain("ERC-8004");
  });

  it("should parse bridge intent and create a job pending approval", () => {
    const { result } = renderHook(() =>
      useArcAgent({
        isConnected: false,
        activeAddress: null,
        chains: [],
        executeSend: mockExecuteSend,
        sendStatus: "idle",
        sendError: null,
        connectedChainId: null,
      })
    );

    act(() => {
      result.current.sendMessage("Base'ten Arc'a 10 USDC köprüle");
    });

    // Expecting 3 messages: welcome, user message, agent response with approval request
    expect(result.current.messages.length).toBe(3);
    expect(result.current.messages[2].text).toContain("ERC-8183 Job Escrow");
    expect(result.current.activeJobs.length).toBe(1);
    expect(result.current.activeJobs[0].actionType).toBe("bridge");
    expect(result.current.activeJobs[0].amount).toBe(10);
    expect(result.current.activeJobs[0].sourceChain).toBe("Base");
    expect(result.current.activeJobs[0].targetChain).toBe("Arc");
  });

  it("should approve a job and set status to running", () => {
    const { result } = renderHook(() =>
      useArcAgent({
        isConnected: false,
        activeAddress: null,
        chains: [],
        executeSend: mockExecuteSend,
        sendStatus: "idle",
        sendError: null,
        connectedChainId: null,
      })
    );

    act(() => {
      result.current.sendMessage("Base'ten Arc L1'e 50 USDC köprüle");
    });

    const jobId = result.current.activeJobs[0].jobId;

    act(() => {
      result.current.approveJob(jobId);
    });

    expect(result.current.activeJobs[0].status).toBe("running");
  });

  it("should trigger real executeSend on EVM network when condition is met and connected", async () => {
    mockExecuteSend.mockResolvedValue(undefined);

    const chains = [
      { id: "base", name: "Base", balance: 150.00, symbol: "USDC", isMock: false },
      { id: "arc", name: "Arc Testnet", balance: 10.00, symbol: "USDC", isMock: false },
    ];

    const { result } = renderHook(() =>
      useArcAgent({
        isConnected: true,
        activeAddress: "0xUserAddress",
        chains,
        executeSend: mockExecuteSend,
        sendStatus: "idle",
        sendError: null,
        connectedChainId: 84532, // Base Sepolia Chain ID
      })
    );

    // 1. Send command
    act(() => {
      result.current.sendMessage("Base'ten Arc'a 20 USDC köprüle");
    });

    const jobId = result.current.activeJobs[0].jobId;

    // 2. Approve job
    act(() => {
      result.current.approveJob(jobId);
    });

    // 3. Fast-forward timer by 20 seconds (to trigger interval check and satisfy 15s rate-limit)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000);
    });

    // Expect mockExecuteSend to be called because condition (having balance, right chain) is met
    expect(mockExecuteSend).toHaveBeenCalledWith("0xUserAddress", 20);
  });
});
