/**
 * Long-term Memory Service
 * 长期记忆服务 - 管理持久化的用户记忆
 */

import type {
  MemoryEntry,
  MemoryType,
  MemorySource,
  UserProfile,
  MemoryQuery,
  MemoryQueryResult,
  MemoryContext,
  DEFAULT_USER_PROFILE,
} from "./types";
import {
  saveMemory,
  saveMemories,
  getMemoriesByUser,
  getMemoriesByType,
  getRecentMemories,
  searchMemories,
  updateMemoryAccess,
  deleteMemory,
  deleteMemoriesByUser,
  saveUserProfile,
  getUserProfile,
  getDefaultUserProfile,
} from "../storage";
import type { BasicExpression } from "../expression";

const DEFAULT_USER_ID = "default";

export class LongTermMemory {
  private userId: string;
  private cache: Map<string, MemoryEntry> = new Map();
  private profileCache: UserProfile | null = null;

  constructor(userId: string = DEFAULT_USER_ID) {
    this.userId = userId;
  }

  // ================== User Profile Operations ==================

  /**
   * Get or create user profile
   */
  async getProfile(): Promise<UserProfile> {
    if (this.profileCache) {
      return this.profileCache;
    }

    let profile = await getUserProfile(this.userId);

    if (!profile) {
      profile = this.createDefaultProfile();
      await saveUserProfile(profile);
    }

    this.profileCache = profile;
    return profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const profile = await this.getProfile();

    const updatedProfile: UserProfile = {
      ...profile,
      ...updates,
      id: profile.id, // Ensure ID is not changed
      updatedAt: new Date(),
    };

    await saveUserProfile(updatedProfile);
    this.profileCache = updatedProfile;

    return updatedProfile;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    preferences: Partial<UserProfile["preferences"]>
  ): Promise<UserProfile> {
    const profile = await this.getProfile();

    return this.updateProfile({
      preferences: {
        ...profile.preferences,
        ...preferences,
      },
    });
  }

  /**
   * Update personal info
   */
  async updatePersonalInfo(
    info: Partial<UserProfile["personalInfo"]>
  ): Promise<UserProfile> {
    const profile = await this.getProfile();

    return this.updateProfile({
      personalInfo: {
        ...profile.personalInfo,
        ...info,
      },
    });
  }

  // ================== Memory Operations ==================

  /**
   * Add a new memory
   */
  async addMemory(params: {
    type: MemoryType;
    content: string;
    summary: string;
    confidence: number;
    source: MemorySource;
    context: string;
    tags?: string[];
    emotionalContext?: BasicExpression;
    expiresAt?: Date;
  }): Promise<MemoryEntry> {
    const memory: MemoryEntry = {
      id: crypto.randomUUID(),
      userId: this.userId,
      type: params.type,
      content: params.content,
      summary: params.summary,
      confidence: Math.max(0, Math.min(1, params.confidence)),
      source: params.source,
      context: params.context,
      tags: params.tags || [],
      emotionalContext: params.emotionalContext,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      expiresAt: params.expiresAt,
    };

    await saveMemory(memory);
    this.cache.set(memory.id, memory);

    return memory;
  }

  /**
   * Add multiple memories at once
   */
  async addMemories(
    memories: Array<Omit<Parameters<typeof this.addMemory>[0], never>>
  ): Promise<MemoryEntry[]> {
    const entries: MemoryEntry[] = memories.map((params) => ({
      id: crypto.randomUUID(),
      userId: this.userId,
      type: params.type,
      content: params.content,
      summary: params.summary,
      confidence: Math.max(0, Math.min(1, params.confidence)),
      source: params.source,
      context: params.context,
      tags: params.tags || [],
      emotionalContext: params.emotionalContext,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      expiresAt: params.expiresAt,
    }));

    await saveMemories(entries);

    for (const entry of entries) {
      this.cache.set(entry.id, entry);
    }

    return entries;
  }

  /**
   * Get all memories for this user
   */
  async getAllMemories(): Promise<MemoryEntry[]> {
    return getMemoriesByUser(this.userId);
  }

  /**
   * Get memories by type
   */
  async getByType(type: MemoryType): Promise<MemoryEntry[]> {
    return getMemoriesByType(this.userId, type);
  }

  /**
   * Get recent memories
   */
  async getRecent(limit: number = 10): Promise<MemoryEntry[]> {
    return getRecentMemories(this.userId, limit);
  }

  /**
   * Search memories
   */
  async search(
    query: string,
    options: {
      types?: MemoryType[];
      minConfidence?: number;
      limit?: number;
    } = {}
  ): Promise<MemoryEntry[]> {
    return searchMemories(this.userId, query, options);
  }

  /**
   * Query memories with advanced options
   */
  async query(params: Omit<MemoryQuery, "userId">): Promise<MemoryQueryResult> {
    let memories = await this.getAllMemories();

    // Filter by types
    if (params.types?.length) {
      memories = memories.filter((m) => params.types!.includes(m.type));
    }

    // Filter by confidence
    if (params.minConfidence !== undefined) {
      memories = memories.filter((m) => m.confidence >= params.minConfidence!);
    }

    // Filter expired (unless included)
    if (!params.includeExpired) {
      const now = new Date();
      memories = memories.filter((m) => !m.expiresAt || m.expiresAt > now);
    }

    // Text search
    if (params.query) {
      const lowerQuery = params.query.toLowerCase();
      memories = memories.filter(
        (m) =>
          m.content.toLowerCase().includes(lowerQuery) ||
          m.summary.toLowerCase().includes(lowerQuery) ||
          m.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    const totalCount = memories.length;

    // Apply limit
    if (params.limit) {
      memories = memories.slice(0, params.limit);
    }

    return {
      memories,
      totalCount,
    };
  }

  /**
   * Mark a memory as accessed
   */
  async markAccessed(id: string): Promise<void> {
    await updateMemoryAccess(id);

    // Update cache if exists
    const cached = this.cache.get(id);
    if (cached) {
      cached.lastAccessed = new Date();
      cached.accessCount += 1;
    }
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<void> {
    await deleteMemory(id);
    this.cache.delete(id);
  }

  /**
   * Delete all memories for this user
   */
  async deleteAll(): Promise<void> {
    await deleteMemoriesByUser(this.userId);
    this.cache.clear();
  }

  /**
   * Update memory confidence
   */
  async updateConfidence(id: string, confidence: number): Promise<void> {
    const memories = await this.getAllMemories();
    const memory = memories.find((m) => m.id === id);

    if (memory) {
      memory.confidence = Math.max(0, Math.min(1, confidence));
      await saveMemory(memory);
      this.cache.set(id, memory);
    }
  }

  // ================== Context Generation ==================

  /**
   * Generate memory context for LLM
   */
  async generateContext(
    currentQuery?: string,
    options: {
      maxMemories?: number;
      includeProfile?: boolean;
    } = {}
  ): Promise<MemoryContext> {
    const { maxMemories = 10, includeProfile = true } = options;

    const [profile, recentMemories] = await Promise.all([
      includeProfile ? this.getProfile() : null,
      this.getRecent(maxMemories),
    ]);

    // Get relevant memories if query provided
    let relevantMemories: MemoryEntry[] = [];
    if (currentQuery) {
      relevantMemories = await this.search(currentQuery, {
        limit: 5,
        minConfidence: 0.5,
      });
    }

    // Generate short-term summary
    const shortTermSummary = this.formatMemoriesForContext(
      recentMemories.slice(0, 5)
    );

    return {
      userProfile: profile,
      recentMemories,
      relevantMemories,
      shortTermSummary,
    };
  }

  /**
   * Format memory context for LLM system prompt
   */
  async formatForSystemPrompt(currentQuery?: string): Promise<string> {
    const context = await this.generateContext(currentQuery);
    const lines: string[] = [];

    // User profile section
    if (context.userProfile) {
      lines.push("## User Information");

      if (context.userProfile.name) {
        lines.push(`Name: ${context.userProfile.name}`);
      }
      if (context.userProfile.nickname) {
        lines.push(`Nickname: ${context.userProfile.nickname}`);
      }

      const { personalInfo, preferences } = context.userProfile;

      if (personalInfo.occupation) {
        lines.push(`Occupation: ${personalInfo.occupation}`);
      }
      if (personalInfo.hobbies?.length) {
        lines.push(`Hobbies: ${personalInfo.hobbies.join(", ")}`);
      }
      if (preferences.favoriteTopics.length) {
        lines.push(`Favorite topics: ${preferences.favoriteTopics.join(", ")}`);
      }
      if (preferences.avoidTopics.length) {
        lines.push(`Topics to avoid: ${preferences.avoidTopics.join(", ")}`);
      }

      lines.push("");
    }

    // Relevant memories section
    if (context.relevantMemories.length > 0) {
      lines.push("## Relevant Memories");
      for (const memory of context.relevantMemories) {
        lines.push(`- [${memory.type}] ${memory.summary}`);
      }
      lines.push("");
    }

    // Recent memories section
    if (context.recentMemories.length > 0) {
      lines.push("## Recent Memories");
      for (const memory of context.recentMemories.slice(0, 5)) {
        lines.push(`- [${memory.type}] ${memory.summary}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  // ================== Helper Methods ==================

  private createDefaultProfile(): UserProfile {
    return {
      id: this.userId,
      preferences: {
        favoriteTopics: [],
        avoidTopics: [],
        responseLength: "moderate",
        formalityLevel: "casual",
        humorAppreciation: 0.5,
      },
      personalInfo: {
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
  }

  private formatMemoriesForContext(memories: MemoryEntry[]): string {
    if (memories.length === 0) {
      return "";
    }

    return memories.map((m) => `[${m.type}] ${m.summary}`).join("\n");
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.profileCache = null;
  }
}

// Singleton instance for the default long-term memory
let defaultInstance: LongTermMemory | null = null;

export function getLongTermMemory(userId?: string): LongTermMemory {
  if (userId && userId !== DEFAULT_USER_ID) {
    return new LongTermMemory(userId);
  }

  if (!defaultInstance) {
    defaultInstance = new LongTermMemory();
  }
  return defaultInstance;
}

export function resetLongTermMemory(): void {
  defaultInstance = null;
}
