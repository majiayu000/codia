import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  EmotionAnalyzer,
  createEmotionAnalyzer,
  mapToBasicExpression,
} from "./emotionAnalyzer";
import type { EmotionAnalysisResult, ExtendedExpression } from "./types";
import type { Message } from "@/store/types";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("EmotionAnalyzer", () => {
  let analyzer: EmotionAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    analyzer = new EmotionAnalyzer();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const a = new EmotionAnalyzer();
      expect(a).toBeDefined();
    });

    it("should create with custom config", () => {
      const a = new EmotionAnalyzer({
        provider: "anthropic",
        minConfidence: 0.8,
        useQuickDetection: false,
      });
      expect(a).toBeDefined();
    });
  });

  describe("quickDetect", () => {
    it("should detect happy emotion from Chinese text", () => {
      const result = analyzer.quickDetect("我今天好开心啊！");
      expect(result.primary).toBe("happy");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should detect happy emotion from English text", () => {
      const result = analyzer.quickDetect("I'm so happy today!");
      expect(result.primary).toBe("happy");
    });

    it("should detect sad emotion", () => {
      const result = analyzer.quickDetect("我好难过...");
      expect(result.primary).toBe("sad");
    });

    it("should detect angry emotion", () => {
      const result = analyzer.quickDetect("I'm so angry right now!");
      expect(result.primary).toBe("angry");
    });

    it("should detect surprised emotion", () => {
      const result = analyzer.quickDetect("Wow! That's amazing!");
      expect(result.primary).toBe("surprised");
    });

    it("should detect curious emotion", () => {
      const result = analyzer.quickDetect("我很好奇这是怎么工作的");
      expect(result.primary).toBe("curious");
    });

    it("should detect concerned/worried emotion", () => {
      const result = analyzer.quickDetect("我有点担心这个问题");
      expect(result.primary).toBe("concerned");
    });

    it("should detect excited emotion", () => {
      const result = analyzer.quickDetect("I'm so excited about this!");
      expect(result.primary).toBe("excited");
    });

    it("should detect confused emotion", () => {
      const result = analyzer.quickDetect("我有点困惑，搞不懂这个");
      expect(result.primary).toBe("confused");
    });

    it("should detect loving emotion", () => {
      const result = analyzer.quickDetect("I love this so much!");
      expect(result.primary).toBe("loving");
    });

    it("should detect shy emotion", () => {
      const result = analyzer.quickDetect("有点害羞不好意思说");
      expect(result.primary).toBe("shy");
    });

    it("should detect playful emotion", () => {
      const result = analyzer.quickDetect("Just joking with you!");
      expect(result.primary).toBe("playful");
    });

    it("should return neutral for generic messages", () => {
      const result = analyzer.quickDetect("好的");
      expect(result.primary).toBe("neutral");
    });

    it("should calculate appropriate valence and arousal", () => {
      const happyResult = analyzer.quickDetect("I'm so happy!");
      expect(happyResult.valence).toBeGreaterThan(0);
      expect(happyResult.arousal).toBeGreaterThan(0.3);

      const sadResult = analyzer.quickDetect("I feel so sad...");
      expect(sadResult.valence).toBeLessThan(0);

      const excitedResult = analyzer.quickDetect("So excited!");
      expect(excitedResult.arousal).toBeGreaterThan(0.7);
    });

    it("should detect multiple emotions and use strongest", () => {
      const result = analyzer.quickDetect("I'm happy but also a bit worried");
      expect(["happy", "concerned"]).toContain(result.primary);
    });

    it("should include detected cues", () => {
      const result = analyzer.quickDetect("I'm really happy and excited!");
      expect(result.cues.length).toBeGreaterThan(0);
    });
  });

  describe("analyze", () => {
    it("should call API with formatted prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            primary: "happy",
            intensity: 0.8,
            valence: 0.7,
            arousal: 0.6,
            confidence: 0.9,
            cues: ["happy", "great"],
            reasoning: "User expresses happiness",
          }),
        }),
      });

      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "今天真是太棒了！",
        timestamp: new Date(),
      };

      await analyzer.analyze(message);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/emotion/analyze",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should parse analysis result correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            primary: "excited",
            secondary: "happy",
            intensity: 0.9,
            valence: 0.8,
            arousal: 0.9,
            confidence: 0.95,
            cues: ["excited", "amazing"],
            reasoning: "High enthusiasm detected",
          }),
        }),
      });

      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "This is amazing! I can't wait!",
        timestamp: new Date(),
      };

      const result = await analyzer.analyze(message);

      expect(result.primary).toBe("excited");
      expect(result.secondary).toBe("happy");
      expect(result.intensity).toBe(0.9);
      expect(result.confidence).toBe(0.95);
    });

    it("should handle JSON wrapped in code blocks", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: `\`\`\`json
{
  "primary": "curious",
  "intensity": 0.7,
  "valence": 0.4,
  "arousal": 0.5,
  "confidence": 0.85,
  "cues": ["wondering"],
  "reasoning": "User asking questions"
}
\`\`\``,
        }),
      });

      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "How does this work?",
        timestamp: new Date(),
      };

      const result = await analyzer.analyze(message);
      expect(result.primary).toBe("curious");
    });

    it("should fall back to quick detection on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "I'm so happy!",
        timestamp: new Date(),
      };

      const result = await analyzer.analyze(message);

      expect(result.primary).toBe("happy");
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence for fallback
    });

    it("should fall back to quick detection on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "I feel sad...",
        timestamp: new Date(),
      };

      const result = await analyzer.analyze(message);

      expect(result.primary).toBe("sad");
    });

    it("should fall back on malformed JSON", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: "not valid json",
        }),
      });

      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "I'm excited!",
        timestamp: new Date(),
      };

      const result = await analyzer.analyze(message);

      expect(result.primary).toBe("excited");
    });

    it("should use cached result for same message within TTL", async () => {
      const cachedAnalyzer = new EmotionAnalyzer({
        enableCache: true,
        cacheTTL: 60000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            primary: "happy",
            intensity: 0.8,
            valence: 0.7,
            arousal: 0.6,
            confidence: 0.9,
            cues: ["happy"],
          }),
        }),
      });

      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "I'm happy!",
        timestamp: new Date(),
      };

      // First call - should hit API
      await cachedAnalyzer.analyze(message);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await cachedAnalyzer.analyze(message);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("analyzeWithContext", () => {
    it("should analyze with conversation context", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            primary: "concerned",
            intensity: 0.7,
            valence: -0.3,
            arousal: 0.6,
            confidence: 0.85,
            cues: ["worried"],
            reasoning: "Context shows growing concern",
          }),
        }),
      });

      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "有个问题...", timestamp: new Date() },
        { id: "msg-2", role: "assistant", content: "什么问题？", timestamp: new Date() },
        { id: "msg-3", role: "user", content: "我有点担心", timestamp: new Date() },
      ];

      const result = await analyzer.analyzeWithContext(messages);

      expect(result.primary).toBe("concerned");
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should include conversation history in API call", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            primary: "happy",
            intensity: 0.8,
            valence: 0.7,
            arousal: 0.6,
            confidence: 0.9,
            cues: [],
          }),
        }),
      });

      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
        { id: "msg-2", role: "assistant", content: "Hi!", timestamp: new Date() },
        { id: "msg-3", role: "user", content: "Great!", timestamp: new Date() },
      ];

      await analyzer.analyzeWithContext(messages);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages.length).toBeGreaterThan(1);
    });
  });

  describe("getEmotionContext", () => {
    it("should return empty context initially", () => {
      const context = analyzer.getEmotionContext();
      expect(context.history).toHaveLength(0);
      expect(context.trend).toBe("stable");
    });

    it("should track emotion history", async () => {
      // Mock multiple analyses
      const emotions = ["happy", "happy", "excited"];
      for (const emotion of emotions) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: JSON.stringify({
              primary: emotion,
              intensity: 0.8,
              valence: 0.7,
              arousal: 0.6,
              confidence: 0.9,
              cues: [],
            }),
          }),
        });

        await analyzer.analyze({
          id: `msg-${Date.now()}`,
          role: "user",
          content: "Test",
          timestamp: new Date(),
        });
      }

      const context = analyzer.getEmotionContext();
      expect(context.history.length).toBeGreaterThan(0);
    });

    it("should calculate emotional trend", async () => {
      // Simulate improving emotional trend
      const emotions: Array<{ emotion: ExtendedExpression; valence: number }> = [
        { emotion: "sad", valence: -0.5 },
        { emotion: "neutral", valence: 0 },
        { emotion: "happy", valence: 0.7 },
      ];

      for (const { emotion, valence } of emotions) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: JSON.stringify({
              primary: emotion,
              intensity: 0.8,
              valence,
              arousal: 0.5,
              confidence: 0.9,
              cues: [],
            }),
          }),
        });

        await analyzer.analyze({
          id: `msg-${Date.now()}-${Math.random()}`,
          role: "user",
          content: "Test",
          timestamp: new Date(),
        });
      }

      const context = analyzer.getEmotionContext();
      expect(context.trend).toBe("improving");
    });

    it("should detect declining emotional trend", async () => {
      const emotions: Array<{ emotion: ExtendedExpression; valence: number }> = [
        { emotion: "happy", valence: 0.7 },
        { emotion: "neutral", valence: 0 },
        { emotion: "sad", valence: -0.5 },
      ];

      for (const { emotion, valence } of emotions) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: JSON.stringify({
              primary: emotion,
              intensity: 0.8,
              valence,
              arousal: 0.5,
              confidence: 0.9,
              cues: [],
            }),
          }),
        });

        await analyzer.analyze({
          id: `msg-${Date.now()}-${Math.random()}`,
          role: "user",
          content: "Test",
          timestamp: new Date(),
        });
      }

      const context = analyzer.getEmotionContext();
      expect(context.trend).toBe("declining");
    });

    it("should identify dominant emotion", async () => {
      // Happy appears most frequently
      const emotions = ["happy", "happy", "happy", "sad", "neutral"];

      for (const emotion of emotions) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: JSON.stringify({
              primary: emotion,
              intensity: 0.8,
              valence: emotion === "happy" ? 0.7 : -0.3,
              arousal: 0.5,
              confidence: 0.9,
              cues: [],
            }),
          }),
        });

        await analyzer.analyze({
          id: `msg-${Date.now()}-${Math.random()}`,
          role: "user",
          content: "Test",
          timestamp: new Date(),
        });
      }

      const context = analyzer.getEmotionContext();
      expect(context.dominantEmotion).toBe("happy");
    });
  });

  describe("clearHistory", () => {
    it("should clear emotion history", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            primary: "happy",
            intensity: 0.8,
            valence: 0.7,
            arousal: 0.6,
            confidence: 0.9,
            cues: [],
          }),
        }),
      });

      await analyzer.analyze({
        id: "msg-1",
        role: "user",
        content: "Happy!",
        timestamp: new Date(),
      });

      expect(analyzer.getEmotionContext().history.length).toBeGreaterThan(0);

      analyzer.clearHistory();

      expect(analyzer.getEmotionContext().history).toHaveLength(0);
    });
  });

  describe("clearCache", () => {
    it("should clear analysis cache", async () => {
      const cachedAnalyzer = new EmotionAnalyzer({
        enableCache: true,
        cacheTTL: 60000,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            primary: "happy",
            intensity: 0.8,
            valence: 0.7,
            arousal: 0.6,
            confidence: 0.9,
            cues: [],
          }),
        }),
      });

      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "Happy!",
        timestamp: new Date(),
      };

      // First call
      await cachedAnalyzer.analyze(message);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      cachedAnalyzer.clearCache();

      // Second call should hit API again
      await cachedAnalyzer.analyze(message);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe("mapToBasicExpression", () => {
  it("should map extended expressions to basic VRM expressions", () => {
    expect(mapToBasicExpression("happy")).toBe("happy");
    expect(mapToBasicExpression("sad")).toBe("sad");
    expect(mapToBasicExpression("angry")).toBe("angry");
    expect(mapToBasicExpression("surprised")).toBe("surprised");
    expect(mapToBasicExpression("relaxed")).toBe("relaxed");
    expect(mapToBasicExpression("neutral")).toBe("neutral");
  });

  it("should map curious to happy", () => {
    expect(mapToBasicExpression("curious")).toBe("happy");
  });

  it("should map concerned to sad", () => {
    expect(mapToBasicExpression("concerned")).toBe("sad");
  });

  it("should map excited to happy", () => {
    expect(mapToBasicExpression("excited")).toBe("happy");
  });

  it("should map confused to surprised", () => {
    expect(mapToBasicExpression("confused")).toBe("surprised");
  });

  it("should map loving to happy", () => {
    expect(mapToBasicExpression("loving")).toBe("happy");
  });

  it("should map shy to relaxed", () => {
    expect(mapToBasicExpression("shy")).toBe("relaxed");
  });

  it("should map thinking to neutral", () => {
    expect(mapToBasicExpression("thinking")).toBe("neutral");
  });

  it("should map playful to happy", () => {
    expect(mapToBasicExpression("playful")).toBe("happy");
  });
});

describe("createEmotionAnalyzer", () => {
  it("should create analyzer via factory function", () => {
    const a = createEmotionAnalyzer();
    expect(a).toBeInstanceOf(EmotionAnalyzer);
  });

  it("should pass config to analyzer", () => {
    const a = createEmotionAnalyzer({
      provider: "anthropic",
      minConfidence: 0.7,
    });
    expect(a).toBeInstanceOf(EmotionAnalyzer);
  });
});
