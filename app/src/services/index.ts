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
  streamChat,
  chat,
  type LLMConfig,
  type LLMResponse,
  type StreamCallbacks,
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
} from "./storage";
