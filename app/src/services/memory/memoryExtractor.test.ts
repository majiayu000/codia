import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MemoryExtractor, createMemoryExtractor } from "./memoryExtractor";
import type { Message } from "@/store/types";
import type { MemoryEntry, UserProfile } from "./types";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create a mock LongTermMemory class
class MockLongTermMemory {
  private memories: MemoryEntry[] = [];
  private profile: UserProfile = {
    id: "test-user",
    name: "Test User",
    preferences: {
      favoriteTopics: [],
      avoidTopics: [],
      responseLength: "moderate",
      formalityLevel: "casual",
      humorAppreciation: 0.5,
    },
    personalInfo: {
      occupation: "Developer",
      hobbies: [],
      importantDates: [],
      relationships: [],
    },
    communicationStyle: {
      preferredLanguage: "zh",
      usesEmoji: false,
      messageLength: "medium",
      formality: "casual",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  getAllMemories = vi.fn().mockImplementation(async () => this.memories);

  getProfile = vi.fn().mockImplementation(async () => this.profile);

  addMemory = vi.fn().mockImplementation(async (params: any) => {
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}-${Math.random()}`,
      userId: "test-user",
      type: params.type,
      content: params.content,
      summary: params.summary,
      confidence: params.confidence,
      source: params.source,
      context: params.context,
      tags: params.tags || [],
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    };
    this.memories.push(entry);
    return entry;
  });

  updateProfile = vi.fn().mockImplementation(async (updates: Partial<UserProfile>) => {
    this.profile = { ...this.profile, ...updates };
    return this.profile;
  });

  clearMemories() {
    this.memories = [];
  }
}

describe("MemoryExtractor", () => {
  let extractor: MemoryExtractor;
  let mockLongTermMemory: MockLongTermMemory;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockLongTermMemory = new MockLongTermMemory();
    // Cast to any to bypass type checking for mock
    extractor = new MemoryExtractor(mockLongTermMemory as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockLongTermMemory.clearMemories();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const ext = new MemoryExtractor(mockLongTermMemory as any);
      expect(ext).toBeDefined();
    });

    it("should create with custom config", () => {
      const ext = new MemoryExtractor(mockLongTermMemory as any, {
        provider: "anthropic",
        minConfidence: 0.8,
        batchSize: 5,
      });
      expect(ext).toBeDefined();
    });
  });

  describe("quickExtract", () => {
    it("should detect personal info patterns in Chinese", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "我叫张三，今年25岁",
        timestamp: new Date(),
      };

      const result = extractor.quickExtract(message);
      expect(result.hasPersonalInfo).toBe(true);
      expect(result.importance).toBeGreaterThan(0.5);
    });

    it("should detect preference patterns", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "我喜欢编程和音乐",
        timestamp: new Date(),
      };

      const result = extractor.quickExtract(message);
      expect(result.hasPreference).toBe(true);
    });

    it("should detect event patterns", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "明天是我的生日",
        timestamp: new Date(),
      };

      const result = extractor.quickExtract(message);
      expect(result.hasEvent).toBe(true);
    });

    it("should detect English patterns", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "My name is John and I love coding",
        timestamp: new Date(),
      };

      const result = extractor.quickExtract(message);
      expect(result.hasPersonalInfo).toBe(true);
      expect(result.hasPreference).toBe(true);
    });

    it("should calculate combined importance", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "我叫张三，我喜欢编程，明天我要去面试",
        timestamp: new Date(),
      };

      const result = extractor.quickExtract(message);
      // Has personal info (+0.3), preference (+0.1), event (+0.2)
      expect(result.importance).toBeGreaterThanOrEqual(0.9);
    });

    it("should return low importance for generic messages", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "好的，谢谢你",
        timestamp: new Date(),
      };

      const result = extractor.quickExtract(message);
      expect(result.hasPersonalInfo).toBe(false);
      expect(result.hasPreference).toBe(false);
      expect(result.hasEvent).toBe(false);
      expect(result.importance).toBe(0.5);
    });

    it("should detect I am patterns", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "I am a software engineer",
        timestamp: new Date(),
      };

      const result = extractor.quickExtract(message);
      expect(result.hasPersonalInfo).toBe(true);
    });

    it("should detect hate patterns", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "I hate bugs in my code",
        timestamp: new Date(),
      };

      const result = extractor.quickExtract(message);
      expect(result.hasPreference).toBe(true);
    });
  });

  describe("extractFromConversation", () => {
    it("should call API with formatted prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            facts: [],
            preferences: [],
            events: [],
            relationships: [],
            emotions: [],
            shouldUpdateProfile: false,
          }),
        }),
      });

      const messages: Message[] = [
        {
          id: "msg-1",
          role: "user",
          content: "我叫李明",
          timestamp: new Date(),
        },
      ];

      await extractor.extractFromConversation(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/memory/extract",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should parse extraction result correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            facts: [
              {
                content: "用户名字是李明",
                summary: "名字是李明",
                confidence: 0.95,
                source: "explicit",
                tags: ["name"],
              },
            ],
            preferences: [],
            events: [],
            relationships: [],
            emotions: [],
            shouldUpdateProfile: true,
            profileUpdates: { name: "李明" },
          }),
        }),
      });

      const messages: Message[] = [
        {
          id: "msg-1",
          role: "user",
          content: "我叫李明",
          timestamp: new Date(),
        },
      ];

      const result = await extractor.extractFromConversation(messages);

      expect(result.facts).toHaveLength(1);
      expect(result.facts[0].content).toBe("用户名字是李明");
      expect(result.shouldUpdateProfile).toBe(true);
      expect(result.profileUpdates?.name).toBe("李明");
    });

    it("should handle JSON wrapped in code blocks", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: `\`\`\`json
{
  "facts": [{"content": "Test", "summary": "T", "confidence": 0.9, "source": "explicit", "tags": []}],
  "preferences": [],
  "events": [],
  "relationships": [],
  "emotions": [],
  "shouldUpdateProfile": false
}
\`\`\``,
        }),
      });

      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Test", timestamp: new Date() },
      ];

      const result = await extractor.extractFromConversation(messages);
      expect(result.facts).toHaveLength(1);
    });

    it("should filter by minimum confidence", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            facts: [
              {
                content: "High confidence",
                summary: "High",
                confidence: 0.9,
                source: "explicit",
                tags: [],
              },
              {
                content: "Low confidence",
                summary: "Low",
                confidence: 0.3,
                source: "inferred",
                tags: [],
              },
            ],
            preferences: [],
            events: [],
            relationships: [],
            emotions: [],
            shouldUpdateProfile: false,
          }),
        }),
      });

      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Test", timestamp: new Date() },
      ];

      const result = await extractor.extractFromConversation(messages);

      // Default minConfidence is 0.6
      expect(result.facts).toHaveLength(1);
      expect(result.facts[0].confidence).toBeGreaterThanOrEqual(0.6);
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Test", timestamp: new Date() },
      ];

      const result = await extractor.extractFromConversation(messages);

      expect(result.facts).toHaveLength(0);
      expect(result.preferences).toHaveLength(0);
      expect(result.shouldUpdateProfile).toBe(false);
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Test", timestamp: new Date() },
      ];

      const result = await extractor.extractFromConversation(messages);

      expect(result.facts).toHaveLength(0);
    });

    it("should handle malformed JSON gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: "not valid json",
        }),
      });

      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Test", timestamp: new Date() },
      ];

      const result = await extractor.extractFromConversation(messages);

      expect(result.facts).toHaveLength(0);
    });
  });

  describe("extractAndSave", () => {
    it("should extract and save memories", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            facts: [
              {
                content: "User is a developer",
                summary: "Developer",
                confidence: 0.9,
                source: "explicit",
                tags: ["occupation"],
              },
            ],
            preferences: [
              {
                content: "Likes TypeScript",
                summary: "TypeScript fan",
                confidence: 0.8,
                source: "explicit",
                tags: ["programming"],
              },
            ],
            events: [],
            relationships: [],
            emotions: [],
            shouldUpdateProfile: false,
          }),
        }),
      });

      const messages: Message[] = [
        {
          id: "msg-1",
          role: "user",
          content: "我是程序员，喜欢用TypeScript",
          timestamp: new Date(),
        },
      ];

      const saved = await extractor.extractAndSave(messages, "test-context");

      expect(saved.length).toBe(2);
      expect(mockLongTermMemory.addMemory).toHaveBeenCalledTimes(2);
    });

    it("should update profile when needed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            facts: [],
            preferences: [],
            events: [],
            relationships: [],
            emotions: [],
            shouldUpdateProfile: true,
            profileUpdates: { name: "张三", nickname: "小张" },
          }),
        }),
      });

      const messages: Message[] = [
        {
          id: "msg-1",
          role: "user",
          content: "我叫张三，朋友都叫我小张",
          timestamp: new Date(),
        },
      ];

      await extractor.extractAndSave(messages);

      expect(mockLongTermMemory.updateProfile).toHaveBeenCalledWith({
        name: "张三",
        nickname: "小张",
      });
    });

    it("should save all memory types", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            facts: [
              {
                content: "Fact",
                summary: "F",
                confidence: 0.9,
                source: "explicit",
                tags: [],
              },
            ],
            preferences: [
              {
                content: "Pref",
                summary: "P",
                confidence: 0.8,
                source: "explicit",
                tags: [],
              },
            ],
            events: [
              {
                content: "Event",
                summary: "E",
                confidence: 0.7,
                source: "explicit",
                tags: [],
              },
            ],
            relationships: [
              {
                content: "Rel",
                summary: "R",
                confidence: 0.8,
                source: "explicit",
                tags: [],
              },
            ],
            emotions: [
              {
                content: "Emo",
                summary: "Em",
                confidence: 0.7,
                source: "inferred",
                tags: [],
              },
            ],
            shouldUpdateProfile: false,
          }),
        }),
      });

      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Test", timestamp: new Date() },
      ];

      const saved = await extractor.extractAndSave(messages);

      // 5 memories should be saved (one of each type)
      expect(mockLongTermMemory.addMemory).toHaveBeenCalledTimes(5);
      expect(saved.length).toBe(5);
    });

    it("should not update profile when not needed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: JSON.stringify({
            facts: [],
            preferences: [],
            events: [],
            relationships: [],
            emotions: [],
            shouldUpdateProfile: false,
          }),
        }),
      });

      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Hi", timestamp: new Date() },
      ];

      await extractor.extractAndSave(messages);

      expect(mockLongTermMemory.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe("createMemoryExtractor", () => {
    it("should create extractor via factory function", () => {
      const ext = createMemoryExtractor(mockLongTermMemory as any);
      expect(ext).toBeInstanceOf(MemoryExtractor);
    });

    it("should pass config to extractor", () => {
      const ext = createMemoryExtractor(mockLongTermMemory as any, {
        provider: "anthropic",
        minConfidence: 0.7,
      });
      expect(ext).toBeInstanceOf(MemoryExtractor);
    });
  });
});
