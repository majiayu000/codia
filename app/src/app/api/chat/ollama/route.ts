import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export async function POST(request: NextRequest) {
  try {
    const { messages, model, temperature, max_tokens, stream, baseUrl } =
      await request.json();

    const ollamaBaseUrl = (
      baseUrl ||
      process.env.OLLAMA_BASE_URL ||
      DEFAULT_OLLAMA_BASE_URL
    ).replace(/\/$/, "");

    const ollamaPayload = {
      model: model || "llama3.2",
      messages,
      stream: Boolean(stream),
      options: {
        temperature: temperature ?? 0.7,
        num_predict: max_tokens ?? 1024,
      },
    };

    const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ollamaPayload),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text().catch(() => "");
      return NextResponse.json(
        {
          error:
            errorText ||
            `Ollama API error: ${ollamaResponse.status} ${ollamaResponse.statusText}`,
        },
        { status: ollamaResponse.status }
      );
    }

    if (stream) {
      if (!ollamaResponse.body) {
        return NextResponse.json(
          { error: "No response body from Ollama" },
          { status: 502 }
        );
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = ollamaResponse.body.getReader();

      const readable = new ReadableStream({
        async start(controller) {
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                try {
                  const parsed = JSON.parse(trimmed) as {
                    message?: { content?: string };
                    done?: boolean;
                    error?: string;
                  };

                  if (parsed.error) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ error: parsed.error })}\n\n`
                      )
                    );
                    continue;
                  }

                  const token = parsed.message?.content || "";
                  if (token) {
                    // Emit OpenAI-compatible SSE so the client parser stays simple
                    const data = JSON.stringify({
                      choices: [{ delta: { content: token } }],
                    });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  }

                  if (parsed.done) {
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  }
                } catch {
                  // Ignore incomplete JSON lines
                }
              }
            }

            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim()) as {
                  message?: { content?: string };
                  done?: boolean;
                };
                const token = parsed.message?.content || "";
                if (token) {
                  const data = JSON.stringify({
                    choices: [{ delta: { content: token } }],
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              } catch {
                // Ignore trailing incomplete JSON
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const result = await ollamaResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Ollama API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reach Ollama. Is it running on localhost:11434?",
      },
      { status: 500 }
    );
  }
}
