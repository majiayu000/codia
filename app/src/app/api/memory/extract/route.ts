import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";

const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export async function POST(request: NextRequest) {
  try {
    const { prompt, provider = "openai", model } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let result: string;

    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Anthropic API key not configured" },
          { status: 500 }
        );
      }

      const anthropic = new Anthropic({ apiKey });
      const anthropicModel =
        typeof model === "string" && model.length > 0
          ? model
          : DEFAULT_ANTHROPIC_MODEL;

      const response = await anthropic.messages.create({
        model: anthropicModel,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      result =
        response.content[0].type === "text" ? response.content[0].text : "";
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "OpenAI API key not configured" },
          { status: 500 }
        );
      }

      const openai = new OpenAI({ apiKey });
      const openaiModel =
        typeof model === "string" && model.length > 0
          ? model
          : DEFAULT_OPENAI_MODEL;

      const response = await openai.chat.completions.create({
        model: openaiModel,
        messages: [
          {
            role: "system",
            content:
              "You are a memory extraction assistant. Extract information from conversations and return it in the specified JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      });

      result = response.choices[0]?.message?.content || "{}";
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Memory extraction API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
