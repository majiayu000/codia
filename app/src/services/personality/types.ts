/**
 * Personality System Types
 * 自适应人格系统类型定义
 */

/**
 * Big Five personality traits (OCEAN model)
 * 大五人格特质
 */
export interface BigFiveTraits {
  openness: number; // 开放性: 0-1
  conscientiousness: number; // 尽责性: 0-1
  extraversion: number; // 外向性: 0-1
  agreeableness: number; // 宜人性: 0-1
  neuroticism: number; // 神经质: 0-1
}

/**
 * Custom personality traits for AI companion
 * AI 伴侣的自定义性格特质
 */
export interface CustomTraits {
  playfulness: number; // 俏皮程度: 0-1
  warmth: number; // 温暖程度: 0-1
  formality: number; // 正式程度: 0-1
  assertiveness: number; // 果断程度: 0-1
  curiosity: number; // 好奇程度: 0-1
  humor: number; // 幽默程度: 0-1
  empathy: number; // 共情程度: 0-1
}

/**
 * Complete personality traits
 * 完整的人格特质
 */
export interface PersonalityTraits extends BigFiveTraits, CustomTraits {}

/**
 * Personality state with metadata
 * 人格状态（含元数据）
 */
export interface PersonalityState {
  traits: PersonalityTraits;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  adaptationHistory: AdaptationRecord[];
}

/**
 * Record of a personality adaptation
 * 人格适应记录
 */
export interface AdaptationRecord {
  timestamp: Date;
  trigger: AdaptationTrigger;
  traitChanges: Partial<PersonalityTraits>;
  confidence: number;
}

/**
 * What triggered the adaptation
 * 触发适应的原因
 */
export type AdaptationTrigger =
  | "user_feedback" // 用户直接反馈
  | "interaction_pattern" // 交互模式分析
  | "emotion_response" // 情感响应分析
  | "preference_detection" // 偏好检测
  | "explicit_request"; // 明确请求

/**
 * User interaction pattern
 * 用户交互模式
 */
export interface InteractionPattern {
  averageMessageLength: number;
  responseSpeed: "fast" | "medium" | "slow";
  emotionalExpressiveness: number; // 0-1
  topicDiversity: number; // 0-1
  questionFrequency: number; // 0-1
  humorAppreciation: number; // 0-1
  formalityPreference: number; // 0-1
  detailPreference: "brief" | "moderate" | "detailed";
}

/**
 * Personality model configuration
 * 人格模型配置
 */
export interface PersonalityModelConfig {
  learningRate: number; // 学习速率: 0-1
  minConfidence: number; // 最小置信度: 0-1
  maxAdaptationPerSession: number; // 每次会话最大适应次数
  traitBounds: {
    min: number;
    max: number;
  };
  enabledTraits: (keyof PersonalityTraits)[];
}

/**
 * Adaptation suggestion from analysis
 * 分析得出的适应建议
 */
export interface AdaptationSuggestion {
  trait: keyof PersonalityTraits;
  currentValue: number;
  suggestedValue: number;
  reason: string;
  confidence: number;
  trigger: AdaptationTrigger;
}

/**
 * Personality adaptation result
 * 人格适应结果
 */
export interface AdaptationResult {
  applied: boolean;
  suggestions: AdaptationSuggestion[];
  appliedChanges: Partial<PersonalityTraits>;
  rejectedSuggestions: AdaptationSuggestion[];
  newState: PersonalityState;
}

/**
 * Prompt generation context
 * Prompt 生成上下文
 */
export interface PromptContext {
  traits: PersonalityTraits;
  userPattern?: InteractionPattern;
  currentMood?: string;
  conversationTone?: string;
}

/**
 * Generated prompt components
 * 生成的 Prompt 组件
 */
export interface GeneratedPrompt {
  personalitySection: string;
  toneGuidelines: string;
  behaviorRules: string[];
  fullSystemPrompt: string;
}

/**
 * Default personality traits
 * 默认人格特质
 */
export const DEFAULT_PERSONALITY_TRAITS: PersonalityTraits = {
  // Big Five
  openness: 0.7,
  conscientiousness: 0.6,
  extraversion: 0.6,
  agreeableness: 0.8,
  neuroticism: 0.3,
  // Custom
  playfulness: 0.6,
  warmth: 0.8,
  formality: 0.4,
  assertiveness: 0.5,
  curiosity: 0.7,
  humor: 0.6,
  empathy: 0.8,
};

/**
 * Default personality model config
 * 默认人格模型配置
 */
export const DEFAULT_PERSONALITY_CONFIG: PersonalityModelConfig = {
  learningRate: 0.05,
  minConfidence: 0.6,
  maxAdaptationPerSession: 3,
  traitBounds: {
    min: 0.1,
    max: 0.95,
  },
  enabledTraits: [
    "openness",
    "extraversion",
    "agreeableness",
    "playfulness",
    "warmth",
    "formality",
    "assertiveness",
    "curiosity",
    "humor",
    "empathy",
  ],
};

/**
 * Trait descriptions for prompt generation
 * 用于 Prompt 生成的特质描述
 */
export const TRAIT_DESCRIPTIONS: Record<keyof PersonalityTraits, { low: string; high: string }> = {
  openness: {
    low: "prefers familiar topics and straightforward conversations",
    high: "loves exploring new ideas and creative discussions",
  },
  conscientiousness: {
    low: "relaxed and spontaneous in responses",
    high: "thorough and well-organized in responses",
  },
  extraversion: {
    low: "calm and thoughtful, prefers deeper one-on-one conversations",
    high: "energetic and enthusiastic, loves lively interactions",
  },
  agreeableness: {
    low: "honest and direct, even if it might be uncomfortable",
    high: "supportive and accommodating, prioritizes harmony",
  },
  neuroticism: {
    low: "emotionally stable and calm under pressure",
    high: "sensitive and emotionally expressive",
  },
  playfulness: {
    low: "serious and focused in conversations",
    high: "playful and loves adding fun to conversations",
  },
  warmth: {
    low: "professional and maintains appropriate distance",
    high: "warm and nurturing, like a close friend",
  },
  formality: {
    low: "casual and uses informal language",
    high: "polite and uses formal language",
  },
  assertiveness: {
    low: "gentle and suggestive in giving advice",
    high: "confident and direct in giving advice",
  },
  curiosity: {
    low: "focused on answering questions directly",
    high: "asks follow-up questions and shows genuine interest",
  },
  humor: {
    low: "straightforward and serious",
    high: "uses humor and wit frequently",
  },
  empathy: {
    low: "logical and solution-focused",
    high: "deeply understanding and emotionally supportive",
  },
};
