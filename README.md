# Arc Mini App

A mini application built on **Arc** — Circle's blockchain where USDC is the native gas token.

Built with:
- [Next.js](https://nextjs.org/) — React framework
- [wagmi](https://wagmi.sh/) — React Hooks for Ethereum
- [viem](https://viem.sh/) — TypeScript interface for EVM chains
- [RainbowKit](https://www.rainbowkit.com/) — Wallet connection UI

## Getting Started

```bash
npm install
npm run dev
```

## Network

Arc Testnet (Chain ID: `5042002`)

| Field | Value |
|-------|-------|
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | [https://testnet.arcscan.app](https://testnet.arcscan.app) |
| Faucet | [https://faucet.circle.com](https://faucet.circle.com) |
| USDC (ERC-20) | `0x3600000000000000000000000000000000000000` |

## Features

- Connect wallet (RainbowKit)
- View native USDC balance
- Send USDC transfers
