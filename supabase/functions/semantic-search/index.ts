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

    const { query, vault_id, top_k = 5 } = await req.json();
    if (!query || !vault_id) {
      return new Response(JSON.stringify({ error: "query and vault_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    // Fetch all memories for this vault (text-based search since embeddings are null)
    const { data: memories, error: memError } = await supabase
      .from("memories")
      .select("id, content, source_file, source_date, metadata")
      .eq("vault_id", vault_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (memError) throw memError;
    if (!memories?.length) {
      return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use AI to rank memories by relevance
    const memoriesText = memories.map((m, i) => `[${i}] ${m.content}`).join("\n");

    const rankResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a semantic search ranker. Given a query and a list of memory items, return the indices of the top ${top_k} most relevant items.
Return a JSON object with "ranked_indices" (array of integers) and "similarities" (array of 0-1 scores matching the ranked indices).
Return only valid JSON.`,
          },
          {
            role: "user",
            content: `Query: "${query}"\n\nMemories:\n${memoriesText.slice(0, 8000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!rankResponse.ok) {
      if (rankResponse.status === 429) throw new Error("AI rate limit exceeded");
      throw new Error("AI search failed");
    }

    const rankResult = await rankResponse.json();
    const ranked = JSON.parse(rankResult.choices[0].message.content);
    const indices: number[] = ranked.ranked_indices ?? [];
    const similarities: number[] = ranked.similarities ?? [];

    const results = indices.slice(0, top_k).map((idx, i) => ({
      ...memories[idx],
      similarity: similarities[i] ?? 0.5,
    })).filter(Boolean);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("semantic-search error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
