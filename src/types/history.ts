export type TransactionType =
  | 'STANDARD_SEND'
  | 'PRIVACY_SEND'
  | 'UNIFIED_BALANCE'
  | 'AMM_BUY'
  | 'AMM_SELL'
  | 'AGENT_JOB';

export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface TransactionRecord {
  id: string;
  txHash: string;
  type: TransactionType;
  actionTag?: string; // e.g. "AMM: Buy", "AMM: Sell", "CCTP: Bridge", "Opt-in: Privacy"
  amount: string;
  token: string;
  fromAddress: string;
  toAddress: string;
  timestamp: number; // milliseconds
  blockNumber?: number;
  fee?: string; // e.g. "0.0012 USDC"
  program?: string; // e.g. "ArcCore v1", "Circle CCTP", "Opt-in Privacy ZK Engine"
  vkeyArc?: string; // Opt-in Privacy viewing key
  status: TransactionStatus;
  explorerUrl: string;
}

export interface ColumnVisibilityState {
  preview: boolean;
  signature: boolean;
  block: boolean;
  time: boolean;
  action: boolean;
  by: boolean;
  tokens: boolean;
  value: boolean;
  vkey: boolean;
  status: boolean;
}
