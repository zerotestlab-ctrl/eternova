import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Plus, Upload, Database, Search, Key, BarChart3, Folder, MoreHorizontal, ArrowRight, LogOut, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function SidebarLink({ icon: Icon, label, active, href, onClick }: { icon: any; label: string; active?: boolean; href?: string; onClick?: () => void }) {
  const content = (
    <span className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`}>
      <Icon className="w-4 h-4" />
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
  const [newVaultName, setNewVaultName] = useState("");

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
  const storageLimitMB = profile?.plan === "pro" ? Infinity : 5;
  const storagePercent = Math.min((storageUsedMB / Math.max(storageLimitMB, 0.001)) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-border bg-card/50 p-4">
          <Link to="/" className="flex items-center gap-2 mb-8 px-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">VibeVault</span>
          </Link>
          <nav className="space-y-1 flex-1">
            <SidebarLink icon={Folder} label="Vaults" active />
            <SidebarLink icon={Upload} label="Upload" href="/upload" />
            <SidebarLink icon={Key} label="API Keys" href="/api" />
          </nav>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
              <p className="text-primary font-semibold mb-1">{profile?.plan === "pro" ? "Pro Plan" : "Free Plan"}</p>
              <p className="text-muted-foreground">{storageUsedMB.toFixed(1)} MB / {profile?.plan === "pro" ? "∞" : "5 MB"} used</p>
              {profile?.plan !== "pro" && (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${storagePercent}%` }} />
                </div>
              )}
              {profile?.plan !== "pro" && (
                <a href="https://paystack.shop/pay/4b8mdpttkf" target="_blank" rel="noopener noreferrer">
                  <Button variant="hero" size="sm" className="w-full mt-3 text-xs h-7">Upgrade to Pro</Button>
                </a>
              )}
            </div>
            <SidebarLink icon={LogOut} label="Sign out" onClick={signOut} />
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-10">
          <div className="lg:hidden flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">VibeVault</span>
            </Link>
            <Link to="/upload"><Button variant="hero" size="sm"><Upload className="w-4 h-4" /> Upload</Button></Link>
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {user?.email ?? "Welcome back"}
                </p>
              </div>
              <div className="hidden md:flex gap-3">
                <Link to="/upload"><Button variant="hero-outline"><Upload className="w-4 h-4" /> Quick Upload</Button></Link>
                <Button variant="hero" onClick={() => setShowNewVault(true)}><Plus className="w-4 h-4" /> New Vault</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </motion.div>
              ))}
            </div>

            <h2 className="text-lg font-semibold text-foreground mb-4">Your Vaults</h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {vaults.map((vault, i) => (
                  <motion.div key={vault.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}>
                    <Link to={`/vault/${vault.id}`} className="block p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Folder className="w-5 h-5 text-primary" />
                        </div>
                        <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{vault.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{vault.description ?? "No description"}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{vault.fact_count} facts</span>
                        <span>{vault.memory_count} memories</span>
                        <span>{formatTokens(vault.token_count)} tokens</span>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Open vault <ArrowRight className="w-3 h-3" />
                      </div>
                    </Link>
                  </motion.div>
                ))}

                {vaults.length === 0 && (
                  <div className="col-span-full text-center py-16 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No vaults yet. Create one to start building your memory.</p>
                  </div>
                )}

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
                  <button onClick={() => setShowNewVault(true)}
                    className="w-full h-full min-h-[180px] p-5 rounded-xl border border-dashed border-border hover:border-primary/30 bg-card/50 flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Create new vault</span>
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </main>
      </div>

      <Dialog open={showNewVault} onOpenChange={setShowNewVault}>
        <DialogContent className="bg-card border-border">
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
    </div>
  );
}
