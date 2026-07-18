"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
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
  /** Path to the SVG icon under /public/wallets/ */
  iconPath: string;
  /** Hex colour for the icon background (fallback) */
  color: string;
  type: "evm" | "non-evm";
  connector?: () =>
    | ReturnType<typeof injected>
    | ReturnType<typeof coinbaseWallet>
    | ReturnType<typeof walletConnect>;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Wallet definitions
// ---------------------------------------------------------------------------
const WALLETS: WalletOption[] = [
  {
    id: "metamask", name: "MetaMask",
    iconPath: "/wallets/metamask.svg", color: "#F6851B",
    type: "evm", connector: () => injected({ target: "metaMask" }),
  },
  {
    id: "okx", name: "OKX Wallet",
    iconPath: "/wallets/okx.svg", color: "#ffffff",
    type: "evm",
    connector: () =>
      injected({
        target: {
          id: "okxWallet",
          name: "OKX Wallet",
          provider(window: any) {
            if (window?.okxwallet) return window.okxwallet;
            if (window?.ethereum?.isOkxWallet) return window.ethereum;
            if (window?.ethereum?.providers) {
              return window.ethereum.providers.find((p: any) => p.isOkxWallet);
            }
            return undefined;
          },
        },
      }),
  },
  {
    id: "coinbase", name: "Coinbase Wallet",
    iconPath: "/wallets/coinbase.svg", color: "#0052FF",
    type: "evm", connector: () => coinbaseWallet({ appName: "ArcFlow" }),
  },
  {
    id: "walletconnect", name: "WalletConnect",
    iconPath: "/wallets/walletconnect.svg", color: "#3B99FC",
    type: "evm",
    connector: () =>
      walletConnect({
        projectId:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID",
      }),
  },
  {
    id: "rainbow", name: "Rainbow",
    iconPath: "/wallets/rainbow.svg", color: "#001A3C",
    type: "evm", connector: () => injected({ target: "rainbow" }),
  },
  // Non-EVM wallets (simulated)
  {
    id: "phantom", name: "Phantom",
    iconPath: "/wallets/phantom.svg", color: "#AB9FF2",
    type: "non-evm",
  },
  {
    id: "backpack", name: "Backpack",
    iconPath: "/wallets/backpack.svg", color: "#39D0D8",
    type: "non-evm",
  },
  {
    id: "keplr", name: "Keplr",
    iconPath: "/wallets/keplr.svg", color: "#E8831A",
    type: "non-evm",
  },
];

const POPULAR_IDS = new Set(["metamask", "phantom", "coinbase", "walletconnect"]);

// ---------------------------------------------------------------------------
// Wallet Installation Checks & Download Links
// ---------------------------------------------------------------------------
const DOWNLOAD_URLS: Record<string, string> = {
  metamask: "https://metamask.io/download/",
  okx: "https://www.okx.com/web3",
  coinbase: "https://www.coinbase.com/wallet",
  rainbow: "https://rainbow.me/",
  phantom: "https://phantom.app/download",
  backpack: "https://backpack.app/downloads",
  keplr: "https://www.keplr.app/download",
};

function isWalletInstalled(id: string): boolean {
  if (typeof window === "undefined") return false;
  const anyWindow = window as any;
  const ethereum = anyWindow.ethereum;

  switch (id) {
    case "metamask":
      return !!(ethereum?.isMetaMask || ethereum?.providers?.some((p: any) => p.isMetaMask));
    case "okx":
      return !!(anyWindow.okxwallet || ethereum?.isOkxWallet || ethereum?.providers?.some((p: any) => p.isOkxWallet));
    case "coinbase":
      return !!(anyWindow.coinbaseWalletExtension || ethereum?.isCoinbaseWallet || ethereum?.providers?.some((p: any) => p.isCoinbaseWallet));
    case "rainbow":
      return !!(ethereum?.isRainbow || ethereum?.providers?.some((p: any) => p.isRainbow));
    case "phantom":
      return !!(anyWindow.solana?.isPhantom || anyWindow.phantom?.solana);
    case "backpack":
      return !!(anyWindow.backpack || anyWindow.backpack?.solana || anyWindow.solana?.isBackpack);
    case "keplr":
      return !!anyWindow.keplr;
    default:
      return true;
  }
}

// =========================================================================
// WalletIcon — renders local SVG with fallback
// =========================================================================
function WalletIcon({
  wallet,
  size = "md",
}: {
  wallet: WalletOption;
  size?: "sm" | "md";
}) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <div
      className={`flex ${dim} flex-shrink-0 items-center justify-center rounded-full`}
      style={{ backgroundColor: `${wallet.color}20` }}
    >
      {imgError ? (
        /* Fallback: Lucide Wallet icon */
        <Wallet
          className={size === "sm" ? "h-4 w-4" : "h-5 w-5"}
          style={{ color: wallet.color }}
        />
      ) : (
        <Image
          src={wallet.iconPath}
          alt={wallet.name}
          width={size === "sm" ? 22 : 28}
          height={size === "sm" ? 22 : 28}
          className="rounded-full object-contain"
          onError={() => setImgError(true)}
        />
      )}
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
      className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-300 hover:bg-white/10 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <WalletIcon wallet={wallet} />
      <div className="flex-1 min-w-0 font-body">
        <p className="text-sm font-semibold text-white">{wallet.name}</p>
        <p className="text-xs text-zinc-400">
          {wallet.type === "evm" ? "EVM · Tarayıcı Eklentisi" : `${wallet.name} Cüzdanı`}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-zinc-300" />
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
      <p className="mb-2 px-4 text-[10px] font-display font-semibold uppercase tracking-[0.15em] text-zinc-400">
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
    <div className="hidden flex-col justify-between rounded-r-2xl bg-white/[0.02] border-l border-white/10 p-8 md:flex md:w-[280px]">
      <div>
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10">
          <Wallet className="h-7 w-7 text-white/70" />
        </div>

        <h3 className="mb-4 text-base font-display font-bold uppercase tracking-wider text-white">Cüzdan nedir?</h3>

        <div className="space-y-5 font-body">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
              <Shield className="h-4 w-4 text-[#acc6e9]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Dijital Varlıklarınız İçin Bir Ev</p>
              <p className="mt-0.5 text-xs text-semi-white">
                Kripto paranızı, NFT&apos;lerinizi ve dijital koleksiyonlarınızı güvenle saklayın.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
              <Zap className="h-4 w-4 text-[#e9a13f]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Yeni Bir Giriş Yolu</p>
              <p className="mt-0.5 text-xs text-semi-white">
                Web3 dünyasına tek tıkla adım atın. Uygulamalara ve hizmetlere cüzdanınızla bağlanın.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
              <Globe className="h-4 w-4 text-arc-green" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Çoklu Zincir Desteği</p>
              <p className="mt-0.5 text-xs text-semi-white">
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
          className="flex w-full items-center justify-center gap-1.5 rounded-[5px] border border-white/10 px-4 py-2.5 text-sm font-display font-bold text-white transition-all duration-200 hover:bg-white/10 active:scale-[0.98]"
        >
          Bir Cüzdan Edinin
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href="https://ethereum.org/en/wallets/find-wallet/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-1.5 text-xs font-body text-zinc-500 transition-colors hover:text-zinc-300"
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
  
  const [connectingNonEvmId, setConnectingNonEvmId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll and reset states when modal is open/closed
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setErrorMessage(null);
      setDownloadUrl(null);
      setConnectingNonEvmId(null);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isAnyLoading = isPending || connectingNonEvmId !== null;

  const handleConnect = useCallback(
    async (wallet: WalletOption) => {
      if (isAnyLoading) return;
      setErrorMessage(null);
      setDownloadUrl(null);

      // Check if extension is installed (except for walletconnect)
      if (wallet.id !== "walletconnect" && !isWalletInstalled(wallet.id)) {
        setErrorMessage(`${wallet.name} cüzdanı tarayıcınızda yüklü değil.`);
        setDownloadUrl(DOWNLOAD_URLS[wallet.id] || null);
        return;
      }

      if (wallet.type === "evm" && wallet.connector) {
        try {
          await connectAsync({ connector: wallet.connector() });
          onClose(); // close modal on success
        } catch (err: any) {
          console.error("EVM Connection error:", err);
          setErrorMessage("Cüzdan bağlantısı reddedildi veya hata oluştu.");
        }
      } else {
        // Non-EVM Connection
        setConnectingNonEvmId(wallet.id);
        try {
          const anyWindow = window as any;
          if (wallet.id === "phantom") {
            const provider = anyWindow.phantom?.solana || anyWindow.solana;
            const resp = await provider.connect();
            const addr = resp.publicKey.toString();
            localStorage.setItem("solana_address", addr);
            window.dispatchEvent(new Event("wallet-connection-update"));
            onClose();
          } else if (wallet.id === "backpack") {
            const provider = anyWindow.backpack || anyWindow.backpack?.solana || anyWindow.solana;
            const resp = await provider.connect();
            const addr = resp.publicKey.toString();
            localStorage.setItem("solana_address", addr);
            window.dispatchEvent(new Event("wallet-connection-update"));
            onClose();
          } else if (wallet.id === "keplr") {
            const chainId = "cosmoshub-4";
            await anyWindow.keplr.enable(chainId);
            const offlineSigner = anyWindow.keplr.getOfflineSigner(chainId);
            const accounts = await offlineSigner.getAccounts();
            const addr = accounts[0].address;
            localStorage.setItem("cosmos_address", addr);
            window.dispatchEvent(new Event("wallet-connection-update"));
            onClose();
          }
        } catch (err: any) {
          console.error("Non-EVM connection error:", err);
          setErrorMessage(`${wallet.name} cüzdan bağlantısı başarısız oldu.`);
        } finally {
          setConnectingNonEvmId(null);
        }
      }
    },
    [connectAsync, onClose, isAnyLoading],
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
      <div className="relative z-10 mx-4 flex w-full max-w-[680px] overflow-hidden rounded-2xl border border-white/10 bg-[#ffffff14] backdrop-blur-md shadow-2xl shadow-black/60">
        {/* ── Left: Wallet list ── */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-sm font-display font-semibold uppercase tracking-wider text-white">Bir Cüzdan Bağla</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          {/* Alert / Warning Banner for uninstalled extensions */}
          {errorMessage && (
            <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-[13px] text-amber-200">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 flex-shrink-0 text-amber-400" />
                <span>{errorMessage}</span>
              </div>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-shrink-0 items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-100 transition-colors hover:bg-amber-500/30"
                >
                  İndir
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

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
          {isAnyLoading && (
            <div className="flex items-center justify-center gap-2 border-t border-white/10 px-5 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-sky-sync" />
              <span className="text-xs font-body text-zinc-300">Cüzdan bağlanıyor...</span>
            </div>
          )}

          {/* Footer hint */}
          <div className="border-t border-white/10 px-5 py-3 text-center">
            <p className="text-[10px] font-body text-zinc-400">
              ArcFlow tarafından desteklenmektedir ·{" "}
              <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-zinc-300">Arc Testnet</a>
            </p>
          </div>
        </div>

        {/* ── Right: Educational panel ── */}
        <RightPanel />
      </div>
    </div>
  );
}