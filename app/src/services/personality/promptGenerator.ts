/**
 * Prompt Generator Service
 * 动态 Prompt 生成器 - 根据人格特质生成 System Prompt
 */

import { PersonalityModel, getPersonalityModel } from "./personalityModel";
import type {
  PersonalityTraits,
  PromptContext,
  GeneratedPrompt,
} from "./types";
import { TRAIT_DESCRIPTIONS } from "./types";

/**
 * Prompt generator configuration
 */
export interface PromptGeneratorConfig {
  basePrompt: string;
  includePersonalitySection: boolean;
  includeToneGuidelines: boolean;
  includeBehaviorRules: boolean;
  maxRules: number;
}

const DEFAULT_BASE_PROMPT = `You are Codia, a friendly and intelligent AI companion. You're here to chat, help, and keep the user company. Be natural, engaging, and authentic in your responses.`;

const DEFAULT_CONFIG: PromptGeneratorConfig = {
  basePrompt: DEFAULT_BASE_PROMPT,
  includePersonalitySection: true,
  includeToneGuidelines: true,
  includeBehaviorRules: true,
  maxRules: 8,
};

/**
 * Prompt Generator
 * Generates dynamic system prompts based on personality traits
 */
export class PromptGenerator {
  private model: PersonalityModel;
  private config: PromptGeneratorConfig;

  constructor(
    model: PersonalityModel,
    config: Partial<PromptGeneratorConfig> = {}
  ) {
    this.model = model;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a complete prompt based on current personality
   */
  generate(): GeneratedPrompt {
    const traits = this.model.getTraits();

    const personalitySection = this.generatePersonalitySection(traits);
    const toneGuidelines = this.generateToneGuidelines();
    const behaviorRules = this.generateBehaviorRules();

    const fullSystemPrompt = this.assemblePrompt(
      personalitySection,
      toneGuidelines,
      behaviorRules
    );

    return {
      personalitySection,
      toneGuidelines,
      behaviorRules,
      fullSystemPrompt,
    };
  }

  /**
   * Generate prompt with additional context
   */
  generateWithContext(context: PromptContext): GeneratedPrompt {
    const basePrompt = this.generate();

    // Add context-specific modifications
    let contextSection = "";

    if (context.currentMood) {
      contextSection += this.getMoodGuidance(context.currentMood);
    }

    if (context.conversationTone) {
      contextSection += this.getToneGuidance(context.conversationTone);
    }

    if (context.userPattern) {
      contextSection += this.getPatternGuidance(context.userPattern);
    }

    if (contextSection) {
      return {
        ...basePrompt,
        fullSystemPrompt: basePrompt.fullSystemPrompt + "\n\n" + contextSection,
      };
    }

    return basePrompt;
  }

  /**
   * Generate behavior rules based on traits
   */
  generateBehaviorRules(): string[] {
    const traits = this.model.getTraits();
    const rules: string[] = [];

    // Empathy rules
    if (traits.empathy > 0.7) {
      rules.push(
        "Always acknowledge the user's emotions and feelings before responding to their content"
      );
      rules.push(
        "Show genuine empathy and understanding in your responses"
      );
    }

    // Curiosity rules
    if (traits.curiosity > 0.7) {
      rules.push(
        "Ask follow-up questions to show genuine interest in the user's thoughts"
      );
      rules.push(
        "Be curious about the user's experiences and opinions"
      );
    }

    // Warmth rules
    if (traits.warmth > 0.7) {
      rules.push(
        "Use warm, caring language that makes the user feel valued"
      );
    }

    // Humor rules
    if (traits.humor > 0.7) {
      rules.push(
        "Include appropriate humor and wit when the conversation allows"
      );
    } else if (traits.humor < 0.3) {
      rules.push(
        "Keep responses focused and serious, avoid unnecessary jokes"
      );
    }

    // Assertiveness rules
    if (traits.assertiveness > 0.7) {
      rules.push(
        "Give clear, confident recommendations when asked for advice"
      );
    } else if (traits.assertiveness < 0.3) {
      rules.push(
        "Offer suggestions gently, presenting options rather than directives"
      );
    }

    // Openness rules
    if (traits.openness > 0.7) {
      rules.push(
        "Explore topics in depth and share interesting perspectives"
      );
    } else if (traits.openness < 0.3) {
      rules.push(
        "Keep responses concise and focused on the specific question"
      );
    }

    // Playfulness rules
    if (traits.playfulness > 0.7) {
      rules.push(
        "Add playful elements to make conversations more fun and engaging"
      );
    }

    // Limit rules to config max
    return rules.slice(0, this.config.maxRules);
  }

  /**
   * Generate tone guidelines based on traits
   */
  generateToneGuidelines(): string {
    const traits = this.model.getTraits();
    const guidelines: string[] = [];

    // Formality
    if (traits.formality > 0.7) {
      guidelines.push("Use formal, polite language");
      guidelines.push("Maintain proper grammar and avoid slang");
    } else if (traits.formality < 0.3) {
      guidelines.push("Use casual, informal language");
      guidelines.push("Feel free to use relaxed expressions and contractions");
    } else {
      guidelines.push("Use a balanced, conversational tone");
    }

    // Assertiveness
    if (traits.assertiveness > 0.7) {
      guidelines.push("Be confident and direct in your statements");
      guidelines.push("Express opinions with assertive language");
    } else if (traits.assertiveness < 0.3) {
      guidelines.push("Use gentle, suggestive language");
      guidelines.push("Offer soft recommendations rather than directives");
    }

    // Extraversion
    if (traits.extraversion > 0.7) {
      guidelines.push("Be enthusiastic and energetic in responses");
    } else if (traits.extraversion < 0.3) {
      guidelines.push("Be calm and measured in your responses");
    }

    return guidelines.join(". ") + ".";
  }

  /**
   * Get a natural language personality summary
   */
  getPersonalitySummary(): string {
    return this.model.getPersonalitySummary();
  }

  // ================== Private Methods ==================

  private generatePersonalitySection(traits: PersonalityTraits): string {
    const descriptions: string[] = [];

    // Generate descriptions for significant traits
    for (const [trait, value] of Object.entries(traits)) {
      const traitKey = trait as keyof PersonalityTraits;
      const desc = TRAIT_DESCRIPTIONS[traitKey];

      if (value > 0.7) {
        descriptions.push(`You ${desc.high}`);
      } else if (value < 0.3) {
        descriptions.push(`You ${desc.low}`);
      }
    }

    if (descriptions.length === 0) {
      return "You have a balanced, adaptable personality.";
    }

    return `Your personality: ${descriptions.join(". ")}.`;
  }

  private assemblePrompt(
    personalitySection: string,
    toneGuidelines: string,
    behaviorRules: string[]
  ): string {
    const parts: string[] = [this.config.basePrompt];

    if (this.config.includePersonalitySection && personalitySection) {
      parts.push(`\n\n## Personality\n${personalitySection}`);
    }

    if (this.config.includeToneGuidelines && toneGuidelines) {
      parts.push(`\n\n## Tone\n${toneGuidelines}`);
    }

    if (this.config.includeBehaviorRules && behaviorRules.length > 0) {
      const rulesText = behaviorRules.map((r) => `- ${r}`).join("\n");
      parts.push(`\n\n## Behavior Guidelines\n${rulesText}`);
    }

    return parts.join("");
  }

  private getMoodGuidance(mood: string): string {
    const moodGuidance: Record<string, string> = {
      sad: "The user seems sad. Be extra gentle, supportive, and empathetic. Offer comfort and understanding.",
      happy: "The user is in a good mood. Match their energy and share in their positivity.",
      angry: "The user may be frustrated. Stay calm, validate their feelings, and don't be defensive.",
      anxious: "The user seems anxious. Be reassuring, calm, and help them feel grounded.",
      excited: "The user is excited! Be enthusiastic and share in their excitement.",
      neutral: "",
    };

    return moodGuidance[mood.toLowerCase()] || "";
  }

  private getToneGuidance(tone: string): string {
    const toneGuidance: Record<string, string> = {
      playful: "The conversation is playful and light. Feel free to be fun and humorous.",
      serious: "This is a serious conversation. Be thoughtful and focused.",
      supportive: "The user needs support. Be caring and encouraging.",
      professional: "Maintain a professional tone in this conversation.",
      casual: "Keep the conversation casual and friendly.",
    };

    return toneGuidance[tone.toLowerCase()] || "";
  }

  private getPatternGuidance(pattern: {
    detailPreference?: "brief" | "moderate" | "detailed";
    formalityPreference?: number;
  }): string {
    const guidance: string[] = [];

    if (pattern.detailPreference === "brief") {
      guidance.push("Keep responses concise - the user prefers brief answers.");
    } else if (pattern.detailPreference === "detailed") {
      guidance.push("Feel free to elaborate - the user appreciates detailed responses.");
    }

    if (pattern.formalityPreference !== undefined) {
      if (pattern.formalityPreference < 0.3) {
        guidance.push("Match the user's casual communication style.");
      } else if (pattern.formalityPreference > 0.7) {
        guidance.push("Match the user's formal communication style.");
      }
    }

    return guidance.join(" ");
  }
}

/**
 * Factory function
 */
export function createPromptGenerator(
  model: PersonalityModel,
  config?: Partial<PromptGeneratorConfig>
): PromptGenerator {
  return new PromptGenerator(model, config);
}

// Singleton
let defaultInstance: PromptGenerator | null = null;

export function getPromptGenerator(): PromptGenerator {
  if (!defaultInstance) {
    defaultInstance = new PromptGenerator(getPersonalityModel());
  }
  return defaultInstance;
}

export function resetPromptGenerator(): void {
  defaultInstance = null;
}
