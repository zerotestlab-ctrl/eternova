import { useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Copy, Check, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ZapierPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const { data: vaults = [] } = useQuery({
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

  const webhookUrl = vaults[0]
    ? `https://${PROJECT_ID}.supabase.co/functions/v1/memory-webhook/${vaults[0].id}`
    : null;

  const handleCopy = () => {
    if (!webhookUrl) {
      toast({ title: "No vault found", description: "Create a vault first in the Dashboard.", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({ title: "Copied!", description: "Webhook URL copied to clipboard." });
    setTimeout(() => setCopied(false), 2500);
  };

  const steps = [
    { n: "1", text: "Click 'Copy My Webhook URL' below" },
    { n: "2", text: "Click 'Open Ready Zapier Template'" },
    { n: "3", text: "Paste the URL and turn on the Zap" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border py-4 px-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-foreground">Eternova</span>
        </Link>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono mb-6">
            <Zap className="w-3 h-3" />
            60-second setup
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-4 leading-tight">
            Instant Zapier Memory
          </h1>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Give any AI agent permanent memory — no code, no API keys.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3 mb-10">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-3 w-full rounded-xl py-4 text-base font-black transition-all min-h-[56px] shadow-lg"
              style={{
                background: copied ? "hsl(142, 60%, 35%)" : "hsl(142, 65%, 42%)",
                color: "hsl(0, 0%, 100%)",
                boxShadow: "0 4px 24px hsl(142, 70%, 45% / 0.35)",
              }}
            >
              {copied ? (
                <><Check className="w-5 h-5" /> Copied! ✓</>
              ) : (
                <><Copy className="w-5 h-5" /> Copy My Webhook URL</>
              )}
            </button>

            <a
              href="https://zapier.com/shared/5e143bc89ccdc157b31c86abb8435e4970809173"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full rounded-xl py-4 text-base font-black transition-all min-h-[56px] shadow-lg"
              style={{
                background: "linear-gradient(135deg, hsl(210, 90%, 50%), hsl(200, 85%, 45%))",
                color: "hsl(0, 0%, 100%)",
                boxShadow: "0 4px 24px hsl(210, 90%, 50% / 0.35)",
              }}
            >
              <ExternalLink className="w-5 h-5" />
              Open Ready Zapier Template
            </a>
          </div>

          {/* 3 steps */}
          <div className="flex flex-col gap-4 mb-8 text-left">
            {steps.map(({ n, text }) => (
              <div key={n} className="flex items-center gap-4">
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black"
                  style={{
                    background: "hsl(var(--primary) / 0.12)",
                    color: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--primary) / 0.25)",
                  }}
                >
                  {n}
                </div>
                <span className="text-foreground font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* Note */}
          <p className="text-muted-foreground text-sm">
            Works with Claude, Gumloop, any agent.{" "}
            <span className="text-foreground font-medium">Free tier works instantly.</span>
          </p>

          {!user && (
            <div className="mt-8">
              <Link to="/auth">
                <Button variant="hero-outline" size="sm">Sign in to get your webhook URL</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
