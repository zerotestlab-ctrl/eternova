import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Check, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type UploadStage = "upload" | "processing" | "done";

interface ProcessResult {
  factsFound: number;
  relationsFound: number;
  embeddingsCreated: number;
  vaultId: string;
}

export default function UploadWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stage, setStage] = useState<UploadStage>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedVaultId, setSelectedVaultId] = useState<string>("");
  const [processingStep, setProcessingStep] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const { data: vaults = [] } = useQuery({
    queryKey: ["vaults", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vaults").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const startProcessing = async () => {
    if (!selectedVaultId) {
      toast({ title: "Select a vault", description: "Please select or create a vault first", variant: "destructive" });
      return;
    }
    if (files.length === 0) return;

    setStage("processing");
    setProcessingStep(0);

    try {
      // Read file contents
      const fileContents: { name: string; content: string }[] = [];
      for (const file of files) {
        const text = await file.text();
        fileContents.push({ name: file.name, content: text.slice(0, 8000) });
      }
      setProcessingStep(1);

      // Call edge function to extract facts and store embeddings
      const { data, error } = await supabase.functions.invoke("process-vault", {
        body: {
          vault_id: selectedVaultId,
          files: fileContents,
        },
      });

      setProcessingStep(2);

      if (error) throw new Error(error.message);

      setProcessingStep(3);
      setResult({
        factsFound: data.facts_count ?? 0,
        relationsFound: data.relations_count ?? 0,
        embeddingsCreated: data.embeddings_count ?? 0,
        vaultId: selectedVaultId,
      });
      setStage("done");
    } catch (err: any) {
      toast({ title: "Processing failed", description: err.message, variant: "destructive" });
      setStage("upload");
    }
  };

  const stepNames = ["Upload", "Processing", "Complete"];
  const stages: UploadStage[] = ["upload", "processing", "done"];
  const stageIndex = stages.indexOf(stage);

  const processingSteps = ["Parsing documents...", "Extracting facts with AI...", "Generating embeddings..."];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 px-4 md:px-6 py-3 flex items-center gap-3">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="font-semibold text-foreground text-sm md:text-base">Upload Wizard</h1>
          <p className="text-xs text-muted-foreground">Upload documents to extract memories</p>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-2xl">
        <div className="flex items-center gap-2 md:gap-4 mb-8 md:mb-12 overflow-x-auto pb-1">
          {stepNames.map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < stageIndex ? "bg-primary text-primary-foreground" : i === stageIndex ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground"
              }`}>{i < stageIndex ? <Check className="w-4 h-4" /> : i + 1}</div>
              <span className={`text-sm ${i === stageIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>{step}</span>
              {i < 2 && <div className={`flex-1 h-px ${i < stageIndex ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {stage === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Vault selector */}
              <div className="mb-6">
                <label className="text-sm font-medium text-foreground mb-2 block">Select Vault</label>
                <Select value={selectedVaultId} onValueChange={setSelectedVaultId}>
                  <SelectTrigger className="bg-muted/50 border-border">
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

              <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-2">Drop files here or click to browse</p>
                <p className="text-sm text-muted-foreground mb-4">PDFs, TXT, chat exports, Notion ZIP</p>
                <label>
                  <input type="file" multiple className="hidden" onChange={handleFileInput} accept=".pdf,.txt,.md,.zip,.json,.csv" />
                  <Button variant="hero-outline" size="sm" asChild><span>Browse files</span></Button>
                </label>
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                    </div>
                  ))}
                  <Button variant="hero" className="w-full mt-4" onClick={startProcessing} disabled={!selectedVaultId}>
                    <Sparkles className="w-4 h-4" /> Process {files.length} file{files.length > 1 ? "s" : ""} with AI
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {stage === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-16">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Extracting memories...</h2>
              <p className="text-muted-foreground text-sm">AI is reading your documents, extracting facts and building relations</p>
              <div className="mt-8 max-w-sm mx-auto space-y-3">
                {processingSteps.map((step, i) => (
                  <motion.div key={step} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.8 }}
                    className={`flex items-center gap-3 text-sm ${i <= processingStep ? "opacity-100" : "opacity-30"}`}>
                    {i < processingStep ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    )}
                    <span className="text-muted-foreground">{step}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "done" && result && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 glow-primary">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Processing complete!</h2>
              <p className="text-muted-foreground mb-8">Your vault has been updated with new memories</p>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                {[
                  { label: "Facts Found", value: String(result.factsFound) },
                  { label: "Relations", value: String(result.relationsFound) },
                  { label: "Embeddings", value: String(result.embeddingsCreated) },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg border border-border bg-card text-center">
                    <p className="text-xl font-bold text-primary">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-3">
                <Link to={`/vault/${result.vaultId}`}><Button variant="hero">View Vault</Button></Link>
                <Button variant="hero-outline" onClick={() => { setStage("upload"); setFiles([]); setResult(null); }}>Upload More</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
