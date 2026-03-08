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
        {user && (
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
        )}
      </nav>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">

          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <Zap className="w-8 h-8 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-4 leading-[1.1]">
            Instant Zapier Memory
            <span className="block text-2xl sm:text-3xl font-bold text-primary mt-1">
              (60 seconds setup)
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Give any AI agent permanent memory —<br className="hidden sm:block" />
            no code, no API keys.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3 mb-10">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-3 w-full rounded-2xl py-4 px-6 text-base font-black transition-all min-h-[58px] focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                background: copied
                  ? "hsl(142, 55%, 32%)"
                  : "hsl(142, 60%, 38%)",
                color: "#ffffff",
                boxShadow: "0 6px 28px hsl(142 65% 42% / 0.4)",
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
              className="flex items-center justify-center gap-3 w-full rounded-2xl py-4 px-6 text-base font-black transition-all min-h-[58px]"
              style={{
                background: "hsl(213, 90%, 50%)",
                color: "#ffffff",
                boxShadow: "0 6px 28px hsl(213 90% 50% / 0.4)",
              }}
            >
              <ExternalLink className="w-5 h-5" />
              Open Ready Zapier Template
            </a>
          </div>

          {/* 3 Steps */}
          <div className="flex flex-col gap-4 mb-8 text-left">
            {[
              "Click Copy My Webhook URL",
              "Click Open Ready Zapier Template",
              "Paste and turn on",
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black"
                  style={{
                    background: "hsl(var(--primary) / 0.12)",
                    color: "hsl(var(--primary))",
                    border: "1.5px solid hsl(var(--primary) / 0.3)",
                  }}
                >
                  {i + 1}
                </div>
                <span className="text-foreground font-semibold text-base">{text}</span>
              </div>
            ))}
          </div>

          {/* Note */}
          <p className="text-muted-foreground text-sm">
            Works with Claude, Gumloop, anything.{" "}
            <span className="text-foreground font-semibold">Free forever.</span>
          </p>

          {!user && (
            <div className="mt-8 p-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground">
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
