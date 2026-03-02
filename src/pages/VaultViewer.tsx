import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search, ArrowLeft, MessageSquare, Sparkles, Clock, X, Loader2, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const makeNodeStyle = (highlight = false) => ({
  background: "hsl(220, 18%, 12%)",
  color: "hsl(210, 20%, 92%)",
  border: highlight ? "1px solid rgba(45, 212, 191, 0.4)" : "1px solid hsl(220, 14%, 20%)",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "13px",
  fontWeight: highlight ? 600 : 400,
});

const edgeStyle = { stroke: "rgba(45, 212, 191, 0.4)" };

export default function VaultViewer() {
  const { id: vaultId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const { data: vault } = useQuery({
    queryKey: ["vault", vaultId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vaults").select("*").eq("id", vaultId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!vaultId,
  });

  const { data: memories = [] } = useQuery({
    queryKey: ["memories", vaultId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("vault_id", vaultId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!vaultId,
  });

  // Build graph nodes from memories
  const nodes: Node[] = memories.slice(0, 15).map((m, i) => {
    const angle = (i / Math.max(memories.length, 1)) * 2 * Math.PI;
    const radius = 200;
    const x = 350 + radius * Math.cos(angle);
    const y = 200 + radius * Math.sin(angle);
    return {
      id: m.id,
      position: { x, y },
      data: { label: m.content.slice(0, 50) + (m.content.length > 50 ? "..." : "") },
      style: makeNodeStyle(i === 0),
    };
  });

  const edges: Edge[] = memories.slice(1, 10).map((m, i) => ({
    id: `e${i}`,
    source: memories[0]?.id ?? "",
    target: m.id,
    style: edgeStyle,
    markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(45, 212, 191, 0.4)" },
  })).filter(e => e.source && e.target);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !vaultId) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("semantic-search", {
        body: { query: searchQuery, vault_id: vaultId },
      });
      if (error) throw new Error(error.message);
      setSearchResults(data.results ?? []);
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !vaultId) return;
    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("vault-chat", {
        body: { message: userMsg, vault_id: vaultId },
      });
      if (error) throw new Error(error.message);
      setChatMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. " + err.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatTokens = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-foreground">{vault?.name ?? "Loading..."}</h1>
            <p className="text-xs text-muted-foreground">
              {vault?.fact_count ?? 0} facts · {vault?.memory_count ?? 0} memories · {formatTokens(vault?.token_count ?? 0)} tokens
            </p>
          </div>
        </div>
        <Button variant={showChat ? "hero" : "hero-outline"} size="sm" onClick={() => setShowChat(!showChat)}>
          <MessageSquare className="w-4 h-4" /> Test Memory
        </Button>
      </header>

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-xl flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search your vault semantically..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              <Button variant="hero-outline" size="sm" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row">
            <div className="flex-1 min-h-[400px] relative">
              {memories.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Brain className="w-12 h-12 opacity-30" />
                  <p className="text-sm">No memories yet. <Link to="/upload" className="text-primary hover:underline">Upload documents</Link> to get started.</p>
                </div>
              ) : (
                <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }} style={{ background: "hsl(220, 20%, 6%)" }}>
                  <Background color="hsl(220, 14%, 14%)" gap={40} size={1} />
                  <Controls style={{ background: "hsl(220, 18%, 12%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px" }} />
                </ReactFlow>
              )}
            </div>

            {searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-96 border-l border-border bg-card/50 p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Semantic Results
                  </h3>
                  <button onClick={() => setSearchResults([])} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {searchResults.map((r: any) => (
                    <div key={r.id} className="p-3 rounded-lg border border-border bg-background hover:border-primary/20 transition-colors">
                      <p className="text-sm text-foreground mb-2">{r.content}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="text-primary font-mono">{(r.similarity * 100).toFixed(0)}% match</span>
                        {r.source_file && <span>{r.source_file}</span>}
                        {r.source_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.source_date.slice(0, 10)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {showChat && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-96 border-l border-border bg-card/50 flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Memory Playground
              </h3>
              <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {chatMessages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center mt-8">Ask anything about this vault's memories...</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Input
                placeholder="Ask your vault..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChat()}
                className="bg-muted/50 border-border"
                disabled={chatLoading}
              />
              <Button variant="hero" size="icon" onClick={handleChat} disabled={chatLoading}>
                {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
