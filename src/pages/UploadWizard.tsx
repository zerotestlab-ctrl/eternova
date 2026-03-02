import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, ArrowLeft, Loader2, Sparkles } from "lucide-react";

type UploadStage = "upload" | "processing" | "done";

export default function UploadWizard() {
  const [stage, setStage] = useState<UploadStage>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const startProcessing = () => {
    setStage("processing");
    setTimeout(() => setStage("done"), 3000);
  };

  const stepNames = ["Upload", "Processing", "Complete"];
  const stages: UploadStage[] = ["upload", "processing", "done"];
  const stageIndex = stages.indexOf(stage);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 px-6 py-3 flex items-center gap-4">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="font-semibold text-foreground">Upload Wizard</h1>
          <p className="text-xs text-muted-foreground">Upload documents to extract memories</p>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <div className="flex items-center gap-4 mb-12">
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
                    </div>
                  ))}
                  <Button variant="hero" className="w-full mt-4" onClick={startProcessing}>
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
                {["Parsing documents...", "Extracting facts with LLM...", "Generating embeddings..."].map((step, i) => (
                  <motion.div key={step} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.8 }} className="flex items-center gap-3 text-sm">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span className="text-muted-foreground">{step}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 glow-primary">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Processing complete!</h2>
              <p className="text-muted-foreground mb-8">Your vault has been updated with new memories</p>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                {[{ label: "Facts Found", value: "47" }, { label: "Relations", value: "23" }, { label: "Embeddings", value: "47" }].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg border border-border bg-card text-center">
                    <p className="text-xl font-bold text-primary">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-3">
                <Link to="/vault/1"><Button variant="hero">View Vault</Button></Link>
                <Button variant="hero-outline" onClick={() => { setStage("upload"); setFiles([]); }}>Upload More</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
