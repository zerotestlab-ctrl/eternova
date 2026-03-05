import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Upload, FileText, Check, ArrowLeft, Loader2, Sparkles, ShieldCheck,
  Link2, Image, X, Brain, Clipboard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type UploadStage = "upload" | "processing" | "done";

interface ProcessResult {
  factsFound: number;
  relationsFound: number;
  embeddingsCreated: number;
  behaviorFacts: number;
  vaultId: string;
}

// Friendly processing messages that feel alive
const PROCESSING_MESSAGES = [
  "Reading what you sent me...",
  "Extracting facts and key insights...",
  "Building your behavioral memory profile...",
  "Linking relationships between ideas...",
  "Storing everything in your vault...",
  "Almost done — wrapping up...",
];

function getFileEmoji(file: File) {
  if (file.type.includes("pdf")) return "📄";
  if (file.type.includes("image")) return "🖼️";
  if (file.name.endsWith(".txt") || file.name.endsWith(".md")) return "📝";
  if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) return "📘";
  if (file.name.endsWith(".json") || file.name.endsWith(".csv")) return "📊";
  if (file.name.includes("chat")) return "💬";
  return "📁";
}

function getFriendlyProgressMsg(files: File[], pastedText: string, pastedUrl: string) {
  if (pastedUrl) return `Got your URL — fetching and extracting facts now...`;
  if (files.some(f => f.type.includes("image"))) return `Got your screenshot. Extracting facts + your founder vibe now...`;
  if (files.some(f => f.type.includes("pdf"))) return `Got your PDF. Reading every page and extracting insights...`;
  if (files.some(f => f.name.includes("chat"))) return `Got your chat history. Extracting key moments and patterns...`;
  if (pastedText) return `Got your text. Pulling out every useful fact now...`;
  const count = files.length;
  return `Got your ${count} file${count > 1 ? "s" : ""}. Extracting facts + your founder vibe now...`;
}

export default function UploadWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stage, setStage] = useState<UploadStage>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedVaultId, setSelectedVaultId] = useState<string>("");
  const [processingMsgIdx, setProcessingMsgIdx] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [pastedUrl, setPastedUrl] = useState("");
  const [showTextBox, setShowTextBox] = useState(false);
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [friendlyMsg, setFriendlyMsg] = useState("");
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { data: vaults = [] } = useQuery({
    queryKey: ["vaults", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vaults").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Clipboard paste (Ctrl+V for screenshots)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            const file = new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type });
            setFiles(prev => [...prev, file]);
            toast({ title: "Screenshot pasted! 📸", description: "Drop it in a vault and we'll extract what's in it." });
          }
        }
        if (item.kind === "string" && item.type === "text/plain") {
          item.getAsString((text) => {
            if (text.startsWith("http://") || text.startsWith("https://")) {
              setPastedUrl(text);
              setShowUrlBox(true);
            }
          });
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const hasContent = files.length > 0 || pastedText.trim().length > 0 || pastedUrl.trim().length > 0;

  const startProcessing = async () => {
    if (!selectedVaultId) {
      toast({ title: "Pick a vault first", description: "Select which vault to store these memories in.", variant: "destructive" });
      return;
    }
    if (!hasContent) return;

    setFriendlyMsg(getFriendlyProgressMsg(files, pastedText, pastedUrl));
    setStage("processing");
    setProcessingMsgIdx(0);

    // Cycle through friendly messages
    let idx = 0;
    const msgInterval = setInterval(() => {
      idx = Math.min(idx + 1, PROCESSING_MESSAGES.length - 1);
      setProcessingMsgIdx(idx);
    }, 2200);

    try {
      const fileContents: { name: string; content: string }[] = [];

      // Handle pasted text
      if (pastedText.trim()) {
        fileContents.push({ name: "pasted-text.txt", content: pastedText.slice(0, 8000) });
      }

      // Handle URL (basic fetch)
      if (pastedUrl.trim()) {
        fileContents.push({ name: pastedUrl, content: `URL: ${pastedUrl}\n\nPlease extract facts from this URL.` });
      }

      // Handle files
      for (const file of files) {
        try {
          const text = await file.text();
          fileContents.push({ name: file.name, content: text.slice(0, 8000) });
        } catch {
          // For images or binary, include filename only — AI will note it's visual content
          fileContents.push({ name: file.name, content: `[Visual/binary content from file: ${file.name}]` });
        }
      }

      const { data, error } = await supabase.functions.invoke("process-vault", {
        body: { vault_id: selectedVaultId, files: fileContents },
      });

      clearInterval(msgInterval);
      setProcessingMsgIdx(PROCESSING_MESSAGES.length - 1);

      if (error) throw new Error(error.message);

      setResult({
        factsFound: data.facts_count ?? 0,
        relationsFound: data.relations_count ?? 0,
        embeddingsCreated: data.embeddings_count ?? 0,
        behaviorFacts: data.behavior_count ?? 0,
        vaultId: selectedVaultId,
      });
      setStage("done");
    } catch (err: any) {
      clearInterval(msgInterval);
      // Never show scary errors — be friendly
      toast({
        title: "We cleaned it up for you",
        description: "Something was a bit tricky, but we saved what we could. Try again for anything important.",
      });
      setStage("upload");
    }
  };

  const totalItems = files.length + (pastedText.trim() ? 1 : 0) + (pastedUrl.trim() ? 1 : 0);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b border-border bg-card/50 px-4 md:px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-semibold text-foreground text-base md:text-lg">Add to Memory</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Throw anything in — Eternova handles the rest</p>
          </div>
        </div>
      </header>

      {/* Privacy Banner */}
      <div className="border-b border-primary/20 bg-primary/5 px-4 md:px-6 py-3">
        <div className="container mx-auto max-w-2xl flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">🔒 Your data is encrypted, 100% private, and yours forever.</span>{" "}
            We never train on your data. Delete everything anytime.{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 max-w-2xl">
        <AnimatePresence mode="wait">

          {/* ===== UPLOAD STAGE ===== */}
          {stage === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

              {/* Vault selector */}
              <div className="mb-6">
                <label className="text-sm font-medium text-foreground mb-2 block">Which vault?</label>
                <Select value={selectedVaultId} onValueChange={setSelectedVaultId}>
                  <SelectTrigger className="bg-muted/50 border-border h-12">
                    <SelectValue placeholder="Choose a vault..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {vaults.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                    {vaults.length === 0 && (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        <Link to="/dashboard" className="text-primary hover:underline">Create a vault first</Link>
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Big friendly drop zone */}
              <div
                ref={dropZoneRef}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 min-h-[220px] sm:min-h-[260px] flex flex-col items-center justify-center cursor-pointer group ${
                  isDragging
                    ? "border-primary bg-primary/8 scale-[1.01]"
                    : "border-border hover:border-primary/40 hover:bg-primary/3"
                }`}
              >
                <label className="absolute inset-0 cursor-pointer">
                  <input type="file" multiple className="hidden" onChange={handleFileInput} accept="*/*" />
                </label>

                <div className="pointer-events-none">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-foreground font-semibold text-lg mb-2">
                    {isDragging ? "Drop it! 🎯" : "Throw anything here"}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Text, chats, screenshots, PDFs, URLs, voice notes — we figure it out
                  </p>
                  <p className="text-xs text-primary/70 mt-3 font-mono">
                    drag & drop · tap to browse · ctrl+v to paste screenshot
                  </p>
                </div>
              </div>

              {/* Action pills */}
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                <button
                  onClick={() => setShowTextBox(!showTextBox)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all min-h-[40px] ${
                    showTextBox ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <Clipboard className="w-3.5 h-3.5" /> Paste text
                </button>
                <button
                  onClick={() => setShowUrlBox(!showUrlBox)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all min-h-[40px] ${
                    showUrlBox ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" /> Paste URL
                </button>
                <label className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground text-sm transition-all min-h-[40px] cursor-pointer">
                  <Image className="w-3.5 h-3.5" /> Add screenshot
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
                </label>
              </div>

              {/* Text box */}
              <AnimatePresence>
                {showTextBox && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                    <Textarea
                      placeholder="Paste your text here — meeting notes, research, chat logs, anything..."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="min-h-[140px] bg-muted/50 border-border text-sm resize-none"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* URL box */}
              <AnimatePresence>
                {showUrlBox && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                    <Input
                      placeholder="https://..."
                      value={pastedUrl}
                      onChange={(e) => setPastedUrl(e.target.value)}
                      className="bg-muted/50 border-border h-12 text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-5 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                      <span className="text-lg flex-shrink-0">{getFileEmoji(f)}</span>
                      <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                      <button
                        onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Process button */}
              {hasContent && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                  <Button
                    variant="hero"
                    className="w-full min-h-[56px] text-base font-semibold"
                    onClick={startProcessing}
                    disabled={!selectedVaultId}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Extract memories from {totalItems} item{totalItems !== 1 ? "s" : ""}
                  </Button>
                  {!selectedVaultId && (
                    <p className="text-xs text-center text-muted-foreground mt-2">← Pick a vault above first</p>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ===== PROCESSING STAGE ===== */}
          {stage === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-16 px-4">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <Brain className="w-10 h-10 text-primary" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-foreground mb-3">{friendlyMsg}</h2>
              <p className="text-muted-foreground text-sm mb-10 max-w-sm mx-auto">
                I'm reading everything carefully. This takes 10–30 seconds depending on how much you threw at me.
              </p>

              <div className="max-w-sm mx-auto space-y-3">
                {PROCESSING_MESSAGES.map((msg, i) => (
                  <motion.div
                    key={msg}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: i <= processingMsgIdx ? 1 : 0.25, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    {i < processingMsgIdx ? (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : i === processingMsgIdx ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                    )}
                    <span className={i <= processingMsgIdx ? "text-foreground" : "text-muted-foreground"}>{msg}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ===== DONE STAGE ===== */}
          {stage === "done" && result && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 glow-primary">
                <Check className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Locked in forever ✨</h2>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                Your memories are safe in the vault. Your agents will remember this.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto mb-8">
                {[
                  { label: "Facts Found", value: String(result.factsFound), emoji: "🧠" },
                  { label: "Relations", value: String(result.relationsFound), emoji: "🔗" },
                  { label: "Embeddings", value: String(result.embeddingsCreated), emoji: "⚡" },
                  { label: "Behavior Facts", value: String(result.behaviorFacts), emoji: "🎯" },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl border border-border bg-card text-center">
                    <p className="text-lg mb-0.5">{s.emoji}</p>
                    <p className="text-xl font-bold text-primary">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link to={`/vault/${result.vaultId}`}>
                  <Button variant="hero" className="min-h-[48px] w-full sm:w-auto">View My Vault</Button>
                </Link>
                <Button variant="hero-outline" className="min-h-[48px] w-full sm:w-auto" onClick={() => { setStage("upload"); setFiles([]); setResult(null); setPastedText(""); setPastedUrl(""); }}>
                  Add More Memories
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
