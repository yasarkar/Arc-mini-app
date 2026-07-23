"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

interface WalletAdapterContextType {
  adapter: any | null;
  setAdapter: (adapter: any | null) => void;
  createAdapterFromProvider: (provider: any) => Promise<any>;
}

const WalletAdapterContext = createContext<WalletAdapterContextType>({
  adapter: null,
  setAdapter: () => {},
  createAdapterFromProvider: async () => null,
});

export function WalletAdapterProvider({ children }: { children: React.ReactNode }) {
  const [adapter, setAdapter] = useState<any | null>(null);
  const { connector, isConnected } = useAccount();

  const createAdapterFromProvider = useCallback(async (provider: any) => {
    if (!provider) return null;
    try {
      const adapterInstance = await createViemAdapterFromProvider({
        provider,
      });
      setAdapter(adapterInstance);
      return adapterInstance;
    } catch (error) {
      console.error("Failed to create Viem adapter from provider:", error);
      return null;
    }
  }, []);

  // Auto-initialize adapter when wagmi connector is connected
  useEffect(() => {
    let isMounted = true;
    async function initAdapter() {
      if (isConnected && connector) {
        try {
          const provider = await connector.getProvider();
          if (provider && isMounted) {
            await createAdapterFromProvider(provider);
          }
        } catch (err) {
          console.error("Error fetching provider from connector:", err);
        }
      } else if (!isConnected && isMounted) {
        setAdapter(null);
      }
    }
    initAdapter();
    return () => {
      isMounted = false;
    };
  }, [isConnected, connector, createAdapterFromProvider]);

  return (
    <WalletAdapterContext.Provider
      value={{ adapter, setAdapter, createAdapterFromProvider }}
    >
      {children}
    </WalletAdapterContext.Provider>
  );
}

export function useWalletAdapter() {
  return useContext(WalletAdapterContext);
}
