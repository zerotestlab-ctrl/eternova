import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Copy, Eye, EyeOff, Plus, Check, Code, Trash2 } from "lucide-react";

const mockKeys = [
  { id: "1", name: "Production Key", key: "vv_live_sk_7f3a8b2c...d4e1", created: "2025-12-01", lastUsed: "2 hours ago" },
  { id: "2", name: "Development Key", key: "vv_test_sk_9c1d2e4f...b3a5", created: "2025-12-15", lastUsed: "1 day ago" },
];

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
  const [copied, setCopied] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 px-6 py-3 flex items-center gap-4">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="font-semibold text-foreground">API Access</h1>
          <p className="text-xs text-muted-foreground">Integrate VibeVault with your agents</p>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
              <Button variant="hero" size="sm"><Plus className="w-4 h-4" /> Generate Key</Button>
            </div>
            <div className="space-y-3">
              {mockKeys.map((k) => (
                <div key={k.id} className="p-4 rounded-xl border border-border bg-card flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Key className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{k.name}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {showKey === k.id ? "vv_live_sk_7f3a8b2c1d9e4f6a8b2c1d9e4f6ad4e1" : k.key}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      {showKey === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleCopy(k.key, k.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      {copied === k.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">REST Endpoint</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/20 text-primary">POST</span>
                <code className="text-sm font-mono text-foreground">/api/v1/query</code>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">Send a message and receive relevant memories + AI-generated answer.</p>
                <CodeBlock title="Request" onCopy={() => handleCopy("curl", "req")} copied={copied === "req"} code={`curl -X POST https://api.vibevault.app/v1/query \\
  -H "Authorization: Bearer vv_live_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "vault_id": "my-founder-brain",
    "message": "What did I learn about RAG?",
    "top_k": 5
  }'`} />
                <CodeBlock title="Response" onCopy={() => handleCopy("response", "res")} copied={copied === "res"} code={`{
  "answer": "Based on your notes, RAG systems perform best with...",
  "memories": [
    {
      "fact": "Recursive chunking of 512 tokens...",
      "score": 0.94,
      "source": "research-notes.pdf"
    }
  ],
  "tokens_used": 1240
}`} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">One-Line Integration</h2>
            <div className="space-y-4">
              <CodeBlock title="Claude / MCP" onCopy={() => handleCopy("claude", "claude")} copied={copied === "claude"} code={`# Add to your Claude project system prompt:
"For context, query my VibeVault: 
curl -s api.vibevault.app/v1/query -H 'Auth: Bearer $VV_KEY' -d '{message: USER_QUERY}'"`} />
              <CodeBlock title="LangGraph / Python" onCopy={() => handleCopy("python", "python")} copied={copied === "python"} code={`from vibevault import VibeVault

vv = VibeVault(api_key="vv_live_sk_...")
memories = vv.query("What do I know about embeddings?")
# Returns: List[Memory] with .fact, .score, .source`} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
