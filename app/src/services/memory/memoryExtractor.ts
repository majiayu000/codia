/**
 * Memory Extractor Service
 * 记忆提取服务 - 使用 LLM 从对话中提取值得记住的信息
 */

import type { Message } from "@/store/types";
import type {
  MemoryExtractionResult,
  ExtractedMemory,
  UserProfile,
  MemoryEntry,
} from "./types";
import { LongTermMemory } from "./longTermMemory";

export interface MemoryExtractorConfig {
  provider: "openai" | "anthropic";
  minConfidence: number;
  batchSize: number;
}

const DEFAULT_CONFIG: MemoryExtractorConfig = {
  provider: "openai",
  minConfidence: 0.6,
  batchSize: 10,
};

const EXTRACTION_PROMPT = `你是一个记忆提取助手。分析以下对话，提取值得长期记住的信息。

## 对话内容
{conversation}

## 已有记忆
{existing_memories}

## 用户画像
{user_profile}

## 提取规则
1. **事实 (fact)**: 用户明确陈述的客观信息
   - 姓名、年龄、职业、居住地
   - 家庭情况、工作单位
   - 确定性的个人信息

2. **偏好 (preference)**: 用户的喜好和厌恶
   - 喜欢/不喜欢的事物
   - 兴趣爱好
   - 习惯和风格偏好

3. **事件 (event)**: 发生的重要事情
   - 重要日期（生日、纪念日）
   - 近期发生的事情
   - 计划和安排

4. **关系 (relationship)**: 与他人的关系
   - 家人、朋友、同事
   - 宠物
   - 重要的人

5. **情感 (emotion)**: 显著的情感状态
   - 持续的情绪模式
   - 重要的情感经历

## 输出要求
以 JSON 格式输出，每个类别包含提取的记忆：
\`\`\`json
{
  "facts": [
    {
      "content": "完整描述",
      "summary": "简短摘要（10字以内）",
      "confidence": 0.9,
      "source": "explicit",
      "tags": ["标签1", "标签2"]
    }
  ],
  "preferences": [],
  "events": [],
  "relationships": [],
  "emotions": [],
  "shouldUpdateProfile": false,
  "profileUpdates": null
}
\`\`\`

## 注意事项
- confidence: 0-1，表示信息的确定程度
- source: "explicit"（用户明确说的）或 "inferred"（推断的）
- 只提取新信息，不要重复已有记忆
- 如果没有新信息，返回空数组
- 如果需要更新用户画像（如姓名、职业等核心信息），设置 shouldUpdateProfile 为 true`;

export class MemoryExtractor {
  private config: MemoryExtractorConfig;
  private longTermMemory: LongTermMemory;

  constructor(
    longTermMemory: LongTermMemory,
    config: Partial<MemoryExtractorConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.longTermMemory = longTermMemory;
  }

  /**
   * Extract memories from a conversation
   */
  async extractFromConversation(
    messages: Message[],
    existingMemories: MemoryEntry[] = []
  ): Promise<MemoryExtractionResult> {
    // Format conversation for prompt
    const conversationText = this.formatConversation(messages);
    const memoriesText = this.formatMemories(existingMemories);
    const profileText = await this.formatProfile();

    // Build prompt
    const prompt = EXTRACTION_PROMPT
      .replace("{conversation}", conversationText)
      .replace("{existing_memories}", memoriesText)
      .replace("{user_profile}", profileText);

    // Call LLM API
    const result = await this.callExtractionAPI(prompt);

    // Filter by confidence
    return this.filterByConfidence(result);
  }

  /**
   * Extract and save memories from conversation
   */
  async extractAndSave(
    messages: Message[],
    context: string = "conversation"
  ): Promise<MemoryEntry[]> {
    const existingMemories = await this.longTermMemory.getAllMemories();
    const extraction = await this.extractFromConversation(messages, existingMemories);

    const savedMemories: MemoryEntry[] = [];

    // Save facts
    for (const memory of extraction.facts) {
      const saved = await this.longTermMemory.addMemory({
        type: "fact",
        content: memory.content,
        summary: memory.summary,
        confidence: memory.confidence,
        source: memory.source,
        context,
        tags: memory.tags,
      });
      savedMemories.push(saved);
    }

    // Save preferences
    for (const memory of extraction.preferences) {
      const saved = await this.longTermMemory.addMemory({
        type: "preference",
        content: memory.content,
        summary: memory.summary,
        confidence: memory.confidence,
        source: memory.source,
        context,
        tags: memory.tags,
      });
      savedMemories.push(saved);
    }

    // Save events
    for (const memory of extraction.events) {
      const saved = await this.longTermMemory.addMemory({
        type: "event",
        content: memory.content,
        summary: memory.summary,
        confidence: memory.confidence,
        source: memory.source,
        context,
        tags: memory.tags,
      });
      savedMemories.push(saved);
    }

    // Save relationships
    for (const memory of extraction.relationships) {
      const saved = await this.longTermMemory.addMemory({
        type: "relationship",
        content: memory.content,
        summary: memory.summary,
        confidence: memory.confidence,
        source: memory.source,
        context,
        tags: memory.tags,
      });
      savedMemories.push(saved);
    }

    // Save emotions
    for (const memory of extraction.emotions) {
      const saved = await this.longTermMemory.addMemory({
        type: "emotion",
        content: memory.content,
        summary: memory.summary,
        confidence: memory.confidence,
        source: memory.source,
        context,
        tags: memory.tags,
      });
      savedMemories.push(saved);
    }

    // Update profile if needed
    if (extraction.shouldUpdateProfile && extraction.profileUpdates) {
      await this.longTermMemory.updateProfile(extraction.profileUpdates);
    }

    return savedMemories;
  }

  /**
   * Quick extraction for importance scoring (without full LLM call)
   */
  quickExtract(message: Message): {
    hasPersonalInfo: boolean;
    hasPreference: boolean;
    hasEvent: boolean;
    importance: number;
  } {
    const text = message.content.toLowerCase();

    // Check for personal info patterns
    const personalPatterns = [
      /我(?:叫|是|名字)/,
      /我(?:在|住|工作)/,
      /我(?:\d+)岁/,
      /我的(?:工作|职业|公司)/,
      /my name is/i,
      /i(?:'m| am) (?:a |an )?(?:\w+)/i,
    ];
    const hasPersonalInfo = personalPatterns.some((p) => p.test(text));

    // Check for preference patterns
    const preferencePatterns = [
      /我(?:喜欢|讨厌|不喜欢|爱|恨)/,
      /我(?:最喜欢|最讨厌)/,
      /i (?:like|love|hate|prefer|enjoy)/i,
      /my favorite/i,
    ];
    const hasPreference = preferencePatterns.some((p) => p.test(text));

    // Check for event patterns
    const eventPatterns = [
      /(?:今天|昨天|明天|上周|下周)/,
      /我(?:要|会|打算)/,
      /(?:生日|纪念日|周年)/,
      /(?:yesterday|today|tomorrow|next week|last week)/i,
      /(?:birthday|anniversary)/i,
    ];
    const hasEvent = eventPatterns.some((p) => p.test(text));

    // Calculate importance score
    let importance = 0.5;
    if (hasPersonalInfo) importance += 0.3;
    if (hasPreference) importance += 0.1;
    if (hasEvent) importance += 0.2;
    importance = Math.min(1, importance);

    return {
      hasPersonalInfo,
      hasPreference,
      hasEvent,
      importance,
    };
  }

  /**
   * Call extraction API
   */
  private async callExtractionAPI(prompt: string): Promise<MemoryExtractionResult> {
    try {
      const response = await fetch("/api/memory/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider: this.config.provider,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseExtractionResult(data.result);
    } catch (error) {
      console.error("Memory extraction failed:", error);
      return this.emptyResult();
    }
  }

  /**
   * Parse extraction result from LLM response
   */
  private parseExtractionResult(text: string): MemoryExtractionResult {
    try {
      // Try to find JSON in the response
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;

      const parsed = JSON.parse(jsonStr);

      return {
        facts: parsed.facts || [],
        preferences: parsed.preferences || [],
        events: parsed.events || [],
        relationships: parsed.relationships || [],
        emotions: parsed.emotions || [],
        shouldUpdateProfile: parsed.shouldUpdateProfile || false,
        profileUpdates: parsed.profileUpdates || undefined,
      };
    } catch (error) {
      console.error("Failed to parse extraction result:", error);
      return this.emptyResult();
    }
  }

  /**
   * Filter results by minimum confidence
   */
  private filterByConfidence(result: MemoryExtractionResult): MemoryExtractionResult {
    const filter = (memories: ExtractedMemory[]) =>
      memories.filter((m) => m.confidence >= this.config.minConfidence);

    return {
      facts: filter(result.facts),
      preferences: filter(result.preferences),
      events: filter(result.events),
      relationships: filter(result.relationships),
      emotions: filter(result.emotions),
      shouldUpdateProfile: result.shouldUpdateProfile,
      profileUpdates: result.profileUpdates,
    };
  }

  /**
   * Format conversation for prompt
   */
  private formatConversation(messages: Message[]): string {
    return messages
      .slice(-this.config.batchSize)
      .map((m) => {
        const role = m.role === "user" ? "User" : "AI";
        return `${role}: ${m.content}`;
      })
      .join("\n");
  }

  /**
   * Format existing memories for prompt
   */
  private formatMemories(memories: MemoryEntry[]): string {
    if (memories.length === 0) {
      return "无已有记忆";
    }

    return memories
      .slice(0, 20)
      .map((m) => `- [${m.type}] ${m.summary}`)
      .join("\n");
  }

  /**
   * Format user profile for prompt
   */
  private async formatProfile(): Promise<string> {
    const profile = await this.longTermMemory.getProfile();

    const lines: string[] = [];

    if (profile.name) lines.push(`姓名: ${profile.name}`);
    if (profile.nickname) lines.push(`昵称: ${profile.nickname}`);
    if (profile.personalInfo.occupation)
      lines.push(`职业: ${profile.personalInfo.occupation}`);
    if (profile.personalInfo.hobbies?.length)
      lines.push(`爱好: ${profile.personalInfo.hobbies.join(", ")}`);

    return lines.length > 0 ? lines.join("\n") : "暂无用户画像";
  }

  /**
   * Return empty result
   */
  private emptyResult(): MemoryExtractionResult {
    return {
      facts: [],
      preferences: [],
      events: [],
      relationships: [],
      emotions: [],
      shouldUpdateProfile: false,
    };
  }
}

// Factory function
export function createMemoryExtractor(
  longTermMemory: LongTermMemory,
  config?: Partial<MemoryExtractorConfig>
): MemoryExtractor {
  return new MemoryExtractor(longTermMemory, config);
}
