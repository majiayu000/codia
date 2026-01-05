import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageData,
      imageUrl,
      prompt,
      provider = "openai",
      model,
      maxTokens = 1024,
    } = body;

    if (!imageData && !imageUrl) {
      return NextResponse.json(
        { error: "Either imageData or imageUrl is required" },
        { status: 400 }
      );
    }

    let result: string;

    // Prepare image content
    const imageContent = imageData
      ? { type: "base64", media_type: "image/jpeg", data: imageData.replace(/^data:image\/\w+;base64,/, "") }
      : { type: "url", url: imageUrl };

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
        model: model || "claude-3-5-sonnet-20241022",
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: imageData
                  ? {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: imageData.replace(/^data:image\/\w+;base64,/, ""),
                    }
                  : {
                      type: "url",
                      url: imageUrl,
                    },
              },
              {
                type: "text",
                text: prompt || "Analyze this image and describe what you see.",
              },
            ],
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

      const imagePayload = imageData
        ? { url: imageData }
        : { url: imageUrl };

      const response = await openai.chat.completions.create({
        model: model || "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: imagePayload,
              },
              {
                type: "text",
                text: prompt || "Analyze this image and describe what you see.",
              },
            ],
          },
        ],
        max_tokens: maxTokens,
      });

      result = response.choices[0]?.message?.content || "";
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Vision analysis API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
