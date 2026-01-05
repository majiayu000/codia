/**
 * Short-term Memory Service
 * 短期记忆服务 - 管理会话级别的对话记忆
 */

import type { Message } from "@/store/types";
import type { BasicExpression } from "../expression";
import type {
  ShortTermMemoryEntry,
  ShortTermMemoryConfig,
  ExtractedInfo,
  DEFAULT_SHORT_TERM_CONFIG,
} from "./types";

export class ShortTermMemory {
  private entries: ShortTermMemoryEntry[] = [];
  private config: ShortTermMemoryConfig;

  constructor(config: Partial<ShortTermMemoryConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 20,
      importanceThreshold: config.importanceThreshold ?? 0.3,
    };
  }

  /**
   * Add a message to short-term memory
   */
  add(message: Message, importance: number = 0.5): void {
    const entry: ShortTermMemoryEntry = {
      id: message.id,
      content: message.content,
      role: message.role as "user" | "assistant",
      timestamp: message.timestamp,
      importance,
      emotionalContext: message.emotion,
    };

    this.entries.push(entry);

    // Trim to max entries, keeping the most important ones
    if (this.entries.length > this.config.maxEntries) {
      this.trim();
    }
  }

  /**
   * Add multiple messages at once
   */
  addBatch(messages: Message[]): void {
    for (const message of messages) {
      this.add(message);
    }
  }

  /**
   * Update importance score for an entry
   */
  updateImportance(id: string, importance: number): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      entry.importance = Math.max(0, Math.min(1, importance));
    }
  }

  /**
   * Add extracted info to an entry
   */
  addExtractedInfo(id: string, info: ExtractedInfo[]): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      entry.extractedInfo = [...(entry.extractedInfo || []), ...info];
    }
  }

  /**
   * Get all entries
   */
  getAll(): ShortTermMemoryEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries by role
   */
  getByRole(role: "user" | "assistant"): ShortTermMemoryEntry[] {
    return this.entries.filter((e) => e.role === role);
  }

  /**
   * Get recent entries
   */
  getRecent(count: number): ShortTermMemoryEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Get important entries (above threshold)
   */
  getImportant(): ShortTermMemoryEntry[] {
    return this.entries.filter((e) => e.importance >= this.config.importanceThreshold);
  }

  /**
   * Get entries with extracted info
   */
  getWithExtractedInfo(): ShortTermMemoryEntry[] {
    return this.entries.filter((e) => e.extractedInfo && e.extractedInfo.length > 0);
  }

  /**
   * Generate a summary of short-term memory for LLM context
   */
  generateSummary(): string {
    if (this.entries.length === 0) {
      return "";
    }

    const importantEntries = this.getImportant();
    const recentEntries = this.getRecent(5);

    // Combine and deduplicate
    const relevantEntries = [
      ...new Map([...importantEntries, ...recentEntries].map((e) => [e.id, e])).values(),
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (relevantEntries.length === 0) {
      return "";
    }

    const lines: string[] = ["Recent conversation highlights:"];

    for (const entry of relevantEntries) {
      const roleLabel = entry.role === "user" ? "User" : "AI";
      const emotionLabel = entry.emotionalContext ? ` [${entry.emotionalContext}]` : "";

      // Truncate long content
      const content =
        entry.content.length > 100
          ? entry.content.slice(0, 100) + "..."
          : entry.content;

      lines.push(`- ${roleLabel}${emotionLabel}: ${content}`);

      // Include extracted info if available
      if (entry.extractedInfo && entry.extractedInfo.length > 0) {
        for (const info of entry.extractedInfo) {
          lines.push(`  [${info.type}] ${info.content}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Generate context for LLM (formatted for system prompt)
   */
  generateContext(): string {
    const summary = this.generateSummary();
    if (!summary) {
      return "";
    }

    return `## Short-term Memory\n${summary}`;
  }

  /**
   * Get emotional trend from recent entries
   */
  getEmotionalTrend(): {
    trend: "positive" | "negative" | "neutral" | "mixed";
    dominantEmotion?: BasicExpression;
  } {
    const recentWithEmotion = this.entries
      .filter((e) => e.emotionalContext && e.role === "user")
      .slice(-5);

    if (recentWithEmotion.length === 0) {
      return { trend: "neutral" };
    }

    const emotionCounts: Record<string, number> = {};
    for (const entry of recentWithEmotion) {
      const emotion = entry.emotionalContext!;
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    }

    const positiveEmotions = ["happy", "relaxed"];
    const negativeEmotions = ["sad", "angry"];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const [emotion, count] of Object.entries(emotionCounts)) {
      if (positiveEmotions.includes(emotion)) positiveCount += count;
      if (negativeEmotions.includes(emotion)) negativeCount += count;
    }

    // Find dominant emotion
    const sortedEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
    const dominantEmotion = sortedEmotions[0]?.[0] as BasicExpression | undefined;

    // Determine trend
    let trend: "positive" | "negative" | "neutral" | "mixed";
    if (positiveCount > negativeCount * 2) {
      trend = "positive";
    } else if (negativeCount > positiveCount * 2) {
      trend = "negative";
    } else if (positiveCount > 0 && negativeCount > 0) {
      trend = "mixed";
    } else {
      trend = "neutral";
    }

    return { trend, dominantEmotion };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get the number of entries
   */
  get size(): number {
    return this.entries.length;
  }

  /**
   * Trim entries to max size, keeping important ones
   */
  private trim(): void {
    // Sort by importance (descending), then by timestamp (ascending for older)
    const sorted = [...this.entries].sort((a, b) => {
      // Keep important entries
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      // For same importance, keep newer ones
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Keep the top entries up to maxEntries
    this.entries = sorted.slice(0, this.config.maxEntries);

    // Re-sort by timestamp for chronological order
    this.entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

// Singleton instance for the default short-term memory
let defaultInstance: ShortTermMemory | null = null;

export function getShortTermMemory(): ShortTermMemory {
  if (!defaultInstance) {
    defaultInstance = new ShortTermMemory();
  }
  return defaultInstance;
}

export function resetShortTermMemory(): void {
  defaultInstance = null;
}
