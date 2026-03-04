import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Brain, Upload, Search, Key, Zap, Shield, ArrowRight, Database, Network, Code } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const features = [
  { icon: Upload, title: "Upload Anything", desc: "PDFs, chat exports, Notion zips, raw text. We handle the chaos." },
  { icon: Brain, title: "LLM Extraction", desc: "AI extracts clean facts, relations, and timestamps automatically." },
  { icon: Database, title: "Vector Storage", desc: "1536-dim embeddings stored in pgvector for instant semantic recall." },
  { icon: Network, title: "Knowledge Graph", desc: "Interactive graph visualization of your facts and relationships." },
  { icon: Search, title: "Semantic Search", desc: "Query your vault with natural language. Find anything, instantly." },
  { icon: Code, title: "Agent-Ready API", desc: "One REST endpoint. Works with Claude, LangGraph, any agent framework." },
];

const tiers = [
  { name: "Free", price: "$0", period: "forever", features: ["5 MB storage", "100 queries/month", "1 vault", "Community support"], cta: "Start Free", highlighted: false },
  { name: "Pro", price: "$9", period: "/mo", features: ["Unlimited storage", "Unlimited queries", "Unlimited vaults", "Priority support", "API access", "Custom embeddings"], cta: "Go Pro", highlighted: true },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-strong">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg text-foreground">VibeVault</span>
            <span className="text-xs text-muted-foreground font-mono ml-1">by ZeroTest Lab</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link to="/auth">
              <Button variant="hero-outline" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero" size="sm">Start Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] animate-pulse-glow" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div className="max-w-3xl mx-auto text-center" initial="hidden" animate="visible">
            <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-mono mb-8">
              <Zap className="w-3.5 h-3.5" />
              Personal memory for AI agents
            </motion.div>

            <motion.h1 custom={1} variants={fadeUp} className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6">
              Upload your chaos.{" "}
              <span className="gradient-text">Your agents remember forever.</span>
            </motion.h1>

            <motion.p custom={2} variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              The personal memory layer for indie agents and Claude projects. Extract facts, build knowledge graphs, query with natural language.
            </motion.p>

            <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="text-base px-8 h-12">
                  Start for free <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="hero-outline" size="lg" className="text-base px-8 h-12">See how it works</Button>
              </a>
            </motion.div>

            <motion.div custom={4} variants={fadeUp} className="mt-12 font-mono text-xs text-muted-foreground">
              <code className="px-3 py-1.5 rounded-md bg-muted/50 border border-border">
                {"curl -X POST vibevault.app/api/query -d '{message: \"What did I learn about RAG?\"}'"}
              </code>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-6">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything your agents need to <span className="gradient-text">remember</span></h2>
            <p className="text-muted-foreground max-w-lg mx-auto">From raw uploads to queryable knowledge — in seconds.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="group p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 relative">
        <div className="container mx-auto px-6">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, fair <span className="gradient-text">pricing</span></h2>
            <p className="text-muted-foreground">Start free. Scale when ready.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {tiers.map((tier, i) => (
              <motion.div key={tier.name} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className={`p-8 rounded-xl border relative ${tier.highlighted ? "border-primary/40 bg-primary/5 glow-primary" : "border-border bg-card"}`}>
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">Popular</div>
                )}
                <h3 className="text-lg font-semibold mb-1 text-foreground">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {tier.highlighted ? (
                  <a href="https://paystack.shop/pay/4b8mdpttkf" target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="hero" className="w-full">{tier.cta}</Button>
                  </a>
                ) : (
                  <Link to="/auth">
                    <Button variant="hero-outline" className="w-full">{tier.cta}</Button>
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">VibeVault</span>
            <span className="text-xs text-muted-foreground font-mono">by ZeroTest Lab</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <p>&copy; 2026 ZeroTest Lab. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
