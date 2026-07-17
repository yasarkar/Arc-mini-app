"use client";

import { useState, useCallback } from "react";

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
  amount: number | null;
  sourceChain: string | null;
  targetChain: string | null;
  frequency: string | null;
  privacyMode: boolean;
  description: string;
}

function parseIntent(text: string): ParsedIntent {
  const lower = text.toLowerCase();

  // Detect chains
  const chains = ["solana", "base", "arbitrum", "ethereum", "arc"];
  const foundChains = chains.filter((c) => lower.includes(c));

  // Detect frequency
  const freqMap: Record<string, string> = {
    "her gün": "daily",
    "her hafta": "weekly",
    "her ay": "monthly",
    "her pazartesi": "weekly",
    "periyodik": "weekly",
    "düzenli": "weekly",
    "her": "weekly",
  };
  let frequency: string | null = null;
  for (const [keyword, val] of Object.entries(freqMap)) {
    if (lower.includes(keyword)) {
      frequency = val;
      break;
    }
  }

  // Detect amount (percentage or absolute)
  let amount: number | null = null;
  const pctMatch = lower.match(/(\d+)\s*%?/);
  if (pctMatch) {
    amount = parseFloat(pctMatch[1]);
  }

  // Detect privacy
  const privacyMode = lower.includes("gizli") || lower.includes("private");

  // Detect automation keywords
  const autoKeywords = [
    "köprüle", "aktar", "taşı", "gönder", "transfer",
    "otomatik", "her", "periyodik", "düzenli", "zamanla",
  ];
  const isAutomation = autoKeywords.some((k) => lower.includes(k));

  // Build description
  let description = text.length > 80 ? text.slice(0, 80) + "..." : text;

  // Source/target
  const sourceChain = foundChains.length > 0 ? foundChains[0] : null;
  const targetChain = foundChains.length > 1 ? foundChains[1] : "arc";

  return {
    isAutomation,
    amount,
    sourceChain,
    targetChain,
    frequency,
    privacyMode,
    description,
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
        "Şu an için **otomatik finansal görevler** oluşturmanıza yardımcı olabilirim. " +
        "Örneğin:\n" +
        '• _"Her hafta Solana\'daki USDC\'lerimin %10\'unu Arc\'a köprüle"_  \n' +
        '• _"Her gün 20 USDC\'yi gizli havuzuma aktar"_  \n' +
        '• _"Base\'ten Arc\'a düzenli transfer başlat"_',
      job: null,
    };
  }

  const amtDisplay = intent.amount
    ? intent.amount > 50
      ? `${intent.amount} USDC`
      : `%${intent.amount}`
    : "tüm";

  const sourceDisplay = intent.sourceChain ?? "mevcut ağlar";
  const targetDisplay = intent.targetChain ?? "Arc";
  const freqDisplay = intent.frequency ?? "one-time";
  const privacyLabel = intent.privacyMode ? " (Gizli Mod)" : "";

  const job: ArcJob = {
    jobId: nextJobId(),
    description: intent.description,
    status: "pending_approval",
    amount: intent.amount ?? 0,
    sourceChain: intent.sourceChain ?? undefined,
    targetChain: intent.targetChain ?? "arc",
    frequency: intent.frequency ?? undefined,
    privacyMode: intent.privacyMode,
  };

  const text =
    `İsteğinizi anladım. **ERC-8183** standartlarında bir otonom görev hazırladım.\n\n` +
    `📋 **Görev:** ${freqDisplay ? `${freqDisplay} ` : ""}${amtDisplay} USDC ` +
    `${sourceDisplay} → ${targetDisplay}${privacyLabel}\n` +
    `🔗 **Standart:** ERC-8183 Job Escrow\n` +
    `💰 **Bütçe:** ${amtDisplay} USDC\n` +
    `⛓ **Kaynak:** ${sourceDisplay}\n` +
    `🎯 **Hedef:** ${targetDisplay}\n\n` +
    `Onaylıyor musunuz?`;

  return { text, job };
}

// ---------------------------------------------------------------------------
// useArcAgent
// ---------------------------------------------------------------------------
export function useArcAgent(): ArcAgentResult {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: nextId(),
      role: "agent",
      text:
        "Merhaba! Ben ArcFlow'un **ERC-8004** tescilli yapay zeka ajanıyım.\n\n" +
        "Bana doğal dilde finansal görevler verebilirsiniz. Örneğin:\n" +
        '• _"Her hafta Solana\'daki USDC\'lerimin %10\'unu Arc\'a köprüle"_\n' +
        '• _"Her gün 20 USDC\'yi gizli havuzuma aktar"_',
      timestamp: new Date(),
    },
  ]);
  const [activeJobs, setActiveJobs] = useState<ArcJob[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);

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

        // Simulate escrow -> running flow
        let status: JobStatus = "running";
        // Add approval message
        const approvalMsg: Message = {
          id: nextId(),
          role: "agent",
          text:
            `✅ **Görev zincir üstünde onaylandı!**\n\n` +
            `🔗 **ERC-8183 Job ID:** ${mockJobOnchainId()}\n` +
            `💰 **Escrow Havuzu:** ${j.amount > 0 ? `${j.amount} USDC` : "Değişken"} bloke edildi.\n` +
            `⏱ **Durum:** Otonom çalışıyor (ERC-8183)\n\n` +
            `Görev koşulları sağlandıkça otomatik tetiklenecektir.`,
          timestamp: new Date(),
          jobId: j.jobId,
        };
        setMessages((prev) => [...prev, approvalMsg]);

        return { ...j, status };
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