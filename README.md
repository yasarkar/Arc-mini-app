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
- [x] Network Breakdown kartı (her ağ için renkli dot + bakiye)
- [x] "Real" badge ile Arc Testnet gerçek bakiyesi işaretleme
- [x] "Add Funds via CCTP" aksiyon butonu

### Faz 2 — Universal Send (Evrensel Gönderim)
- [x] `useUniversalSend` hook — durum makinesi (`idle` → `aggregating` → `bridging` → `finalizing` → `success`)
- [x] Bakiye kontrolü: Arc bakiyesi yetiyorsa direkt `finalizing`, yetmiyorsa tam stepper
- [x] Alıcı adresi ve miktar input alanları
- [x] "Yetersiz Bakiye" uyarısı
- [x] Animasyonlu stepper arayüzü (Loader2 spin, CheckCircle2, XCircle)
- [x] Başarı / Hata banner'ları
- [x] 2 saniyelik yapay gecikmelerle CCTP simülasyonu