/**
 * Personality Model Service
 * 人格模型服务 - 管理和适应 AI 伴侣的性格特质
 */

import type {
  PersonalityTraits,
  PersonalityState,
  PersonalityModelConfig,
  InteractionPattern,
  AdaptationSuggestion,
  AdaptationResult,
  AdaptationRecord,
  AdaptationTrigger,
} from "./types";
import {
  DEFAULT_PERSONALITY_TRAITS,
  DEFAULT_PERSONALITY_CONFIG,
  TRAIT_DESCRIPTIONS,
} from "./types";

export interface PersonalityModelOptions extends Partial<PersonalityModelConfig> {
  initialTraits?: Partial<PersonalityTraits>;
}

interface ApplySuggestionsOptions {
  gradual?: boolean;
}

/**
 * Personality Model
 * Manages AI companion personality traits and adaptation
 */
export class PersonalityModel {
  private state: PersonalityState;
  private config: PersonalityModelConfig;
  private sessionAdaptationCount: number = 0;

  constructor(options: PersonalityModelOptions = {}) {
    const { initialTraits, ...configOptions } = options;

    this.config = { ...DEFAULT_PERSONALITY_CONFIG, ...configOptions };

    const traits: PersonalityTraits = {
      ...DEFAULT_PERSONALITY_TRAITS,
      ...initialTraits,
    };

    this.state = {
      traits,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      adaptationHistory: [],
    };
  }

  // ================== State Access ==================

  /**
   * Get current personality state
   */
  getState(): PersonalityState {
    return {
      ...this.state,
      traits: { ...this.state.traits },
      adaptationHistory: [...this.state.adaptationHistory],
    };
  }

  /**
   * Get current traits
   */
  getTraits(): PersonalityTraits {
    return { ...this.state.traits };
  }

  /**
   * Get a specific trait value
   */
  getTrait(trait: keyof PersonalityTraits): number {
    return this.state.traits[trait];
  }

  /**
   * Get current config
   */
  getConfig(): PersonalityModelConfig {
    return { ...this.config };
  }

  // ================== Trait Modification ==================

  /**
   * Set a single trait value
   */
  setTrait(trait: keyof PersonalityTraits, value: number): void {
    const clampedValue = this.clampTraitValue(value);
    this.state.traits[trait] = clampedValue;
    this.state.updatedAt = new Date();
    this.state.version++;
  }

  /**
   * Set multiple traits at once
   */
  setTraits(traits: Partial<PersonalityTraits>): void {
    for (const [trait, value] of Object.entries(traits)) {
      if (value !== undefined) {
        const clampedValue = this.clampTraitValue(value);
        this.state.traits[trait as keyof PersonalityTraits] = clampedValue;
      }
    }
    this.state.updatedAt = new Date();
    this.state.version++;
  }

  // ================== Pattern Analysis ==================

  /**
   * Analyze user interaction pattern and suggest adaptations
   */
  analyzeInteractionPattern(pattern: InteractionPattern): AdaptationSuggestion[] {
    const suggestions: AdaptationSuggestion[] = [];

    // Analyze formality preference
    if (Math.abs(pattern.formalityPreference - this.state.traits.formality) > 0.2) {
      suggestions.push({
        trait: "formality",
        currentValue: this.state.traits.formality,
        suggestedValue: pattern.formalityPreference,
        reason: pattern.formalityPreference < 0.5
          ? "User prefers casual communication"
          : "User prefers formal communication",
        confidence: 0.7,
        trigger: "interaction_pattern",
      });
    }

    // Analyze emotional expressiveness -> warmth
    if (pattern.emotionalExpressiveness > 0.7 && this.state.traits.warmth < 0.8) {
      suggestions.push({
        trait: "warmth",
        currentValue: this.state.traits.warmth,
        suggestedValue: Math.min(0.95, this.state.traits.warmth + 0.2),
        reason: "User shows high emotional expressiveness",
        confidence: 0.75,
        trigger: "interaction_pattern",
      });
    }

    // Analyze humor appreciation
    if (pattern.humorAppreciation > 0.7 && this.state.traits.humor < pattern.humorAppreciation) {
      suggestions.push({
        trait: "humor",
        currentValue: this.state.traits.humor,
        suggestedValue: Math.min(0.9, pattern.humorAppreciation),
        reason: "User appreciates humor in conversations",
        confidence: 0.7,
        trigger: "interaction_pattern",
      });
    } else if (pattern.humorAppreciation < 0.3 && this.state.traits.humor > 0.5) {
      suggestions.push({
        trait: "humor",
        currentValue: this.state.traits.humor,
        suggestedValue: 0.4,
        reason: "User prefers serious conversations",
        confidence: 0.65,
        trigger: "interaction_pattern",
      });
    }

    // Analyze detail preference -> openness
    if (pattern.detailPreference === "brief" && this.state.traits.openness > 0.6) {
      suggestions.push({
        trait: "openness",
        currentValue: this.state.traits.openness,
        suggestedValue: Math.max(0.4, this.state.traits.openness - 0.2),
        reason: "User prefers brief, focused responses",
        confidence: 0.65,
        trigger: "interaction_pattern",
      });
    } else if (pattern.detailPreference === "detailed" && this.state.traits.openness < 0.7) {
      suggestions.push({
        trait: "openness",
        currentValue: this.state.traits.openness,
        suggestedValue: Math.min(0.9, this.state.traits.openness + 0.2),
        reason: "User enjoys detailed, exploratory responses",
        confidence: 0.7,
        trigger: "interaction_pattern",
      });
    }

    // Analyze curiosity based on question frequency
    if (pattern.questionFrequency > 0.6 && this.state.traits.curiosity < 0.7) {
      suggestions.push({
        trait: "curiosity",
        currentValue: this.state.traits.curiosity,
        suggestedValue: 0.8,
        reason: "User asks many questions, likely appreciates mutual curiosity",
        confidence: 0.6,
        trigger: "interaction_pattern",
      });
    }

    // Analyze empathy based on emotional expressiveness
    if (pattern.emotionalExpressiveness > 0.8 && this.state.traits.empathy < 0.85) {
      suggestions.push({
        trait: "empathy",
        currentValue: this.state.traits.empathy,
        suggestedValue: 0.9,
        reason: "User shares emotions frequently, needs high empathy",
        confidence: 0.8,
        trigger: "emotion_response",
      });
    }

    return suggestions;
  }

  // ================== Adaptation ==================

  /**
   * Apply adaptation suggestions
   */
  applySuggestions(
    suggestions: AdaptationSuggestion[],
    options: ApplySuggestionsOptions = {}
  ): AdaptationResult {
    const { gradual = false } = options;

    // Check session limit
    if (this.sessionAdaptationCount >= this.config.maxAdaptationPerSession) {
      return {
        applied: false,
        suggestions,
        appliedChanges: {},
        rejectedSuggestions: suggestions,
        newState: this.getState(),
      };
    }

    const appliedChanges: Partial<PersonalityTraits> = {};
    const rejectedSuggestions: AdaptationSuggestion[] = [];

    for (const suggestion of suggestions) {
      // Check confidence threshold
      if (suggestion.confidence < this.config.minConfidence) {
        rejectedSuggestions.push(suggestion);
        continue;
      }

      // Check if trait is enabled
      if (!this.config.enabledTraits.includes(suggestion.trait)) {
        rejectedSuggestions.push(suggestion);
        continue;
      }

      // Calculate new value
      let newValue: number;
      if (gradual) {
        // Apply learning rate for gradual adaptation
        const delta = suggestion.suggestedValue - suggestion.currentValue;
        newValue = suggestion.currentValue + delta * this.config.learningRate;
      } else {
        newValue = suggestion.suggestedValue;
      }

      // Clamp and apply
      newValue = this.clampTraitValue(newValue);
      this.state.traits[suggestion.trait] = newValue;
      appliedChanges[suggestion.trait] = newValue;
    }

    const applied = Object.keys(appliedChanges).length > 0;

    if (applied) {
      this.state.updatedAt = new Date();
      this.state.version++;
      this.sessionAdaptationCount++;

      // Record in history
      const record: AdaptationRecord = {
        timestamp: new Date(),
        trigger: suggestions[0]?.trigger || "interaction_pattern",
        traitChanges: appliedChanges,
        confidence: Math.max(...suggestions.map((s) => s.confidence)),
      };
      this.state.adaptationHistory.push(record);
    }

    return {
      applied,
      suggestions,
      appliedChanges,
      rejectedSuggestions,
      newState: this.getState(),
    };
  }

  /**
   * Reset session adaptation count
   */
  resetSession(): void {
    this.sessionAdaptationCount = 0;
  }

  // ================== Descriptions ==================

  /**
   * Get description for a trait based on its value
   */
  getTraitDescription(trait: keyof PersonalityTraits): string {
    const value = this.state.traits[trait];
    const descriptions = TRAIT_DESCRIPTIONS[trait];

    if (value < 0.35) {
      return descriptions.low;
    } else if (value > 0.65) {
      return descriptions.high;
    } else {
      // Blend descriptions for middle values
      return `balanced between ${descriptions.low} and ${descriptions.high}`;
    }
  }

  /**
   * Get a human-readable personality summary
   */
  getPersonalitySummary(): string {
    const traits = this.state.traits;
    const dominantTraits: string[] = [];

    // Find dominant traits (>0.7)
    if (traits.warmth > 0.7) dominantTraits.push("warm and friendly");
    if (traits.humor > 0.7) dominantTraits.push("humorous");
    if (traits.playfulness > 0.7) dominantTraits.push("playful");
    if (traits.empathy > 0.7) dominantTraits.push("empathetic");
    if (traits.curiosity > 0.7) dominantTraits.push("curious");
    if (traits.formality < 0.3) dominantTraits.push("casual");
    if (traits.formality > 0.7) dominantTraits.push("formal");
    if (traits.assertiveness > 0.7) dominantTraits.push("assertive");
    if (traits.openness > 0.7) dominantTraits.push("open-minded");

    if (dominantTraits.length === 0) {
      return "A balanced personality with moderate traits across all dimensions.";
    }

    return `A ${dominantTraits.join(", ")} personality.`;
  }

  // ================== Serialization ==================

  /**
   * Export state as JSON string
   */
  exportState(): string {
    return JSON.stringify({
      traits: this.state.traits,
      version: this.state.version,
      createdAt: this.state.createdAt.toISOString(),
      updatedAt: this.state.updatedAt.toISOString(),
      adaptationHistory: this.state.adaptationHistory.map((record) => ({
        ...record,
        timestamp: record.timestamp.toISOString(),
      })),
    });
  }

  /**
   * Import state from JSON string
   */
  importState(jsonStr: string): void {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      throw new Error("Invalid JSON format");
    }

    // Validate required fields
    if (!parsed.traits || typeof parsed.traits !== "object") {
      throw new Error("Invalid state: missing or invalid traits");
    }

    // Validate trait values
    for (const [key, value] of Object.entries(parsed.traits)) {
      if (typeof value !== "number" || value < 0 || value > 1) {
        throw new Error(`Invalid trait value for ${key}`);
      }
    }

    // Apply imported state
    this.state = {
      traits: { ...DEFAULT_PERSONALITY_TRAITS, ...parsed.traits },
      version: parsed.version || 1,
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
      updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
      adaptationHistory: (parsed.adaptationHistory || []).map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp),
      })),
    };
  }

  // ================== Private Methods ==================

  private clampTraitValue(value: number): number {
    return Math.max(
      this.config.traitBounds.min,
      Math.min(this.config.traitBounds.max, value)
    );
  }
}

/**
 * Factory function
 */
export function createPersonalityModel(
  options?: PersonalityModelOptions
): PersonalityModel {
  return new PersonalityModel(options);
}

// Singleton
let defaultInstance: PersonalityModel | null = null;

export function getPersonalityModel(): PersonalityModel {
  if (!defaultInstance) {
    defaultInstance = new PersonalityModel();
  }
  return defaultInstance;
}

export function resetPersonalityModel(): void {
  defaultInstance = null;
}
