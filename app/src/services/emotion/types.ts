/**
 * Emotion System Types
 * 情感系统类型定义
 */

import type { BasicExpression } from "../expression";

/**
 * Extended expression types beyond basic VRM expressions
 * 扩展表情类型，超越基础 VRM 表情
 */
export type ExtendedExpression =
  | BasicExpression
  | "curious"
  | "concerned"
  | "shy"
  | "excited"
  | "confused"
  | "loving"
  | "thinking"
  | "playful";

/**
 * Emotion analysis result from LLM
 * LLM 情感分析结果
 */
export interface EmotionAnalysisResult {
  /** Primary detected emotion */
  primary: ExtendedExpression;
  /** Secondary emotion (if mixed) */
  secondary?: ExtendedExpression;
  /** Emotional intensity (0-1) */
  intensity: number;
  /** Emotional valence: positive (1) to negative (-1) */
  valence: number;
  /** Arousal level: calm (0) to excited (1) */
  arousal: number;
  /** Confidence in the analysis (0-1) */
  confidence: number;
  /** Detected emotional cues/keywords */
  cues: string[];
  /** Brief explanation of analysis */
  reasoning?: string;
}

/**
 * Emotion context for tracking emotional state over time
 * 情感上下文，用于追踪情感状态变化
 */
export interface EmotionContext {
  /** Current emotional state */
  current: EmotionAnalysisResult;
  /** Previous emotional states (for trend analysis) */
  history: EmotionAnalysisResult[];
  /** Overall emotional trend: improving, declining, stable, volatile */
  trend: "improving" | "declining" | "stable" | "volatile";
  /** Dominant emotion in recent conversation */
  dominantEmotion: ExtendedExpression;
  /** Average valence over recent messages */
  averageValence: number;
  /** Average arousal over recent messages */
  averageArousal: number;
}

/**
 * Response strategy based on emotional analysis
 * 基于情感分析的响应策略
 */
export interface ResponseStrategy {
  /** Recommended tone for response */
  tone: "supportive" | "cheerful" | "calm" | "empathetic" | "playful" | "serious" | "encouraging";
  /** Recommended response length */
  length: "brief" | "moderate" | "detailed";
  /** Whether to ask follow-up questions */
  shouldAskFollowUp: boolean;
  /** Whether to acknowledge the emotion explicitly */
  acknowledgeEmotion: boolean;
  /** Suggested expression for AI avatar */
  suggestedExpression: ExtendedExpression;
  /** Expression intensity (0-1) */
  expressionIntensity: number;
  /** Additional guidance for response generation */
  guidance: string[];
  /** Topics to avoid in response */
  avoidTopics: string[];
  /** Priority level: how urgently to respond to this emotional state */
  priority: "low" | "medium" | "high" | "urgent";
}

/**
 * Emotion analyzer configuration
 * 情感分析器配置
 */
export interface EmotionAnalyzerConfig {
  /** LLM provider to use */
  provider: "openai" | "anthropic" | "ollama";
  /** Model ID (optional, uses default per provider) */
  model?: string;
  /** Enable quick pattern matching before LLM call */
  useQuickDetection: boolean;
  /** Minimum confidence to trust LLM result */
  minConfidence: number;
  /** Maximum history length for context */
  maxHistoryLength: number;
  /** Enable caching of recent analyses */
  enableCache: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL: number;
}

/**
 * Default analyzer configuration
 */
export const DEFAULT_EMOTION_ANALYZER_CONFIG: EmotionAnalyzerConfig = {
  provider: "openai",
  useQuickDetection: true,
  minConfidence: 0.6,
  maxHistoryLength: 10,
  enableCache: true,
  cacheTTL: 60000, // 1 minute
};

/**
 * Emotion keywords for quick detection (fallback)
 * 快速检测用的情感关键词（备用）
 */
export const EMOTION_KEYWORDS: Record<ExtendedExpression, string[]> = {
  neutral: [],
  happy: ["happy", "joy", "glad", "pleased", "delighted", "开心", "高兴", "快乐", "愉快"],
  sad: ["sad", "unhappy", "depressed", "down", "upset", "难过", "伤心", "悲伤", "沮丧"],
  angry: ["angry", "mad", "furious", "annoyed", "irritated", "生气", "愤怒", "恼火"],
  surprised: ["wow", "surprised", "shocked", "amazed", "unexpected", "惊讶", "意外", "震惊"],
  relaxed: ["calm", "peaceful", "relaxed", "chill", "comfortable", "放松", "平静", "舒适"],
  curious: ["curious", "wondering", "interested", "intrigued", "好奇", "想知道", "感兴趣"],
  concerned: ["worried", "concerned", "anxious", "nervous", "担心", "担忧", "焦虑", "紧张"],
  shy: ["shy", "embarrassed", "awkward", "bashful", "害羞", "尴尬", "不好意思"],
  excited: ["excited", "thrilled", "pumped", "eager", "兴奋", "激动", "期待"],
  confused: ["confused", "lost", "puzzled", "unclear", "困惑", "迷茫", "不明白", "搞不懂"],
  loving: ["love", "adore", "cherish", "affection", "爱", "喜爱", "珍惜", "疼爱"],
  thinking: ["thinking", "considering", "pondering", "想", "考虑", "思考", "琢磨"],
  playful: ["playful", "teasing", "joking", "funny", "调皮", "开玩笑", "逗", "有趣"],
};

/**
 * Valence mapping for emotions
 * 情感效价映射
 */
export const EMOTION_VALENCE: Record<ExtendedExpression, number> = {
  neutral: 0,
  happy: 0.8,
  sad: -0.7,
  angry: -0.6,
  surprised: 0.3,
  relaxed: 0.5,
  curious: 0.4,
  concerned: -0.3,
  shy: 0.1,
  excited: 0.9,
  confused: -0.2,
  loving: 0.9,
  thinking: 0.1,
  playful: 0.7,
};

/**
 * Arousal mapping for emotions
 * 情感唤醒度映射
 */
export const EMOTION_AROUSAL: Record<ExtendedExpression, number> = {
  neutral: 0.3,
  happy: 0.6,
  sad: 0.3,
  angry: 0.8,
  surprised: 0.9,
  relaxed: 0.2,
  curious: 0.5,
  concerned: 0.6,
  shy: 0.4,
  excited: 0.9,
  confused: 0.5,
  loving: 0.5,
  thinking: 0.4,
  playful: 0.7,
};
