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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { message, vault_id } = await req.json();
    if (!message || !vault_id) {
      return new Response(JSON.stringify({ error: "message and vault_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    // Fetch relevant memories — more context, ordered by recency
    const { data: memories } = await supabase
      .from("memories")
      .select("content, source_file, source_date, fact_type, created_at")
      .eq("vault_id", vault_id)
      .order("created_at", { ascending: false })
      .limit(30);

    const context = memories?.map(m => {
      const date = m.source_date
        ? new Date(m.source_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : new Date(m.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const source = m.source_file ?? null;
      const meta = [date, source].filter(Boolean).join(" · ");
      return meta ? `[${meta}] ${m.content}` : m.content;
    }).join("\n") ?? "No memories found.";

    const systemPrompt = `You are VibeVault, a brilliant, insightful personal memory assistant for indie founders and builders.

Your role: Help users recall, connect, and gain insight from their stored memories, notes, and documents.

THINKING PROCESS — always do this silently before answering:
1. Scan ALL memory entries for relevance to the question
2. Connect facts across different uploads and dates — look for patterns
3. Identify the most useful 2-4 pieces of information to highlight
4. Think about what insight or follow-up would genuinely help the user

RESPONSE RULES — follow these exactly:
- Write in clean, natural, human-like English. No asterisks, no bold markers, no hashtags, no markdown symbols.
- Use short paragraphs (2-3 sentences max each). Use a plain hyphen list only when listing 3+ distinct items.
- Cite specific dates and source files naturally in the sentence (e.g. "In your March 1 upload from research-notes.pdf...").
- Be concise but insightful — never just repeat chunks verbatim. Add value by synthesizing and connecting.
- If you see related facts across multiple dates or sources, mention the connection.
- End with one short follow-up suggestion if relevant (e.g. "Want me to pull related facts about X?").
- If no relevant context exists, say so in one honest sentence.
- Never output raw JSON, code blocks, or object notation.
- Maximum response: 150 words unless the user explicitly asks for more detail.

Memory Context (your knowledge base):
${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("AI rate limit exceeded. Please try again in a moment.");
      if (response.status === 402) throw new Error("AI credits exhausted.");
      throw new Error("AI service error");
    }

    const result = await response.json();
    let answer = result.choices[0].message.content as string;

    // Strip all markdown formatting
    answer = answer
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
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
