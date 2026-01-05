import { describe, it, expect, beforeEach } from "vitest";
import {
  ResponseStrategyEngine,
  createResponseStrategyEngine,
  getResponseStrategyEngine,
  resetResponseStrategyEngine,
} from "./responseStrategy";
import type { EmotionAnalysisResult, EmotionContext, ResponseStrategy } from "./types";

describe("ResponseStrategyEngine", () => {
  let engine: ResponseStrategyEngine;

  beforeEach(() => {
    engine = new ResponseStrategyEngine();
    resetResponseStrategyEngine();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const e = new ResponseStrategyEngine();
      expect(e).toBeDefined();
    });

    it("should create with custom config", () => {
      const e = new ResponseStrategyEngine({
        defaultTone: "cheerful",
        prioritizeEmotionalSupport: true,
      });
      expect(e).toBeDefined();
    });
  });

  describe("generateStrategy", () => {
    describe("for positive emotions", () => {
      it("should generate cheerful strategy for happy emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "happy",
          intensity: 0.8,
          valence: 0.7,
          arousal: 0.6,
          confidence: 0.9,
          cues: ["happy"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("cheerful");
        expect(strategy.suggestedExpression).toBe("happy");
        expect(strategy.acknowledgeEmotion).toBe(true);
      });

      it("should generate playful strategy for playful emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "playful",
          intensity: 0.7,
          valence: 0.6,
          arousal: 0.7,
          confidence: 0.85,
          cues: ["joking"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("playful");
        expect(strategy.suggestedExpression).toBe("playful");
      });

      it("should generate encouraging strategy for excited emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "excited",
          intensity: 0.9,
          valence: 0.8,
          arousal: 0.9,
          confidence: 0.9,
          cues: ["excited"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("encouraging");
        expect(strategy.suggestedExpression).toBe("excited");
        expect(strategy.expressionIntensity).toBeGreaterThan(0.7);
      });

      it("should generate supportive strategy for loving emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "loving",
          intensity: 0.8,
          valence: 0.9,
          arousal: 0.5,
          confidence: 0.85,
          cues: ["love"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("supportive");
        expect(strategy.suggestedExpression).toBe("loving");
      });
    });

    describe("for negative emotions", () => {
      it("should generate empathetic strategy for sad emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "sad",
          intensity: 0.7,
          valence: -0.6,
          arousal: 0.3,
          confidence: 0.9,
          cues: ["sad"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("empathetic");
        expect(strategy.acknowledgeEmotion).toBe(true);
        expect(strategy.shouldAskFollowUp).toBe(true);
        expect(strategy.priority).toBe("high");
      });

      it("should generate calm strategy for angry emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "angry",
          intensity: 0.8,
          valence: -0.7,
          arousal: 0.8,
          confidence: 0.9,
          cues: ["angry"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("calm");
        expect(strategy.acknowledgeEmotion).toBe(true);
        expect(strategy.avoidTopics.length).toBeGreaterThan(0);
      });

      it("should generate supportive strategy for concerned emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "concerned",
          intensity: 0.6,
          valence: -0.3,
          arousal: 0.6,
          confidence: 0.85,
          cues: ["worried"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("supportive");
        expect(strategy.shouldAskFollowUp).toBe(true);
      });
    });

    describe("for neutral/cognitive emotions", () => {
      it("should generate calm strategy for neutral emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "neutral",
          intensity: 0.5,
          valence: 0,
          arousal: 0.3,
          confidence: 0.9,
          cues: [],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("calm");
        expect(strategy.length).toBe("moderate");
        expect(strategy.acknowledgeEmotion).toBe(false);
      });

      it("should generate encouraging strategy for curious emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "curious",
          intensity: 0.7,
          valence: 0.4,
          arousal: 0.5,
          confidence: 0.85,
          cues: ["wondering"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("encouraging");
        expect(strategy.length).toBe("detailed");
        expect(strategy.suggestedExpression).toBe("curious");
      });

      it("should generate supportive strategy for confused emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "confused",
          intensity: 0.6,
          valence: -0.2,
          arousal: 0.5,
          confidence: 0.8,
          cues: ["confused"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("supportive");
        expect(strategy.length).toBe("detailed");
        expect(strategy.shouldAskFollowUp).toBe(true);
      });

      it("should generate calm strategy for thinking emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "thinking",
          intensity: 0.5,
          valence: 0.1,
          arousal: 0.4,
          confidence: 0.8,
          cues: ["thinking"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("calm");
        expect(strategy.suggestedExpression).toBe("thinking");
      });
    });

    describe("for special emotions", () => {
      it("should generate supportive strategy for shy emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "shy",
          intensity: 0.6,
          valence: 0.1,
          arousal: 0.4,
          confidence: 0.8,
          cues: ["shy"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("supportive");
        expect(strategy.length).toBe("brief");
        expect(strategy.suggestedExpression).toBe("shy");
      });

      it("should generate cheerful strategy for surprised emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "surprised",
          intensity: 0.8,
          valence: 0.3,
          arousal: 0.9,
          confidence: 0.9,
          cues: ["wow"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("cheerful");
        expect(strategy.suggestedExpression).toBe("surprised");
      });

      it("should generate calm strategy for relaxed emotion", () => {
        const emotion: EmotionAnalysisResult = {
          primary: "relaxed",
          intensity: 0.6,
          valence: 0.5,
          arousal: 0.2,
          confidence: 0.85,
          cues: ["calm"],
        };

        const strategy = engine.generateStrategy(emotion);

        expect(strategy.tone).toBe("calm");
        expect(strategy.suggestedExpression).toBe("relaxed");
      });
    });

    describe("intensity-based adjustments", () => {
      it("should set higher expression intensity for high emotional intensity", () => {
        const highIntensity: EmotionAnalysisResult = {
          primary: "happy",
          intensity: 0.95,
          valence: 0.8,
          arousal: 0.7,
          confidence: 0.9,
          cues: [],
        };

        const strategy = engine.generateStrategy(highIntensity);
        expect(strategy.expressionIntensity).toBeGreaterThan(0.8);
      });

      it("should set lower expression intensity for low emotional intensity", () => {
        const lowIntensity: EmotionAnalysisResult = {
          primary: "happy",
          intensity: 0.3,
          valence: 0.4,
          arousal: 0.3,
          confidence: 0.9,
          cues: [],
        };

        const strategy = engine.generateStrategy(lowIntensity);
        expect(strategy.expressionIntensity).toBeLessThan(0.5);
      });

      it("should set urgent priority for high intensity negative emotions", () => {
        const urgentEmotion: EmotionAnalysisResult = {
          primary: "sad",
          intensity: 0.9,
          valence: -0.8,
          arousal: 0.7,
          confidence: 0.9,
          cues: [],
        };

        const strategy = engine.generateStrategy(urgentEmotion);
        expect(strategy.priority).toBe("urgent");
      });
    });
  });

  describe("generateStrategyWithContext", () => {
    it("should consider emotional trend in strategy", () => {
      const emotion: EmotionAnalysisResult = {
        primary: "neutral",
        intensity: 0.5,
        valence: 0,
        arousal: 0.3,
        confidence: 0.9,
        cues: [],
      };

      const decliningContext: EmotionContext = {
        current: emotion,
        history: [
          { primary: "happy", intensity: 0.8, valence: 0.7, arousal: 0.6, confidence: 0.9, cues: [] },
          { primary: "neutral", intensity: 0.5, valence: 0, arousal: 0.3, confidence: 0.9, cues: [] },
          { primary: "sad", intensity: 0.6, valence: -0.5, arousal: 0.3, confidence: 0.9, cues: [] },
        ],
        trend: "declining",
        dominantEmotion: "neutral",
        averageValence: 0.1,
        averageArousal: 0.4,
      };

      const strategy = engine.generateStrategyWithContext(emotion, decliningContext);

      // Should be more supportive when trend is declining
      expect(["supportive", "empathetic"]).toContain(strategy.tone);
      expect(strategy.shouldAskFollowUp).toBe(true);
    });

    it("should maintain positive approach for improving trend", () => {
      const emotion: EmotionAnalysisResult = {
        primary: "happy",
        intensity: 0.7,
        valence: 0.6,
        arousal: 0.5,
        confidence: 0.9,
        cues: [],
      };

      const improvingContext: EmotionContext = {
        current: emotion,
        history: [
          { primary: "sad", intensity: 0.6, valence: -0.5, arousal: 0.3, confidence: 0.9, cues: [] },
          { primary: "neutral", intensity: 0.5, valence: 0, arousal: 0.3, confidence: 0.9, cues: [] },
          { primary: "happy", intensity: 0.7, valence: 0.6, arousal: 0.5, confidence: 0.9, cues: [] },
        ],
        trend: "improving",
        dominantEmotion: "happy",
        averageValence: 0.3,
        averageArousal: 0.4,
      };

      const strategy = engine.generateStrategyWithContext(emotion, improvingContext);

      expect(["cheerful", "encouraging"]).toContain(strategy.tone);
    });

    it("should be more careful with volatile emotions", () => {
      const emotion: EmotionAnalysisResult = {
        primary: "neutral",
        intensity: 0.5,
        valence: 0,
        arousal: 0.5,
        confidence: 0.9,
        cues: [],
      };

      const volatileContext: EmotionContext = {
        current: emotion,
        history: [],
        trend: "volatile",
        dominantEmotion: "neutral",
        averageValence: 0,
        averageArousal: 0.6,
      };

      const strategy = engine.generateStrategyWithContext(emotion, volatileContext);

      expect(strategy.shouldAskFollowUp).toBe(true);
      expect(strategy.guidance).toContain("Be attentive to emotional shifts");
    });
  });

  describe("generateGuidance", () => {
    it("should include guidance for acknowledging emotion", () => {
      const emotion: EmotionAnalysisResult = {
        primary: "sad",
        intensity: 0.7,
        valence: -0.6,
        arousal: 0.3,
        confidence: 0.9,
        cues: [],
      };

      const strategy = engine.generateStrategy(emotion);

      expect(strategy.guidance.length).toBeGreaterThan(0);
    });

    it("should include avoid topics for negative emotions", () => {
      const emotion: EmotionAnalysisResult = {
        primary: "angry",
        intensity: 0.8,
        valence: -0.7,
        arousal: 0.8,
        confidence: 0.9,
        cues: [],
      };

      const strategy = engine.generateStrategy(emotion);

      expect(strategy.avoidTopics.length).toBeGreaterThan(0);
    });
  });

  describe("formatStrategyForPrompt", () => {
    it("should format strategy as prompt instructions", () => {
      const strategy: ResponseStrategy = {
        tone: "empathetic",
        length: "moderate",
        shouldAskFollowUp: true,
        acknowledgeEmotion: true,
        suggestedExpression: "concerned",
        expressionIntensity: 0.7,
        guidance: ["Show understanding", "Be supportive"],
        avoidTopics: ["criticism"],
        priority: "high",
      };

      const prompt = engine.formatStrategyForPrompt(strategy);

      expect(prompt).toContain("empathetic");
      expect(prompt).toContain("follow-up");
      expect(prompt).toContain("Acknowledge");
    });

    it("should include all relevant strategy elements", () => {
      const strategy: ResponseStrategy = {
        tone: "cheerful",
        length: "brief",
        shouldAskFollowUp: false,
        acknowledgeEmotion: false,
        suggestedExpression: "happy",
        expressionIntensity: 0.8,
        guidance: ["Match their energy"],
        avoidTopics: [],
        priority: "low",
      };

      const prompt = engine.formatStrategyForPrompt(strategy);

      expect(prompt).toContain("cheerful");
      expect(prompt).toContain("brief");
    });
  });

  describe("getDefaultStrategy", () => {
    it("should return a valid default strategy", () => {
      const strategy = engine.getDefaultStrategy();

      expect(strategy.tone).toBeDefined();
      expect(strategy.length).toBeDefined();
      expect(strategy.suggestedExpression).toBeDefined();
      expect(strategy.priority).toBe("medium");
    });
  });
});

describe("createResponseStrategyEngine", () => {
  it("should create engine via factory function", () => {
    const e = createResponseStrategyEngine();
    expect(e).toBeInstanceOf(ResponseStrategyEngine);
  });

  it("should pass config to engine", () => {
    const e = createResponseStrategyEngine({
      defaultTone: "supportive",
    });
    expect(e).toBeInstanceOf(ResponseStrategyEngine);
  });
});

describe("getResponseStrategyEngine", () => {
  beforeEach(() => {
    resetResponseStrategyEngine();
  });

  it("should return singleton instance", () => {
    const e1 = getResponseStrategyEngine();
    const e2 = getResponseStrategyEngine();
    expect(e1).toBe(e2);
  });

  it("should reset singleton instance", () => {
    const e1 = getResponseStrategyEngine();
    resetResponseStrategyEngine();
    const e2 = getResponseStrategyEngine();
    expect(e1).not.toBe(e2);
  });
});
