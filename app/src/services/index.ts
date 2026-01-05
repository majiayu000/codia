export {
  loadVRM,
  disposeVRM,
  clearVRMCache,
  getLoadedVRMs,
  isVRMLoaded,
  type VRMLoadResult,
  type VRMServiceOptions,
} from "./vrm";

export {
  setExpression,
  blendExpressions,
  ExpressionAnimator,
  type BasicExpression,
  type ExpressionState,
} from "./expression";

export {
  LipSyncService,
  analyzeAudioForLipSync,
  type Viseme,
  type LipSyncFrame,
} from "./lipSync";

export {
  IdleAnimationService,
  type IdleAnimationConfig,
} from "./idleAnimation";

export {
  LivelyIdleAnimationService,
  createLivelyIdleAnimation,
  getLivelyIdleAnimation,
  resetLivelyIdleAnimation,
  type LivelyIdleConfig,
} from "./livelyIdleAnimation";

export {
  GestureAnimationService,
  createGestureAnimationService,
  getGestureAnimationService,
  resetGestureAnimationService,
  type GestureType,
} from "./gestureAnimation";

export {
  streamChat,
  chat,
  streamChatWithMemory,
  getMemoryContext,
  formatMemoryContextForDebug,
  type LLMConfig,
  type LLMResponse,
  type StreamCallbacks,
  type MemoryEnhancedConfig,
} from "./llm";

export {
  synthesizeSpeech,
  playAudio,
  stopAudio,
  useBrowserTTS,
  getBrowserVoices,
  type TTSConfig,
  type TTSResult,
} from "./tts";

export {
  isASRSupported,
  startListening,
  stopListening,
  isCurrentlyListening,
  type ASRConfig,
  type ASRResult,
  type ASRCallbacks,
} from "./asr";

export {
  saveConversation,
  getConversation,
  getAllConversations,
  deleteConversation,
  saveCharacter,
  getCharacter,
  getAllCharacters,
  deleteCharacter,
  saveSettings,
  getSettings,
  cacheFile,
  getCachedFile,
  clearCache,
  exportData,
  importData,
  // Memory system storage
  saveUserProfile,
  getUserProfile,
  getDefaultUserProfile,
  deleteUserProfile,
  saveMemory,
  saveMemories,
  getMemory,
  getMemoriesByUser,
  getMemoriesByType,
  getRecentMemories,
  updateMemoryAccess,
  deleteMemory,
  deleteMemoriesByUser,
  searchMemories,
} from "./storage";

// Memory system
export {
  // Types
  type UserProfile,
  type UserPreferences,
  type PersonalInfo,
  type MemoryEntry,
  type MemoryType,
  type MemorySource,
  type MemoryContext,
  type MemoryQuery,
  type MemoryQueryResult,
  type ShortTermMemoryEntry,
  type MemoryExtractionResult,
  // Short-term memory
  ShortTermMemory,
  getShortTermMemory,
  resetShortTermMemory,
  // Long-term memory
  LongTermMemory,
  getLongTermMemory,
  resetLongTermMemory,
  // Memory extractor
  MemoryExtractor,
  createMemoryExtractor,
  type MemoryExtractorConfig,
} from "./memory";

// Emotion system
export {
  // Types
  type ExtendedExpression,
  type EmotionAnalysisResult,
  type EmotionContext,
  type ResponseStrategy,
  type EmotionAnalyzerConfig,
  // Emotion analyzer
  EmotionAnalyzer,
  createEmotionAnalyzer,
  getEmotionAnalyzer,
  resetEmotionAnalyzer,
  mapToBasicExpression,
  // Response strategy
  ResponseStrategyEngine,
  createResponseStrategyEngine,
  getResponseStrategyEngine,
  resetResponseStrategyEngine,
  type ResponseStrategyConfig,
} from "./emotion";

// Proactive interaction system
export {
  // Types
  type ProactiveTriggerType,
  type ProactiveScenario,
  type ProactiveMessage,
  type TriggerCondition,
  type ProactiveEngineConfig,
  type ProactiveEngineState,
  // Engine
  ProactiveEngine,
  createProactiveEngine,
  getProactiveEngine,
  resetProactiveEngine,
  // Scenarios
  getScenarioTemplate,
  getAllScenarioTemplates,
  generateMessageFromTemplate,
  getDefaultConditions,
} from "./proactive";
