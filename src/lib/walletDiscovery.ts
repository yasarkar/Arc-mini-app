import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

// ---------------------------------------------------------------------------
// EIP-6963 TypeScript Definitions
// ---------------------------------------------------------------------------
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any; // EIP-1193 Provider
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: "eip6963:announceProvider";
  detail: EIP6963ProviderDetail;
}

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": EIP6963AnnounceProviderEvent;
  }
}

// ---------------------------------------------------------------------------
// EIP-6963 Provider Discovery Utility
// ---------------------------------------------------------------------------
/**
 * Collects EIP-6963 announced browser wallet providers.
 * Listens for 'eip6963:announceProvider' and dispatches 'eip6963:requestProvider'.
 *
 * @param timeoutMs Time in milliseconds to wait for providers (default: 250ms)
 * @returns Array of discovered EIP-6963 provider details
 */
export function discoverEIP6963Providers(
  timeoutMs = 250
): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    const providers: EIP6963ProviderDetail[] = [];
    const providerUuids = new Set<string>();

    const handleAnnounce = (event: EIP6963AnnounceProviderEvent) => {
      if (event.detail && event.detail.info && !providerUuids.has(event.detail.info.uuid)) {
        providerUuids.add(event.detail.info.uuid);
        providers.push(event.detail);
      }
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce as EventListener);

    // Trigger wallets to announce themselves
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Collect for timeoutMs then cleanup listener
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce as EventListener);
      resolve(providers);
    }, timeoutMs);
  });
}

// ---------------------------------------------------------------------------
// Primary EVM Adapter Initialization
// ---------------------------------------------------------------------------
/**
 * Discovers and initializes a Circle Viem Adapter from the user's primary browser wallet.
 * Prioritizes active connected wagmi provider / EVM-native wallets (MetaMask, OKX, Rabby) over Phantom.
 *
 * @param customProvider Optional provider instance or EIP6963ProviderDetail
 * @returns Initialized ViemAdapter instance for Circle AppKit SDK
 */
export async function getPrimaryEVMAdapter(
  customProvider?: any
) {
  let targetProvider: any = customProvider?.provider || customProvider;

  // 1. If no explicit provider passed, discover via window.ethereum or EIP-6963
  if (!targetProvider && typeof window !== "undefined") {
    const winEth = (window as any).ethereum;

    // Check if window.ethereum contains multiple provider instances
    if (winEth?.providers && Array.isArray(winEth.providers)) {
      const evmNative =
        winEth.providers.find((p: any) => p.isMetaMask && !p.isPhantom) ||
        winEth.providers.find((p: any) => p.isOKXWallet || p.isRabby || p.isCoinbaseWallet) ||
        winEth.providers.find((p: any) => !p.isPhantom);

      if (evmNative) {
        targetProvider = evmNative;
      }
    }

    if (!targetProvider) {
      const discovered = await discoverEIP6963Providers(250);
      if (discovered.length > 0) {
        // Sort/prioritize EVM-native wallets (MetaMask, OKX, Rabby) over Phantom
        const sorted = [...discovered].sort((a, b) => {
          const rdnsA = a.info?.rdns?.toLowerCase() || "";
          const rdnsB = b.info?.rdns?.toLowerCase() || "";
          const isPhantomA = rdnsA.includes("phantom");
          const isPhantomB = rdnsB.includes("phantom");
          if (isPhantomA && !isPhantomB) return 1;
          if (!isPhantomA && isPhantomB) return -1;
          return 0;
        });

        targetProvider = sorted[0].provider;
      } else if (winEth) {
        targetProvider = winEth;
      }
    }
  }

  // 2. Guard: Verify a valid EIP-1193 provider was located
  if (!targetProvider) {
    throw new Error(
      "EVM uyumlu bir tarayıcı cüzdanı bulunamadı. Lütfen MetaMask, OKX Wallet veya uyumlu bir cüzdan eklentisini aktif edin."
    );
  }

  try {
    // 3. Initialize Viem Adapter using Circle SDK adapter creation helper
    const adapter = await createViemAdapterFromProvider({
      provider: targetProvider,
    });

    return adapter;
  } catch (error: any) {
    console.error("Viem adapter oluşturulurken hata oluştu:", error);
    throw new Error(
      `Cüzdan bağlantısı başarısız oldu: ${
        error instanceof Error ? error.message : String(error)
      }. Lütfen cüzdan erişimine onay verdiğinizden emin olun.`
    );
  }
}
