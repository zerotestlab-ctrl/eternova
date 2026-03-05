import { Link } from "react-router-dom";
import { Brain, Shield, Lock, Trash2, Server, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/40 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground">Eternova</span>
            <span className="text-xs text-muted-foreground font-mono ml-1">by ZeroTest Lab</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: March 2026 · Eternova by ZeroTest Lab</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Our Core Principles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Lock, title: "You own your data", desc: "Everything you upload belongs to you. We make no claim on your content, ever." },
                { icon: Shield, title: "We never train on it", desc: "Your memories and documents are never used to train AI models — by us or any third party." },
                { icon: Trash2, title: "Full deletion on request", desc: "Request account deletion at any time and all your data is permanently erased within 48 hours." },
                { icon: Server, title: "Encrypted at rest", desc: "All data is stored with AES-256 encryption. Queries are processed with TLS in transit." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-4 rounded-xl border border-border/60 bg-card">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-semibold text-foreground text-sm">{title}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Data We Collect</h2>
            <p className="text-muted-foreground mb-3">We collect only what is necessary to operate the service:</p>
            <ul className="space-y-2 text-muted-foreground list-none">
              {[
                "Your email address, used solely for authentication and essential service notifications.",
                "Documents and files you upload, stored securely to power your vaults and memory search.",
                "AI-extracted facts from your documents, stored as memories in your private vaults.",
                "Basic usage metadata (query counts, storage bytes) to enforce plan limits.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">How We Process Your Queries</h2>
            <p className="text-muted-foreground mb-3">
              When you ask a question in the Memory Playground or via the API, your query and relevant memory context are sent to our AI provider (Google Gemini via Lovable AI Gateway) to generate an answer. This processing is ephemeral — queries are not stored by the AI provider and not used for training.
            </p>
            <p className="text-muted-foreground">
              All AI calls are routed through secure server-side edge functions. Your API keys or service credentials never touch the frontend code.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Infrastructure & Security</h2>
            <ul className="space-y-2 text-muted-foreground list-none">
              {[
                "Database: PostgreSQL with Row Level Security enforced on all tables.",
                "Storage encryption: AES-256 at rest, TLS 1.3 in transit.",
                "Authentication: Email verification and optional OAuth.",
                "AI processing: Lovable AI Gateway — queries processed in-flight, not persisted.",
                "Hosting: Deployed on secure cloud infrastructure with automatic backups.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Your Rights</h2>
            <p className="text-muted-foreground mb-3">You have full control over your data:</p>
            <ul className="space-y-2 text-muted-foreground list-none">
              {[
                "Export: Download all your memories as JSON from any vault at any time.",
                "Delete: Remove individual memories, entire vaults, or your full account.",
                "Access: View all data we hold about you through the dashboard.",
                "Correction: Update your profile and preferences at any time.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Contact</h2>
            <p className="text-muted-foreground">
              For privacy questions, data deletion requests, or security disclosures, contact ZeroTest Lab. We respond to all requests within 48 hours.
            </p>
          </section>

          <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 text-center">
            <p className="text-foreground font-semibold mb-1">Your data is encrypted, private, and yours forever.</p>
            <p className="text-muted-foreground text-xs">Eternova is built on the principle that personal memory is sacred.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 px-6 py-8 mt-10">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 ZeroTest Lab · Eternova</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
