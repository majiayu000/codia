import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { text, voice = "af_bella" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const kokoroUrl = process.env.KOKORO_API_URL || "http://localhost:8080";

    const response = await fetch(`${kokoroUrl}/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice,
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Kokoro API error: ${error}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Kokoro TTS error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Kokoro TTS failed",
        hint: "Make sure Kokoro TTS server is running locally",
      },
      { status: 500 }
    );
  }
}
