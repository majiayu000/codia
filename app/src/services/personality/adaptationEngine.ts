/**
 * Adaptation Engine Service
 * 适应引擎服务 - 分析用户交互并调整 AI 人格
 */

import { PersonalityModel, getPersonalityModel } from "./personalityModel";
import type {
  InteractionPattern,
  AdaptationSuggestion,
  AdaptationResult,
  AdaptationRecord,
  AdaptationTrigger,
} from "./types";

/**
 * Interaction record types
 */
export type InteractionType = "user_message" | "ai_response" | "emotional_reaction";

export interface UserMessageInteraction {
  type: "user_message";
  content: string;
  timestamp: Date;
}

export interface AIResponseInteraction {
  type: "ai_response";
  content: string;
  timestamp: Date;
}

export interface EmotionalReactionInteraction {
  type: "emotional_reaction";
  emotion: string;
  intensity: number;
  timestamp: Date;
}

export type Interaction =
  | UserMessageInteraction
  | AIResponseInteraction
  | EmotionalReactionInteraction;

/**
 * User feedback types
 */
export type FeedbackType =
  | "too_formal"
  | "too_casual"
  | "too_cold"
  | "too_warm"
  | "too_serious"
  | "too_playful"
  | "too_verbose"
  | "too_brief";

export interface UserFeedback {
  type: FeedbackType;
  message?: string;
}

/**
 * Interaction statistics
 */
export interface InteractionStats {
  totalInteractions: number;
  userMessages: number;
  aiResponses: number;
  emotionalReactions: number;
  sessionStart: Date;
  averageMessageLength: number;
}

/**
 * Adaptation engine configuration
 */
export interface AdaptationEngineConfig {
  analysisIntervalMs: number;
  minInteractionsForAnalysis: number;
  humorKeywords: string[];
  questionPatterns: RegExp[];
}

const DEFAULT_ENGINE_CONFIG: AdaptationEngineConfig = {
  analysisIntervalMs: 60000, // 1 minute
  minInteractionsForAnalysis: 5,
  humorKeywords: ["haha", "lol", "😂", "🤣", "funny", "hilarious", "joke", "laugh"],
  questionPatterns: [/\?$/, /^(what|who|where|when|why|how|can|could|would|should|is|are|do|does)/i],
};

/**
 * Adaptation Engine
 * Analyzes user interactions and suggests personality adaptations
 */
export class AdaptationEngine {
  private model: PersonalityModel;
  private config: AdaptationEngineConfig;
  private interactions: Interaction[] = [];
  private sessionStart: Date = new Date();

  constructor(
    model: PersonalityModel,
    config: Partial<AdaptationEngineConfig> = {}
  ) {
    this.model = model;
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AdaptationEngineConfig {
    return { ...this.config };
  }

  // ================== Interaction Recording ==================

  /**
   * Record a user interaction
   */
  recordInteraction(interaction: Interaction): void {
    this.interactions.push(interaction);
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats(): InteractionStats {
    const userMessages = this.interactions.filter(
      (i) => i.type === "user_message"
    ) as UserMessageInteraction[];
    const aiResponses = this.interactions.filter(
      (i) => i.type === "ai_response"
    ) as AIResponseInteraction[];
    const emotionalReactions = this.interactions.filter(
      (i) => i.type === "emotional_reaction"
    );

    const totalLength = userMessages.reduce(
      (sum, m) => sum + m.content.length,
      0
    );
    const averageMessageLength =
      userMessages.length > 0 ? totalLength / userMessages.length : 0;

    return {
      totalInteractions: this.interactions.length,
      userMessages: userMessages.length,
      aiResponses: aiResponses.length,
      emotionalReactions: emotionalReactions.length,
      sessionStart: this.sessionStart,
      averageMessageLength,
    };
  }

  /**
   * Clear interaction history
   */
  clearHistory(): void {
    this.interactions = [];
    this.sessionStart = new Date();
  }

  // ================== Pattern Analysis ==================

  /**
   * Analyze interaction pattern from history
   */
  analyzePattern(): InteractionPattern {
    const userMessages = this.interactions.filter(
      (i) => i.type === "user_message"
    ) as UserMessageInteraction[];
    const emotionalReactions = this.interactions.filter(
      (i) => i.type === "emotional_reaction"
    ) as EmotionalReactionInteraction[];

    // Calculate average message length
    const totalLength = userMessages.reduce(
      (sum, m) => sum + m.content.length,
      0
    );
    const averageMessageLength =
      userMessages.length > 0 ? totalLength / userMessages.length : 50;

    // Determine detail preference
    let detailPreference: "brief" | "moderate" | "detailed";
    if (averageMessageLength < 30) {
      detailPreference = "brief";
    } else if (averageMessageLength > 100) {
      detailPreference = "detailed";
    } else {
      detailPreference = "moderate";
    }

    // Calculate emotional expressiveness
    const avgEmotionIntensity =
      emotionalReactions.length > 0
        ? emotionalReactions.reduce((sum, r) => sum + r.intensity, 0) /
          emotionalReactions.length
        : 0.5;
    const emotionalExpressiveness = Math.min(
      1,
      avgEmotionIntensity * (emotionalReactions.length > 0 ? 1 : 0.5)
    );

    // Detect humor appreciation
    const humorCount = userMessages.filter((m) =>
      this.config.humorKeywords.some((kw) =>
        m.content.toLowerCase().includes(kw)
      )
    ).length;
    const humorAppreciation =
      userMessages.length > 0
        ? Math.min(1, humorCount / userMessages.length + 0.1)
        : 0.5;

    // Detect question frequency
    const questionCount = userMessages.filter((m) =>
      this.config.questionPatterns.some((pattern) => pattern.test(m.content))
    ).length;
    const questionFrequency =
      userMessages.length > 0 ? questionCount / userMessages.length : 0.3;

    // Detect formality preference (simple heuristic)
    const formalIndicators = ["please", "thank you", "would you", "could you"];
    const casualIndicators = ["hey", "gonna", "wanna", "u ", "ur ", "lol"];

    const formalCount = userMessages.filter((m) =>
      formalIndicators.some((ind) => m.content.toLowerCase().includes(ind))
    ).length;
    const casualCount = userMessages.filter((m) =>
      casualIndicators.some((ind) => m.content.toLowerCase().includes(ind))
    ).length;

    let formalityPreference = 0.5;
    if (formalCount > casualCount) {
      formalityPreference = 0.5 + (formalCount - casualCount) / (userMessages.length || 1) * 0.3;
    } else if (casualCount > formalCount) {
      formalityPreference = 0.5 - (casualCount - formalCount) / (userMessages.length || 1) * 0.3;
    }
    formalityPreference = Math.max(0.1, Math.min(0.9, formalityPreference));

    // Topic diversity (simplified - based on unique word count)
    const allWords = userMessages
      .map((m) => m.content.toLowerCase().split(/\s+/))
      .flat();
    const uniqueWords = new Set(allWords);
    const topicDiversity =
      allWords.length > 0
        ? Math.min(1, uniqueWords.size / allWords.length + 0.2)
        : 0.5;

    return {
      averageMessageLength,
      responseSpeed: "medium", // Would need timing analysis for this
      emotionalExpressiveness,
      topicDiversity,
      questionFrequency,
      humorAppreciation,
      formalityPreference,
      detailPreference,
    };
  }

  // ================== Adaptation Suggestions ==================

  /**
   * Generate adaptation suggestions based on pattern analysis
   */
  suggestAdaptations(): AdaptationSuggestion[] {
    const pattern = this.analyzePattern();
    return this.model.analyzeInteractionPattern(pattern);
  }

  /**
   * Apply adaptation suggestions to the personality model
   */
  applyAdaptations(): AdaptationResult {
    const suggestions = this.suggestAdaptations();
    return this.model.applySuggestions(suggestions, { gradual: true });
  }

  // ================== User Feedback ==================

  /**
   * Process explicit user feedback
   */
  processUserFeedback(feedback: UserFeedback): AdaptationResult {
    const suggestions = this.generateFeedbackSuggestions(feedback);
    return this.model.applySuggestions(suggestions);
  }

  private generateFeedbackSuggestions(
    feedback: UserFeedback
  ): AdaptationSuggestion[] {
    const suggestions: AdaptationSuggestion[] = [];
    const HIGH_CONFIDENCE = 0.9;

    switch (feedback.type) {
      case "too_formal":
        suggestions.push({
          trait: "formality",
          currentValue: this.model.getTrait("formality"),
          suggestedValue: Math.max(0.2, this.model.getTrait("formality") - 0.3),
          reason: "User feedback: too formal",
          confidence: HIGH_CONFIDENCE,
          trigger: "user_feedback",
        });
        break;

      case "too_casual":
        suggestions.push({
          trait: "formality",
          currentValue: this.model.getTrait("formality"),
          suggestedValue: Math.min(0.8, this.model.getTrait("formality") + 0.3),
          reason: "User feedback: too casual",
          confidence: HIGH_CONFIDENCE,
          trigger: "user_feedback",
        });
        break;

      case "too_cold":
        suggestions.push({
          trait: "warmth",
          currentValue: this.model.getTrait("warmth"),
          suggestedValue: Math.min(0.95, this.model.getTrait("warmth") + 0.2),
          reason: "User feedback: too cold",
          confidence: HIGH_CONFIDENCE,
          trigger: "user_feedback",
        });
        suggestions.push({
          trait: "empathy",
          currentValue: this.model.getTrait("empathy"),
          suggestedValue: Math.min(0.95, this.model.getTrait("empathy") + 0.15),
          reason: "User feedback: too cold",
          confidence: 0.85,
          trigger: "user_feedback",
        });
        break;

      case "too_warm":
        suggestions.push({
          trait: "warmth",
          currentValue: this.model.getTrait("warmth"),
          suggestedValue: Math.max(0.3, this.model.getTrait("warmth") - 0.2),
          reason: "User feedback: too warm",
          confidence: HIGH_CONFIDENCE,
          trigger: "user_feedback",
        });
        break;

      case "too_serious":
        suggestions.push({
          trait: "humor",
          currentValue: this.model.getTrait("humor"),
          suggestedValue: Math.min(0.8, this.model.getTrait("humor") + 0.25),
          reason: "User feedback: too serious",
          confidence: HIGH_CONFIDENCE,
          trigger: "user_feedback",
        });
        suggestions.push({
          trait: "playfulness",
          currentValue: this.model.getTrait("playfulness"),
          suggestedValue: Math.min(0.8, this.model.getTrait("playfulness") + 0.2),
          reason: "User feedback: too serious",
          confidence: 0.85,
          trigger: "user_feedback",
        });
        break;

      case "too_playful":
        suggestions.push({
          trait: "playfulness",
          currentValue: this.model.getTrait("playfulness"),
          suggestedValue: Math.max(0.2, this.model.getTrait("playfulness") - 0.25),
          reason: "User feedback: too playful",
          confidence: HIGH_CONFIDENCE,
          trigger: "user_feedback",
        });
        suggestions.push({
          trait: "humor",
          currentValue: this.model.getTrait("humor"),
          suggestedValue: Math.max(0.3, this.model.getTrait("humor") - 0.2),
          reason: "User feedback: too playful",
          confidence: 0.85,
          trigger: "user_feedback",
        });
        break;

      case "too_verbose":
        suggestions.push({
          trait: "openness",
          currentValue: this.model.getTrait("openness"),
          suggestedValue: Math.max(0.3, this.model.getTrait("openness") - 0.2),
          reason: "User feedback: responses too long",
          confidence: HIGH_CONFIDENCE,
          trigger: "user_feedback",
        });
        break;

      case "too_brief":
        suggestions.push({
          trait: "openness",
          currentValue: this.model.getTrait("openness"),
          suggestedValue: Math.min(0.9, this.model.getTrait("openness") + 0.2),
          reason: "User feedback: responses too short",
          confidence: HIGH_CONFIDENCE,
          trigger: "user_feedback",
        });
        break;
    }

    return suggestions;
  }

  // ================== History Access ==================

  /**
   * Get adaptation history from the model
   */
  getAdaptationHistory(): AdaptationRecord[] {
    return this.model.getState().adaptationHistory;
  }
}

/**
 * Factory function
 */
export function createAdaptationEngine(
  model: PersonalityModel,
  config?: Partial<AdaptationEngineConfig>
): AdaptationEngine {
  return new AdaptationEngine(model, config);
}

// Singleton
let defaultInstance: AdaptationEngine | null = null;

export function getAdaptationEngine(): AdaptationEngine {
  if (!defaultInstance) {
    defaultInstance = new AdaptationEngine(getPersonalityModel());
  }
  return defaultInstance;
}

export function resetAdaptationEngine(): void {
  defaultInstance = null;
}
