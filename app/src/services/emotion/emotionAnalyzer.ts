/**
 * Emotion Analyzer Service
 * 情感分析服务 - 使用 LLM 进行深度情感分析
 */

import type { Message } from "@/store/types";
import type { BasicExpression } from "../expression";
import type {
  EmotionAnalysisResult,
  EmotionContext,
  ExtendedExpression,
  EmotionAnalyzerConfig,
} from "./types";
import {
  DEFAULT_EMOTION_ANALYZER_CONFIG,
  EMOTION_KEYWORDS,
  EMOTION_VALENCE,
  EMOTION_AROUSAL,
} from "./types";

/**
 * Map extended expressions to basic VRM expressions
 * 将扩展表情映射到基础 VRM 表情
 */
export function mapToBasicExpression(expression: ExtendedExpression): BasicExpression {
  const mapping: Record<ExtendedExpression, BasicExpression> = {
    neutral: "neutral",
    happy: "happy",
    sad: "sad",
    angry: "angry",
    surprised: "surprised",
    relaxed: "relaxed",
    // Extended mappings
    curious: "happy",
    concerned: "sad",
    shy: "relaxed",
    excited: "happy",
    confused: "surprised",
    loving: "happy",
    thinking: "neutral",
    playful: "happy",
  };

  return mapping[expression] || "neutral";
}

/**
 * Emotion Analyzer class
 * Provides both quick pattern-based detection and LLM-based analysis
 */
export class EmotionAnalyzer {
  private config: EmotionAnalyzerConfig;
  private history: EmotionAnalysisResult[] = [];
  private cache: Map<string, { result: EmotionAnalysisResult; timestamp: number }> = new Map();

  constructor(config: Partial<EmotionAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_EMOTION_ANALYZER_CONFIG, ...config };
  }

  /**
   * Quick detection using keyword patterns
   * 使用关键词模式快速检测
   */
  quickDetect(text: string): EmotionAnalysisResult {
    const lowerText = text.toLowerCase();
    const detectedEmotions: Array<{ emotion: ExtendedExpression; count: number; cues: string[] }> = [];

    // Check each emotion's keywords
    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      const matchedCues: string[] = [];
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matchedCues.push(keyword);
        }
      }
      if (matchedCues.length > 0) {
        detectedEmotions.push({
          emotion: emotion as ExtendedExpression,
          count: matchedCues.length,
          cues: matchedCues,
        });
      }
    }

    // Sort by count and get the primary emotion
    detectedEmotions.sort((a, b) => b.count - a.count);

    const primary: ExtendedExpression = detectedEmotions[0]?.emotion || "neutral";
    const secondary = detectedEmotions[1]?.emotion;
    const allCues = detectedEmotions.flatMap((d) => d.cues);

    // Calculate intensity based on number of matches
    const intensity = Math.min(1, 0.5 + detectedEmotions[0]?.count * 0.15 || 0);

    // Get valence and arousal from mappings
    const valence = EMOTION_VALENCE[primary];
    const arousal = EMOTION_AROUSAL[primary];

    // Lower confidence for quick detection
    const confidence = detectedEmotions.length > 0 ? 0.6 : 0.4;

    return {
      primary,
      secondary,
      intensity,
      valence,
      arousal,
      confidence,
      cues: allCues,
      reasoning: "Quick pattern-based detection",
    };
  }

  /**
   * Analyze emotion using LLM
   * 使用 LLM 分析情感
   */
  async analyze(message: Message): Promise<EmotionAnalysisResult> {
    // Check cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(message.id);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        return cached.result;
      }
    }

    // Try LLM analysis
    try {
      const result = await this.callEmotionAPI(message.content);

      // Validate result
      if (result && result.primary && result.confidence >= this.config.minConfidence) {
        // Cache the result
        if (this.config.enableCache) {
          this.cache.set(message.id, { result, timestamp: Date.now() });
        }

        // Add to history
        this.addToHistory(result);

        return result;
      }
    } catch (error) {
      console.warn("Emotion analysis API failed, falling back to quick detection:", error);
    }

    // Fallback to quick detection
    const quickResult = this.quickDetect(message.content);
    this.addToHistory(quickResult);
    return quickResult;
  }

  /**
   * Analyze with conversation context
   * 带对话上下文的情感分析
   */
  async analyzeWithContext(messages: Message[]): Promise<EmotionAnalysisResult> {
    if (messages.length === 0) {
      return this.createNeutralResult();
    }

    // Get the last user message for analysis
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return this.createNeutralResult();
    }

    try {
      const result = await this.callEmotionAPIWithContext(messages);

      if (result && result.primary && result.confidence >= this.config.minConfidence) {
        this.addToHistory(result);
        return result;
      }
    } catch (error) {
      console.warn("Emotion analysis with context failed:", error);
    }

    // Fallback
    const quickResult = this.quickDetect(lastUserMessage.content);
    this.addToHistory(quickResult);
    return quickResult;
  }

  /**
   * Get current emotion context
   * 获取当前情感上下文
   */
  getEmotionContext(): EmotionContext {
    if (this.history.length === 0) {
      return {
        current: this.createNeutralResult(),
        history: [],
        trend: "stable",
        dominantEmotion: "neutral",
        averageValence: 0,
        averageArousal: 0.3,
      };
    }

    const current = this.history[this.history.length - 1];
    const trend = this.calculateTrend();
    const dominantEmotion = this.findDominantEmotion();
    const averageValence = this.calculateAverageValence();
    const averageArousal = this.calculateAverageArousal();

    return {
      current,
      history: [...this.history],
      trend,
      dominantEmotion,
      averageValence,
      averageArousal,
    };
  }

  /**
   * Clear emotion history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ================== Private Methods ==================

  private async callEmotionAPI(text: string): Promise<EmotionAnalysisResult> {
    const response = await fetch("/api/emotion/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        provider: this.config.provider,
        model: this.config.model,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseAnalysisResult(data.result);
  }

  private async callEmotionAPIWithContext(messages: Message[]): Promise<EmotionAnalysisResult> {
    const formattedMessages = messages.slice(-this.config.maxHistoryLength).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch("/api/emotion/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: formattedMessages,
        provider: this.config.provider,
        model: this.config.model,
        withContext: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseAnalysisResult(data.result);
  }

  private parseAnalysisResult(resultStr: string): EmotionAnalysisResult {
    // Handle JSON wrapped in code blocks
    let jsonStr = resultStr;
    const codeBlockMatch = resultStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return {
      primary: parsed.primary || "neutral",
      secondary: parsed.secondary,
      intensity: parsed.intensity ?? 0.5,
      valence: parsed.valence ?? 0,
      arousal: parsed.arousal ?? 0.5,
      confidence: parsed.confidence ?? 0.7,
      cues: parsed.cues || [],
      reasoning: parsed.reasoning,
    };
  }

  private addToHistory(result: EmotionAnalysisResult): void {
    this.history.push(result);

    // Limit history size
    if (this.history.length > this.config.maxHistoryLength) {
      this.history = this.history.slice(-this.config.maxHistoryLength);
    }
  }

  private calculateTrend(): "improving" | "declining" | "stable" | "volatile" {
    if (this.history.length < 3) {
      return "stable";
    }

    const recent = this.history.slice(-5);
    const valences = recent.map((r) => r.valence);

    // Calculate trend direction
    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < valences.length; i++) {
      if (valences[i] > valences[i - 1]) increasing++;
      else if (valences[i] < valences[i - 1]) decreasing++;
    }

    // Check for volatility
    const variance = this.calculateVariance(valences);
    if (variance > 0.3) {
      return "volatile";
    }

    if (increasing > decreasing && increasing >= 2) {
      return "improving";
    } else if (decreasing > increasing && decreasing >= 2) {
      return "declining";
    }

    return "stable";
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private findDominantEmotion(): ExtendedExpression {
    if (this.history.length === 0) {
      return "neutral";
    }

    const emotionCounts = new Map<ExtendedExpression, number>();

    for (const result of this.history) {
      const count = emotionCounts.get(result.primary) || 0;
      emotionCounts.set(result.primary, count + 1);
    }

    let dominant: ExtendedExpression = "neutral";
    let maxCount = 0;

    for (const [emotion, count] of emotionCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominant = emotion;
      }
    }

    return dominant;
  }

  private calculateAverageValence(): number {
    if (this.history.length === 0) return 0;
    return this.history.reduce((sum, r) => sum + r.valence, 0) / this.history.length;
  }

  private calculateAverageArousal(): number {
    if (this.history.length === 0) return 0.3;
    return this.history.reduce((sum, r) => sum + r.arousal, 0) / this.history.length;
  }

  private createNeutralResult(): EmotionAnalysisResult {
    return {
      primary: "neutral",
      intensity: 0.5,
      valence: 0,
      arousal: 0.3,
      confidence: 1,
      cues: [],
    };
  }
}

/**
 * Factory function to create EmotionAnalyzer
 */
export function createEmotionAnalyzer(
  config?: Partial<EmotionAnalyzerConfig>
): EmotionAnalyzer {
  return new EmotionAnalyzer(config);
}

// Singleton instance
let defaultInstance: EmotionAnalyzer | null = null;

export function getEmotionAnalyzer(): EmotionAnalyzer {
  if (!defaultInstance) {
    defaultInstance = new EmotionAnalyzer();
  }
  return defaultInstance;
}

export function resetEmotionAnalyzer(): void {
  defaultInstance = null;
}
