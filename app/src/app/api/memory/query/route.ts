import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

/**
 * Memory Query API
 * 用于语义搜索相关记忆（使用 LLM 评估相关性）
 */
export async function POST(request: NextRequest) {
  try {
    const { query, memories, limit = 5 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    if (!memories || memories.length === 0) {
      return NextResponse.json({
        relevant: [],
        scores: [],
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Format memories for evaluation
    const memoriesText = memories
      .map((m: { id: string; summary: string }, i: number) => `${i + 1}. [${m.id}] ${m.summary}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a memory relevance scorer. Given a query and a list of memories,
return a JSON object with the IDs of the most relevant memories and their relevance scores (0-1).

Output format:
{
  "relevant": [
    {"id": "memory_id_1", "score": 0.95},
    {"id": "memory_id_2", "score": 0.8}
  ]
}

Only include memories with score >= 0.5. Return at most ${limit} results.`,
        },
        {
          role: "user",
          content: `Query: ${query}\n\nMemories:\n${memoriesText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(resultText);

    return NextResponse.json({
      relevant: result.relevant || [],
    });
  } catch (error) {
    console.error("Memory query API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
