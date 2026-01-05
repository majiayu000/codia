/**
 * Response Strategy Engine
 * 响应策略引擎 - 根据情感分析生成响应策略
 */

import type {
  EmotionAnalysisResult,
  EmotionContext,
  ExtendedExpression,
  ResponseStrategy,
} from "./types";

/**
 * Response strategy engine configuration
 */
export interface ResponseStrategyConfig {
  /** Default tone when emotion is unclear */
  defaultTone: ResponseStrategy["tone"];
  /** Prioritize emotional support over information */
  prioritizeEmotionalSupport: boolean;
  /** Default response length */
  defaultLength: ResponseStrategy["length"];
  /** Always acknowledge negative emotions */
  alwaysAcknowledgeNegative: boolean;
}

const DEFAULT_CONFIG: ResponseStrategyConfig = {
  defaultTone: "calm",
  prioritizeEmotionalSupport: true,
  defaultLength: "moderate",
  alwaysAcknowledgeNegative: true,
};

/**
 * Response Strategy Engine
 * Generates response strategies based on emotional analysis
 */
export class ResponseStrategyEngine {
  private config: ResponseStrategyConfig;

  constructor(config: Partial<ResponseStrategyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate response strategy from emotion analysis
   */
  generateStrategy(emotion: EmotionAnalysisResult): ResponseStrategy {
    const strategy = this.createBaseStrategy(emotion);

    // Apply emotion-specific adjustments
    this.applyEmotionAdjustments(strategy, emotion);

    // Apply intensity-based adjustments
    this.applyIntensityAdjustments(strategy, emotion);

    // Generate guidance
    strategy.guidance = this.generateGuidanceList(emotion, strategy);

    // Generate avoid topics
    strategy.avoidTopics = this.generateAvoidTopics(emotion);

    return strategy;
  }

  /**
   * Generate strategy considering emotional context/history
   */
  generateStrategyWithContext(
    emotion: EmotionAnalysisResult,
    context: EmotionContext
  ): ResponseStrategy {
    const baseStrategy = this.generateStrategy(emotion);

    // Adjust based on emotional trend
    this.adjustForTrend(baseStrategy, context);

    return baseStrategy;
  }

  /**
   * Format strategy as prompt instructions for LLM
   */
  formatStrategyForPrompt(strategy: ResponseStrategy): string {
    const lines: string[] = [];

    lines.push("## Response Guidelines");
    lines.push("");
    lines.push(`Tone: ${strategy.tone}`);
    lines.push(`Response length: ${strategy.length}`);

    if (strategy.acknowledgeEmotion) {
      lines.push("- Acknowledge the user's emotional state");
    }

    if (strategy.shouldAskFollowUp) {
      lines.push("- Consider asking a follow-up question");
    }

    if (strategy.guidance.length > 0) {
      lines.push("");
      lines.push("Additional guidance:");
      for (const guidance of strategy.guidance) {
        lines.push(`- ${guidance}`);
      }
    }

    if (strategy.avoidTopics.length > 0) {
      lines.push("");
      lines.push("Avoid:");
      for (const topic of strategy.avoidTopics) {
        lines.push(`- ${topic}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Get default strategy when no emotion data is available
   */
  getDefaultStrategy(): ResponseStrategy {
    return {
      tone: this.config.defaultTone,
      length: this.config.defaultLength,
      shouldAskFollowUp: false,
      acknowledgeEmotion: false,
      suggestedExpression: "neutral",
      expressionIntensity: 0.5,
      guidance: [],
      avoidTopics: [],
      priority: "medium",
    };
  }

  // ================== Private Methods ==================

  private createBaseStrategy(emotion: EmotionAnalysisResult): ResponseStrategy {
    return {
      tone: this.determineTone(emotion),
      length: this.determineLength(emotion),
      shouldAskFollowUp: this.shouldAskFollowUp(emotion),
      acknowledgeEmotion: this.shouldAcknowledgeEmotion(emotion),
      suggestedExpression: emotion.primary,
      expressionIntensity: this.calculateExpressionIntensity(emotion),
      guidance: [],
      avoidTopics: [],
      priority: this.determinePriority(emotion),
    };
  }

  private determineTone(emotion: EmotionAnalysisResult): ResponseStrategy["tone"] {
    const toneMapping: Record<ExtendedExpression, ResponseStrategy["tone"]> = {
      neutral: "calm",
      happy: "cheerful",
      sad: "empathetic",
      angry: "calm",
      surprised: "cheerful",
      relaxed: "calm",
      curious: "encouraging",
      concerned: "supportive",
      shy: "supportive",
      excited: "encouraging",
      confused: "supportive",
      loving: "supportive",
      thinking: "calm",
      playful: "playful",
    };

    return toneMapping[emotion.primary] || this.config.defaultTone;
  }

  private determineLength(emotion: EmotionAnalysisResult): ResponseStrategy["length"] {
    // Detailed responses for curious/confused users
    if (emotion.primary === "curious" || emotion.primary === "confused") {
      return "detailed";
    }

    // Brief responses for shy users or when emotion is low intensity
    if (emotion.primary === "shy" || emotion.intensity < 0.3) {
      return "brief";
    }

    // Brief for very high arousal (excited, angry)
    if (emotion.arousal > 0.8 && emotion.primary !== "curious") {
      return "moderate";
    }

    return this.config.defaultLength;
  }

  private shouldAskFollowUp(emotion: EmotionAnalysisResult): boolean {
    // Ask follow-up for negative emotions
    if (emotion.valence < -0.3) {
      return true;
    }

    // Ask follow-up for confused/concerned
    if (emotion.primary === "confused" || emotion.primary === "concerned") {
      return true;
    }

    return false;
  }

  private shouldAcknowledgeEmotion(emotion: EmotionAnalysisResult): boolean {
    // Always acknowledge negative emotions
    if (emotion.valence < -0.3 && this.config.alwaysAcknowledgeNegative) {
      return true;
    }

    // Acknowledge strong positive emotions
    if (emotion.valence > 0.5 && emotion.intensity > 0.6) {
      return true;
    }

    // Don't acknowledge neutral
    if (emotion.primary === "neutral") {
      return false;
    }

    // Acknowledge other distinct emotions
    return emotion.intensity > 0.5;
  }

  private calculateExpressionIntensity(emotion: EmotionAnalysisResult): number {
    // Base intensity from emotion intensity
    let intensity = emotion.intensity;

    // Adjust based on arousal
    intensity = intensity * 0.7 + emotion.arousal * 0.3;

    // Clamp between 0.3 and 1
    return Math.max(0.3, Math.min(1, intensity));
  }

  private determinePriority(emotion: EmotionAnalysisResult): ResponseStrategy["priority"] {
    // Urgent for high intensity negative emotions
    if (emotion.valence < -0.5 && emotion.intensity > 0.7) {
      return "urgent";
    }

    // High for any negative emotion
    if (emotion.valence < -0.3) {
      return "high";
    }

    // Medium for strong positive emotions
    if (emotion.valence > 0.5 && emotion.intensity > 0.6) {
      return "medium";
    }

    // Low for neutral/calm
    if (emotion.primary === "neutral" || emotion.primary === "relaxed") {
      return "low";
    }

    return "medium";
  }

  private applyEmotionAdjustments(
    strategy: ResponseStrategy,
    emotion: EmotionAnalysisResult
  ): void {
    // Special handling for specific emotions
    switch (emotion.primary) {
      case "angry":
        // Stay calm, don't escalate
        strategy.tone = "calm";
        strategy.avoidTopics = ["criticism", "blame", "confrontation"];
        break;

      case "sad":
        // Be empathetic, ask follow-up
        strategy.tone = "empathetic";
        strategy.shouldAskFollowUp = true;
        break;

      case "excited":
        // Match energy, encourage
        strategy.tone = "encouraging";
        strategy.expressionIntensity = Math.min(1, strategy.expressionIntensity + 0.2);
        break;

      case "loving":
        // Be warm and supportive
        strategy.tone = "supportive";
        break;
    }
  }

  private applyIntensityAdjustments(
    strategy: ResponseStrategy,
    emotion: EmotionAnalysisResult
  ): void {
    // High intensity emotions need stronger expression
    if (emotion.intensity > 0.8) {
      strategy.expressionIntensity = Math.min(1, strategy.expressionIntensity + 0.15);
    }

    // Low intensity emotions need subtler expression
    if (emotion.intensity < 0.4) {
      strategy.expressionIntensity = Math.max(0.3, strategy.expressionIntensity - 0.2);
    }

    // High intensity negative = urgent
    if (emotion.intensity > 0.8 && emotion.valence < -0.5) {
      strategy.priority = "urgent";
    }
  }

  private generateGuidanceList(
    emotion: EmotionAnalysisResult,
    strategy: ResponseStrategy
  ): string[] {
    const guidance: string[] = [];

    if (strategy.acknowledgeEmotion) {
      if (emotion.valence < 0) {
        guidance.push("Validate their feelings");
        guidance.push("Show understanding and empathy");
      } else {
        guidance.push("Share in their positive emotion");
      }
    }

    if (emotion.primary === "confused") {
      guidance.push("Provide clear, step-by-step explanations");
      guidance.push("Ask clarifying questions if needed");
    }

    if (emotion.primary === "curious") {
      guidance.push("Provide detailed, informative response");
      guidance.push("Encourage further exploration");
    }

    if (emotion.primary === "angry") {
      guidance.push("Remain calm and non-confrontational");
      guidance.push("Focus on solutions rather than problems");
    }

    if (emotion.primary === "shy") {
      guidance.push("Be gentle and non-pressuring");
      guidance.push("Create a safe, comfortable atmosphere");
    }

    return guidance;
  }

  private generateAvoidTopics(emotion: EmotionAnalysisResult): string[] {
    const avoidTopics: string[] = [];

    if (emotion.valence < -0.3) {
      avoidTopics.push("dismissive language");
      avoidTopics.push("minimizing their feelings");
    }

    if (emotion.primary === "angry") {
      avoidTopics.push("criticism");
      avoidTopics.push("blame");
      avoidTopics.push("condescension");
    }

    if (emotion.primary === "sad") {
      avoidTopics.push("toxic positivity");
      avoidTopics.push("unsolicited advice");
    }

    return avoidTopics;
  }

  private adjustForTrend(strategy: ResponseStrategy, context: EmotionContext): void {
    switch (context.trend) {
      case "declining":
        // More supportive when emotions are declining
        if (strategy.tone !== "empathetic") {
          strategy.tone = "supportive";
        }
        strategy.shouldAskFollowUp = true;
        strategy.guidance.push("Check in on their wellbeing");
        break;

      case "improving":
        // Reinforce positive trajectory
        if (context.current.valence > 0) {
          strategy.tone = strategy.tone === "calm" ? "encouraging" : strategy.tone;
        }
        break;

      case "volatile":
        // Be more attentive
        strategy.shouldAskFollowUp = true;
        strategy.guidance.push("Be attentive to emotional shifts");
        break;

      case "stable":
        // No special adjustments
        break;
    }
  }
}

/**
 * Factory function
 */
export function createResponseStrategyEngine(
  config?: Partial<ResponseStrategyConfig>
): ResponseStrategyEngine {
  return new ResponseStrategyEngine(config);
}

// Singleton
let defaultInstance: ResponseStrategyEngine | null = null;

export function getResponseStrategyEngine(): ResponseStrategyEngine {
  if (!defaultInstance) {
    defaultInstance = new ResponseStrategyEngine();
  }
  return defaultInstance;
}

export function resetResponseStrategyEngine(): void {
  defaultInstance = null;
}
