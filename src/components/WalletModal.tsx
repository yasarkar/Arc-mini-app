"use client";

import { useState, useCallback, useEffect } from "react";
import { useConnect } from "wagmi";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import {
  X,
  Wallet,
  ExternalLink,
  Loader2,
  ChevronRight,
  Shield,
  Zap,
  Globe,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WalletOption {
  id: string;
  name: string;
  /** icon character or emoji fallback */
  icon: string;
  /** hex colour for the icon background */
  color: string;
  type: "evm" | "non-evm";
  connector?: () => ReturnType<typeof injected>;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Wallet definitions
// ---------------------------------------------------------------------------
const WALLETS: WalletOption[] = [
  { id: "metamask", name: "MetaMask", icon: "🦊", color: "#F6851B", type: "evm", connector: () => injected() },
  { id: "okx", name: "OKX Wallet", icon: "🧩", color: "#0C0F1C", type: "evm", connector: () => injected() },
  { id: "coinbase", name: "Coinbase Wallet", icon: "🔵", color: "#0052FF", type: "evm", connector: () => coinbaseWallet({ appName: "ArcFlow" }) },
  { id: "walletconnect", name: "WalletConnect", icon: "🔗", color: "#3B99FC", type: "evm", connector: () => walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID" }) },
  { id: "rainbow", name: "Rainbow", icon: "🌈", color: "#001A3C", type: "evm", connector: () => injected() },
  // Non-EVM wallets (simulated)
  { id: "phantom", name: "Phantom", icon: "👻", color: "#AB9FF2", type: "non-evm" },
  { id: "backpack", name: "Backpack", icon: "🎒", color: "#39D0D8", type: "non-evm" },
  { id: "keplr", name: "Keplr", icon: "⭐", color: "#E8831A", type: "non-evm" },
];

const POPULAR_IDS = new Set(["metamask", "phantom", "coinbase", "walletconnect"]);

// ---------------------------------------------------------------------------
// Non-EVM connection simulation
// ---------------------------------------------------------------------------
function useSimulatedConnect() {
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const simulateConnect = useCallback(
    (walletId: string): Promise<boolean> => {
      setSimulatingId(walletId);
      return new Promise((resolve) => {
        setTimeout(() => {
          setSimulatingId(null);
          resolve(true);
        }, 1500);
      });
    },
    [],
  );

  return { simulatingId, simulateConnect };
}

// =========================================================================
// WalletIcon — circular icon with fallback
// =========================================================================
function WalletIcon({ wallet, size = "md" }: { wallet: WalletOption; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-base";
  return (
    <div
      className={`flex ${dim} flex-shrink-0 items-center justify-center rounded-full`}
      style={{ backgroundColor: `${wallet.color}20` }}
    >
      <span className="leading-none">{wallet.icon}</span>
    </div>
  );
}

// =========================================================================
// WalletButton — single wallet row
// =========================================================================
function WalletButton({
  wallet,
  onConnect,
  disabled,
}: {
  wallet: WalletOption;
  onConnect: (w: WalletOption) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onConnect(wallet)}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <WalletIcon wallet={wallet} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{wallet.name}</p>
        <p className="text-xs text-zinc-500">
          {wallet.type === "evm" ? "EVM · Browser Extension" : `${wallet.name} Wallet`}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-400" />
    </button>
  );
}

// =========================================================================
// WalletSection — group of wallets under a heading
// =========================================================================
function WalletSection({
  title,
  wallets,
  onConnect,
  disabled,
}: {
  title: string;
  wallets: WalletOption[];
  onConnect: (w: WalletOption) => void;
  disabled: boolean;
}) {
  if (wallets.length === 0) return null;
  return (
    <div>
      <p className="mb-2 px-4 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">
        {title}
      </p>
      <div className="space-y-0.5">
        {wallets.map((w) => (
          <WalletButton key={w.id} wallet={w} onConnect={onConnect} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// RightPanel — educational content
// =========================================================================
function RightPanel() {
  return (
    <div className="hidden flex-col justify-between rounded-2xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 p-8 md:flex md:w-[280px]">
      <div>
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
          <Wallet className="h-7 w-7 text-white/60" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-white">Cüzdan nedir?</h3>

        <div className="space-y-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
              <Shield className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Dijital Varlıklarınız İçin Bir Ev</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Kripto paranızı, NFT&apos;lerinizi ve dijital koleksiyonlarınızı güvenle saklayın.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Yeni Bir Giriş Yolu</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Web3 dünyasına tek tıkla adım atın. Uygulamalara ve hizmetlere cüzdanınızla bağlanın.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
              <Globe className="h-4 w-4 text-arc-green" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Çoklu Zincir Desteği</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                EVM, Solana ve Cosmos ekosistemlerindeki varlıklarınızı tek bir panelden yönetin.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-2">
        <a
          href="https://ethereum.org/en/wallets/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-white/[0.06] active:scale-[0.98]"
        >
          Bir Cüzdan Edinin
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href="https://ethereum.org/en/wallets/find-wallet/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Daha fazla bilgi edinin
          <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// =========================================================================
// WalletModal
// =========================================================================
export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectAsync, isPending } = useConnect();
  const { simulatingId, simulateConnect } = useSimulatedConnect();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const isAnyLoading = isPending || simulatingId !== null;

  const handleConnect = useCallback(
    async (wallet: WalletOption) => {
      if (isAnyLoading) return;

      if (wallet.type === "evm" && wallet.connector) {
        try {
          await connectAsync({ connector: wallet.connector() });
          onClose(); // close modal on success
        } catch {
          // user cancelled — stay open
        }
      } else {
        // Non-EVM: simulate
        await simulateConnect(wallet.id);
        onClose();
      }
    },
    [connectAsync, simulateConnect, onClose, isAnyLoading],
  );

  if (!isOpen) return null;

  const installed = WALLETS.filter((w) => POPULAR_IDS.has(w.id));
  const popular = WALLETS.filter((w) => !POPULAR_IDS.has(w.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 flex w-full max-w-[680px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0B0F] shadow-2xl shadow-black/60">
        {/* ── Left: Wallet list ── */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Connect a Wallet</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          {/* Wallet list */}
          <div className="space-y-6 overflow-y-auto px-3 py-5">
            <WalletSection
              title="Yüklendi"
              wallets={installed}
              onConnect={handleConnect}
              disabled={isAnyLoading}
            />
            <WalletSection
              title="Popüler"
              wallets={popular}
              onConnect={handleConnect}
              disabled={isAnyLoading}
            />
          </div>

          {/* Loading indicator */}
          {(isPending || simulatingId) && (
            <div className="flex items-center justify-center gap-2 border-t border-white/[0.06] px-5 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-arc-blue" />
              <span className="text-xs text-zinc-400">Cüzdan bağlanıyor...</span>
            </div>
          )}

          {/* Footer hint */}
          <div className="border-t border-white/[0.06] px-5 py-3 text-center">
            <p className="text-[10px] text-zinc-700">
              ArcFlow tarafından desteklenmektedir ·{" "}
              <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer"
                 className="underline underline-offset-2 hover:text-zinc-500">Arc Testnet</a>
            </p>
          </div>
        </div>

        {/* ── Right: Educational panel ── */}
        <RightPanel />
      </div>
    </div>
  );
}