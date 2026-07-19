"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { parseUnits } from "viem";
import {
  BridgeKit,
  ArcTestnet,
  BaseSepolia,
  ArbitrumSepolia,
  EthereumSepolia,
  AvalancheFuji,
  HyperEVMTestnet,
  OptimismSepolia,
  SeiTestnet,
  SonicTestnet,
  UnichainSepolia,
  WorldChainSepolia,
} from "@circle-fin/bridge-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SendStatus =
  | "idle"
  | "aggregating"
  | "bridging"
  | "finalizing"
  | "success"
  | "error";

export interface UniversalSendResult {
  sendStatus: SendStatus;
  sendError: string | null;
  executeSend: (toAddress: string, amount: number) => Promise<void>;
  resetSend: () => void;
}

// USDC ERC-20 Address on Arc L1 Testnet
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

// Simple ERC-20 ABI fragment for same-chain transfer
const erc20Abi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

// ---------------------------------------------------------------------------
// useUniversalSend
// ---------------------------------------------------------------------------
export function useUniversalSend(
  totalUnified: number,
  realArcBalance: number,
  isConnected: boolean,
): UniversalSendResult {
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  
  const { chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  const resetSend = useCallback(() => {
    setSendStatus("idle");
    setSendError(null);
  }, []);

  const executeSend = useCallback(
    async (toAddress: string, amount: number) => {
      // Guard: wallet must be connected
      if (!isConnected || !walletClient) {
        setSendError("Wallet not connected.");
        setSendStatus("error");
        return;
      }

      // Guard: amount must be positive
      if (amount <= 0) {
        setSendError("Amount must be greater than 0.");
        setSendStatus("error");
        return;
      }

      // Guard: address basic validation
      if (!toAddress.startsWith("0x") || toAddress.length < 10) {
        setSendError("Invalid recipient address.");
        setSendStatus("error");
        return;
      }

      setSendError(null);

      try {
        const currentChainId = chainId;

        if (currentChainId === 5_042_002) {
          // ─── Case 1: Already on Arc Testnet ───
          // Arc balance alone covers the send — do a simple same-chain USDC transfer
          setSendStatus("finalizing");
          
          const txHash = await walletClient.writeContract({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: "transfer",
            args: [toAddress as `0x${string}`, parseUnits(amount.toString(), 6)],
          });

          console.log("Same-chain transfer completed on Arc Testnet:", txHash);
          setSendStatus("success");
        } else {
          // ─── Case 2: Bridge via CCTP from Source Chain to Arc Testnet ───
          let sourceChain: any;
          if (currentChainId === 84532) {
            sourceChain = BaseSepolia;
          } else if (currentChainId === 421614) {
            sourceChain = ArbitrumSepolia;
          } else if (currentChainId === 11155111) {
            sourceChain = EthereumSepolia;
          } else if (currentChainId === 43113) {
            sourceChain = AvalancheFuji;
          } else if (currentChainId === 998) {
            sourceChain = HyperEVMTestnet;
          } else if (currentChainId === 11155420) {
            sourceChain = OptimismSepolia;
          } else if (currentChainId === 1328) {
            sourceChain = SeiTestnet;
          } else if (currentChainId === 14601) {
            sourceChain = SonicTestnet;
          } else if (currentChainId === 1301) {
            sourceChain = UnichainSepolia;
          } else if (currentChainId === 4801) {
            sourceChain = WorldChainSepolia;
          } else {
            throw new Error(
              "Unsupported network. Please switch to a supported testnet chain."
            );
          }

          if (typeof window === "undefined" || !(window as any).ethereum) {
            throw new Error("No browser wallet provider found. Please install MetaMask.");
          }

          setSendStatus("aggregating");

          // 1. Initialize the Bridge Kit
          const kit = new BridgeKit();

          // 2. Initialize the Viem Adapter from browser wallet (window.ethereum)
          const adapter = await createViemAdapterFromProvider({
            provider: (window as any).ethereum,
            capabilities: {
              addressContext: "user-controlled",
              supportedChains: [
                ArcTestnet,
                BaseSepolia,
                ArbitrumSepolia,
                EthereumSepolia,
                AvalancheFuji,
                HyperEVMTestnet,
                OptimismSepolia,
                SeiTestnet,
                SonicTestnet,
                UnichainSepolia,
                WorldChainSepolia,
              ],
            },
          });

          // 3. Subscribe to bridge event lifecycle to update UI stepper
          kit.on("approve", () => {
            setSendStatus("aggregating");
          });

          kit.on("burn", () => {
            setSendStatus("bridging");
          });

          kit.on("fetchAttestation", () => {
            setSendStatus("finalizing");
          });

          kit.on("mint", () => {
            setSendStatus("success");
          });

          console.log(`Executing CCTP bridge from ${sourceChain.name} to Arc Testnet for ${amount} USDC`);

          // 4. Perform the cross-chain CCTP transfer
          const result = await kit.bridge({
            from: { adapter, chain: sourceChain },
            to: { adapter, chain: ArcTestnet, recipientAddress: toAddress },
            amount: amount.toString(),
            config: { transferSpeed: "FAST" },
          });

          if (result.state === "error") {
            const failedStep = result.steps.find((s) => s.state === "error");
            const errorMessage = failedStep?.errorMessage || "CCTP transfer failed during execution.";
            throw new Error(errorMessage);
          }

          setSendStatus("success");
        }
      } catch (error: any) {
        console.error("Universal Send error:", error);
        setSendError(error.message || "An unexpected error occurred during execution.");
        setSendStatus("error");
      }
    },
    [isConnected, walletClient, chainId],
  );

  return { sendStatus, sendError, executeSend, resetSend };
}
