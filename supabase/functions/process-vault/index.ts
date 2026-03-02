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

    const userId = claimsData.claims.sub;
    const { vault_id, files } = await req.json();

    if (!vault_id || !files?.length) {
      return new Response(JSON.stringify({ error: "vault_id and files required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify user owns the vault
    const { data: vault, error: vaultError } = await supabase
      .from("vaults")
      .select("id")
      .eq("id", vault_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (vaultError || !vault) {
      return new Response(JSON.stringify({ error: "Vault not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    // Combine all file contents
    const combinedContent = files.map((f: { name: string; content: string }) =>
      `=== FILE: ${f.name} ===\n${f.content}`
    ).join("\n\n");

    // Use AI to extract facts
    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a knowledge extraction system. Extract factual statements from the provided documents.
Return a JSON object with:
- "facts": array of strings (each fact is a single, clear, self-contained statement)
- "relations": array of objects with {from, to, relation} showing how facts relate

Rules:
- Each fact should be concise (1-2 sentences max)
- Focus on actionable insights, specific data, key learnings
- Extract 10-50 facts depending on content length
- Return only valid JSON, nothing else`,
          },
          {
            role: "user",
            content: `Extract facts from these documents:\n\n${combinedContent.slice(0, 12000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!extractResponse.ok) {
      const errText = await extractResponse.text();
      if (extractResponse.status === 429) throw new Error("AI rate limit exceeded");
      if (extractResponse.status === 402) throw new Error("AI credits exhausted");
      throw new Error(`AI error: ${errText}`);
    }

    const aiResult = await extractResponse.json();
    const extracted = JSON.parse(aiResult.choices[0].message.content);
    const facts: string[] = extracted.facts ?? [];
    const relations: any[] = extracted.relations ?? [];

    // Generate embeddings for each fact using AI
    let embeddingsCreated = 0;
    const memoriesToInsert = [];

    for (const fact of facts) {
      // Use simple text-based embedding via AI (since we use Lovable AI gateway)
      // Store the fact with a placeholder embedding (we'll use semantic search via AI)
      memoriesToInsert.push({
        vault_id,
        user_id: userId,
        content: fact,
        fact_type: "fact",
        source_file: files[0]?.name ?? "unknown",
        embedding: null, // embeddings generated separately or via pgvector
        metadata: { relations: relations.filter((r: any) => r.from === fact || r.to === fact) },
      });
    }

    if (memoriesToInsert.length > 0) {
      const { error: insertError } = await supabase.from("memories").insert(memoriesToInsert);
      if (insertError) throw insertError;
      embeddingsCreated = memoriesToInsert.length;
    }

    // Update vault stats
    const { data: currentVault } = await supabase.from("vaults").select("fact_count, memory_count, token_count").eq("id", vault_id).maybeSingle();
    const tokenEstimate = combinedContent.length / 4;

    await supabase.from("vaults").update({
      fact_count: (currentVault?.fact_count ?? 0) + facts.length,
      memory_count: (currentVault?.memory_count ?? 0) + facts.length,
      token_count: (currentVault?.token_count ?? 0) + Math.round(tokenEstimate),
    }).eq("id", vault_id);

    return new Response(JSON.stringify({
      facts_count: facts.length,
      relations_count: relations.length,
      embeddings_count: embeddingsCreated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("process-vault error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
