"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: Date;
  /** If this message contains an approval request, here's the linked job */
  jobId?: string;
}

export type JobStatus = "pending_approval" | "escrowed" | "running" | "completed";

export interface ArcJob {
  jobId: string;
  description: string;
  status: JobStatus;
  amount: number;
  sourceChain?: string;
  targetChain?: string;
  frequency?: string;
  privacyMode?: boolean;
  actionType?: "bridge" | "swap" | "transfer" | "stake";
  fromToken?: string;
  toToken?: string;
  conditionType?: "balance" | "price";
  conditionAmount?: number;
}

export interface ArcAgentResult {
  messages: Message[];
  activeJobs: ArcJob[];
  sendMessage: (text: string) => void;
  approveJob: (jobId: string) => void;
  rejectJob: (jobId: string) => void;
  isChatOpen: boolean;
  toggleChat: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let msgCounter = 0;
function nextId() {
  return `msg_${++msgCounter}_${Date.now()}`;
}

let jobCounter = 0;
function nextJobId() {
  return `job_erc8183_${++jobCounter}_${Date.now().toString(36)}`;
}

/** Generate a mock ERC-8183 hex identifier */
function mockJobOnchainId() {
  return `0x${Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("")}`;
}

// ---------------------------------------------------------------------------
// Keyword analysis — parse the user's intent
// ---------------------------------------------------------------------------
interface ParsedIntent {
  isAutomation: boolean;
  actionType: "bridge" | "swap" | "transfer" | "stake";
  amount: number | null;
  fromToken: string;
  toToken: string;
  sourceChain: string | null;
  targetChain: string | null;
  frequency: string | null;
  privacyMode: boolean;
  conditionType: "balance" | "price" | null;
  conditionAmount: number | null;
  description: string;
}

function parseIntent(text: string): ParsedIntent {
  const lower = text.toLowerCase();

  // 1. Split condition vs action clauses
  const splitKeywords = ["olduğunda", "olursa", "ise", "aşınca", "geçince", "düşünce", "when", "if"];
  let conditionClause = "";
  let actionClause = lower;

  for (const kw of splitKeywords) {
    if (lower.includes(kw)) {
      const idx = lower.indexOf(kw);
      if (kw === "when" || kw === "if") {
        conditionClause = lower.slice(idx);
        actionClause = lower.replace(conditionClause, "");
      } else {
        conditionClause = lower.slice(0, idx + kw.length);
        actionClause = lower.slice(idx + kw.length);
      }
      break;
    }
  }

  // 2. Parse Trigger Conditions
  let conditionType: "balance" | "price" | null = null;
  let conditionAmount: number | null = null;

  if (conditionClause) {
    if (conditionClause.includes("bakiye") || conditionClause.includes("balance")) {
      conditionType = "balance";
    } else if (
      conditionClause.includes("fiyat") ||
      conditionClause.includes("price") ||
      conditionClause.includes("saparsa") ||
      conditionClause.includes("depeg")
    ) {
      conditionType = "price";
    }

    const condNumbers = conditionClause.match(/(\d+(?:\.\d+)?)/g);
    if (condNumbers && condNumbers.length > 0) {
      conditionAmount = parseFloat(condNumbers[0]);
    }
  }

  // 3. Parse Amount
  let amount: number | null = null;
  const actionNumbers = actionClause.match(/(\d+(?:\.\d+)?)/g);
  if (actionNumbers && actionNumbers.length > 0) {
    amount = parseFloat(actionNumbers[0]);
  } else if (!conditionClause) {
    const allNumbers = lower.match(/(\d+(?:\.\d+)?)/g);
    if (allNumbers && allNumbers.length > 0) {
      amount = parseFloat(allNumbers[0]);
    }
  }

  // 4. Parse Frequency
  const freqMap: Record<string, string> = {
    "her gün": "daily",
    "günlük": "daily",
    "daily": "daily",
    "her hafta": "weekly",
    "haftalık": "weekly",
    "weekly": "weekly",
    "her ay": "monthly",
    "aylık": "monthly",
    "monthly": "monthly",
    "her pazartesi": "weekly",
    "her pazar": "weekly",
    "periyodik": "weekly",
    "düzenli": "weekly",
  };
  let frequency: string | null = null;
  for (const [keyword, val] of Object.entries(freqMap)) {
    if (lower.includes(keyword)) {
      frequency = val;
      break;
    }
  }
  if (!frequency && lower.includes("her ")) {
    frequency = "weekly";
  }

  // 5. Parse Chains with Position/Preposition Awareness
  const chains = ["solana", "base", "arbitrum", "ethereum", "arc"];
  const targetText = actionClause || lower;
  const chainPositions = chains
    .map((c) => ({ name: c, index: targetText.indexOf(c) }))
    .filter((p) => p.index !== -1)
    .sort((a, b) => a.index - b.index);

  let sourceChain: string | null = null;
  let targetChain: string | null = null;

  const checkSourceIndicator = (chain: string, text: string) => {
    const regex = new RegExp(`(from\\s+${chain}|${chain}\\s*['’]?(?:den|dan|ten|tan))`, "i");
    return regex.test(text);
  };

  const checkTargetIndicator = (chain: string, text: string) => {
    const regex = new RegExp(`(to\\s+${chain}|into\\s+${chain}|${chain}\\s*['’]?(?:e|a|ye|ya))`, "i");
    return regex.test(text);
  };

  for (const p of chainPositions) {
    if (checkSourceIndicator(p.name, targetText)) {
      sourceChain = p.name;
    }
    if (checkTargetIndicator(p.name, targetText)) {
      targetChain = p.name;
    }
  }

  if (!sourceChain && !targetChain) {
    if (chainPositions.length >= 2) {
      sourceChain = chainPositions[0].name;
      targetChain = chainPositions[1].name;
    } else if (chainPositions.length === 1) {
      sourceChain = chainPositions[0].name;
      targetChain = "arc";
    }
  } else if (sourceChain && !targetChain) {
    targetChain = sourceChain === "arc" ? "base" : "arc";
  } else if (!sourceChain && targetChain) {
    sourceChain = targetChain === "arc" ? "base" : "arc";
  }

  // 6. Parse Action Types
  let actionType: "bridge" | "swap" | "transfer" | "stake" = "transfer";
  const swapKeywords = ["swap", "takas", "çevir", "dönüştür", "convert", "takasla"];
  const stakeKeywords = ["stake", "yatır", "earn", "faiz", "nemalandır"];
  const bridgeKeywords = ["köprüle", "bridge", "geçir", "aktar", "cctp"];

  if (swapKeywords.some((k) => lower.includes(k))) {
    actionType = "swap";
  } else if (stakeKeywords.some((k) => lower.includes(k))) {
    actionType = "stake";
  } else if (
    bridgeKeywords.some((k) => lower.includes(k)) ||
    (sourceChain !== targetChain && sourceChain && targetChain)
  ) {
    actionType = "bridge";
  } else {
    actionType = "transfer";
  }

  // 7. Parse Tokens
  const tokens = ["usdc", "eurc", "sol", "atom", "eth"];
  const foundTokens = tokens
    .map((t) => ({ name: t.toUpperCase(), index: lower.indexOf(t) }))
    .filter((p) => p.index !== -1)
    .sort((a, b) => a.index - b.index);

  let fromToken = "USDC";
  let toToken = "USDC";

  if (actionType === "swap") {
    if (foundTokens.length >= 2) {
      fromToken = foundTokens[0].name;
      toToken = foundTokens[1].name;
    } else if (foundTokens.length === 1) {
      toToken = foundTokens[0].name;
      fromToken = toToken === "USDC" ? "EURC" : "USDC";
    } else {
      fromToken = "USDC";
      toToken = "EURC";
    }
  } else {
    if (foundTokens.length >= 1) {
      fromToken = foundTokens[0].name;
      toToken = foundTokens[0].name;
    }
  }

  // 8. Automation Check
  const autoKeywords = [
    "köprüle", "aktar", "taşı", "gönder", "transfer",
    "otomatik", "her", "periyodik", "düzenli", "zamanla",
    "swap", "takas", "çevir", "yatır", "stake", "olduğunda", "olursa", "ise"
  ];
  const isAutomation = autoKeywords.some((k) => lower.includes(k));

  const cap = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : null);

  return {
    isAutomation,
    actionType,
    amount,
    fromToken,
    toToken,
    sourceChain: cap(sourceChain),
    targetChain: cap(targetChain),
    frequency,
    privacyMode: lower.includes("gizli") || lower.includes("private"),
    conditionType,
    conditionAmount,
    description: text.length > 80 ? text.slice(0, 80) + "..." : text,
  };
}

// ---------------------------------------------------------------------------
// Agent response templates
// ---------------------------------------------------------------------------
function buildAgentResponse(intent: ParsedIntent): {
  text: string;
  job: ArcJob | null;
} {
  if (!intent.isAutomation) {
    return {
      text:
        "Merhaba! Ben ArcFlow'un yapay zeka finansal asistanıyım. 🧠\n\n" +
        "Şu an otonom finansal görevler oluşturmanıza yardımcı olabilirim. " +
        "Örneğin:\n" +
        '• _"Her hafta Solana\'daki USDC\'lerimin %10\'unu Arc\'a köprüle"_\n' +
        '• _"Bakiyem 100 USDC\'yi aşınca Base\'ten Arc\'a 10 USDC aktar"_\n' +
        '• _"Arc\'ta 50 USDC\'yi EURC\'ye swap et"_',
      job: null,
    };
  }

  const amtDisplay = intent.amount
    ? intent.amount > 50
      ? `${intent.amount} ${intent.fromToken}`
      : `%${intent.amount}`
    : `tüm ${intent.fromToken}`;

  const sourceDisplay = intent.sourceChain ?? "Arc";
  const targetDisplay = intent.targetChain ?? "Arc";
  const freqDisplay = intent.frequency ?? "one-time";
  const privacyLabel = intent.privacyMode ? " (Gizli Mod)" : "";

  let conditionLabel = "";
  if (intent.conditionType === "balance" && intent.conditionAmount !== null) {
    conditionLabel = `\n⏱ **Tetikleyici Koşul:** ${sourceDisplay} Bakiyesi > ${intent.conditionAmount} USDC`;
  } else if (intent.conditionType === "price" && intent.conditionAmount !== null) {
    conditionLabel = `\n⏱ **Tetikleyici Koşul:** USDC Fiyatı < ${intent.conditionAmount} USD`;
  } else if (intent.frequency) {
    conditionLabel = `\n⏱ **Tetikleyici Koşul:** Zamanla (${freqDisplay})`;
  } else {
    conditionLabel = `\n⏱ **Tetikleyici Koşul:** Anında (Manuel Onay)`;
  }

  let taskDetails = "";
  if (intent.actionType === "bridge") {
    taskDetails = `📋 **Görev:** ${sourceDisplay} → ${targetDisplay} Köprüleme (${amtDisplay})${privacyLabel}`;
  } else if (intent.actionType === "swap") {
    taskDetails = `📋 **Görev:** ${sourceDisplay} Ağında Takas (${intent.fromToken} → ${intent.toToken})`;
  } else if (intent.actionType === "stake") {
    taskDetails = `📋 **Görev:** ${sourceDisplay} Ağında Staking (${amtDisplay})`;
  } else {
    taskDetails = `📋 **Görev:** ${sourceDisplay} → ${targetDisplay} Transfer (${amtDisplay})`;
  }

  const job: ArcJob = {
    jobId: nextJobId(),
    description: intent.description,
    status: "pending_approval",
    amount: intent.amount ?? 0,
    sourceChain: intent.sourceChain ?? undefined,
    targetChain: intent.targetChain ?? undefined,
    frequency: intent.frequency ?? undefined,
    privacyMode: intent.privacyMode,
    actionType: intent.actionType,
    fromToken: intent.fromToken,
    toToken: intent.toToken,
    conditionType: intent.conditionType ?? undefined,
    conditionAmount: intent.conditionAmount ?? undefined,
  };

  const text =
    `İsteğinizi anladım. **ERC-8183** standartlarında bir otonom görev hazırladım.\n\n` +
    `${taskDetails}\n` +
    `🔗 **Standart:** ERC-8183 Job Escrow\n` +
    `💰 **Bütçe:** ${amtDisplay}` +
    conditionLabel +
    `\n\nGörevi onaylıyor musunuz?`;

  return { text, job };
}

// ---------------------------------------------------------------------------
// useArcAgent hook
// ---------------------------------------------------------------------------
export interface ArcAgentParams {
  isConnected: boolean;
  activeAddress: string | null;
  chains: { id: string; name: string; balance: number; symbol: string; isMock: boolean }[];
  executeSend: (toAddress: string, amount: number) => Promise<void>;
  sendStatus: string;
  sendError: string | null;
  connectedChainId: number | null;
}

function getChainIdFromName(name: string): number | null {
  const n = name.toLowerCase();
  if (n.includes("arc")) return 5042002;
  if (n.includes("base")) return 84532;
  if (n.includes("arbitrum")) return 421614;
  if (n.includes("ethereum") || n.includes("sepolia")) return 11155111;
  return null;
}

// ---------------------------------------------------------------------------
// useArcAgent hook
// ---------------------------------------------------------------------------
export function useArcAgent({
  isConnected,
  activeAddress,
  chains,
  executeSend,
  sendStatus,
  sendError,
  connectedChainId,
}: ArcAgentParams): ArcAgentResult {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: nextId(),
      role: "agent",
      text:
        "Merhaba! Ben ArcFlow'un **ERC-8004** tescilli yapay zeka ajanıyım.\n\n" +
        "Bana doğal dilde finansal görevler verebilirsiniz. Örneğin:\n" +
        '• _"Her hafta Solana\'daki USDC\'lerimin %10\'unu Arc\'a köprüle"_\n' +
        '• _"Bakiyem 100 USDC\'den fazlaysa Base\'ten Arc\'a 10 USDC transfer et"_\n' +
        '• _"Arc\'ta 50 USDC\'yi EURC\'ye swap et"_',
      timestamp: new Date(),
    },
  ]);
  const [activeJobs, setActiveJobs] = useState<ArcJob[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [executingJobId, setExecutingJobId] = useState<string | null>(null);

  const activeJobsRef = useRef<ArcJob[]>([]);
  const lastExecutionRef = useRef<Record<string, number>>({});
  const isConnectedRef = useRef(isConnected);
  const activeAddressRef = useRef(activeAddress);
  const chainsRef = useRef(chains);
  const executeSendRef = useRef(executeSend);
  const connectedChainIdRef = useRef(connectedChainId);
  const executingJobIdRef = useRef<string | null>(null);
  const lastWarnRef = useRef<Record<string, number>>({});

  useEffect(() => {
    activeJobsRef.current = activeJobs;
  }, [activeJobs]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
    activeAddressRef.current = activeAddress;
    chainsRef.current = chains;
    executeSendRef.current = executeSend;
    connectedChainIdRef.current = connectedChainId;
    executingJobIdRef.current = executingJobId;
  }, [isConnected, activeAddress, chains, executeSend, connectedChainId, executingJobId]);

  // otonom işlerin durum takibi (başarı / hata logları)
  useEffect(() => {
    if (!executingJobId) return;

    const job = activeJobs.find((j) => j.jobId === executingJobId);
    if (!job) return;

    if (sendStatus === "success") {
      const txHash = mockJobOnchainId();
      const actionLabel = job.actionType === "bridge" 
        ? "Bridge" 
        : job.actionType === "swap" 
          ? "Takas (Swap)" 
          : job.actionType === "stake" 
            ? "Staking" 
            : "Transfer";

      const successMsg: Message = {
        id: nextId(),
        role: "agent",
        text: `✅ **[Otonom Görev Başarıyla Gerçekleşti]**\n\n` +
              `⚙️ **İşlem:** ${actionLabel}\n` +
              `💰 **Tutar:** ${job.amount} ${job.fromToken || "USDC"}\n` +
              `⛓ **Yön:** ${job.sourceChain || "Base"} → ${job.targetChain || "Arc Testnet"}\n` +
              `🔗 **Tx Hash:** ${txHash.slice(0, 10)}...${txHash.slice(-8)}\n\n` +
              `İşlem cüzdanınız aracılığıyla zincir üstünde kesinleştirildi. Bakiyeler güncellendi.`,
        timestamp: new Date(),
        jobId: job.jobId,
      };
      setMessages((prev) => [...prev, successMsg]);

      // Tek seferlikse tamamla, periyodikse aktif bırak
      if (!job.frequency) {
        setActiveJobs((prev) =>
          prev.map((j) => (j.jobId === job.jobId ? { ...j, status: "completed" as JobStatus } : j))
        );
      }

      lastExecutionRef.current[job.jobId] = Date.now();
      setExecutingJobId(null);

      // Tetikleyici UI güncellemesi
      window.dispatchEvent(new Event("balance-update"));
    } else if (sendStatus === "error") {
      const failMsg: Message = {
        id: nextId(),
        role: "agent",
        text: `⚠️ **[Otonom Görev Başarısız]**\n\n` +
              `Cüzdandaki işlem başarısız oldu veya reddedildi:\n` +
              `_${sendError || "Kullanıcı işlemi reddetti."}_`,
        timestamp: new Date(),
        jobId: job.jobId,
      };
      setMessages((prev) => [...prev, failMsg]);
      setExecutingJobId(null);
    }
  }, [sendStatus, sendError, executingJobId, activeJobs]);

  // otonom işleri 5 saniyede bir kontrol eden otonom döngü
  useEffect(() => {
    const interval = setInterval(() => {
      const runningJobs = activeJobsRef.current.filter((j) => j.status === "running");
      if (runningJobs.length === 0) return;

      // Eğer şu an cüzdanda bekleyen aktif bir işlem varsa, yeni işlem tetikleme
      if (executingJobIdRef.current) return;

      runningJobs.forEach((job) => {
        const now = Date.now();
        const lastExec = lastExecutionRef.current[job.jobId] || 0;

        let shouldTrigger = false;
        
        // Cüzdan bağlıysa ve ağ eşleşmesi gerekiyorsa
        const sourceChainName = job.sourceChain || "Solana";
        const isNonEvm = ["solana", "cosmos", "cosmos hub"].includes(sourceChainName.toLowerCase());

        // Bakiye kontrolü
        let srcBalance = 0;
        if (isConnectedRef.current) {
          const matchedChain = chainsRef.current.find(
            (c) =>
              c.id === sourceChainName.toLowerCase() ||
              c.name.toLowerCase().includes(sourceChainName.toLowerCase())
          );
          if (matchedChain) {
            srcBalance = matchedChain.balance;
          } else {
            // Fallback to local storage if not found in active list
            const srcKey = sourceChainName.toLowerCase() === "arc testnet" 
              ? "sim_balance_arc" 
              : `sim_balance_${sourceChainName.toLowerCase()}`;
            srcBalance = parseFloat(localStorage.getItem(srcKey) || "0");
          }
        } else {
          const srcKey = sourceChainName.toLowerCase() === "arc testnet" 
            ? "sim_balance_arc" 
            : `sim_balance_${sourceChainName.toLowerCase()}`;
          srcBalance = parseFloat(localStorage.getItem(srcKey) || "0");
        }

        if (job.conditionType === "balance" && job.conditionAmount !== undefined) {
          if (srcBalance > job.conditionAmount && now - lastExec >= 15000) {
            shouldTrigger = true;
          }
        } else if (job.frequency) {
          if (now - lastExec >= 20000) {
            shouldTrigger = true;
          }
        } else if (!job.conditionType && !job.frequency) {
          // Anında (Manuel Onay) - tetiklenmemişse tetiklensin
          if (lastExec === 0) {
            shouldTrigger = true;
          }
        }

        if (shouldTrigger) {
          // Calculate amount
          let deduct = job.amount;
          if (deduct === 0) {
            const pctMatch = job.description.match(/(\d+)\s*%/);
            if (pctMatch) {
              deduct = parseFloat((srcBalance * (parseFloat(pctMatch[1]) / 100)).toFixed(2));
            } else {
              deduct = 10;
            }
          }

          if (srcBalance < deduct) {
            // Yetersiz bakiye logu
            const failMsg: Message = {
              id: nextId(),
              role: "agent",
              text: `⚠️ **[Otonom Görev Tetiklenemedi]**\n\n` +
                    `Gerekli tutar (${deduct} ${job.fromToken || "USDC"}) kaynak ağda (${sourceChainName}) bulunamadı.\n` +
                    `Mevcut bakiye: ${srcBalance} ${job.fromToken || "USDC"}. Görev beklemede.`,
              timestamp: new Date(),
              jobId: job.jobId,
            };
            setMessages((prev) => [...prev, failMsg]);
            lastExecutionRef.current[job.jobId] = now; // rate-limit logging
            return;
          }

          // ─── GERÇEK VS SİMÜLE AYRIMI ───
          if (isConnectedRef.current && !isNonEvm) {
            // EVM ağlarında gerçek işlem tetikleme
            const expectedChainId = getChainIdFromName(sourceChainName);
            const currentChainId = connectedChainIdRef.current;

            if (expectedChainId !== null && currentChainId !== expectedChainId) {
              // Yanlış ağ uyarısı (20s rate-limit)
              const lastWarn = lastWarnRef.current[job.jobId] || 0;
              if (now - lastWarn >= 20000) {
                lastWarnRef.current[job.jobId] = now;
                const warnMsg: Message = {
                  id: nextId(),
                  role: "agent",
                  text: `⚠️ **[Otonom Görev Ağı Bekliyor]**\n\n` +
                        `**${sourceChainName}** ağından tetikleme yapmak için lütfen cüzdan ağınızı **${sourceChainName}** olarak değiştirin.\n` +
                        `Mevcut ağ ID: ${currentChainId} · Beklenen ağ ID: ${expectedChainId}`,
                  timestamp: new Date(),
                  jobId: job.jobId,
                };
                setMessages((prev) => [...prev, warnMsg]);
              }
              return;
            }

            // Doğru ağdaysak cüzdan imzasını tetikleme
            setExecutingJobId(job.jobId);
            const triggerMsg: Message = {
              id: nextId(),
              role: "agent",
              text: `⏱ **[Otonom Görev Tetiklendi]**\n\n` +
                    `⚙️ **İşlem:** Bridge/Transfer\n` +
                    `💰 **Tutar:** ${deduct} ${job.fromToken || "USDC"}\n` +
                    `⛓ **Kaynak Ağ:** ${sourceChainName}\n\n` +
                    `İşlemi başlatmak için cüzdanınızda (MetaMask vb.) açılan pencereyi onaylayın.`,
              timestamp: new Date(),
              jobId: job.jobId,
            };
            setMessages((prev) => [...prev, triggerMsg]);

            executeSendRef.current(activeAddressRef.current || "", deduct).catch((err) => {
              console.error("Agent execution send failed:", err);
              // reset executing job ID on immediate rejection
              setExecutingJobId(null);
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: "agent",
                  text: `❌ **[Otonom Görev İptal Edildi]**\n\n` +
                        `İşlem cüzdanda onaylanmadı veya reddedildi.`,
                  timestamp: new Date(),
                  jobId: job.jobId,
                },
              ]);
            });
          } else {
            // Non-EVM veya Cüzdan bağlı değilken: Simüle çalış
            lastExecutionRef.current[job.jobId] = now;

            const targetChainName = job.targetChain || "Arc";
            const srcKey = sourceChainName.toLowerCase() === "arc testnet" 
              ? "sim_balance_arc" 
              : `sim_balance_${sourceChainName.toLowerCase()}`;
            const targetKey = targetChainName.toLowerCase() === "arc testnet" 
              ? "sim_balance_arc" 
              : `sim_balance_${targetChainName.toLowerCase()}`;

            localStorage.setItem(srcKey, (srcBalance - deduct).toFixed(2));
            const targetBalance = parseFloat(localStorage.getItem(targetKey) || "0");
            localStorage.setItem(targetKey, (targetBalance + deduct).toFixed(2));

            // Refresh UI
            window.dispatchEvent(new Event("balance-update"));

            const txHash = mockJobOnchainId();
            const actionLabel = job.actionType === "bridge" 
              ? "Bridge" 
              : job.actionType === "swap" 
                ? "Takas (Swap)" 
                : job.actionType === "stake" 
                  ? "Staking" 
                  : "Transfer";

            const successMsg: Message = {
              id: nextId(),
              role: "agent",
              text: `⏱ **[Otonom Görev Tetiklendi - Simüle]**\n\n` +
                    `⚙️ **İşlem:** ${actionLabel}\n` +
                    `💰 **Tutar:** ${deduct} ${job.fromToken || "USDC"}\n` +
                    `⛓ **Yön:** ${sourceChainName} → ${targetChainName}\n` +
                    `🔗 **Simüle Tx Hash:** ${txHash.slice(0, 10)}...${txHash.slice(-8)}\n\n` +
                    `İşlem simüle ağda otonom olarak gerçekleştirildi. Bakiyeler güncellendi.`,
              timestamp: new Date(),
              jobId: job.jobId,
            };
            setMessages((prev) => [...prev, successMsg]);

            if (!job.frequency) {
              setActiveJobs((prev) =>
                prev.map((j) => (j.jobId === job.jobId ? { ...j, status: "completed" as JobStatus } : j))
              );
            }
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: nextId(),
      role: "user",
      text: trimmed,
      timestamp: new Date(),
    };

    const intent = parseIntent(trimmed);
    const { text: responseText, job } = buildAgentResponse(intent);

    const agentMsg: Message = {
      id: nextId(),
      role: "agent",
      text: responseText,
      timestamp: new Date(),
      jobId: job?.jobId,
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);

    if (job) {
      setActiveJobs((prev) => [...prev, job]);
    }
  }, []);

  const approveJob = useCallback((jobId: string) => {
    setActiveJobs((prev) =>
      prev.map((j) => {
        if (j.jobId !== jobId) return j;

        const approvalMsg: Message = {
          id: nextId(),
          role: "agent",
          text:
            `✅ **Görev zincir üstünde onaylandı!**\n\n` +
            `🔗 **ERC-8183 Job ID:** ${mockJobOnchainId()}\n` +
            `💰 **Escrow Havuzu:** ${j.amount > 0 ? `${j.amount} ${j.fromToken || "USDC"}` : "Değişken"} bloke edildi.\n` +
            `⏱ **Durum:** Otonom çalışıyor (ERC-8183)\n\n` +
            `Görev koşulları sağlandıkça otomatik tetiklenecektir.`,
          timestamp: new Date(),
          jobId: j.jobId,
        };
        setMessages((prev) => [...prev, approvalMsg]);

        // initialize target execution time to prevent immediate firing on approval (except for immediate tasks)
        if (j.conditionType || j.frequency) {
          lastExecutionRef.current[j.jobId] = Date.now();
        }

        return { ...j, status: "running" as JobStatus };
      }),
    );
  }, []);

  const rejectJob = useCallback((jobId: string) => {
    setActiveJobs((prev) =>
      prev.map((j) => {
        if (j.jobId !== jobId) return j;

        const rejectMsg: Message = {
          id: nextId(),
          role: "agent",
          text: `❌ Görev **${j.jobId}** iptal edildi. Başka bir görevle tekrar deneyebilirsiniz.`,
          timestamp: new Date(),
          jobId: j.jobId,
        };
        setMessages((prev) => [...prev, rejectMsg]);

        return { ...j, status: "completed" as JobStatus };
      }),
    );
  }, []);

  return {
    messages,
    activeJobs,
    sendMessage,
    approveJob,
    rejectJob,
    isChatOpen,
    toggleChat,
  };
}