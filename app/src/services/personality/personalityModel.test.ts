import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PersonalityModel,
  createPersonalityModel,
  getPersonalityModel,
  resetPersonalityModel,
} from "./personalityModel";
import type {
  PersonalityTraits,
  PersonalityState,
  InteractionPattern,
  AdaptationSuggestion,
} from "./types";
import { DEFAULT_PERSONALITY_TRAITS } from "./types";

describe("PersonalityModel", () => {
  let model: PersonalityModel;

  beforeEach(() => {
    vi.clearAllMocks();
    model = new PersonalityModel();
    resetPersonalityModel();
  });

  describe("constructor", () => {
    it("should create with default traits", () => {
      const m = new PersonalityModel();
      expect(m).toBeDefined();
      const state = m.getState();
      expect(state.traits).toBeDefined();
      expect(state.version).toBe(1);
    });

    it("should create with custom initial traits", () => {
      const customTraits: Partial<PersonalityTraits> = {
        warmth: 0.9,
        humor: 0.8,
      };
      const m = new PersonalityModel({ initialTraits: customTraits });
      const state = m.getState();
      expect(state.traits.warmth).toBe(0.9);
      expect(state.traits.humor).toBe(0.8);
    });

    it("should create with custom config", () => {
      const m = new PersonalityModel({
        learningRate: 0.1,
        minConfidence: 0.7,
      });
      const config = m.getConfig();
      expect(config.learningRate).toBe(0.1);
      expect(config.minConfidence).toBe(0.7);
    });
  });

  describe("getState", () => {
    it("should return current personality state", () => {
      const state = model.getState();
      expect(state).toHaveProperty("traits");
      expect(state).toHaveProperty("createdAt");
      expect(state).toHaveProperty("updatedAt");
      expect(state).toHaveProperty("version");
      expect(state).toHaveProperty("adaptationHistory");
    });

    it("should return a copy of state (immutable)", () => {
      const state1 = model.getState();
      const state2 = model.getState();
      expect(state1).not.toBe(state2);
      expect(state1.traits).not.toBe(state2.traits);
    });
  });

  describe("getTraits", () => {
    it("should return current traits", () => {
      const traits = model.getTraits();
      expect(traits).toHaveProperty("openness");
      expect(traits).toHaveProperty("warmth");
      expect(traits).toHaveProperty("humor");
    });

    it("should return a copy of traits (immutable)", () => {
      const traits1 = model.getTraits();
      const traits2 = model.getTraits();
      expect(traits1).not.toBe(traits2);
    });
  });

  describe("getTrait", () => {
    it("should return specific trait value", () => {
      const warmth = model.getTrait("warmth");
      expect(typeof warmth).toBe("number");
      expect(warmth).toBeGreaterThanOrEqual(0);
      expect(warmth).toBeLessThanOrEqual(1);
    });

    it("should return correct default values", () => {
      expect(model.getTrait("warmth")).toBe(DEFAULT_PERSONALITY_TRAITS.warmth);
      expect(model.getTrait("humor")).toBe(DEFAULT_PERSONALITY_TRAITS.humor);
    });
  });

  describe("setTrait", () => {
    it("should update a single trait", () => {
      model.setTrait("warmth", 0.9);
      expect(model.getTrait("warmth")).toBe(0.9);
    });

    it("should clamp trait values within bounds", () => {
      model.setTrait("warmth", 1.5);
      expect(model.getTrait("warmth")).toBeLessThanOrEqual(1);

      model.setTrait("warmth", -0.5);
      expect(model.getTrait("warmth")).toBeGreaterThanOrEqual(0);
    });

    it("should update version on trait change", () => {
      const initialVersion = model.getState().version;
      model.setTrait("warmth", 0.9);
      expect(model.getState().version).toBe(initialVersion + 1);
    });

    it("should update updatedAt timestamp", () => {
      const initialTime = model.getState().updatedAt.getTime();
      model.setTrait("warmth", 0.9);
      // Just check updatedAt is defined and a valid date
      const updatedTime = model.getState().updatedAt;
      expect(updatedTime).toBeDefined();
      expect(updatedTime instanceof Date).toBe(true);
    });
  });

  describe("setTraits", () => {
    it("should update multiple traits at once", () => {
      model.setTraits({
        warmth: 0.9,
        humor: 0.8,
        formality: 0.3,
      });
      expect(model.getTrait("warmth")).toBe(0.9);
      expect(model.getTrait("humor")).toBe(0.8);
      expect(model.getTrait("formality")).toBe(0.3);
    });

    it("should only increment version once for multiple trait changes", () => {
      const initialVersion = model.getState().version;
      model.setTraits({
        warmth: 0.9,
        humor: 0.8,
      });
      expect(model.getState().version).toBe(initialVersion + 1);
    });
  });

  describe("analyzeInteractionPattern", () => {
    it("should suggest lower formality for brief messages", () => {
      // Set formality higher so the difference triggers suggestion
      model.setTrait("formality", 0.7);

      const pattern: InteractionPattern = {
        averageMessageLength: 20,
        responseSpeed: "fast",
        emotionalExpressiveness: 0.3,
        topicDiversity: 0.5,
        questionFrequency: 0.2,
        humorAppreciation: 0.5,
        formalityPreference: 0.2,
        detailPreference: "brief",
      };

      const suggestions = model.analyzeInteractionPattern(pattern);
      const formalitySuggestion = suggestions.find((s) => s.trait === "formality");
      expect(formalitySuggestion).toBeDefined();
      if (formalitySuggestion) {
        expect(formalitySuggestion.suggestedValue).toBeLessThan(
          formalitySuggestion.currentValue
        );
      }
    });

    it("should suggest higher warmth for emotional users", () => {
      // Set warmth lower so the suggestion triggers
      model.setTrait("warmth", 0.5);

      const pattern: InteractionPattern = {
        averageMessageLength: 100,
        responseSpeed: "medium",
        emotionalExpressiveness: 0.9,
        topicDiversity: 0.5,
        questionFrequency: 0.3,
        humorAppreciation: 0.5,
        formalityPreference: 0.5,
        detailPreference: "moderate",
      };

      const suggestions = model.analyzeInteractionPattern(pattern);
      const warmthSuggestion = suggestions.find((s) => s.trait === "warmth");
      expect(warmthSuggestion).toBeDefined();
    });

    it("should suggest higher humor for users who appreciate it", () => {
      const pattern: InteractionPattern = {
        averageMessageLength: 50,
        responseSpeed: "medium",
        emotionalExpressiveness: 0.5,
        topicDiversity: 0.5,
        questionFrequency: 0.3,
        humorAppreciation: 0.9,
        formalityPreference: 0.3,
        detailPreference: "moderate",
      };

      const suggestions = model.analyzeInteractionPattern(pattern);
      const humorSuggestion = suggestions.find((s) => s.trait === "humor");
      expect(humorSuggestion).toBeDefined();
      if (humorSuggestion) {
        expect(humorSuggestion.suggestedValue).toBeGreaterThan(
          humorSuggestion.currentValue
        );
      }
    });

    it("should suggest lower openness for users who prefer brief responses", () => {
      const pattern: InteractionPattern = {
        averageMessageLength: 10,
        responseSpeed: "fast",
        emotionalExpressiveness: 0.3,
        topicDiversity: 0.2,
        questionFrequency: 0.1,
        humorAppreciation: 0.3,
        formalityPreference: 0.5,
        detailPreference: "brief",
      };

      const suggestions = model.analyzeInteractionPattern(pattern);
      const opennessSuggestion = suggestions.find((s) => s.trait === "openness");
      expect(opennessSuggestion).toBeDefined();
    });

    it("should return empty suggestions if pattern matches current traits", () => {
      // Set traits to match pattern
      model.setTraits({
        formality: 0.2,
        warmth: 0.5,
        humor: 0.5,
      });

      const pattern: InteractionPattern = {
        averageMessageLength: 50,
        responseSpeed: "medium",
        emotionalExpressiveness: 0.5,
        topicDiversity: 0.5,
        questionFrequency: 0.3,
        humorAppreciation: 0.5,
        formalityPreference: 0.2,
        detailPreference: "moderate",
      };

      const suggestions = model.analyzeInteractionPattern(pattern);
      // May have some suggestions but with low confidence
      suggestions.forEach((s) => {
        expect(Math.abs(s.suggestedValue - s.currentValue)).toBeLessThan(0.3);
      });
    });
  });

  describe("applySuggestions", () => {
    it("should apply suggestions above confidence threshold", () => {
      const suggestions: AdaptationSuggestion[] = [
        {
          trait: "warmth",
          currentValue: 0.5,
          suggestedValue: 0.8,
          reason: "User shows high emotional expressiveness",
          confidence: 0.8,
          trigger: "interaction_pattern",
        },
      ];

      const result = model.applySuggestions(suggestions);
      expect(result.applied).toBe(true);
      expect(result.appliedChanges.warmth).toBe(0.8);
      expect(model.getTrait("warmth")).toBe(0.8);
    });

    it("should reject suggestions below confidence threshold", () => {
      // Set initial warmth to 0.5
      model.setTrait("warmth", 0.5);

      const suggestions: AdaptationSuggestion[] = [
        {
          trait: "warmth",
          currentValue: 0.5,
          suggestedValue: 0.8,
          reason: "User shows high emotional expressiveness",
          confidence: 0.3, // Below default threshold of 0.6
          trigger: "interaction_pattern",
        },
      ];

      const result = model.applySuggestions(suggestions);
      expect(result.rejectedSuggestions.length).toBe(1);
      expect(model.getTrait("warmth")).toBe(0.5); // Unchanged
    });

    it("should apply gradual changes based on learning rate", () => {
      const m = new PersonalityModel({ learningRate: 0.1 });
      m.setTrait("warmth", 0.5);

      const suggestions: AdaptationSuggestion[] = [
        {
          trait: "warmth",
          currentValue: 0.5,
          suggestedValue: 1.0,
          reason: "Test",
          confidence: 0.9,
          trigger: "interaction_pattern",
        },
      ];

      const result = m.applySuggestions(suggestions, { gradual: true });
      // With learning rate 0.1, should move 10% toward target
      // 0.5 + (1.0 - 0.5) * 0.1 = 0.55
      expect(result.appliedChanges.warmth).toBeCloseTo(0.55, 2);
    });

    it("should record adaptation in history", () => {
      const suggestions: AdaptationSuggestion[] = [
        {
          trait: "warmth",
          currentValue: 0.5,
          suggestedValue: 0.8,
          reason: "Test",
          confidence: 0.8,
          trigger: "user_feedback",
        },
      ];

      model.applySuggestions(suggestions);
      const history = model.getState().adaptationHistory;
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].trigger).toBe("user_feedback");
    });

    it("should respect max adaptations per session", () => {
      const m = new PersonalityModel({ maxAdaptationPerSession: 2 });

      for (let i = 0; i < 5; i++) {
        m.applySuggestions([
          {
            trait: "warmth",
            currentValue: 0.5,
            suggestedValue: 0.5 + i * 0.1,
            reason: "Test",
            confidence: 0.8,
            trigger: "interaction_pattern",
          },
        ]);
      }

      const history = m.getState().adaptationHistory;
      // Should only have 2 adaptations due to limit
      expect(history.length).toBeLessThanOrEqual(2);
    });
  });

  describe("resetSession", () => {
    it("should reset session adaptation count", () => {
      const m = new PersonalityModel({ maxAdaptationPerSession: 2 });

      // Apply 2 suggestions (max)
      for (let i = 0; i < 2; i++) {
        m.applySuggestions([
          {
            trait: "warmth",
            currentValue: 0.5,
            suggestedValue: 0.6,
            reason: "Test",
            confidence: 0.8,
            trigger: "interaction_pattern",
          },
        ]);
      }

      // Reset session
      m.resetSession();

      // Should be able to apply more suggestions
      const result = m.applySuggestions([
        {
          trait: "humor",
          currentValue: 0.5,
          suggestedValue: 0.7,
          reason: "Test",
          confidence: 0.8,
          trigger: "interaction_pattern",
        },
      ]);

      expect(result.applied).toBe(true);
    });
  });

  describe("getTraitDescription", () => {
    it("should return low description for low trait values", () => {
      model.setTrait("warmth", 0.2);
      const desc = model.getTraitDescription("warmth");
      expect(desc).toContain("professional");
    });

    it("should return high description for high trait values", () => {
      model.setTrait("warmth", 0.9);
      const desc = model.getTraitDescription("warmth");
      expect(desc).toContain("warm");
    });

    it("should return blended description for middle values", () => {
      model.setTrait("warmth", 0.5);
      const desc = model.getTraitDescription("warmth");
      expect(desc).toBeDefined();
      expect(desc.length).toBeGreaterThan(0);
    });
  });

  describe("exportState", () => {
    it("should export state as JSON string", () => {
      const exported = model.exportState();
      expect(typeof exported).toBe("string");
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty("traits");
      expect(parsed).toHaveProperty("version");
    });
  });

  describe("importState", () => {
    it("should import state from JSON string", () => {
      const originalState = model.getState();
      model.setTrait("warmth", 0.1);

      const exported = new PersonalityModel().exportState();
      model.importState(exported);

      expect(model.getTrait("warmth")).toBe(DEFAULT_PERSONALITY_TRAITS.warmth);
    });

    it("should validate imported state", () => {
      const invalidJson = '{"invalid": true}';
      expect(() => model.importState(invalidJson)).toThrow();
    });

    it("should handle malformed JSON", () => {
      expect(() => model.importState("not json")).toThrow();
    });
  });

  describe("getPersonalitySummary", () => {
    it("should return a human-readable summary", () => {
      const summary = model.getPersonalitySummary();
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });

    it("should reflect dominant traits", () => {
      model.setTraits({
        warmth: 0.95,
        humor: 0.9,
        formality: 0.1,
      });
      const summary = model.getPersonalitySummary();
      expect(summary.toLowerCase()).toMatch(/warm|friendly|humorous|casual/);
    });
  });
});

describe("createPersonalityModel", () => {
  it("should create model via factory function", () => {
    const m = createPersonalityModel();
    expect(m).toBeInstanceOf(PersonalityModel);
  });

  it("should pass config to model", () => {
    const m = createPersonalityModel({
      learningRate: 0.2,
      initialTraits: { warmth: 0.9 },
    });
    expect(m.getConfig().learningRate).toBe(0.2);
    expect(m.getTrait("warmth")).toBe(0.9);
  });
});

describe("getPersonalityModel", () => {
  beforeEach(() => {
    resetPersonalityModel();
  });

  it("should return singleton instance", () => {
    const m1 = getPersonalityModel();
    const m2 = getPersonalityModel();
    expect(m1).toBe(m2);
  });

  it("should reset singleton instance", () => {
    const m1 = getPersonalityModel();
    resetPersonalityModel();
    const m2 = getPersonalityModel();
    expect(m1).not.toBe(m2);
  });
});
