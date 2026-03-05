import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  Search, ArrowLeft, MessageSquare, Sparkles, Clock, X, Loader2, Brain,
  FileText, Calendar, Eye, Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const makeNodeStyle = (highlight = false) => ({
  background: highlight ? "hsl(173, 70%, 10%)" : "hsl(220, 18%, 12%)",
  color: "hsl(210, 20%, 92%)",
  border: highlight ? "1.5px solid hsl(173, 70%, 45%)" : "1px solid hsl(220, 14%, 22%)",
  borderRadius: "14px",
  padding: "14px 18px",
  fontSize: "12px",
  fontWeight: highlight ? 600 : 400,
  maxWidth: "200px",
  lineHeight: "1.4",
  boxShadow: highlight ? "0 0 20px hsl(173, 70%, 30% / 0.3)" : "none",
});

const edgeStyle = { stroke: "hsl(173, 70%, 40%)", strokeWidth: 1.5 };

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getSourceIcon(sourceFile: string | null) {
  if (!sourceFile) return "💬";
  if (sourceFile.endsWith(".pdf")) return "📄";
  if (sourceFile.endsWith(".txt")) return "📝";
  if (sourceFile.includes("notion")) return "📓";
  if (sourceFile.includes("chat")) return "💬";
  return "📁";
}

export default function VaultViewer() {
  const { id: vaultId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "graph">("timeline");

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

  // Filter memories by search
  const displayedMemories = activeSearch
    ? memories.filter(m =>
        m.content.toLowerCase().includes(activeSearch.toLowerCase()) ||
        (m.source_file ?? "").toLowerCase().includes(activeSearch.toLowerCase())
      )
    : searchResults.length > 0
    ? searchResults
    : memories;

  // Build graph nodes
  const nodes: Node[] = memories.slice(0, 18).map((m, i) => {
    const angle = (i / Math.max(memories.length, 1)) * 2 * Math.PI;
    const radius = 220;
    const x = 380 + radius * Math.cos(angle);
    const y = 220 + radius * Math.sin(angle);
    return {
      id: m.id,
      position: { x, y },
      data: { label: m.content.slice(0, 45) + (m.content.length > 45 ? "..." : "") },
      style: makeNodeStyle(i === 0),
    };
  });

  const edges: Edge[] = memories.slice(1, 12).map((m, i) => ({
    id: `e${i}`,
    source: memories[0]?.id ?? "",
    target: m.id,
    style: edgeStyle,
    markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(173, 70%, 40%)" },
    animated: i < 3,
  })).filter(e => e.source && e.target);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q || !vaultId) return;
    setActiveSearch(q);
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("semantic-search", {
        body: { query: q, vault_id: vaultId },
      });
      if (error) throw new Error(error.message);
      setSearchResults(data.results ?? []);
    } catch (err: any) {
      // Fallback to local filter
      setSearchResults([]);
      toast({ title: "Semantic search unavailable", description: "Showing local results instead.", variant: "default" });
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
    setSearchResults([]);
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
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "hsl(220, 20%, 6%)" }}>
      {/* Header */}
      <header className="border-b px-4 md:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-10" style={{ borderColor: "hsl(220, 14%, 16%)", background: "hsl(220, 18%, 8%)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-semibold text-foreground text-sm md:text-base truncate">{vault?.name ?? "Loading..."}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {vault?.fact_count ?? 0} facts · {vault?.memory_count ?? 0} memories · {formatTokens(vault?.token_count ?? 0)} tokens
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors min-h-[40px] ${activeTab === "timeline" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Layers className="w-3.5 h-3.5" /> <span className="hidden xs:inline sm:inline">Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab("graph")}
              className={`px-3 py-2 text-xs flex items-center gap-1.5 transition-colors border-l border-border min-h-[40px] ${activeTab === "graph" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Brain className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Graph</span>
            </button>
          </div>
          <Button variant={showChat ? "hero" : "hero-outline"} size="sm" onClick={() => setShowChat(!showChat)} className="text-xs min-h-[40px] px-3">
            <MessageSquare className="w-3.5 h-3.5" /> <span className="hidden sm:inline ml-1">Memory</span>
          </Button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 md:px-6 py-3 border-b" style={{ borderColor: "hsl(220, 14%, 16%)", background: "hsl(220, 18%, 9%)" }}>
        <div className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search memories semantically..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 bg-muted/50 border-border text-sm h-9"
            />
          </div>
          {activeSearch && (
            <Button variant="ghost" size="sm" onClick={clearSearch} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button variant="hero-outline" size="sm" onClick={handleSearch} disabled={searching} className="h-9">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        </div>
        {activeSearch && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Showing {displayedMemories.length} result{displayedMemories.length !== 1 ? "s" : ""} for "{activeSearch}"
          </p>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {activeTab === "timeline" ? (
            <div className="p-4 sm:p-5 md:p-6 max-w-4xl mx-auto w-full">
              {memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                  <Brain className="w-12 h-12 opacity-30" />
                  <p className="text-sm text-center">No memories yet. <Link to="/upload" className="text-primary hover:underline">Upload documents</Link> to get started.</p>
                </div>
              ) : displayedMemories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                  <Search className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No memories match your search.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedMemories.map((memory: any, i: number) => {
                    const title = memory.content.split(" ").slice(0, 6).join(" ") + (memory.content.split(" ").length > 6 ? "..." : "");
                    const excerpt = memory.content.slice(0, 120) + (memory.content.length > 120 ? "..." : "");
                    const date = formatDate(memory.source_date ?? memory.created_at);
                    const sourceIcon = getSourceIcon(memory.source_file);
                    const similarity = (memory as any).similarity;
                    const isHighlighted = activeSearch && memory.content.toLowerCase().includes(activeSearch.toLowerCase());

                    return (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        className={`flex gap-3 md:gap-4 group`}
                      >
                        {/* Timeline dot */}
                        <div className="hidden sm:flex flex-col items-center flex-shrink-0 pt-3">
                          <div className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${isHighlighted ? "bg-primary border-primary" : "bg-card border-border group-hover:border-primary/50"} transition-colors`} />
                          {i < displayedMemories.length - 1 && (
                            <div className="w-px flex-1 bg-border mt-1 min-h-[20px]" />
                          )}
                        </div>

                        {/* Card */}
                        <div className={`flex-1 mb-3 p-4 md:p-5 rounded-xl border transition-all cursor-pointer min-h-[80px] ${
                          isHighlighted
                            ? "border-primary/40 bg-primary/5 shadow-[0_0_12px_hsl(173,70%,30%/0.15)]"
                            : "border-border bg-card hover:border-primary/20 hover:bg-card/80"
                        }`}
                          onClick={() => setSelectedMemory(memory)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base flex-shrink-0">{sourceIcon}</span>
                              <h3 className="font-semibold text-foreground text-sm truncate">{title}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {similarity !== undefined && (
                                <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                  {(similarity * 100).toFixed(0)}%
                                </span>
                              )}
                              {memory.fact_type && (
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden md:block">
                                  {memory.fact_type}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2.5">{excerpt}</p>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              {date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {date}
                                </span>
                              )}
                              {memory.source_file && (
                                <span className="flex items-center gap-1 truncate max-w-[120px] md:max-w-none">
                                  <FileText className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{memory.source_file}</span>
                                </span>
                              )}
                            </div>
                            <button
                              className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); setSelectedMemory(memory); }}
                            >
                              <Eye className="w-3 h-3" /> View full
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Graph View */
            <div className="h-full min-h-[60vh] md:min-h-[500px] relative">
              {memories.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Brain className="w-12 h-12 opacity-30" />
                  <p className="text-sm text-center px-4">No memories yet. <Link to="/upload" className="text-primary hover:underline">Upload documents</Link> to get started.</p>
                </div>
              ) : (
                <div className="w-full h-full min-h-[60vh] md:min-h-[500px]">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    fitView
                    fitViewOptions={{ padding: 0.25 }}
                    proOptions={{ hideAttribution: true }}
                    style={{ background: "hsl(220, 20%, 6%)" }}
                    minZoom={0.2}
                    maxZoom={3}
                    panOnScroll={false}
                    zoomOnPinch
                    panOnDrag
                  >
                    <Background color="hsl(220, 14%, 14%)" gap={40} size={1} />
                    <Controls style={{ background: "hsl(220, 18%, 12%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px" }} />
                  </ReactFlow>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Memory Chat Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="border-l flex flex-col fixed right-0 top-0 bottom-0 z-20 w-full sm:w-[380px] md:w-[400px] sm:relative sm:top-auto sm:bottom-auto sm:right-auto sm:z-auto"
              style={{ borderColor: "hsl(220, 14%, 16%)", background: "hsl(220, 18%, 9%)" }}
            >
              <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Memory Playground
                  <span className="text-xs text-muted-foreground font-normal hidden sm:inline">· try "respond like me"</span>
                </h3>
                <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {chatMessages.length === 0 && (
                  <div className="text-center mt-8 space-y-3">
                    <Brain className="w-8 h-8 text-primary/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">Ask anything about this vault's memories...</p>
                    <div className="space-y-2">
                      {["What facts are stored here?", "Summarize the key topics", "What dates are mentioned?"].map(q => (
                        <button key={q} onClick={() => setChatInput(q)}
                          className="block w-full text-left text-xs text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 border border-border rounded-lg px-3 py-2 transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] p-3 rounded-xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-xl flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border flex gap-2 flex-shrink-0">
                <Input
                  placeholder="Ask your vault..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChat()}
                  className="bg-muted/50 border-border text-base sm:text-sm min-h-[48px] sm:min-h-[40px]"
                  disabled={chatLoading}
                />
                <Button variant="hero" size="icon" onClick={handleChat} disabled={chatLoading || !chatInput.trim()} className="min-w-[48px] min-h-[48px] sm:min-h-[40px]">
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full Memory Modal */}
      <Dialog open={!!selectedMemory} onOpenChange={() => setSelectedMemory(null)}>
        <DialogContent className="bg-card border-border mx-4 w-[calc(100vw-2rem)] max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base leading-snug pr-6">
              {selectedMemory?.content.split(" ").slice(0, 8).join(" ")}{selectedMemory?.content.split(" ").length > 8 ? "..." : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedMemory && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedMemory.fact_type && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{selectedMemory.fact_type}</span>
                )}
                {selectedMemory.source_file && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {selectedMemory.source_file}
                  </span>
                )}
                {(selectedMemory.source_date ?? selectedMemory.created_at) && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDate(selectedMemory.source_date ?? selectedMemory.created_at)}
                  </span>
                )}
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedMemory.content}</p>
              </div>
              {selectedMemory.metadata && Object.keys(selectedMemory.metadata).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Relations & Metadata</p>
                  <div className="space-y-1">
                    {Object.entries(selectedMemory.metadata as Record<string, any>).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="text-muted-foreground font-mono">{k}:</span>
                        <span className="text-foreground">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
