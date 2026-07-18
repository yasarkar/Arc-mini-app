import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrivacyTransfer, PrivateTxDetails } from "../usePrivacyTransfer";

describe("usePrivacyTransfer Hook", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize with default states", () => {
    const { result } = renderHook(() => usePrivacyTransfer());
    expect(result.current.isPrivateMode).toBe(false);
    expect(result.current.lastViewingKey).toBeNull();
    expect(result.current.storedKeys).toEqual([]);
  });

  it("should toggle privacy mode", () => {
    const { result } = renderHook(() => usePrivacyTransfer());
    
    act(() => {
      result.current.togglePrivacy();
    });
    expect(result.current.isPrivateMode).toBe(true);

    act(() => {
      result.current.togglePrivacy();
    });
    expect(result.current.isPrivateMode).toBe(false);
  });

  it("should generate a viewing key cryptographically and encrypt details", async () => {
    const { result } = renderHook(() => usePrivacyTransfer());

    const details: PrivateTxDetails = {
      txHash: "0x123456",
      sender: "0xSenderAddress",
      recipient: "0xRecipientAddress",
      amount: 100,
      symbol: "USDC",
      timestamp: Date.now(),
    };

    let key = "";
    await act(async () => {
      key = await result.current.generateViewingKey(details.txHash, details);
    });

    expect(key).toContain("vkey_arc_");
    expect(result.current.lastViewingKey).toBe(key);
    expect(result.current.storedKeys.length).toBe(1);
    expect(result.current.storedKeys[0].key).toBe(key);
  });

  it("should decrypt and reveal details using the generated viewing key", async () => {
    const { result } = renderHook(() => usePrivacyTransfer());

    const details: PrivateTxDetails = {
      txHash: "0xabcdef",
      sender: "0xSenderAddress",
      recipient: "0xRecipientAddress",
      amount: 50.5,
      symbol: "USDC",
      timestamp: Date.now(),
    };

    let key = "";
    await act(async () => {
      key = await result.current.generateViewingKey(details.txHash, details);
    });

    let revealed: PrivateTxDetails | null = null;
    await act(async () => {
      revealed = await result.current.revealTransactionDetails(key);
    });

    expect(revealed).not.toBeNull();
    const data = revealed as unknown as PrivateTxDetails;
    expect(data.txHash).toBe(details.txHash);
    expect(data.amount).toBe(details.amount);
    expect(data.recipient).toBe(details.recipient);
  });

  it("should return null for invalid viewing keys", async () => {
    const { result } = renderHook(() => usePrivacyTransfer());

    let revealed: PrivateTxDetails | null = null;
    await act(async () => {
      revealed = await result.current.revealTransactionDetails("vkey_arc_invalidkeyhere");
    });

    expect(revealed).toBeNull();
  });
});
