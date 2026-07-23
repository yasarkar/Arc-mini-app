import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnifiedBalance } from "../useUnifiedBalance";

// Mock wagmi hooks
const mockAccount = vi.fn();
const mockBalance = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => mockAccount(),
  useBalance: (args: any) => mockBalance(args),
}));

describe("useUnifiedBalance Hook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it("should return zero balances when disconnected", () => {
    mockAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      chainId: undefined,
    });
    mockBalance.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useUnifiedBalance());

    // Connection should be false
    expect(result.current.isConnected).toBe(false);

    // Find Arc balance row
    const arc = result.current.chains.find((c) => c.id === "arc");
    expect(arc?.balance).toBe(0.00);
    expect(arc?.isMock).toBe(false);

    const solana = result.current.chains.find((c) => c.id === "solana");
    expect(solana?.balance).toBe(0.00);
    expect(solana?.isMock).toBe(false);
  });

  it("should return real balances when connected", () => {
    mockAccount.mockReturnValue({
      address: "0xTestUserAddress",
      isConnected: true,
      chainId: 5042002,
    });

    mockBalance.mockImplementation(({ chainId }) => {
      if (chainId === 5042002) {
        return { data: { formatted: "123.45", value: BigInt("123450000000000000000") }, isLoading: false };
      }
      if (chainId === 84532) {
        return { data: { formatted: "67.89" }, isLoading: false };
      }
      return { data: { formatted: "0.00" }, isLoading: false };
    });

    const { result } = renderHook(() => useUnifiedBalance());

    expect(result.current.isConnected).toBe(true);

    const arc = result.current.chains.find(c => c.id === "arc");
    expect(arc?.balance).toBe(123.45);
    expect(arc?.isMock).toBe(false);

    const base = result.current.chains.find(c => c.id === "base");
    expect(base?.balance).toBe(67.89);
    expect(base?.isMock).toBe(false);
  });
});
