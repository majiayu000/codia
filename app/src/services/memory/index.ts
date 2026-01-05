/**
 * Memory System Module
 * 记忆系统模块导出
 */

// Types
export type {
  UserProfile,
  UserPreferences,
  PersonalInfo,
  ImportantDate,
  Relationship,
  CommunicationStyle,
  MemoryType,
  MemorySource,
  MemoryEntry,
  ShortTermMemoryEntry,
  ShortTermMemoryConfig,
  ExtractedInfo,
  MemoryExtractionResult,
  ExtractedMemory,
  MemoryQuery,
  MemoryQueryResult,
  MemoryContext,
} from "./types";

export {
  DEFAULT_USER_PROFILE,
  DEFAULT_SHORT_TERM_CONFIG,
} from "./types";

// Short-term Memory
export {
  ShortTermMemory,
  getShortTermMemory,
  resetShortTermMemory,
} from "./shortTermMemory";

// Long-term Memory
export {
  LongTermMemory,
  getLongTermMemory,
  resetLongTermMemory,
} from "./longTermMemory";

// Memory Extractor
export {
  MemoryExtractor,
  createMemoryExtractor,
  type MemoryExtractorConfig,
} from "./memoryExtractor";
