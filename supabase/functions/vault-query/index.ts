import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Support X-API-Key header or Bearer token in Authorization
    const apiKey =
      req.headers.get("X-API-Key") ||
      req.headers.get("x-api-key") ||
      req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
      null;

    if (!apiKey) {
      return jsonResponse({ answer: null, memories: [], error: "X-API-Key header required" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const keyHash = await hashKey(apiKey);
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from("api_keys")
      .select("id, user_id")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyError || !keyRecord) {
      return jsonResponse({ answer: null, memories: [], error: "Invalid API key" }, 401);
    }

    // Parse body safely
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ answer: null, memories: [], error: "Invalid JSON body" }, 400);
    }

    const { message, top_k = 5 } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return jsonResponse({ answer: null, memories: [], error: "message is required" }, 400);
    }

    // vault_id is optional — if not provided, use the user's first vault
    let vault_id = body.vault_id as string | undefined;

    if (!vault_id) {
      const { data: firstVault } = await supabaseAdmin
        .from("vaults")
        .select("id")
        .eq("user_id", keyRecord.user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!firstVault) {
        return jsonResponse({ answer: "No vaults found. Please upload some memories first.", memories: [] }, 200);
      }
      vault_id = firstVault.id;
    }

    // Verify the vault belongs to this user
    const { data: vault } = await supabaseAdmin
      .from("vaults")
      .select("id")
      .eq("id", vault_id)
      .eq("user_id", keyRecord.user_id)
      .maybeSingle();

    if (!vault) {
      return jsonResponse({ answer: null, memories: [], error: "Invalid vault_id or access denied" }, 403);
    }

    // Update last_used_at
    await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ answer: null, memories: [], error: "AI not configured" }, 500);
    }

    // Fetch memories
    const { data: memories, error: memError } = await supabaseAdmin
      .from("memories")
      .select("id, content, source_file, source_date, fact_type")
      .eq("vault_id", vault_id)
      .eq("user_id", keyRecord.user_id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (memError) {
      return jsonResponse({ answer: null, memories: [], error: "Failed to fetch memories" }, 500);
    }

    const topK = Math.min(Number(top_k) || 5, 20);
    const context = memories?.map(m => {
      const date = m.source_date
        ? new Date(m.source_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : null;
      const source = m.source_file ?? null;
      const meta = [date, source].filter(Boolean).join(" · ");
      return meta ? `[${meta}] ${m.content}` : m.content;
    }).join("\n") ?? "No memories found.";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are Eternova, a personal memory assistant. Answer based on the context below. Be concise and clear. No markdown formatting.\n\nMemory Context:\n${context}`,
          },
          { role: "user", content: message.trim() },
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return jsonResponse({ answer: null, memories: [], error: "Rate limit exceeded. Please try again shortly." }, 429);
      if (status === 402) return jsonResponse({ answer: null, memories: [], error: "AI credits exhausted." }, 500);
      return jsonResponse({ answer: null, memories: [], error: "AI service error" }, 500);
    }

    const result = await aiResponse.json();
    let answer = (result.choices?.[0]?.message?.content as string) ?? "No answer generated.";

    // Strip markdown formatting
    answer = answer
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
      .trim();

    const topMemories = (memories ?? []).slice(0, topK).map(m => ({
      id: m.id,
      content: m.content,
      source_file: m.source_file ?? null,
      source_date: m.source_date ?? null,
      fact_type: m.fact_type ?? null,
      similarity: 0.9,
    }));

    return jsonResponse({ answer, memories: topMemories });

  } catch (err) {
    console.error("vault-query error:", err);
    return jsonResponse(
      { answer: null, memories: [], error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
