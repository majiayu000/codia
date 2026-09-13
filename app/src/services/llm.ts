import type { Message } from "@/store/types";
import type { BasicExpression } from "./expression";
import { getLongTermMemory, getShortTermMemory, createMemoryExtractor } from "./memory";
import type { MemoryContext } from "./memory";
import {
  getEmotionAnalyzer,
  getResponseStrategyEngine,
  mapToBasicExpression,
  type EmotionAnalysisResult,
  type EmotionContext,
  type ResponseStrategy,
} from "./emotion";

export interface LLMConfig {
  provider: "openai" | "anthropic" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  emotion?: BasicExpression;
  emotionAnalysis?: EmotionAnalysisResult;
  responseStrategy?: ResponseStrategy;
  finishReason?: string;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 1024,
};

/** Serialize background memory extraction so the next lookup sees saved facts. */
let pendingMemoryExtraction: Promise<void> = Promise.resolve();

function formatMessagesForOpenAI(
  messages: Message[],
  systemPrompt: string
): Array<{ role: string; content: string }> {
  return [
    { role: "system", content: systemPrompt },
    ...messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ];
}

function formatMessagesForAnthropic(
  messages: Message[],
  systemPrompt: string
): { system: string; messages: Array<{ role: string; content: string }> } {
  return {
    system: systemPrompt,
    messages: messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      })),
  };
}

export async function* streamChat(
  messages: Message[],
  systemPrompt: string,
  config: Partial<LLMConfig> = {}
): AsyncGenerator<string, LLMResponse, unknown> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  let fullContent = "";

  if (mergedConfig.provider === "openai") {
    const response = await fetch("/api/chat/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: formatMessagesForOpenAI(messages, systemPrompt),
        model: mergedConfig.model,
        temperature: mergedConfig.temperature,
        max_tokens: mergedConfig.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content || "";
          if (token) {
            fullContent += token;
            yield token;
          }
        } catch {
          // Ignore parsing errors for incomplete chunks
        }
      }
    }
  } else if (mergedConfig.provider === "anthropic") {
    const { system, messages: formattedMessages } = formatMessagesForAnthropic(
      messages,
      systemPrompt
    );

    const response = await fetch("/api/chat/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system,
        messages: formattedMessages,
        model: mergedConfig.model,
        temperature: mergedConfig.temperature,
        max_tokens: mergedConfig.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.delta?.text || "";
          if (token) {
            fullContent += token;
            yield token;
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
  } else {
    throw new Error(`Unsupported provider: ${mergedConfig.provider}`);
  }

  // Detect emotion from response
  const emotion = detectEmotion(fullContent);

  return {
    content: fullContent,
    emotion,
    finishReason: "stop",
  };
}

export async function chat(
  messages: Message[],
  systemPrompt: string,
  config: Partial<LLMConfig> = {}
): Promise<LLMResponse> {
  const generator = streamChat(messages, systemPrompt, config);
  let result: IteratorResult<string, LLMResponse>;

  do {
    result = await generator.next();
  } while (!result.done);

  return result.value;
}

/**
 * Quick synchronous emotion detection (for backwards compatibility)
 * Uses the EmotionAnalyzer's quickDetect method
 */
function detectEmotion(
  text: string,
  providerConfig?: Pick<LLMConfig, "provider" | "model">
): BasicExpression {
  const analyzer = getEmotionAnalyzer(providerConfig);
  const result = analyzer.quickDetect(text);
  return mapToBasicExpression(result.primary);
}

/**
 * Analyze emotion from user message (async, more accurate)
 */
async function analyzeUserEmotion(
  message: Message,
  providerConfig?: Pick<LLMConfig, "provider" | "model">
): Promise<EmotionAnalysisResult> {
  const analyzer = getEmotionAnalyzer(providerConfig);
  return analyzer.analyze(message);
}

/**
 * Generate response strategy based on emotion analysis
 */
function generateResponseStrategy(
  emotionAnalysis: EmotionAnalysisResult,
  emotionContext?: EmotionContext
): ResponseStrategy {
  const strategyEngine = getResponseStrategyEngine();
  if (emotionContext) {
    return strategyEngine.generateStrategyWithContext(emotionAnalysis, emotionContext);
  }
  return strategyEngine.generateStrategy(emotionAnalysis);
}

// ================== Memory-enhanced Chat ==================

export interface MemoryEnhancedConfig extends Partial<LLMConfig> {
  enableMemory?: boolean;
  extractMemoryAfterResponse?: boolean;
  enableEmotionAnalysis?: boolean;
  applyResponseStrategy?: boolean;
}

/**
 * Stream chat with memory and emotion enhancement
 * Automatically injects memory context and emotion-aware guidance into the system prompt
 */
export async function* streamChatWithMemory(
  messages: Message[],
  systemPrompt: string,
  config: MemoryEnhancedConfig = {}
): AsyncGenerator<string, LLMResponse & { memoryContext?: MemoryContext; emotionContext?: EmotionContext }, unknown> {
  const {
    enableMemory = true,
    extractMemoryAfterResponse = true,
    enableEmotionAnalysis = true,
    applyResponseStrategy = true,
    ...llmConfig
  } = config;

  let enhancedPrompt = systemPrompt;
  let memoryContext: MemoryContext | undefined;
  let emotionAnalysis: EmotionAnalysisResult | undefined;
  let responseStrategy: ResponseStrategy | undefined;
  let emotionContext: EmotionContext | undefined;

  // Get the last user message for analysis
  const lastUserMessage = messages.filter((m) => m.role === "user").pop();

  // Honor selected LLM provider for auxiliary emotion/memory services
  const auxiliaryProvider = {
    provider: llmConfig.provider ?? DEFAULT_CONFIG.provider,
    model: llmConfig.model,
  };

  // Analyze user emotion if enabled
  if (enableEmotionAnalysis && lastUserMessage) {
    try {
      emotionAnalysis = await analyzeUserEmotion(lastUserMessage, auxiliaryProvider);
      emotionContext = getEmotionAnalyzer(auxiliaryProvider).getEmotionContext();

      // Generate response strategy
      if (applyResponseStrategy) {
        responseStrategy = generateResponseStrategy(emotionAnalysis, emotionContext);

        // Inject response strategy into prompt
        const strategyEngine = getResponseStrategyEngine();
        const strategyPrompt = strategyEngine.formatStrategyForPrompt(responseStrategy);
        enhancedPrompt = `${enhancedPrompt}\n\n${strategyPrompt}`;
      }
    } catch (error) {
      console.error("Failed to analyze emotion:", error);
    }
  }

  // Inject memory context if enabled
  if (enableMemory) {
    try {
      // Wait for any in-flight extraction from the previous turn before lookup.
      await pendingMemoryExtraction;

      const longTermMemory = getLongTermMemory();
      const query = lastUserMessage?.content;

      // Get memory context
      memoryContext = await longTermMemory.generateContext(query);

      // Format and append to system prompt
      const memoryPromptSection = await longTermMemory.formatForSystemPrompt(query);
      if (memoryPromptSection) {
        enhancedPrompt = `${enhancedPrompt}\n\n${memoryPromptSection}`;
      }

      // Update short-term memory with current messages
      const shortTermMemory = getShortTermMemory();
      for (const msg of messages.slice(-5)) {
        if (msg.role === "user" || msg.role === "assistant") {
          shortTermMemory.add(msg);
        }
      }
    } catch (error) {
      console.error("Failed to load memory context:", error);
    }
  }

  // Stream the response
  const generator = streamChat(messages, enhancedPrompt, llmConfig);
  let fullContent = "";

  while (true) {
    const result = await generator.next();
    if (result.done) {
      const response = result.value;

      // Extract memories from this conversation if enabled (serialized for next turn)
      if (enableMemory && extractMemoryAfterResponse) {
        pendingMemoryExtraction = extractMemoriesInBackground(
          messages,
          response.content,
          auxiliaryProvider
        );
      }

      return {
        ...response,
        emotionAnalysis,
        responseStrategy,
        memoryContext,
        emotionContext,
      };
    }

    fullContent += result.value;
    yield result.value;
  }
}

/**
 * Extract memories in background (non-blocking)
 */
async function extractMemoriesInBackground(
  messages: Message[],
  aiResponse: string,
  providerConfig?: Pick<LLMConfig, "provider" | "model">
): Promise<void> {
  try {
    const longTermMemory = getLongTermMemory();
    // Memory extractor supports openai | anthropic; map other providers to openai
    const memoryProvider =
      providerConfig?.provider === "anthropic" ? "anthropic" : "openai";
    const extractor = createMemoryExtractor(longTermMemory, {
      provider: memoryProvider,
      ...(providerConfig?.model ? { model: providerConfig.model } : {}),
    });

    // Add the AI response to messages for extraction
    const allMessages: Message[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      },
    ];

    // Extract and save memories
    await extractor.extractAndSave(allMessages.slice(-10), "conversation");
  } catch (error) {
    console.error("Memory extraction failed:", error);
  }
}

/**
 * Get current memory context for display
 */
export async function getMemoryContext(query?: string): Promise<MemoryContext> {
  const longTermMemory = getLongTermMemory();
  return longTermMemory.generateContext(query);
}

/**
 * Format memory context as a string for debugging
 */
export async function formatMemoryContextForDebug(): Promise<string> {
  const longTermMemory = getLongTermMemory();
  return longTermMemory.formatForSystemPrompt();
}
