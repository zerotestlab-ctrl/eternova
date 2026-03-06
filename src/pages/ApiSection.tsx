import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Key, Copy, Eye, EyeOff, Plus, Check, Code, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function CodeBlock({ title, code, onCopy, copied }: { title: string; code: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Code className="w-3.5 h-3.5" /> {title}</span>
        <button onClick={onCopy} className="text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto leading-relaxed bg-background">{code}</pre>
    </div>
  );
}

export default function ApiSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["api_keys", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const generateKey = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { name },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api_keys"] });
      setGeneratedKey(data.key);
      setNewKeyName("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api_keys"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied!", description: "Copied to clipboard" });
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const queryEndpoint = `${supabaseUrl}/functions/v1/vault-query`;

  return (
    <div className="min-h-screen" style={{ background: "hsl(220, 20%, 6%)" }}>
      <header className="border-b px-6 py-3 flex items-center gap-4" style={{ borderColor: "hsl(220, 14%, 16%)", background: "hsl(220, 18%, 8%)" }}>
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="font-semibold text-foreground">API Access</h1>
          <p className="text-xs text-muted-foreground">Integrate Eternova with your agents</p>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
              <Button variant="hero" size="sm" onClick={() => setShowNewKey(true)}><Plus className="w-4 h-4" /> Generate Key</Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                <Key className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No API keys yet. Generate one to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((k) => (
                  <div key={k.id} className="p-4 rounded-xl border border-border bg-card flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Key className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{k.name}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {showKey === k.id ? k.key_prefix + "..." : k.key_prefix + "••••••••••••••••"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        {showKey === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleCopy(k.key_prefix, k.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        {copied === k.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteKey.mutate(k.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">REST Endpoint</h2>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(220, 14%, 18%)", background: "hsl(220, 18%, 10%)" }}>
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/20 text-primary">POST</span>
                <code className="text-sm font-mono text-foreground">/functions/v1/vault-query</code>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">Send a message and receive relevant memories + AI-generated answer.</p>
                <CodeBlock
                  title="Request"
                  onCopy={() => handleCopy(`curl -X POST ${queryEndpoint}`, "req")}
                  copied={copied === "req"}
                  code={`curl -X POST ${queryEndpoint} \\
  -H "Authorization: Bearer vv_live_sk_..." \\
  -H "X-API-Key: your_vibevault_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "vault_id": "your-vault-uuid",
    "message": "What did I learn about RAG?",
    "top_k": 5
  }'`}
                />
                <CodeBlock
                  title="Response"
                  onCopy={() => handleCopy("response", "res")}
                  copied={copied === "res"}
                  code={`{
  "answer": "Based on your notes, RAG systems perform best with...",
  "memories": [
    {
      "id": "uuid",
      "content": "Recursive chunking of 512 tokens...",
      "similarity": 0.94,
      "source_file": "research-notes.pdf"
    }
  ]
}`}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">One-Click Integrations</h2>
            <p className="text-sm text-muted-foreground mb-4">Copy these snippets directly into your AI tools — no technical setup required.</p>
            <div className="space-y-4">

              {/* Claude */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(220, 14%, 18%)", background: "hsl(220, 18%, 10%)" }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "hsl(220, 14%, 18%)" }}>
                  <div>
                    <span className="text-sm font-semibold text-foreground">🤖 For Claude (Copy into Project Instructions)</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Paste this into Claude's "Project Instructions" box — done.</p>
                  </div>
                  <button onClick={() => handleCopy(`Before answering, query my VibeVault memory: curl -s -X POST ${queryEndpoint} -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -d '{"message": "{{USER_QUERY}}", "vault_id": "YOUR_VAULT_ID"}' | jq .answer`, "claude")} className="text-muted-foreground hover:text-foreground transition-colors ml-3 flex-shrink-0 flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 hover:border-primary/30">
                    {copied === "claude" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === "claude" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto leading-relaxed" style={{ background: "hsl(220, 20%, 7%)" }}>{`Before answering, query my VibeVault memory:
curl -s -X POST ${queryEndpoint} \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "{{USER_QUERY}}", "vault_id": "YOUR_VAULT_ID"}' | jq .answer`}</pre>
              </div>

              {/* curl */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(220, 14%, 18%)", background: "hsl(220, 18%, 10%)" }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "hsl(220, 14%, 18%)" }}>
                  <div>
                    <span className="text-sm font-semibold text-foreground">⚡ Quick Test (Terminal / Postman)</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Run this in your terminal to test instantly.</p>
                  </div>
                  <button onClick={() => handleCopy(`curl -X POST ${queryEndpoint} -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" -d '{"message": "What did I learn?", "vault_id": "YOUR_VAULT_ID"}'`, "curl")} className="text-muted-foreground hover:text-foreground transition-colors ml-3 flex-shrink-0 flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 hover:border-primary/30">
                    {copied === "curl" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === "curl" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto leading-relaxed" style={{ background: "hsl(220, 20%, 7%)" }}>{`curl -X POST ${queryEndpoint} \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What did I learn about pricing?",
    "vault_id": "YOUR_VAULT_ID"
  }'`}</pre>
              </div>

              {/* Python */}
              <CodeBlock
                title="🐍 Python / LangGraph / n8n"
                onCopy={() => handleCopy(`import requests\n\ndef query_vault(message, vault_id, api_key):\n    resp = requests.post(\n        "${queryEndpoint}",\n        headers={"X-API-Key": api_key},\n        json={"message": message, "vault_id": vault_id}\n    )\n    return resp.json()["answer"]`, "python")}
                copied={copied === "python"}
                code={`import requests

def query_vault(message: str, vault_id: str, api_key: str) -> str:
    resp = requests.post(
        "${queryEndpoint}",
        headers={"X-API-Key": api_key},
        json={"message": message, "vault_id": vault_id}
    )
    return resp.json()["answer"]  # Clean natural language answer

# Usage:
answer = query_vault("What are my key product decisions?", "YOUR_VAULT_ID", "YOUR_API_KEY")
print(answer)`}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Generate Key Dialog */}
      <Dialog open={showNewKey} onOpenChange={(open) => { setShowNewKey(open); if (!open) { setGeneratedKey(null); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Generate API Key</DialogTitle>
          </DialogHeader>
          {generatedKey ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Your new API key (copy it now — won't be shown again):</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-primary flex-1 break-all">{generatedKey}</code>
                  <button onClick={() => handleCopy(generatedKey, "new-key")} className="p-1.5 rounded text-muted-foreground hover:text-foreground">
                    {copied === "new-key" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button variant="hero" className="w-full" onClick={() => { setShowNewKey(false); setGeneratedKey(null); }}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="e.g. Production Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="bg-muted/50 border-border"
              />
              <Button
                variant="hero"
                className="w-full"
                onClick={() => newKeyName.trim() && generateKey.mutate(newKeyName.trim())}
                disabled={generateKey.isPending || !newKeyName.trim()}
              >
                {generateKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Key"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
