"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { arcTestnet } from "@/wagmi";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

function USDCBalance() {
  const { address, isConnected } = useAccount();

  const { data: usdcBalance, isLoading: usdcLoading } = useBalance({
    address,
    token: USDC_ADDRESS,
    chainId: arcTestnet.id,
  });

  const { data: nativeBalance, isLoading: nativeLoading } = useBalance({
    address,
    chainId: arcTestnet.id,
  });

  if (!isConnected) return null;

  return (
    <div className="balance-card">
      <div className="balance-item">
        <span className="label">USDC Balance</span>
        <span className="value">
          {usdcLoading
            ? "Loading..."
            : usdcBalance
              ? `${formatUnits(usdcBalance.value, usdcBalance.decimals)} USDC`
              : "0 USDC"}
        </span>
      </div>
      <div className="balance-item muted">
        <span className="label">Network</span>
        <span className="value">Arc Testnet</span>
      </div>
      <div className="balance-item muted">
        <span className="label">Chain ID</span>
        <span className="value">{arcTestnet.id}</span>
      </div>
      <div className="info-note">
        ⚡ USDC is the native gas token on Arc — one balance, two views.
      </div>
    </div>
  );
}

function SendUSDC() {
  return (
    <div className="card">
      <h2>Send USDC</h2>
      <p className="coming-soon">Transfer functionality coming soon.</p>
    </div>
  );
}

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="container">
      <header className="header">
        <h1>Arc Mini App</h1>
        <ConnectButton />
      </header>

      <section className="hero">
        <h2>Welcome to Arc</h2>
        <p>
          Arc is Circle&apos;s blockchain where <strong>USDC is the native gas
          token</strong>.
          Connect your wallet to view your balance and send transactions.
        </p>
      </section>

      {isConnected ? (
        <div className="dashboard">
          <USDCBalance />
          <SendUSDC />
        </div>
      ) : (
        <div className="connect-prompt">
          <p>Connect your wallet to get started.</p>
        </div>
      )}

      <footer className="footer">
        <p>Built on Arc Testnet — Chain ID {arcTestnet.id}</p>
      </footer>
    </main>
  );
}
