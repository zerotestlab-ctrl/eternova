import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { message, vault_id } = await req.json();
    if (!message || !vault_id) {
      return new Response(JSON.stringify({ error: "message and vault_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    // Fetch relevant memories
    const { data: memories } = await supabase
      .from("memories")
      .select("content, source_file, source_date, fact_type")
      .eq("vault_id", vault_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const context = memories?.map(m => {
      const date = m.source_date ? new Date(m.source_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
      const source = m.source_file ?? null;
      const meta = [date, source].filter(Boolean).join(" · ");
      return meta ? `[${meta}] ${m.content}` : m.content;
    }).join("\n") ?? "No memories found.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a friendly personal memory assistant for VibeVault. Answer questions based on the memory context provided.

CRITICAL FORMATTING RULES — follow these exactly:
- Write in clean, natural English prose. No asterisks, no markdown symbols, no bold/italic markers.
- Do NOT use **, *, #, ##, or any markdown formatting characters.
- Use plain sentences and paragraphs.
- For lists, use plain hyphens only when truly needed (max 3-4 items).
- Keep answers concise: 2-4 sentences max unless the user asks for more detail.
- If referencing a date or source, mention it naturally in the sentence.
- If you don't have relevant context, say so naturally in one sentence.
- Never output raw JSON, object notation, or code unless specifically asked.

Memory Context:
${context}`,
          },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("AI rate limit exceeded. Please try again later.");
      if (response.status === 402) throw new Error("AI credits exhausted.");
      throw new Error("AI service error");
    }

    const result = await response.json();
    let answer = result.choices[0].message.content as string;

    // Strip any remaining markdown formatting characters
    answer = answer
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
      .trim();

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("vault-chat error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
