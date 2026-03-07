import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Plus, Upload, Database, Search, Key, BarChart3, Folder, ArrowRight, LogOut, Loader2, Menu, X, Crown, ExternalLink, Trash2, AlertTriangle, Download, Webhook, Copy, Check, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PAYSTACK_LINK = "https://paystack.shop/pay/4b8mdpttkf";

function SidebarLink({ icon: Icon, label, active, href, onClick }: { icon: any; label: string; active?: boolean; href?: string; onClick?: () => void }) {
  const content = (
    <span className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </span>
  );
  if (href) return <Link to={href}>{content}</Link>;
  return <button className="w-full" onClick={onClick}>{content}</button>;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewVault, setShowNewVault] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [newVaultName, setNewVaultName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);

  const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const getWebhookUrl = (vaultId: string) =>
    `https://${PROJECT_ID}.supabase.co/functions/v1/memory-webhook/${vaultId}`;

  const copyWebhookUrl = (vaultId: string) => {
    navigator.clipboard.writeText(getWebhookUrl(vaultId));
    setCopiedWebhookId(vaultId);
    toast({ title: "Copied!", description: "Webhook URL copied to clipboard." });
    setTimeout(() => setCopiedWebhookId(null), 2000);
  };

  const { data: vaults = [], isLoading } = useQuery({
    queryKey: ["vaults", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaults")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isPro = profile?.plan === "pro";
  const vaultLimit = isPro ? Infinity : 1;
  const atVaultLimit = !isPro && vaults.length >= vaultLimit;

  const createVault = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("vaults")
        .insert({ user_id: user!.id, name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (vault) => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      setShowNewVault(false);
      setNewVaultName("");
      navigate(`/vault/${vault.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteVault = useMutation({
    mutationFn: async (id: string) => {
      // Delete all memories first
      await supabase.from("memories").delete().eq("vault_id", id);
      const { error } = await supabase.from("vaults").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setDeleteTarget(null);
      toast({ title: "Vault deleted", description: "Vault and all memories permanently removed." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleNewVaultClick = () => {
    if (atVaultLimit) {
      setShowUpgradeModal(true);
    } else {
      setShowNewVault(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const totalFacts = vaults.reduce((sum, v) => sum + (v.fact_count || 0), 0);
  const totalMemories = vaults.reduce((sum, v) => sum + (v.memory_count || 0), 0);
  const totalTokens = vaults.reduce((sum, v) => sum + (v.token_count || 0), 0);

  const formatTokens = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  const stats = [
    { label: "Total Memories", value: String(totalMemories), icon: Database },
    { label: "Facts Stored", value: String(totalFacts), icon: BarChart3 },
    { label: "Tokens Indexed", value: formatTokens(totalTokens), icon: Search },
    { label: "Vaults", value: String(vaults.length), icon: Key },
  ];

  const storageUsedMB = (profile?.storage_bytes ?? 0) / 1_000_000;
  const storageLimitMB = isPro ? Infinity : 5;
  const storagePercent = Math.min((storageUsedMB / Math.max(storageLimitMB, 0.001)) * 100, 100);

  const SidebarContent = () => (
    <>
      <Link to="/" className="flex items-center gap-2 mb-8 px-2" onClick={() => setSidebarOpen(false)}>
        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <span className="font-bold text-foreground">Eternova</span>
      </Link>
      <nav className="space-y-1 flex-1">
        <SidebarLink icon={Folder} label="Vaults" active onClick={() => setSidebarOpen(false)} />
        <SidebarLink icon={Upload} label="Upload" href="/upload" onClick={() => setSidebarOpen(false)} />
        <SidebarLink icon={Key} label="API Keys" href="/api" onClick={() => setSidebarOpen(false)} />
      </nav>
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
          <p className="text-primary font-semibold mb-1 flex items-center gap-1">
            {isPro && <Crown className="w-3 h-3" />}
            {isPro ? "Pro Plan" : "Free Plan"}
          </p>
          <p className="text-muted-foreground">{storageUsedMB.toFixed(1)} MB / {isPro ? "∞" : "5 MB"} used</p>
          {!isPro && (
            <>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${storagePercent}%` }} />
              </div>
              <p className="text-muted-foreground mt-1">{vaults.length}/1 vaults used</p>
            </>
          )}
          {!isPro && (
            <a href={PAYSTACK_LINK} target="_blank" rel="noopener noreferrer">
              <Button variant="hero" size="sm" className="w-full mt-3 text-xs h-7">Upgrade to Pro</Button>
            </a>
          )}
        </div>
        <SidebarLink icon={LogOut} label="Sign out" onClick={handleSignOut} />
      </div>
    </>
  );

  return (
    <div className="min-h-screen" style={{ background: "hsl(220, 20%, 6%)" }}>
      <div className="flex">
        {/* Desktop Sidebar — always visible on lg+ */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r p-5 flex-shrink-0" style={{ borderColor: "hsl(220, 14%, 16%)", background: "hsl(220, 18%, 8%)" }}>
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 lg:hidden"
                style={{ background: "rgba(0,0,0,0.6)" }}
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-72 z-50 flex flex-col p-4 lg:hidden border-r"
                style={{ background: "hsl(220, 18%, 8%)", borderColor: "hsl(220, 14%, 16%)" }}
              >
                <button
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 lg:p-10 overflow-x-hidden">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-5 lg:hidden">
            <div className="flex items-center gap-3">
              <button
                className="text-muted-foreground hover:text-foreground p-2 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg hover:bg-muted/50"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link to="/" className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground text-base">Eternova</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/upload">
                <Button variant="hero" size="sm" className="min-h-[44px] px-4">
                  <Upload className="w-4 h-4" /><span className="hidden sm:inline ml-1.5">Upload</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleNewVaultClick} className="min-h-[44px] px-3 text-muted-foreground hover:text-foreground">
                <Plus className="w-4 h-4" /><span className="hidden sm:inline ml-1.5">New</span>
              </Button>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">{user?.email ?? "Welcome back"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/upload"><Button variant="hero-outline"><Upload className="w-4 h-4" /> Quick Upload</Button></Link>
                <Button variant="hero" onClick={handleNewVaultClick}>
                  <Plus className="w-4 h-4" /> New Vault
                </Button>
                <Button variant="ghost" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground flex items-center gap-2 border border-border hover:border-border/80">
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </Button>
              </div>
            </div>

            {/* Mobile title */}
            <div className="lg:hidden mb-6">
              <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground text-xs mt-0.5 truncate">{user?.email ?? "Welcome back"}</p>
            </div>

            {/* Stats — 1 col mobile, 2 col sm, 4 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="p-4 md:p-5 rounded-xl border"
                  style={{ background: "hsl(220, 18%, 10%)", borderColor: "hsl(220, 14%, 18%)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{s.value}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">Your Vaults</h2>
              <Button variant="hero" size="sm" className="lg:hidden min-h-[44px] px-4" onClick={handleNewVaultClick}>
                <Plus className="w-4 h-4 mr-1" /> New Vault
              </Button>
            </div>

            {!isPro && vaults.length >= 1 && (
              <div className="mb-4 p-3 rounded-lg border border-primary/20 flex items-center justify-between gap-3" style={{ background: "hsl(175, 80%, 50%, 0.06)" }}>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary flex-shrink-0" />
                  Free tier: 1 vault max. Upgrade to Pro for unlimited vaults.
                </p>
                <a href={PAYSTACK_LINK} target="_blank" rel="noopener noreferrer">
                  <Button variant="hero" size="sm" className="text-xs h-7 whitespace-nowrap flex-shrink-0">Upgrade <ExternalLink className="w-3 h-3 ml-1" /></Button>
                </a>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {vaults.map((vault, i) => (
                  <motion.div key={vault.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}>
                    <div className="relative p-4 md:p-5 rounded-xl border transition-all duration-300 group"
                      style={{ background: "hsl(220, 18%, 10%)", borderColor: "hsl(220, 14%, 18%)" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(175, 80%, 50%, 0.3)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(220, 14%, 18%)")}>
                      {/* Action buttons — always visible on touch, hover on desktop */}
                      <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                         <button
                           onClick={async (e) => {
                             e.preventDefault(); e.stopPropagation();
                             const { data } = await supabase.from("memories").select("content, source_file, source_date, fact_type, created_at").eq("vault_id", vault.id);
                             const blob = new Blob([JSON.stringify({ vault: vault.name, exported_at: new Date().toISOString(), memories: data ?? [] }, null, 2)], { type: "application/json" });
                             const url = URL.createObjectURL(blob);
                             const a = document.createElement("a"); a.href = url; a.download = `${vault.name.replace(/\s+/g, "_")}_memories.json`; a.click(); URL.revokeObjectURL(url);
                           }}
                           className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                           title="Export memories as JSON"
                         >
                           <Download className="w-4 h-4" />
                         </button>
                         <button
                           onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: vault.id, name: vault.name }); }}
                           className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                           title="Delete vault"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>

                      <Link to={`/vault/${vault.id}`} className="block">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Folder className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                          </div>
                        </div>
                        <h3 className="font-semibold text-foreground mb-1 truncate pr-8">{vault.name}</h3>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{vault.description ?? "No description"}</p>
                        <div className="flex flex-wrap gap-2 md:gap-4 text-xs text-muted-foreground">
                          <span>{vault.fact_count} facts</span>
                          <span>{vault.memory_count} memories</span>
                          <span>{formatTokens(vault.token_count)} tokens</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Open vault <ArrowRight className="w-3 h-3" />
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                ))}

                {vaults.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No vaults yet. Create one to start building your memory.</p>
                  </div>
                )}

                {!atVaultLimit && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
                    <button onClick={handleNewVaultClick}
                      className="w-full min-h-[160px] md:min-h-[180px] p-5 rounded-xl border border-dashed flex flex-col items-center justify-center gap-3 transition-all group"
                      style={{ background: "hsl(220, 18%, 9%)", borderColor: "hsl(220, 14%, 20%)" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(175, 80%, 50%, 0.3)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(220, 14%, 20%)")}>
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Create new vault</span>
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Instant Webhook Section ─────────────────────────────────────────── */}
            {vaults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }} className="mt-10 md:mt-12">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold text-foreground">Instant Webhook for Zapier &amp; Agents</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-5 ml-11">
                  Paste this into Zapier or any agent to auto-save memory forever.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {vaults.map((vault) => (
                    <div
                      key={vault.id}
                      className="p-4 rounded-xl border flex flex-col gap-3"
                      style={{ background: "hsl(220, 18%, 10%)", borderColor: "hsl(220, 14%, 18%)" }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Webhook className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-medium text-foreground text-sm truncate">{vault.name}</span>
                      </div>

                      <div className="rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground break-all select-all" style={{ background: "hsl(220, 20%, 7%)", border: "1px solid hsl(220, 14%, 16%)" }}>
                        {getWebhookUrl(vault.id)}
                      </div>

                      <button
                        onClick={() => copyWebhookUrl(vault.id)}
                        className="flex items-center justify-center gap-2 w-full rounded-lg py-2.5 text-sm font-semibold transition-all min-h-[44px]"
                        style={{
                          background: copiedWebhookId === vault.id ? "hsl(142, 70%, 45%, 0.15)" : "hsl(175, 80%, 50%, 0.12)",
                          color: copiedWebhookId === vault.id ? "hsl(142, 70%, 55%)" : "hsl(175, 80%, 55%)",
                          border: `1px solid ${copiedWebhookId === vault.id ? "hsl(142, 70%, 45%, 0.3)" : "hsl(175, 80%, 50%, 0.25)"}`,
                        }}
                      >
                        {copiedWebhookId === vault.id ? (
                          <><Check className="w-4 h-4" /> Copied!</>
                        ) : (
                          <><Copy className="w-4 h-4" /> Copy Webhook URL</>
                        )}
                      </button>

                      <p className="text-xs text-muted-foreground">
                        POST <code className="text-primary/80">{"{ text, source }"}</code> · max 100/day
                      </p>
                    </div>
                  ))}
                </div>

                {/* Quick usage example */}
                <div className="mt-4 p-4 rounded-xl border" style={{ background: "hsl(220, 18%, 9%)", borderColor: "hsl(220, 14%, 16%)" }}>
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Quick Example (curl)</p>
                  <pre className="text-xs text-primary/80 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
{`curl -X POST "${vaults[0] ? getWebhookUrl(vaults[0].id) : "<webhook-url>"}" \\
  -H "X-API-Key: <your-api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Agent output here", "source": "claude-chat"}'`}
                  </pre>
                </div>
              </motion.div>
            )}
          </motion.div>
        </main>
      </div>

      {/* Create Vault Dialog */}
      <Dialog open={showNewVault} onOpenChange={setShowNewVault}>
        <DialogContent className="bg-card border-border mx-4 w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Vault</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="e.g. My Founder Brain"
              value={newVaultName}
              onChange={(e) => setNewVaultName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newVaultName.trim() && createVault.mutate(newVaultName.trim())}
              className="bg-muted/50 border-border"
            />
            <Button
              variant="hero"
              className="w-full"
              onClick={() => newVaultName.trim() && createVault.mutate(newVaultName.trim())}
              disabled={createVault.isPending || !newVaultName.trim()}
            >
              {createVault.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Vault"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-card border-border mx-4 w-[calc(100vw-2rem)] max-w-sm text-center">
          <div className="py-2">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-foreground text-lg mb-2">Delete Vault?</DialogTitle>
            <p className="text-muted-foreground text-sm mb-1">
              You are about to permanently delete <strong className="text-foreground">"{deleteTarget?.name}"</strong> and all its memories.
            </p>
            <p className="text-destructive text-xs mb-6 font-medium">This cannot be undone.</p>
            <div className="space-y-3">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => deleteTarget && deleteVault.mutate(deleteTarget.id)}
                disabled={deleteVault.isPending}
              >
                {deleteVault.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" /> Delete vault and all memories</>}
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-card border-border mx-4 w-[calc(100vw-2rem)] max-w-sm text-center">
          <div className="py-2">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-foreground text-lg mb-2">Vault Limit Reached</DialogTitle>
            <p className="text-muted-foreground text-sm mb-6">
              Free tier allows only <strong className="text-foreground">1 vault</strong>. Upgrade to Pro for unlimited vaults, 5MB+ storage, and unlimited queries.
            </p>
            <div className="space-y-3">
              <a href={PAYSTACK_LINK} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="hero" className="w-full">
                  <Crown className="w-4 h-4" /> Upgrade to Pro — $9/mo
                </Button>
              </a>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowUpgradeModal(false)}>
                Maybe later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
