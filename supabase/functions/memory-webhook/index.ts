import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    // ── Extract vault_id from URL path (/memory-webhook/{vault_id}) ──────
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const vault_id = pathParts[pathParts.length - 1];

    if (!vault_id || vault_id === "memory-webhook") {
      return json({ success: false, error: "vault_id required in URL path: /api/webhook/{vault_id}" }, 400);
    }

    // ── Parse body ────────────────────────────────────────────────────────
    let body: { text?: string; source?: string; extra_data?: string };
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { text, source = "webhook", extra_data } = body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return json({ success: false, error: "text field is required and must be a non-empty string" }, 400);
    }
    if (text.length > 50000) {
      return json({ success: false, error: "text exceeds maximum length of 50,000 characters" }, 400);
    }

    // ── Init admin client to validate vault + rate limiting ───────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Auth: accept Bearer token OR X-API-Key header ─────────────────────
    const authHeader = req.headers.get("Authorization");
    const apiKeyHeader = req.headers.get("X-API-Key") || req.headers.get("x-api-key");

    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      // Supabase JWT token auth
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (user) userId = user.id;
    } else if (apiKeyHeader) {
      // API key auth — hash and look up
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKeyHeader);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const { data: apiKey } = await supabaseAdmin
        .from("api_keys")
        .select("user_id")
        .eq("key_hash", keyHash)
        .maybeSingle();

      if (apiKey) {
        userId = apiKey.user_id;
        // Update last_used_at
        await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", keyHash);
      }
    }

    if (!userId) {
      return json({
        success: false,
        error: "Unauthorized. Provide Authorization: Bearer <token> or X-API-Key: <key>",
      }, 401);
    }

    // ── Verify user owns the vault ─────────────────────────────────────────
    const { data: vault, error: vaultError } = await supabaseAdmin
      .from("vaults")
      .select("id, name, fact_count, memory_count, token_count")
      .eq("id", vault_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (vaultError || !vault) {
      return json({ success: false, error: "Vault not found or access denied" }, 404);
    }

    // ── Rate limiting: max 100 webhook calls per vault per day ────────────
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabaseAdmin
      .from("memories")
      .select("id", { count: "exact", head: true })
      .eq("vault_id", vault_id)
      .eq("fact_type", "webhook_raw")
      .gte("created_at", dayStart.toISOString());

    if ((todayCount ?? 0) >= 100) {
      return json({
        success: false,
        error: "Rate limit exceeded: max 100 webhook calls per vault per day",
        retry_after: "tomorrow",
      }, 429);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ success: false, error: "AI service not configured" }, 500);
    }

    // ── Step 1: Extract facts via AI ──────────────────────────────────────
    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a knowledge extraction system for Eternova — the eternal memory layer for indie agents. Extract factual statements from the provided agent output or text.

Return a JSON object with:
- "facts": array of strings (each fact is a single, clear, self-contained statement)
- "timestamps": array of objects with {fact_index, date_hint} if any temporal references exist

Rules:
- Each fact should be concise (1-2 sentences max)
- Focus on decisions made, data points, key learnings, and actionable insights
- Extract 3-20 facts depending on content length
- Source: "${source}"
- Return only valid JSON, nothing else`,
          },
          {
            role: "user",
            content: `Extract facts from this content:\n\n${text.slice(0, 12000)}${extra_data ? `\n\nAdditional context: ${extra_data}` : ""}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!extractResponse.ok) {
      const errText = await extractResponse.text();
      if (extractResponse.status === 429) return json({ success: false, error: "AI rate limit exceeded, try again later" }, 429);
      if (extractResponse.status === 402) return json({ success: false, error: "AI credits exhausted" }, 503);
      console.error("AI extraction error:", errText);
      return json({ success: false, error: "AI extraction failed" }, 500);
    }

    const aiResult = await extractResponse.json();
    let facts: string[] = [];
    try {
      const extracted = JSON.parse(aiResult.choices[0].message.content);
      facts = extracted.facts ?? [];
    } catch {
      // If JSON parse fails, treat entire text as one fact
      facts = [text.slice(0, 500)];
    }

    if (facts.length === 0) {
      return json({ success: true, stored_facts: 0, message: "No extractable facts found in the provided text" });
    }

    // ── Step 2: Insert memories ───────────────────────────────────────────
    const memoriesToInsert = facts.map((fact: string) => ({
      vault_id,
      user_id: userId,
      content: fact,
      fact_type: "fact",
      source_file: source,
      embedding: null,
      metadata: { webhook: true, source, extra_data: extra_data ?? null },
    }));

    const { error: insertError } = await supabaseAdmin.from("memories").insert(memoriesToInsert);
    if (insertError) {
      console.error("Insert error:", insertError);
      return json({ success: false, error: "Failed to store memories" }, 500);
    }

    // ── Step 3: Update vault stats ────────────────────────────────────────
    const tokenEstimate = Math.round(text.length / 4);
    await supabaseAdmin.from("vaults").update({
      fact_count: (vault.fact_count ?? 0) + facts.length,
      memory_count: (vault.memory_count ?? 0) + facts.length,
      token_count: (vault.token_count ?? 0) + tokenEstimate,
      updated_at: new Date().toISOString(),
    }).eq("id", vault_id);

    return json({
      success: true,
      stored_facts: facts.length,
      vault: vault.name,
      source,
    });

  } catch (err) {
    console.error("memory-webhook error:", err);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
