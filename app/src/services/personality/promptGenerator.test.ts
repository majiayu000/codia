import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PromptGenerator,
  createPromptGenerator,
  getPromptGenerator,
  resetPromptGenerator,
} from "./promptGenerator";
import { PersonalityModel } from "./personalityModel";
import type { PersonalityTraits, PromptContext } from "./types";

describe("PromptGenerator", () => {
  let generator: PromptGenerator;
  let model: PersonalityModel;

  beforeEach(() => {
    vi.clearAllMocks();
    model = new PersonalityModel();
    generator = new PromptGenerator(model);
    resetPromptGenerator();
  });

  describe("constructor", () => {
    it("should create with personality model", () => {
      const g = new PromptGenerator(model);
      expect(g).toBeDefined();
    });

    it("should create with custom base prompt", () => {
      const g = new PromptGenerator(model, {
        basePrompt: "Custom base prompt",
      });
      const result = g.generate();
      expect(result.fullSystemPrompt).toContain("Custom base prompt");
    });
  });

  describe("generate", () => {
    it("should generate a complete prompt", () => {
      const result = generator.generate();
      expect(result).toHaveProperty("personalitySection");
      expect(result).toHaveProperty("toneGuidelines");
      expect(result).toHaveProperty("behaviorRules");
      expect(result).toHaveProperty("fullSystemPrompt");
    });

    it("should include personality section", () => {
      const result = generator.generate();
      expect(result.personalitySection.length).toBeGreaterThan(0);
    });

    it("should include tone guidelines", () => {
      const result = generator.generate();
      expect(result.toneGuidelines.length).toBeGreaterThan(0);
    });

    it("should include behavior rules", () => {
      const result = generator.generate();
      expect(result.behaviorRules.length).toBeGreaterThan(0);
    });

    it("should combine all sections in fullSystemPrompt", () => {
      const result = generator.generate();
      expect(result.fullSystemPrompt).toContain(result.personalitySection);
      expect(result.fullSystemPrompt).toContain(result.toneGuidelines);
    });
  });

  describe("generateWithContext", () => {
    it("should incorporate user pattern context", () => {
      const context: PromptContext = {
        traits: model.getTraits(),
        userPattern: {
          averageMessageLength: 50,
          responseSpeed: "fast",
          emotionalExpressiveness: 0.8,
          topicDiversity: 0.6,
          questionFrequency: 0.3,
          humorAppreciation: 0.7,
          formalityPreference: 0.3,
          detailPreference: "moderate",
        },
      };

      const result = generator.generateWithContext(context);
      expect(result.fullSystemPrompt.length).toBeGreaterThan(0);
    });

    it("should adjust for current mood", () => {
      const context: PromptContext = {
        traits: model.getTraits(),
        currentMood: "sad",
      };

      const result = generator.generateWithContext(context);
      expect(result.fullSystemPrompt.toLowerCase()).toMatch(
        /comfort|empathy|support|gentle|understanding/
      );
    });

    it("should adjust for conversation tone", () => {
      const context: PromptContext = {
        traits: model.getTraits(),
        conversationTone: "playful",
      };

      const result = generator.generateWithContext(context);
      expect(result.fullSystemPrompt.toLowerCase()).toMatch(
        /playful|fun|light|humor/
      );
    });
  });

  describe("personality trait influence", () => {
    it("should reflect high warmth in prompt", () => {
      model.setTrait("warmth", 0.95);
      const result = generator.generate();
      expect(result.personalitySection.toLowerCase()).toMatch(
        /warm|caring|friendly|nurturing/
      );
    });

    it("should reflect low warmth in prompt", () => {
      model.setTrait("warmth", 0.15);
      const result = generator.generate();
      expect(result.personalitySection.toLowerCase()).toMatch(
        /professional|distance|appropriate/
      );
    });

    it("should reflect high humor in prompt", () => {
      model.setTrait("humor", 0.9);
      const result = generator.generate();
      expect(result.personalitySection.toLowerCase()).toMatch(/humor|wit|funny|jokes/);
    });

    it("should reflect low humor in prompt", () => {
      model.setTrait("humor", 0.15);
      const result = generator.generate();
      expect(result.personalitySection.toLowerCase()).toMatch(
        /serious|straightforward/
      );
    });

    it("should reflect high formality in prompt", () => {
      model.setTrait("formality", 0.9);
      const result = generator.generate();
      expect(result.toneGuidelines.toLowerCase()).toMatch(/formal|polite|proper/);
    });

    it("should reflect low formality in prompt", () => {
      model.setTrait("formality", 0.15);
      const result = generator.generate();
      expect(result.toneGuidelines.toLowerCase()).toMatch(/casual|informal|relaxed/);
    });

    it("should reflect high empathy in prompt", () => {
      model.setTrait("empathy", 0.95);
      const result = generator.generate();
      expect(result.personalitySection.toLowerCase()).toMatch(
        /empathy|understanding|emotional|supportive/
      );
    });

    it("should reflect high curiosity in prompt", () => {
      model.setTrait("curiosity", 0.9);
      const result = generator.generate();
      expect(result.behaviorRules.some((r) => r.toLowerCase().includes("question") || r.toLowerCase().includes("curious") || r.toLowerCase().includes("interest"))).toBe(true);
    });
  });

  describe("generateBehaviorRules", () => {
    it("should generate rules based on traits", () => {
      const rules = generator.generateBehaviorRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it("should include empathy rules when empathy is high", () => {
      model.setTrait("empathy", 0.95);
      const rules = generator.generateBehaviorRules();
      expect(
        rules.some(
          (r) =>
            r.toLowerCase().includes("emotion") ||
            r.toLowerCase().includes("feeling") ||
            r.toLowerCase().includes("empathy")
        )
      ).toBe(true);
    });

    it("should include curiosity rules when curiosity is high", () => {
      model.setTrait("curiosity", 0.9);
      const rules = generator.generateBehaviorRules();
      expect(
        rules.some(
          (r) =>
            r.toLowerCase().includes("question") ||
            r.toLowerCase().includes("curious") ||
            r.toLowerCase().includes("interest")
        )
      ).toBe(true);
    });
  });

  describe("generateToneGuidelines", () => {
    it("should generate tone guidelines", () => {
      const tone = generator.generateToneGuidelines();
      expect(typeof tone).toBe("string");
      expect(tone.length).toBeGreaterThan(0);
    });

    it("should reflect formality level", () => {
      model.setTrait("formality", 0.9);
      let tone = generator.generateToneGuidelines();
      expect(tone.toLowerCase()).toMatch(/formal|polite/);

      model.setTrait("formality", 0.1);
      tone = generator.generateToneGuidelines();
      expect(tone.toLowerCase()).toMatch(/casual|informal/);
    });

    it("should reflect assertiveness level", () => {
      model.setTrait("assertiveness", 0.9);
      let tone = generator.generateToneGuidelines();
      expect(tone.toLowerCase()).toMatch(/confident|direct|assertive/);

      model.setTrait("assertiveness", 0.15);
      tone = generator.generateToneGuidelines();
      expect(tone.toLowerCase()).toMatch(/gentle|suggest|soft/);
    });
  });

  describe("getPersonalitySummary", () => {
    it("should return a natural language summary", () => {
      const summary = generator.getPersonalitySummary();
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });

    it("should include dominant trait descriptions", () => {
      model.setTraits({
        warmth: 0.95,
        humor: 0.9,
        formality: 0.1,
      });
      const summary = generator.getPersonalitySummary();
      expect(summary.toLowerCase()).toMatch(/warm|friendly|humorous|casual/);
    });
  });
});

describe("createPromptGenerator", () => {
  it("should create generator via factory function", () => {
    const model = new PersonalityModel();
    const g = createPromptGenerator(model);
    expect(g).toBeInstanceOf(PromptGenerator);
  });

  it("should pass config to generator", () => {
    const model = new PersonalityModel();
    const g = createPromptGenerator(model, {
      basePrompt: "Test base",
    });
    const result = g.generate();
    expect(result.fullSystemPrompt).toContain("Test base");
  });
});

describe("getPromptGenerator", () => {
  beforeEach(() => {
    resetPromptGenerator();
  });

  it("should return singleton instance", () => {
    const g1 = getPromptGenerator();
    const g2 = getPromptGenerator();
    expect(g1).toBe(g2);
  });

  it("should reset singleton instance", () => {
    const g1 = getPromptGenerator();
    resetPromptGenerator();
    const g2 = getPromptGenerator();
    expect(g1).not.toBe(g2);
  });
});
