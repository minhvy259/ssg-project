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

// Chuyển đổi messages để tương thích với Groq (OpenAI-compatible format)
function prepareMessagesForGroq(
  messages: { role: string; content: string }[]
) {
  const result: { role: string; content: string }[] = [];
  
  for (const msg of messages) {
    if (msg.role === "system") {
      // Groq hỗ trợ system prompt trực tiếp
      result.push({ role: "system", content: msg.content });
    } else if (msg.role === "user" || msg.role === "assistant") {
      result.push({ role: msg.role, content: msg.content });
    }
  }
  
  return result;
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, stream } = (await req.json()) as RequestBody;

    // Validate messages
    if (!messages || messages.length === 0) {
      throw new Error("Messages array is required");
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      throw new Error("Groq API key not configured. Please set GROQ_API_KEY in Supabase secrets.");
    }

    const preparedMessages = prepareMessagesForGroq(messages);
    
    // Sử dụng model llama-3.3-70b-versatile (mới nhất, free tier tốt)
    const model = "llama-3.3-70b-versatile";
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

    const response = await fetch(groqUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: preparedMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: stream || false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Groq API error: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error?.message || errorMsg;
      } catch {
        errorMsg += ` - ${errorText}`;
      }
      
      throw new Error(errorMsg);
    }

    const data = await response.json();
    
    // Xử lý response
    const message = data.choices?.[0]?.message?.content || "";
    const tokens = data.usage?.total_tokens || message.length;

    return new Response(JSON.stringify({ message, tokens }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

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
