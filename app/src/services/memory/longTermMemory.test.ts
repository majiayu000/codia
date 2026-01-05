import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  LongTermMemory,
  getLongTermMemory,
  resetLongTermMemory,
} from "./longTermMemory";
import type { UserProfile, MemoryEntry } from "./types";

// Mock the storage module
vi.mock("../storage", () => {
  const memories = new Map<string, MemoryEntry>();
  const profiles = new Map<string, UserProfile>();

  return {
    saveMemory: vi.fn(async (memory: MemoryEntry) => {
      memories.set(memory.id, memory);
    }),
    saveMemories: vi.fn(async (newMemories: MemoryEntry[]) => {
      for (const m of newMemories) {
        memories.set(m.id, m);
      }
    }),
    getMemoriesByUser: vi.fn(async (userId: string) => {
      return Array.from(memories.values()).filter((m) => m.userId === userId);
    }),
    getMemoriesByType: vi.fn(async (userId: string, type: string) => {
      return Array.from(memories.values()).filter(
        (m) => m.userId === userId && m.type === type
      );
    }),
    getRecentMemories: vi.fn(async (userId: string, limit: number) => {
      return Array.from(memories.values())
        .filter((m) => m.userId === userId)
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, limit);
    }),
    searchMemories: vi.fn(
      async (
        userId: string,
        query: string,
        options: { types?: string[]; minConfidence?: number; limit?: number }
      ) => {
        let results = Array.from(memories.values()).filter(
          (m) => m.userId === userId
        );

        if (options.types?.length) {
          results = results.filter((m) => options.types!.includes(m.type));
        }

        if (options.minConfidence !== undefined) {
          results = results.filter((m) => m.confidence >= options.minConfidence!);
        }

        const lowerQuery = query.toLowerCase();
        results = results.filter(
          (m) =>
            m.content.toLowerCase().includes(lowerQuery) ||
            m.summary.toLowerCase().includes(lowerQuery)
        );

        if (options.limit) {
          results = results.slice(0, options.limit);
        }

        return results;
      }
    ),
    updateMemoryAccess: vi.fn(async (id: string) => {
      const memory = memories.get(id);
      if (memory) {
        memory.lastAccessed = new Date();
        memory.accessCount += 1;
      }
    }),
    deleteMemory: vi.fn(async (id: string) => {
      memories.delete(id);
    }),
    deleteMemoriesByUser: vi.fn(async (userId: string) => {
      for (const [id, m] of memories) {
        if (m.userId === userId) {
          memories.delete(id);
        }
      }
    }),
    saveUserProfile: vi.fn(async (profile: UserProfile) => {
      profiles.set(profile.id, profile);
    }),
    getUserProfile: vi.fn(async (id: string) => {
      return profiles.get(id);
    }),
    getDefaultUserProfile: vi.fn(async () => {
      return profiles.get("default");
    }),
    // Expose for test cleanup
    __memories: memories,
    __profiles: profiles,
  };
});

import * as storage from "../storage";

describe("LongTermMemory", () => {
  let memory: LongTermMemory;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock storage
    (storage as any).__memories.clear();
    (storage as any).__profiles.clear();
    resetLongTermMemory();
    memory = new LongTermMemory("test-user");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create with default user ID", () => {
      const mem = new LongTermMemory();
      expect(mem).toBeDefined();
    });

    it("should create with custom user ID", () => {
      const mem = new LongTermMemory("custom-user");
      expect(mem).toBeDefined();
    });
  });

  describe("getProfile", () => {
    it("should create default profile if none exists", async () => {
      const profile = await memory.getProfile();

      expect(profile).toBeDefined();
      expect(profile.id).toBe("test-user");
      expect(profile.preferences).toBeDefined();
      expect(profile.personalInfo).toBeDefined();
      expect(storage.saveUserProfile).toHaveBeenCalled();
    });

    it("should return existing profile", async () => {
      const existingProfile: UserProfile = {
        id: "test-user",
        name: "Test User",
        preferences: {
          favoriteTopics: ["coding"],
          avoidTopics: [],
          responseLength: "moderate",
          formalityLevel: "casual",
          humorAppreciation: 0.7,
        },
        personalInfo: {
          occupation: "Developer",
          hobbies: [],
          importantDates: [],
          relationships: [],
        },
        communicationStyle: {
          preferredLanguage: "en",
          usesEmoji: true,
          messageLength: "medium",
          formality: "casual",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (storage as any).__profiles.set("test-user", existingProfile);

      const profile = await memory.getProfile();
      expect(profile.name).toBe("Test User");
      expect(profile.personalInfo.occupation).toBe("Developer");
    });

    it("should cache profile after first fetch", async () => {
      await memory.getProfile();
      await memory.getProfile();

      // getUserProfile should only be called once due to caching
      expect(storage.getUserProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateProfile", () => {
    it("should update profile fields", async () => {
      await memory.getProfile(); // Create initial profile

      const updated = await memory.updateProfile({
        name: "New Name",
        nickname: "Nick",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.nickname).toBe("Nick");
      expect(storage.saveUserProfile).toHaveBeenCalled();
    });

    it("should preserve unchanged fields", async () => {
      const profile = await memory.getProfile();
      const originalPreferences = { ...profile.preferences };

      await memory.updateProfile({ name: "New Name" });

      const updated = await memory.getProfile();
      expect(updated.preferences).toEqual(originalPreferences);
    });

    it("should update the updatedAt timestamp", async () => {
      await memory.getProfile();

      const before = new Date();
      await new Promise((r) => setTimeout(r, 10));
      const updated = await memory.updateProfile({ name: "New" });

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe("updatePreferences", () => {
    it("should update preferences", async () => {
      await memory.getProfile();

      const updated = await memory.updatePreferences({
        favoriteTopics: ["AI", "Music"],
        humorAppreciation: 0.9,
      });

      expect(updated.preferences.favoriteTopics).toEqual(["AI", "Music"]);
      expect(updated.preferences.humorAppreciation).toBe(0.9);
    });
  });

  describe("updatePersonalInfo", () => {
    it("should update personal info", async () => {
      await memory.getProfile();

      const updated = await memory.updatePersonalInfo({
        occupation: "Engineer",
        hobbies: ["Reading", "Gaming"],
      });

      expect(updated.personalInfo.occupation).toBe("Engineer");
      expect(updated.personalInfo.hobbies).toEqual(["Reading", "Gaming"]);
    });
  });

  describe("addMemory", () => {
    it("should add a memory entry", async () => {
      const entry = await memory.addMemory({
        type: "fact",
        content: "User is a software developer",
        summary: "Developer",
        confidence: 0.9,
        source: "explicit",
        context: "conversation",
      });

      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe("test-user");
      expect(entry.type).toBe("fact");
      expect(entry.content).toBe("User is a software developer");
      expect(storage.saveMemory).toHaveBeenCalled();
    });

    it("should clamp confidence between 0 and 1", async () => {
      const entry1 = await memory.addMemory({
        type: "fact",
        content: "Test",
        summary: "Test",
        confidence: 1.5,
        source: "explicit",
        context: "test",
      });

      const entry2 = await memory.addMemory({
        type: "fact",
        content: "Test 2",
        summary: "Test 2",
        confidence: -0.5,
        source: "explicit",
        context: "test",
      });

      expect(entry1.confidence).toBe(1);
      expect(entry2.confidence).toBe(0);
    });

    it("should set timestamps correctly", async () => {
      const before = new Date();
      const entry = await memory.addMemory({
        type: "fact",
        content: "Test",
        summary: "Test",
        confidence: 0.8,
        source: "explicit",
        context: "test",
      });

      expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.lastAccessed.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.accessCount).toBe(0);
    });

    it("should include optional fields", async () => {
      const entry = await memory.addMemory({
        type: "preference",
        content: "Likes coffee",
        summary: "Coffee lover",
        confidence: 0.8,
        source: "inferred",
        context: "morning chat",
        tags: ["food", "drinks"],
        emotionalContext: "happy",
        expiresAt: new Date("2025-12-31"),
      });

      expect(entry.tags).toEqual(["food", "drinks"]);
      expect(entry.emotionalContext).toBe("happy");
      expect(entry.expiresAt).toEqual(new Date("2025-12-31"));
    });
  });

  describe("addMemories", () => {
    it("should add multiple memories at once", async () => {
      const entries = await memory.addMemories([
        {
          type: "fact",
          content: "Fact 1",
          summary: "F1",
          confidence: 0.9,
          source: "explicit",
          context: "test",
        },
        {
          type: "preference",
          content: "Preference 1",
          summary: "P1",
          confidence: 0.8,
          source: "inferred",
          context: "test",
        },
      ]);

      expect(entries).toHaveLength(2);
      expect(storage.saveMemories).toHaveBeenCalled();
    });
  });

  describe("getAllMemories", () => {
    it("should return all memories for user", async () => {
      await memory.addMemory({
        type: "fact",
        content: "Memory 1",
        summary: "M1",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      await memory.addMemory({
        type: "fact",
        content: "Memory 2",
        summary: "M2",
        confidence: 0.8,
        source: "explicit",
        context: "test",
      });

      const all = await memory.getAllMemories();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getByType", () => {
    it("should filter memories by type", async () => {
      await memory.addMemory({
        type: "fact",
        content: "Fact",
        summary: "F",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      await memory.addMemory({
        type: "preference",
        content: "Preference",
        summary: "P",
        confidence: 0.8,
        source: "explicit",
        context: "test",
      });

      const facts = await memory.getByType("fact");
      expect(facts.every((m) => m.type === "fact")).toBe(true);
    });
  });

  describe("getRecent", () => {
    it("should return recent memories", async () => {
      for (let i = 0; i < 5; i++) {
        await memory.addMemory({
          type: "fact",
          content: `Memory ${i}`,
          summary: `M${i}`,
          confidence: 0.8,
          source: "explicit",
          context: "test",
        });
      }

      const recent = await memory.getRecent(3);
      expect(recent).toHaveLength(3);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await memory.addMemory({
        type: "fact",
        content: "User likes programming in TypeScript",
        summary: "TypeScript fan",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      await memory.addMemory({
        type: "preference",
        content: "Prefers dark mode in all apps",
        summary: "Dark mode",
        confidence: 0.8,
        source: "inferred",
        context: "test",
      });
    });

    it("should search memories by content", async () => {
      const results = await memory.search("TypeScript");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((m) => m.content.includes("TypeScript"))).toBe(true);
    });

    it("should filter by types", async () => {
      const results = await memory.search("", { types: ["preference"] });
      expect(results.every((m) => m.type === "preference")).toBe(true);
    });

    it("should filter by confidence", async () => {
      const results = await memory.search("", { minConfidence: 0.85 });
      expect(results.every((m) => m.confidence >= 0.85)).toBe(true);
    });

    it("should limit results", async () => {
      const results = await memory.search("", { limit: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe("query", () => {
    it("should query with advanced options", async () => {
      await memory.addMemory({
        type: "fact",
        content: "Test memory",
        summary: "Test",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      const result = await memory.query({
        types: ["fact"],
        minConfidence: 0.8,
        limit: 5,
      });

      expect(result.memories).toBeDefined();
      expect(result.totalCount).toBeDefined();
    });
  });

  describe("markAccessed", () => {
    it("should update access time and count", async () => {
      const entry = await memory.addMemory({
        type: "fact",
        content: "Test",
        summary: "T",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      await memory.markAccessed(entry.id);
      expect(storage.updateMemoryAccess).toHaveBeenCalledWith(entry.id);
    });
  });

  describe("delete", () => {
    it("should delete a memory", async () => {
      const entry = await memory.addMemory({
        type: "fact",
        content: "To delete",
        summary: "Delete me",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      await memory.delete(entry.id);
      expect(storage.deleteMemory).toHaveBeenCalledWith(entry.id);
    });
  });

  describe("deleteAll", () => {
    it("should delete all memories for user", async () => {
      await memory.addMemory({
        type: "fact",
        content: "Memory 1",
        summary: "M1",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      await memory.deleteAll();
      expect(storage.deleteMemoriesByUser).toHaveBeenCalledWith("test-user");
    });
  });

  describe("generateContext", () => {
    it("should generate memory context", async () => {
      await memory.addMemory({
        type: "fact",
        content: "User is a developer",
        summary: "Developer",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      const context = await memory.generateContext();

      expect(context.userProfile).toBeDefined();
      expect(context.recentMemories).toBeDefined();
      expect(context.relevantMemories).toBeDefined();
      expect(context.shortTermSummary).toBeDefined();
    });

    it("should include relevant memories when query provided", async () => {
      await memory.addMemory({
        type: "fact",
        content: "User likes coding",
        summary: "Coder",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      const context = await memory.generateContext("coding");

      expect(context.relevantMemories).toBeDefined();
    });
  });

  describe("formatForSystemPrompt", () => {
    it("should format context for system prompt", async () => {
      await memory.updateProfile({ name: "Test User" });
      await memory.addMemory({
        type: "fact",
        content: "Developer",
        summary: "Dev",
        confidence: 0.9,
        source: "explicit",
        context: "test",
      });

      const prompt = await memory.formatForSystemPrompt();

      expect(typeof prompt).toBe("string");
    });
  });

  describe("clearCache", () => {
    it("should clear internal cache", async () => {
      await memory.getProfile();
      memory.clearCache();

      // After clearing cache, should fetch from storage again
      await memory.getProfile();
      expect(storage.getUserProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe("singleton", () => {
    it("should return same instance for default user", () => {
      const instance1 = getLongTermMemory();
      const instance2 = getLongTermMemory();
      expect(instance1).toBe(instance2);
    });

    it("should return new instance for custom user", () => {
      const defaultInstance = getLongTermMemory();
      const customInstance = getLongTermMemory("custom-user");
      expect(defaultInstance).not.toBe(customInstance);
    });

    it("should reset singleton", () => {
      const instance1 = getLongTermMemory();
      resetLongTermMemory();
      const instance2 = getLongTermMemory();
      expect(instance1).not.toBe(instance2);
    });
  });
});
