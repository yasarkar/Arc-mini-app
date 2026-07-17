# ArcFlow — Smart Wallet

**ArcFlow**, Arc L1 Blockchain üzerinde inşa edilen akıllı cüzdan ve kişisel finans uygulamasıdır.

Arc, programlanabilir para için tasarlanmış EVM-uyumlu bir Layer-1 blockchain'dir. En önemli farkı, native gas token'ının ETH değil **USDC** olmasıdır (6 decimal).

## Başlarken

```bash
npm install
cp .env.example .env.local   # optional: customize RPC URL
npm run dev
```

## Network

| Parametre | Değer |
|-----------|-------|
| Ağ | Arc Testnet |
| Chain ID | `111111` (placeholder) |
| RPC | `NEXT_PUBLIC_ARC_RPC_URL` env ile özelleştirilebilir |
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

### Faz 1 — Proje İskeleti & Unified Balance
- [x] Custom Arc Testnet zincir tanımı (`src/config/arcChain.ts`)
- [x] Wagmi + TanStack Query providers
- [x] Premium dark fintech arayüz
- [x] Cüzdan bağlantısı (injected) + adres görüntüleme
- [x] Network / Gas Token badge'leri
- [x] Gerçek Arc Testnet USDC bakiyesi + mock Base/Arbitrum/Solana
- [x] Toplam Birleşik Bakiye + Network Breakdown kartı

### Faz 2 — Universal Send
- [x] Akıllı routing + animasyonlu stepper (CCTP simülasyonu)

### Faz 3 — Opt-in Privacy
- [x] Privacy Toggle, Viewing Key, Auditor Tools

### Faz 4 — AI Agent & Agentic Economy
- [x] ERC-8004/8183 simülasyonu, doğal dil komutları, chat UI

## Production Deployment

### Vercel CLI ile

```bash
# 1. Vercel CLI'ı kur
npm install -g vercel

# 2. Vercel'e giriş yap
vercel login

# 3. Projeyi deploy et (preview)
vercel

# 4. Production'a al
vercel --prod
```

### GitHub + Vercel Entegrasyonu ile (önerilen)

1. [vercel.com](https://vercel.com) adresine git → "Add New Project"
2. GitHub reposu `yasarkar/Arc-mini-app`'i içe aktar
3. Framework Preset: **Next.js** (otomatik algılanır)
4. Root Directory: `./` (varsayılan)
5. Environment Variables:
   - `NEXT_PUBLIC_ARC_RPC_URL` → `https://testnet.arc.io/rpc`
6. **Deploy** → her `git push`'ta otomatik yeniden dağıtım

### Canlı Ortam Testleri

1. **Cüzdan Bağlantısı:** Tarayıcıda MetaMask'i aç → ArcFlow'a bağlan → adresin kısaltılmış halini ve "Arc Testnet / Gas: USDC" badge'lerini doğrula
2. **Unified Balance:** Cüzdan bağlıyken toplam bakiyenin göründüğünü ve Network Breakdown kartının açıldığını kontrol et
3. **AI Agent:** Arc Assistant paneline *"Her hafta Solana'daki USDC'lerimin %10'unu Arc'a köprüle"* yaz → ERC-8183 onay kartının geldiğini ve "Görevi Zincir Üstünde Onayla" butonunun çalıştığını test et

### Multi-Wallet Modal
- [x] WalletModal component with left panel (wallet list) + right panel (educational)
- [x] EVM wallets: MetaMask, OKX, Coinbase, WalletConnect, Rainbow (via Wagmi connectors)
- [x] Non-EVM wallets: Phantom, Backpack, Keplr (simulated connection)
- [x] "Yüklendi" / "Popüler" sections
- [x] Providers: injected(), coinbaseWallet(), walletConnect() configured