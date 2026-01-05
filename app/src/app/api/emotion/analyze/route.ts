import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";

const EMOTION_SYSTEM_PROMPT = `You are an emotion analysis assistant. Analyze the emotional content of user messages and return a JSON object with the following structure:

{
  "primary": string,     // Primary emotion detected (one of: neutral, happy, sad, angry, surprised, relaxed, curious, concerned, shy, excited, confused, loving, thinking, playful)
  "secondary": string?,  // Optional secondary emotion
  "intensity": number,   // Emotional intensity from 0 to 1
  "valence": number,     // Emotional valence from -1 (negative) to 1 (positive)
  "arousal": number,     // Arousal level from 0 (calm) to 1 (excited)
  "confidence": number,  // Confidence in your analysis from 0 to 1
  "cues": string[],      // Keywords or phrases that indicate the emotion
  "reasoning": string    // Brief explanation of your analysis
}

Focus on:
- Understanding both explicit and implicit emotional expressions
- Detecting mixed emotions when present
- Considering cultural context (especially for Chinese text)
- Identifying emotional intensity and arousal levels

Always respond with valid JSON only, no additional text.`;

const CONTEXT_SYSTEM_PROMPT = `You are an emotion analysis assistant. Analyze the emotional context of the entire conversation, focusing on the user's emotional state in the most recent message.

Consider:
- How the conversation has progressed emotionally
- The relationship between messages
- Context clues that might inform the emotional interpretation
- Cultural context (especially for Chinese text)

Return a JSON object with:
{
  "primary": string,     // Primary emotion in the latest user message
  "secondary": string?,  // Optional secondary emotion
  "intensity": number,   // Emotional intensity from 0 to 1
  "valence": number,     // Emotional valence from -1 to 1
  "arousal": number,     // Arousal level from 0 to 1
  "confidence": number,  // Confidence in your analysis from 0 to 1
  "cues": string[],      // Keywords or phrases that indicate the emotion
  "reasoning": string    // Brief explanation considering the conversation context
}

Always respond with valid JSON only, no additional text.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, messages, provider = "openai", withContext = false } = body;

    if (!text && (!messages || messages.length === 0)) {
      return NextResponse.json(
        { error: "Text or messages are required" },
        { status: 400 }
      );
    }

    let result: string;
    const systemPrompt = withContext ? CONTEXT_SYSTEM_PROMPT : EMOTION_SYSTEM_PROMPT;

    // Prepare content
    let userContent: string;
    if (withContext && messages) {
      userContent = `Analyze the emotional state in this conversation:\n\n${messages
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
        .join("\n")}`;
    } else {
      userContent = `Analyze the emotion in this text: "${text}"`;
    }

    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Anthropic API key not configured" },
          { status: 500 }
        );
      }

      const anthropic = new Anthropic({ apiKey });

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userContent,
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

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });

      result = response.choices[0]?.message?.content || "{}";
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Emotion analysis API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
