import { useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Copy, Check, ExternalLink, Zap } from "lucide-react";
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
      toast({
        title: "No vault found",
        description: "Create a vault first in the Dashboard.",
        variant: "destructive",
      });
      return;
    }
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({ title: "Copied!", description: "Webhook URL copied to clipboard." });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border py-4 px-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-foreground text-lg">Eternova</span>
        </Link>
        {user ? (
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
        ) : (
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
        )}
      </nav>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-lg text-center space-y-10">

          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <Zap className="w-8 h-8 text-primary" />
          </div>

          {/* Title + Subtitle */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
              Instant Zapier Memory
              <span className="block text-primary mt-1">(60 seconds setup)</span>
            </h1>
            <p className="text-lg sm:text-xl font-semibold text-muted-foreground leading-relaxed">
              Give any AI agent permanent memory —<br className="hidden sm:block" />
              no code, no API keys, no login.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-3 w-full rounded-2xl py-5 px-6 text-lg font-black transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              style={{
                background: copied
                  ? "hsl(142 55% 32%)"
                  : "hsl(142 60% 38%)",
                color: "#ffffff",
                boxShadow: "0 6px 28px hsl(142 65% 42% / 0.35)",
              }}
            >
              {copied ? (
                <><Check className="w-5 h-5 flex-shrink-0" /> Copied! ✓</>
              ) : (
                <><Copy className="w-5 h-5 flex-shrink-0" /> Copy My Webhook URL</>
              )}
            </button>

            <a
              href="https://zapier.com/shared/5e143bc89ccdc157b31c86abb8435e4970809173"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full rounded-2xl py-5 px-6 text-lg font-black transition-all"
              style={{
                background: "hsl(213 90% 50%)",
                color: "#ffffff",
                boxShadow: "0 6px 28px hsl(213 90% 50% / 0.35)",
              }}
            >
              <ExternalLink className="w-5 h-5 flex-shrink-0" />
              Open Ready Zapier Template
            </a>
          </div>

          {/* 3 Steps */}
          <div className="flex flex-col gap-5 text-left">
            {[
              "Click 'Copy My Webhook URL'",
              "Click 'Open Ready Zapier Template'",
              "Paste the URL into the Zap and turn it on",
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-base font-black"
                  style={{
                    background: "hsl(var(--primary) / 0.12)",
                    color: "hsl(var(--primary))",
                    border: "2px solid hsl(var(--primary) / 0.3)",
                  }}
                >
                  {i + 1}
                </div>
                <span className="text-foreground font-semibold text-base sm:text-lg">{text}</span>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p className="text-muted-foreground text-sm sm:text-base">
            Works instantly with Claude, Gumloop, any agent.{" "}
            <span className="text-foreground font-semibold">Free tier has everything you need.</span>
          </p>

          {!user && (
            <div className="p-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>{" "}
              to get your personal webhook URL.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
