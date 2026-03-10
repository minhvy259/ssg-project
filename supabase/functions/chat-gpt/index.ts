/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import "https://deno.land/x/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface RequestBody {
  messages: { role: string; content: string }[];
  conversationId?: string;
  model?: string;
  stream?: boolean;
}

// Chuyển định dạng messages (kiểu OpenAI) sang contents của Gemini
function mapMessagesToGeminiContents(
  messages: { role: string; content: string }[],
) {
  return messages.map((msg) => {
    let role: "user" | "model" = "user";

    if (msg.role === "assistant") {
      role = "model";
    } else if (msg.role === "system") {
      // Đưa system prompt vào như user context
      role = "user";
    }

    return {
      role,
      parts: [{ text: msg.content }],
    };
  });
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = (await req.json()) as RequestBody;
    // Danh sách models ưu tiên
    const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash-8b"];

    // Validate messages
    if (!messages || messages.length === 0) {
      throw new Error("Messages array is required");
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const contents = mapMessagesToGeminiContents(messages);

    let lastError = "";
    const allErrors: string[] = [];

    for (const model of models) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini error (${model}):`, errorText);

        try {
          const errorJson = JSON.parse(errorText);
          lastError = errorJson.error?.message || `${response.status}: ${response.statusText}`;
        } catch {
          lastError = `${response.status}: ${response.statusText}`;
        }

        allErrors.push(`[${model}]: ${lastError}`);

        // Nếu lỗi quota (429) hoặc model không tìm thấy (404/400), thử model tiếp theo
        const isQuota = lastError.toLowerCase().includes("quota") || response.status === 429;
        const isNotFound = lastError.toLowerCase().includes("not found") || response.status === 404 || response.status === 400;

        if (isQuota || isNotFound) {
          console.log(`Model ${model} failed, trying next...`);
          continue;
        }

        // Lỗi khác (401, 500...) thì throw ngay, ví dụ 401 là sai key
        throw new Error(`API Error (${model}): ` + lastError);
      }

      const data = await response.json();
      const candidates = data.candidates ?? [];
      const first = candidates[0];

      const message =
        first?.content?.parts?.map((p: { text?: string }) => p.text || "")
          .join("") ?? "";

      const tokens = message.length;

      return new Response(JSON.stringify({ message, tokens }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Nếu tất cả models đều lỗi
    throw new Error(allErrors.join(" | ") || "All Gemini models failed");
  } catch (error) {
    console.error("Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = errorMessage.includes("API key") ? 401 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});