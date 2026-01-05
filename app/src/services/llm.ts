import type { Message } from "@/store/types";
import type { BasicExpression } from "./expression";

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

function detectEmotion(text: string): BasicExpression {
  const lowerText = text.toLowerCase();

  const emotionPatterns: Array<[BasicExpression, RegExp[]]> = [
    ["happy", [/happy|joy|excited|great|wonderful|love|amazing|fantastic/]],
    ["sad", [/sad|sorry|unfortunately|miss|regret|disappointed/]],
    ["angry", [/angry|frustrated|annoyed|upset|mad/]],
    ["surprised", [/wow|surprising|unexpected|amazing|incredible|whoa/]],
    ["relaxed", [/calm|peaceful|relaxed|chill|comfortable/]],
  ];

  for (const [emotion, patterns] of emotionPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(lowerText)) {
        return emotion;
      }
    }
  }

  return "neutral";
}
