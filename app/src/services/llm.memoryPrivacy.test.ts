import { describe, it, expect } from "vitest";
import { supportsRemoteMemoryExtraction } from "./llm";

describe("supportsRemoteMemoryExtraction", () => {
  it("allows OpenAI and Anthropic remote extraction", () => {
    expect(supportsRemoteMemoryExtraction("openai")).toBe(true);
    expect(supportsRemoteMemoryExtraction("anthropic")).toBe(true);
  });

  it("blocks Ollama so local chat is never remapped to OpenAI", () => {
    expect(supportsRemoteMemoryExtraction("ollama")).toBe(false);
  });

  it("blocks undefined provider instead of defaulting to OpenAI", () => {
    expect(supportsRemoteMemoryExtraction(undefined)).toBe(false);
  });
});
