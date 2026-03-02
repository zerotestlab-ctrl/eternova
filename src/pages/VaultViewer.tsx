import { useState } from "react";
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
import { Search, ArrowLeft, MessageSquare, Sparkles, Clock, X } from "lucide-react";

const nodeStyle = (highlight = false) => ({
  background: "hsl(220, 18%, 12%)",
  color: "hsl(210, 20%, 92%)",
  border: highlight ? "1px solid hsl(175, 80%, 50%, 0.3)" : "1px solid hsl(220, 14%, 20%)",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "13px",
  fontWeight: highlight ? 600 : 400,
});

const mockNodes: Node[] = [
  { id: "1", position: { x: 250, y: 0 }, data: { label: "RAG Architecture" }, style: nodeStyle(true) },
  { id: "2", position: { x: 0, y: 120 }, data: { label: "Chunking Strategies" }, style: nodeStyle() },
  { id: "3", position: { x: 300, y: 140 }, data: { label: "Embedding Models" }, style: nodeStyle() },
  { id: "4", position: { x: 500, y: 100 }, data: { label: "Vector DBs" }, style: nodeStyle(true) },
  { id: "5", position: { x: 100, y: 280 }, data: { label: "Semantic Search" }, style: nodeStyle() },
  { id: "6", position: { x: 400, y: 260 }, data: { label: "Hybrid Retrieval" }, style: nodeStyle() },
];

const edgeStyle = { stroke: "hsl(175, 80%, 50%, 0.4)" };
const dimEdgeStyle = { stroke: "hsl(220, 14%, 25%)" };

const mockEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(175, 80%, 50%, 0.4)" } },
  { id: "e1-3", source: "1", target: "3", style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(175, 80%, 50%, 0.4)" } },
  { id: "e1-4", source: "1", target: "4", style: { stroke: "hsl(175, 80%, 50%, 0.3)" } },
  { id: "e2-5", source: "2", target: "5", style: dimEdgeStyle },
  { id: "e3-6", source: "3", target: "6", style: dimEdgeStyle },
  { id: "e5-6", source: "5", target: "6", style: dimEdgeStyle },
];

const mockSearchResults = [
  { id: "1", fact: "RAG systems perform better with recursive chunking of 512 tokens with 50-token overlap", score: 0.94, source: "research-notes.pdf", date: "2025-12-15" },
  { id: "2", fact: "text-embedding-3-large produces 1536-dim vectors, best balance of quality and cost", score: 0.89, source: "model-comparison.txt", date: "2025-12-10" },
  { id: "3", fact: "Hybrid search combining BM25 + vector similarity improves recall by 23%", score: 0.85, source: "experiment-logs.md", date: "2025-11-28" },
];

export default function VaultViewer() {
  const { id } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  const handleChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { role: "user", content: chatInput },
      { role: "assistant", content: "Based on your vault, RAG systems work best with recursive chunking (512 tokens, 50-token overlap) combined with text-embedding-3-large for 1536-dim vectors. Hybrid retrieval with BM25 improves recall by 23%." },
    ]);
    setChatInput("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-foreground">My Founder Brain</h1>
            <p className="text-xs text-muted-foreground">342 facts &middot; 89 memories &middot; 1.2M tokens</p>
          </div>
        </div>
        <Button variant={showChat ? "hero" : "hero-outline"} size="sm" onClick={() => setShowChat(!showChat)}>
          <MessageSquare className="w-4 h-4" /> Test Memory
        </Button>
      </header>

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search your vault semantically..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted/50 border-border" />
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row">
            <div className="flex-1 min-h-[400px]">
              <ReactFlow nodes={mockNodes} edges={mockEdges} fitView proOptions={{ hideAttribution: true }} style={{ background: "hsl(220, 20%, 6%)" }}>
                <Background color="hsl(220, 14%, 14%)" gap={40} size={1} />
                <Controls style={{ background: "hsl(220, 18%, 12%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px" }} />
              </ReactFlow>
            </div>

            {searchQuery && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-96 border-l border-border bg-card/50 p-4 overflow-y-auto">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Semantic Results
                </h3>
                <div className="space-y-3">
                  {mockSearchResults.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border border-border bg-background hover:border-primary/20 transition-colors">
                      <p className="text-sm text-foreground mb-2">{r.fact}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="text-primary font-mono">{(r.score * 100).toFixed(0)}% match</span>
                        <span>{r.source}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.date}</span>
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
              {chatMessages.length === 0 && <p className="text-sm text-muted-foreground text-center mt-8">Ask anything about this vault&apos;s memories...</p>}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Input placeholder="Ask your vault..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChat()} className="bg-muted/50 border-border" />
              <Button variant="hero" size="icon" onClick={handleChat}><Sparkles className="w-4 h-4" /></Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
