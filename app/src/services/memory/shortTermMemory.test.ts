import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ShortTermMemory,
  getShortTermMemory,
  resetShortTermMemory,
} from "./shortTermMemory";
import type { Message } from "@/store/types";

describe("ShortTermMemory", () => {
  let memory: ShortTermMemory;

  beforeEach(() => {
    memory = new ShortTermMemory();
    resetShortTermMemory();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const mem = new ShortTermMemory();
      expect(mem.size).toBe(0);
    });

    it("should create with custom config", () => {
      const mem = new ShortTermMemory({
        maxEntries: 10,
        importanceThreshold: 0.5,
      });
      expect(mem.size).toBe(0);
    });
  });

  describe("add", () => {
    it("should add a message to memory", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "Hello, how are you?",
        timestamp: new Date(),
      };

      memory.add(message);
      expect(memory.size).toBe(1);
    });

    it("should add message with custom importance", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "Important message",
        timestamp: new Date(),
      };

      memory.add(message, 0.9);
      const entries = memory.getAll();
      expect(entries[0].importance).toBe(0.9);
    });

    it("should preserve emotion from message", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "I am so happy!",
        timestamp: new Date(),
        emotion: "happy",
      };

      memory.add(message);
      const entries = memory.getAll();
      expect(entries[0].emotionalContext).toBe("happy");
    });

    it("should trim when exceeding maxEntries", () => {
      const smallMemory = new ShortTermMemory({ maxEntries: 3 });

      for (let i = 0; i < 5; i++) {
        smallMemory.add({
          id: `msg-${i}`,
          role: "user",
          content: `Message ${i}`,
          timestamp: new Date(Date.now() + i * 1000),
        });
      }

      expect(smallMemory.size).toBe(3);
    });

    it("should keep important entries when trimming", () => {
      const smallMemory = new ShortTermMemory({ maxEntries: 3 });

      // Add low importance message
      smallMemory.add(
        {
          id: "msg-low",
          role: "user",
          content: "Low importance",
          timestamp: new Date(Date.now()),
        },
        0.1
      );

      // Add high importance message
      smallMemory.add(
        {
          id: "msg-high",
          role: "user",
          content: "High importance",
          timestamp: new Date(Date.now() + 1000),
        },
        0.9
      );

      // Add more messages to trigger trim
      smallMemory.add(
        {
          id: "msg-3",
          role: "user",
          content: "Message 3",
          timestamp: new Date(Date.now() + 2000),
        },
        0.5
      );

      smallMemory.add(
        {
          id: "msg-4",
          role: "user",
          content: "Message 4",
          timestamp: new Date(Date.now() + 3000),
        },
        0.5
      );

      const entries = smallMemory.getAll();
      const ids = entries.map((e) => e.id);

      // High importance should be kept
      expect(ids).toContain("msg-high");
    });
  });

  describe("addBatch", () => {
    it("should add multiple messages at once", () => {
      const messages: Message[] = [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
        {
          id: "msg-2",
          role: "assistant",
          content: "Hi there",
          timestamp: new Date(),
        },
        {
          id: "msg-3",
          role: "user",
          content: "How are you?",
          timestamp: new Date(),
        },
      ];

      memory.addBatch(messages);
      expect(memory.size).toBe(3);
    });
  });

  describe("updateImportance", () => {
    it("should update importance of an entry", () => {
      memory.add({
        id: "msg-1",
        role: "user",
        content: "Test",
        timestamp: new Date(),
      });

      memory.updateImportance("msg-1", 0.8);
      const entries = memory.getAll();
      expect(entries[0].importance).toBe(0.8);
    });

    it("should clamp importance between 0 and 1", () => {
      memory.add({
        id: "msg-1",
        role: "user",
        content: "Test",
        timestamp: new Date(),
      });

      memory.updateImportance("msg-1", 1.5);
      let entries = memory.getAll();
      expect(entries[0].importance).toBe(1);

      memory.updateImportance("msg-1", -0.5);
      entries = memory.getAll();
      expect(entries[0].importance).toBe(0);
    });

    it("should do nothing for non-existent entry", () => {
      memory.updateImportance("non-existent", 0.5);
      expect(memory.size).toBe(0);
    });
  });

  describe("addExtractedInfo", () => {
    it("should add extracted info to an entry", () => {
      memory.add({
        id: "msg-1",
        role: "user",
        content: "My name is John",
        timestamp: new Date(),
      });

      memory.addExtractedInfo("msg-1", [
        { type: "fact", content: "User name is John", confidence: 0.9 },
      ]);

      const entries = memory.getAll();
      expect(entries[0].extractedInfo).toHaveLength(1);
      expect(entries[0].extractedInfo![0].content).toBe("User name is John");
    });

    it("should append to existing extracted info", () => {
      memory.add({
        id: "msg-1",
        role: "user",
        content: "My name is John and I like coding",
        timestamp: new Date(),
      });

      memory.addExtractedInfo("msg-1", [
        { type: "fact", content: "User name is John", confidence: 0.9 },
      ]);

      memory.addExtractedInfo("msg-1", [
        { type: "preference", content: "User likes coding", confidence: 0.8 },
      ]);

      const entries = memory.getAll();
      expect(entries[0].extractedInfo).toHaveLength(2);
    });
  });

  describe("getByRole", () => {
    beforeEach(() => {
      memory.add({
        id: "msg-1",
        role: "user",
        content: "User message 1",
        timestamp: new Date(),
      });
      memory.add({
        id: "msg-2",
        role: "assistant",
        content: "Assistant message",
        timestamp: new Date(),
      });
      memory.add({
        id: "msg-3",
        role: "user",
        content: "User message 2",
        timestamp: new Date(),
      });
    });

    it("should return entries by user role", () => {
      const userEntries = memory.getByRole("user");
      expect(userEntries).toHaveLength(2);
      userEntries.forEach((e) => expect(e.role).toBe("user"));
    });

    it("should return entries by assistant role", () => {
      const assistantEntries = memory.getByRole("assistant");
      expect(assistantEntries).toHaveLength(1);
      expect(assistantEntries[0].role).toBe("assistant");
    });
  });

  describe("getRecent", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        memory.add({
          id: `msg-${i}`,
          role: "user",
          content: `Message ${i}`,
          timestamp: new Date(Date.now() + i * 1000),
        });
      }
    });

    it("should return last N entries", () => {
      const recent = memory.getRecent(3);
      expect(recent).toHaveLength(3);
      expect(recent[0].id).toBe("msg-7");
      expect(recent[2].id).toBe("msg-9");
    });

    it("should return all entries if count exceeds size", () => {
      const recent = memory.getRecent(20);
      expect(recent).toHaveLength(10);
    });
  });

  describe("getImportant", () => {
    it("should return entries above threshold", () => {
      const mem = new ShortTermMemory({ importanceThreshold: 0.5 });

      mem.add(
        { id: "msg-1", role: "user", content: "Low", timestamp: new Date() },
        0.3
      );
      mem.add(
        { id: "msg-2", role: "user", content: "High", timestamp: new Date() },
        0.7
      );
      mem.add(
        { id: "msg-3", role: "user", content: "Medium", timestamp: new Date() },
        0.5
      );

      const important = mem.getImportant();
      expect(important).toHaveLength(2);
      expect(important.every((e) => e.importance >= 0.5)).toBe(true);
    });
  });

  describe("getWithExtractedInfo", () => {
    it("should return only entries with extracted info", () => {
      memory.add({
        id: "msg-1",
        role: "user",
        content: "No info",
        timestamp: new Date(),
      });
      memory.add({
        id: "msg-2",
        role: "user",
        content: "Has info",
        timestamp: new Date(),
      });

      memory.addExtractedInfo("msg-2", [
        { type: "fact", content: "Some fact", confidence: 0.8 },
      ]);

      const withInfo = memory.getWithExtractedInfo();
      expect(withInfo).toHaveLength(1);
      expect(withInfo[0].id).toBe("msg-2");
    });
  });

  describe("generateSummary", () => {
    it("should return empty string for empty memory", () => {
      const summary = memory.generateSummary();
      expect(summary).toBe("");
    });

    it("should generate summary from entries", () => {
      memory.add(
        {
          id: "msg-1",
          role: "user",
          content: "Hello there!",
          timestamp: new Date(),
        },
        0.8
      );

      const summary = memory.generateSummary();
      expect(summary).toContain("User:");
      expect(summary).toContain("Hello there!");
    });

    it("should include emotion labels in summary", () => {
      memory.add(
        {
          id: "msg-1",
          role: "user",
          content: "I am happy!",
          timestamp: new Date(),
          emotion: "happy",
        },
        0.8
      );

      const summary = memory.generateSummary();
      expect(summary).toContain("[happy]");
    });

    it("should truncate long content", () => {
      const longContent = "A".repeat(200);
      memory.add(
        {
          id: "msg-1",
          role: "user",
          content: longContent,
          timestamp: new Date(),
        },
        0.8
      );

      const summary = memory.generateSummary();
      expect(summary).toContain("...");
      expect(summary.length).toBeLessThan(longContent.length + 100);
    });
  });

  describe("generateContext", () => {
    it("should return empty string for empty memory", () => {
      const context = memory.generateContext();
      expect(context).toBe("");
    });

    it("should include header in context", () => {
      memory.add(
        {
          id: "msg-1",
          role: "user",
          content: "Test",
          timestamp: new Date(),
        },
        0.8
      );

      const context = memory.generateContext();
      expect(context).toContain("## Short-term Memory");
    });
  });

  describe("getEmotionalTrend", () => {
    it("should return neutral for empty memory", () => {
      const trend = memory.getEmotionalTrend();
      expect(trend.trend).toBe("neutral");
      expect(trend.dominantEmotion).toBeUndefined();
    });

    it("should detect positive trend", () => {
      for (let i = 0; i < 5; i++) {
        memory.add({
          id: `msg-${i}`,
          role: "user",
          content: "Happy message",
          timestamp: new Date(),
          emotion: "happy",
        });
      }

      const trend = memory.getEmotionalTrend();
      expect(trend.trend).toBe("positive");
      expect(trend.dominantEmotion).toBe("happy");
    });

    it("should detect negative trend", () => {
      for (let i = 0; i < 5; i++) {
        memory.add({
          id: `msg-${i}`,
          role: "user",
          content: "Sad message",
          timestamp: new Date(),
          emotion: "sad",
        });
      }

      const trend = memory.getEmotionalTrend();
      expect(trend.trend).toBe("negative");
    });

    it("should detect mixed trend", () => {
      memory.add({
        id: "msg-1",
        role: "user",
        content: "Happy",
        timestamp: new Date(),
        emotion: "happy",
      });
      memory.add({
        id: "msg-2",
        role: "user",
        content: "Sad",
        timestamp: new Date(),
        emotion: "sad",
      });

      const trend = memory.getEmotionalTrend();
      expect(trend.trend).toBe("mixed");
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      memory.add({
        id: "msg-1",
        role: "user",
        content: "Test",
        timestamp: new Date(),
      });
      memory.add({
        id: "msg-2",
        role: "user",
        content: "Test 2",
        timestamp: new Date(),
      });

      expect(memory.size).toBe(2);
      memory.clear();
      expect(memory.size).toBe(0);
    });
  });

  describe("singleton", () => {
    it("should return the same instance", () => {
      const instance1 = getShortTermMemory();
      const instance2 = getShortTermMemory();
      expect(instance1).toBe(instance2);
    });

    it("should reset singleton instance", () => {
      const instance1 = getShortTermMemory();
      instance1.add({
        id: "msg-1",
        role: "user",
        content: "Test",
        timestamp: new Date(),
      });

      resetShortTermMemory();
      const instance2 = getShortTermMemory();

      expect(instance2.size).toBe(0);
      expect(instance1).not.toBe(instance2);
    });
  });
});
