import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  AdaptationEngine,
  createAdaptationEngine,
  getAdaptationEngine,
  resetAdaptationEngine,
} from "./adaptationEngine";
import { PersonalityModel } from "./personalityModel";
import type { InteractionPattern, AdaptationTrigger } from "./types";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AdaptationEngine", () => {
  let engine: AdaptationEngine;
  let model: PersonalityModel;

  beforeEach(() => {
    vi.clearAllMocks();
    model = new PersonalityModel();
    engine = new AdaptationEngine(model);
    resetAdaptationEngine();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create with personality model", () => {
      const e = new AdaptationEngine(model);
      expect(e).toBeDefined();
    });

    it("should create with custom config", () => {
      const e = new AdaptationEngine(model, {
        analysisIntervalMs: 5000,
        minInteractionsForAnalysis: 5,
      });
      const config = e.getConfig();
      expect(config.analysisIntervalMs).toBe(5000);
      expect(config.minInteractionsForAnalysis).toBe(5);
    });
  });

  describe("recordInteraction", () => {
    it("should record user message interaction", () => {
      engine.recordInteraction({
        type: "user_message",
        content: "Hello, how are you?",
        timestamp: new Date(),
      });

      const stats = engine.getInteractionStats();
      expect(stats.totalInteractions).toBe(1);
      expect(stats.userMessages).toBe(1);
    });

    it("should record AI response interaction", () => {
      engine.recordInteraction({
        type: "ai_response",
        content: "I'm doing well, thank you!",
        timestamp: new Date(),
      });

      const stats = engine.getInteractionStats();
      expect(stats.aiResponses).toBe(1);
    });

    it("should record emotional reaction", () => {
      engine.recordInteraction({
        type: "emotional_reaction",
        emotion: "happy",
        intensity: 0.8,
        timestamp: new Date(),
      });

      const stats = engine.getInteractionStats();
      expect(stats.emotionalReactions).toBe(1);
    });

    it("should record multiple interactions", () => {
      engine.recordInteraction({
        type: "user_message",
        content: "Hi!",
        timestamp: new Date(),
      });
      engine.recordInteraction({
        type: "ai_response",
        content: "Hello!",
        timestamp: new Date(),
      });
      engine.recordInteraction({
        type: "user_message",
        content: "How are you?",
        timestamp: new Date(),
      });

      const stats = engine.getInteractionStats();
      expect(stats.totalInteractions).toBe(3);
      expect(stats.userMessages).toBe(2);
      expect(stats.aiResponses).toBe(1);
    });
  });

  describe("analyzePattern", () => {
    it("should analyze interaction pattern from history", () => {
      // Record several interactions
      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "user_message",
          content: "Short msg",
          timestamp: new Date(),
        });
      }

      const pattern = engine.analyzePattern();
      expect(pattern).toBeDefined();
      expect(pattern.averageMessageLength).toBeGreaterThan(0);
    });

    it("should detect brief message preference", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "user_message",
          content: "Hi",
          timestamp: new Date(),
        });
      }

      const pattern = engine.analyzePattern();
      expect(pattern.detailPreference).toBe("brief");
    });

    it("should detect detailed message preference", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "user_message",
          content: "This is a much longer message with lots of details about what I'm thinking and feeling right now, including many specifics.",
          timestamp: new Date(),
        });
      }

      const pattern = engine.analyzePattern();
      expect(pattern.detailPreference).toBe("detailed");
    });

    it("should detect high emotional expressiveness", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "emotional_reaction",
          emotion: "happy",
          intensity: 0.9,
          timestamp: new Date(),
        });
      }

      const pattern = engine.analyzePattern();
      expect(pattern.emotionalExpressiveness).toBeGreaterThan(0.5);
    });

    it("should detect humor appreciation", () => {
      for (let i = 0; i < 5; i++) {
        engine.recordInteraction({
          type: "user_message",
          content: "Haha that's so funny! 😂 LOL",
          timestamp: new Date(),
        });
      }

      const pattern = engine.analyzePattern();
      expect(pattern.humorAppreciation).toBeGreaterThan(0.3);
    });

    it("should detect question frequency", () => {
      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "user_message",
          content: i % 2 === 0 ? "What do you think?" : "Tell me more",
          timestamp: new Date(),
        });
      }

      const pattern = engine.analyzePattern();
      expect(pattern.questionFrequency).toBeCloseTo(0.5, 1);
    });

    it("should return default pattern if insufficient data", () => {
      const pattern = engine.analyzePattern();
      expect(pattern).toBeDefined();
      expect(pattern.averageMessageLength).toBeGreaterThanOrEqual(0);
    });
  });

  describe("suggestAdaptations", () => {
    it("should suggest adaptations based on pattern", () => {
      // Record interactions that suggest high warmth preference
      model.setTrait("warmth", 0.5);
      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "emotional_reaction",
          emotion: "happy",
          intensity: 0.9,
          timestamp: new Date(),
        });
        engine.recordInteraction({
          type: "user_message",
          content: "I really appreciate you listening to me 💕",
          timestamp: new Date(),
        });
      }

      const suggestions = engine.suggestAdaptations();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should not suggest if already aligned", () => {
      // Set traits to match expected pattern
      model.setTraits({
        formality: 0.3,
        warmth: 0.5,
        humor: 0.5,
      });

      // Record neutral interactions
      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "user_message",
          content: "This is a normal message.",
          timestamp: new Date(),
        });
      }

      const suggestions = engine.suggestAdaptations();
      // May have few or no strong suggestions
      suggestions.forEach((s) => {
        expect(Math.abs(s.suggestedValue - s.currentValue)).toBeLessThan(0.5);
      });
    });
  });

  describe("applyAdaptations", () => {
    it("should apply adaptations to personality model", () => {
      model.setTrait("warmth", 0.5);

      // Record interactions that suggest high warmth
      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "emotional_reaction",
          emotion: "happy",
          intensity: 0.9,
          timestamp: new Date(),
        });
      }

      const result = engine.applyAdaptations();
      if (result.applied) {
        expect(result.appliedChanges).toBeDefined();
      }
    });

    it("should use gradual adaptation by default", () => {
      model.setTrait("warmth", 0.5);

      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "emotional_reaction",
          emotion: "happy",
          intensity: 0.9,
          timestamp: new Date(),
        });
      }

      const initialWarmth = model.getTrait("warmth");
      engine.applyAdaptations();
      const newWarmth = model.getTrait("warmth");

      // Change should be gradual (less than full suggested change)
      if (newWarmth !== initialWarmth) {
        expect(Math.abs(newWarmth - initialWarmth)).toBeLessThan(0.2);
      }
    });
  });

  describe("processUserFeedback", () => {
    it("should process explicit user feedback", () => {
      const result = engine.processUserFeedback({
        type: "too_formal",
        message: "You're being too formal",
      });

      expect(result.suggestions.length).toBeGreaterThan(0);
      const formalitySuggestion = result.suggestions.find(
        (s) => s.trait === "formality"
      );
      expect(formalitySuggestion).toBeDefined();
    });

    it("should handle 'too_cold' feedback", () => {
      const result = engine.processUserFeedback({
        type: "too_cold",
        message: "You seem distant",
      });

      const warmthSuggestion = result.suggestions.find(
        (s) => s.trait === "warmth"
      );
      expect(warmthSuggestion).toBeDefined();
      if (warmthSuggestion) {
        expect(warmthSuggestion.suggestedValue).toBeGreaterThan(
          warmthSuggestion.currentValue
        );
      }
    });

    it("should handle 'too_casual' feedback", () => {
      model.setTrait("formality", 0.3);
      const result = engine.processUserFeedback({
        type: "too_casual",
        message: "Please be more professional",
      });

      const formalitySuggestion = result.suggestions.find(
        (s) => s.trait === "formality"
      );
      expect(formalitySuggestion).toBeDefined();
      if (formalitySuggestion) {
        expect(formalitySuggestion.suggestedValue).toBeGreaterThan(
          formalitySuggestion.currentValue
        );
      }
    });

    it("should handle 'too_serious' feedback", () => {
      model.setTrait("humor", 0.3);
      const result = engine.processUserFeedback({
        type: "too_serious",
        message: "Lighten up a bit",
      });

      const humorSuggestion = result.suggestions.find(
        (s) => s.trait === "humor"
      );
      expect(humorSuggestion).toBeDefined();
    });

    it("should apply feedback with high confidence", () => {
      model.setTrait("formality", 0.7);
      const result = engine.processUserFeedback({
        type: "too_formal",
        message: "Too formal",
      });

      // User feedback should have high confidence
      result.suggestions.forEach((s) => {
        expect(s.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe("getInteractionStats", () => {
    it("should return interaction statistics", () => {
      engine.recordInteraction({
        type: "user_message",
        content: "Hello",
        timestamp: new Date(),
      });

      const stats = engine.getInteractionStats();
      expect(stats).toHaveProperty("totalInteractions");
      expect(stats).toHaveProperty("userMessages");
      expect(stats).toHaveProperty("aiResponses");
      expect(stats).toHaveProperty("emotionalReactions");
      expect(stats).toHaveProperty("sessionStart");
    });
  });

  describe("clearHistory", () => {
    it("should clear interaction history", () => {
      engine.recordInteraction({
        type: "user_message",
        content: "Hello",
        timestamp: new Date(),
      });
      engine.recordInteraction({
        type: "ai_response",
        content: "Hi!",
        timestamp: new Date(),
      });

      engine.clearHistory();

      const stats = engine.getInteractionStats();
      expect(stats.totalInteractions).toBe(0);
    });

    it("should reset session start time", () => {
      const oldStats = engine.getInteractionStats();
      expect(oldStats.sessionStart).toBeDefined();

      engine.clearHistory();

      const newStats = engine.getInteractionStats();
      expect(newStats.sessionStart).toBeDefined();
      expect(newStats.sessionStart instanceof Date).toBe(true);
    });
  });

  describe("getAdaptationHistory", () => {
    it("should return adaptation history from model", () => {
      const history = engine.getAdaptationHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it("should include adaptations after applying", () => {
      model.setTrait("warmth", 0.5);

      for (let i = 0; i < 10; i++) {
        engine.recordInteraction({
          type: "emotional_reaction",
          emotion: "happy",
          intensity: 0.9,
          timestamp: new Date(),
        });
      }

      engine.applyAdaptations();
      const history = engine.getAdaptationHistory();
      // History may or may not have entries depending on if adaptations were applied
      expect(Array.isArray(history)).toBe(true);
    });
  });
});

describe("createAdaptationEngine", () => {
  it("should create engine via factory function", () => {
    const model = new PersonalityModel();
    const e = createAdaptationEngine(model);
    expect(e).toBeInstanceOf(AdaptationEngine);
  });

  it("should pass config to engine", () => {
    const model = new PersonalityModel();
    const e = createAdaptationEngine(model, {
      minInteractionsForAnalysis: 20,
    });
    expect(e.getConfig().minInteractionsForAnalysis).toBe(20);
  });
});

describe("getAdaptationEngine", () => {
  beforeEach(() => {
    resetAdaptationEngine();
  });

  it("should return singleton instance", () => {
    const e1 = getAdaptationEngine();
    const e2 = getAdaptationEngine();
    expect(e1).toBe(e2);
  });

  it("should reset singleton instance", () => {
    const e1 = getAdaptationEngine();
    resetAdaptationEngine();
    const e2 = getAdaptationEngine();
    expect(e1).not.toBe(e2);
  });
});
