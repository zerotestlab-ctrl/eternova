import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Brain, Plus, Upload, Database, Search, Key, BarChart3, Folder, MoreHorizontal, ArrowRight } from "lucide-react";

const mockVaults = [
  { id: "1", name: "My Founder Brain", facts: 342, memories: 89, tokens: "1.2M", lastUpdated: "2 hours ago" },
  { id: "2", name: "Product Research", facts: 156, memories: 45, tokens: "560K", lastUpdated: "1 day ago" },
  { id: "3", name: "Claude Project Notes", facts: 78, memories: 23, tokens: "230K", lastUpdated: "3 days ago" },
];

const stats = [
  { label: "Total Memories", value: "157", icon: Database },
  { label: "Facts Stored", value: "576", icon: BarChart3 },
  { label: "Tokens Indexed", value: "1.99M", icon: Search },
  { label: "API Queries", value: "43", icon: Key },
];

function SidebarLink({ icon: Icon, label, active, href }: { icon: any; label: string; active?: boolean; href?: string }) {
  const content = (
    <span className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`}>
      <Icon className="w-4 h-4" />
      {label}
    </span>
  );
  return href ? <Link to={href}>{content}</Link> : <button className="w-full">{content}</button>;
}

export default function Dashboard() {
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
            <SidebarLink icon={Search} label="Search" />
            <SidebarLink icon={Key} label="API Keys" href="/api" />
            <SidebarLink icon={BarChart3} label="Usage" />
          </nav>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
            <p className="text-primary font-semibold mb-1">Free Plan</p>
            <p className="text-muted-foreground">2.1 MB / 5 MB used</p>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[42%] rounded-full bg-primary" />
            </div>
            <Button variant="hero" size="sm" className="w-full mt-3 text-xs h-7">Upgrade to Pro</Button>
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
                <p className="text-muted-foreground text-sm mt-1">Manage your memory vaults</p>
              </div>
              <div className="hidden md:flex gap-3">
                <Link to="/upload"><Button variant="hero-outline"><Upload className="w-4 h-4" /> Quick Upload</Button></Link>
                <Button variant="hero"><Plus className="w-4 h-4" /> New Vault</Button>
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
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockVaults.map((vault, i) => (
                <motion.div key={vault.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}>
                  <Link to={`/vault/${vault.id}`} className="block p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Folder className="w-5 h-5 text-primary" />
                      </div>
                      <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{vault.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">Updated {vault.lastUpdated}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{vault.facts} facts</span>
                      <span>{vault.memories} memories</span>
                      <span>{vault.tokens} tokens</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Open vault <ArrowRight className="w-3 h-3" />
                    </div>
                  </Link>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
                <button className="w-full h-full min-h-[180px] p-5 rounded-xl border border-dashed border-border hover:border-primary/30 bg-card/50 flex flex-col items-center justify-center gap-3 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Create new vault</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
