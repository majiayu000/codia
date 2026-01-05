/**
 * Memory System Types
 * 记忆系统类型定义
 */

import type { BasicExpression } from "../expression";

// ================== User Profile ==================

export interface UserProfile {
  id: string;
  name?: string;
  nickname?: string;
  preferences: UserPreferences;
  personalInfo: PersonalInfo;
  communicationStyle: CommunicationStyle;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  favoriteTopics: string[];
  avoidTopics: string[];
  responseLength: "brief" | "moderate" | "detailed";
  formalityLevel: "casual" | "neutral" | "formal";
  humorAppreciation: number; // 0-1
}

export interface PersonalInfo {
  occupation?: string;
  hobbies?: string[];
  location?: string;
  timezone?: string;
  importantDates?: ImportantDate[];
  relationships?: Relationship[];
}

export interface ImportantDate {
  name: string;
  date: string; // ISO date string
  type: "birthday" | "anniversary" | "deadline" | "other";
  reminder: boolean;
}

export interface Relationship {
  name: string;
  relation: string; // e.g., "friend", "family", "colleague"
  notes?: string;
}

export interface CommunicationStyle {
  preferredLanguage: string;
  usesEmoji: boolean;
  messageLength: "short" | "medium" | "long";
  formality: "casual" | "neutral" | "formal";
}

// ================== Memory Entry ==================

export type MemoryType =
  | "fact" // 事实信息 (姓名、职业等)
  | "preference" // 偏好 (喜欢/不喜欢)
  | "event" // 事件 (发生的事情)
  | "relationship" // 关系 (与他人的关系)
  | "emotion"; // 情感状态

export type MemorySource =
  | "explicit" // 用户明确说的
  | "inferred"; // 从对话中推断的

export interface MemoryEntry {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  summary: string; // 简短摘要用于快速检索
  confidence: number; // 0-1 置信度
  source: MemorySource;
  context: string; // 记忆产生的上下文
  tags: string[]; // 用于检索的标签
  emotionalContext?: BasicExpression; // 记忆产生时的情感状态
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  expiresAt?: Date; // 可选的过期时间
}

// ================== Short-term Memory ==================

export interface ShortTermMemoryEntry {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  importance: number; // 0-1
  emotionalContext?: BasicExpression;
  extractedInfo?: ExtractedInfo[];
}

export interface ExtractedInfo {
  type: MemoryType;
  content: string;
  confidence: number;
}

export interface ShortTermMemoryConfig {
  maxEntries: number; // 最大条目数，默认 20
  importanceThreshold: number; // 重要性阈值，低于此值不保留
}

// ================== Memory Extraction ==================

export interface MemoryExtractionResult {
  facts: ExtractedMemory[];
  preferences: ExtractedMemory[];
  events: ExtractedMemory[];
  relationships: ExtractedMemory[];
  emotions: ExtractedMemory[];
  shouldUpdateProfile: boolean;
  profileUpdates?: Partial<UserProfile>;
}

export interface ExtractedMemory {
  content: string;
  summary: string;
  confidence: number;
  source: MemorySource;
  tags: string[];
}

// ================== Memory Query ==================

export interface MemoryQuery {
  userId: string;
  query?: string; // 自然语言查询
  types?: MemoryType[]; // 过滤类型
  minConfidence?: number; // 最小置信度
  limit?: number; // 返回数量限制
  includeExpired?: boolean; // 是否包含过期记忆
}

export interface MemoryQueryResult {
  memories: MemoryEntry[];
  totalCount: number;
  relevanceScores?: number[]; // 相关性分数
}

// ================== Memory Context ==================

export interface MemoryContext {
  userProfile: UserProfile | null;
  recentMemories: MemoryEntry[];
  relevantMemories: MemoryEntry[];
  shortTermSummary: string;
}

// ================== Default Values ==================

export const DEFAULT_USER_PROFILE: Omit<UserProfile, "id" | "createdAt" | "updatedAt"> = {
  preferences: {
    favoriteTopics: [],
    avoidTopics: [],
    responseLength: "moderate",
    formalityLevel: "casual",
    humorAppreciation: 0.5,
  },
  personalInfo: {
    hobbies: [],
    importantDates: [],
    relationships: [],
  },
  communicationStyle: {
    preferredLanguage: "zh",
    usesEmoji: false,
    messageLength: "medium",
    formality: "casual",
  },
};

export const DEFAULT_SHORT_TERM_CONFIG: ShortTermMemoryConfig = {
  maxEntries: 20,
  importanceThreshold: 0.3,
};
