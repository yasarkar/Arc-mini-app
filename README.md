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
- **Lucide React** — ikon kütüphanesi

## Özellikler

### Faz 1 — Adım 1 (Proje İskeleti)
- [x] Proje iskeleti ve klasör yapısı
- [x] Custom Arc Testnet zincir tanımı (`src/config/arcChain.ts`)
- [x] Wagmi + TanStack Query providers yapısı
- [x] Premium koyu mod fintech arayüzü
- [x] Cüzdan bağlantısı (injected) ve adres görüntüleme
- [x] Network / Gas Token badge'leri

### Faz 1 — Adım 3 (Unified Balance)
- [x] Gerçek Arc Testnet USDC bakiyesi sorgulama
- [x] Çoklu zincir simüle bakiyeler (Base, Arbitrum, Solana)
- [x] Toplam Birleşik Bakiye gösterimi
- [x] Network Breakdown kartı
- [x] "Real" badge ile Arc Testnet gerçek bakiyesi
- [x] "Add Funds via CCTP" aksiyon butonu

### Faz 2 — Universal Send
- [x] `useUniversalSend` durum makinesi
- [x] Akıllı routing (Arc bakiyesi yetiyorsa direkt finalizing)
- [x] Animasyonlu stepper arayüzü
- [x] 2s yapay gecikmelerle CCTP simülasyonu

### Faz 3 — Opt-in Privacy
- [x] `usePrivacyTransfer` hook — viewing key generation & reveal
- [x] iOS-style Privacy Toggle
- [x] Viewing Key gösterimi + kopyalama
- [x] Auditor Tools paneli

### Faz 4 — AI Agent & Agentic Economy
- [x] `useArcAgent` hook — ERC-8004 onchain identity, ERC-8183 job settlement
- [x] Doğal dil finansal komut analizi (regex/keyword matching)
- [x] Dinamik görev onay kartları (Job Approval Card)
- [x] Otonom görev takip paneli (ping animasyonu)
- [x] Chat UI — mesajlaşma penceresi, ajan avatarı, auto-scroll
- [x] Collapsible panel tasarımı