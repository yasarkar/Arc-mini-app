# ArcFlow — Smart Wallet

**ArcFlow**, Arc L1 Blockchain üzerinde inşa edilen akıllı cüzdan ve kişisel finans uygulamasıdır.

Arc, programlanabilir para için tasarlanmış EVM-uyumlu bir Layer-1 blockchain'dir. En önemli farkı, native gas token'ının ETH değil **USDC** olmasıdır (6 decimal).

## Başlarken

```bash
npm install
npm run dev
```

## Network

| Parametre | Değer |
|-----------|-------|
| Ağ | Arc Testnet |
| Chain ID | `111111` (placeholder) |
| RPC | `https://testnet.arc.io/rpc` (placeholder) |
| Gezgin | [ArcScan](https://testnet.arcscan.app) |
| Faucet | [Circle Faucet](https://faucet.circle.com) |

## Teknoloji Yığını

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** — premium dark fintech tema
- **Viem** — EVM iletişim katmanı
- **Wagmi** — React hooks for Web3
- **TanStack React Query** — state & cache yönetimi

## Faz 1 — Adım 1 (Tamamlanan)

- [x] Proje iskeleti ve klasör yapısı
- [x] Custom Arc Testnet zincir tanımı (`src/config/arcChain.ts`)
- [x] Wagmi + TanStack Query providers yapısı
- [x] Premium koyu mod fintech arayüzü
- [x] Unified Balance gösterimi
- [x] Cüzdan bağlantısı (injected) ve adres görüntüleme
- [x] Network / Gas Token badge'leri