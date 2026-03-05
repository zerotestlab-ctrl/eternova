import { Link } from "react-router-dom";
import { Brain, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
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
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: March 2026 · Eternova by ZeroTest Lab</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Eternova, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">2. Service Description</h2>
            <p>Eternova is a personal memory management platform that allows users to upload documents, extract structured facts, and query their knowledge base using AI. The service is provided by ZeroTest Lab.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">3. Your Data & Ownership</h2>
            <p className="mb-2">You retain full ownership of all content you upload to Eternova. We do not claim any intellectual property rights over your data. Specifically:</p>
            <ul className="space-y-2 list-none">
              {[
                "All documents, memories, and facts you upload remain exclusively yours.",
                "We never use your data to train AI models.",
                "You may export or delete your data at any time.",
                "Account deletion results in permanent removal of all your data within 48 hours.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">4. Acceptable Use</h2>
            <p className="mb-2">You agree not to use Eternova to:</p>
            <ul className="space-y-2 list-none">
              {[
                "Upload or store illegal, harmful, or infringing content.",
                "Attempt to circumvent security or access other users' data.",
                "Use the API in ways that abuse or overload the service.",
                "Resell or sublicense access to the service without written permission.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 flex-shrink-0">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">5. Free & Pro Plans</h2>
            <p>Free accounts are limited to 1 vault, 5MB storage, and 100 queries per month. Pro accounts receive unlimited vaults, storage, and queries. Plan limits are enforced automatically. We reserve the right to update plan features with reasonable notice.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">6. Payments & Refunds</h2>
            <p>Pro subscriptions are billed monthly via Paystack. Payments are non-refundable except where required by applicable law. You may cancel at any time; access continues until the end of the billing period.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">7. Disclaimers & Limitation of Liability</h2>
            <p>Eternova is provided "as is" without warranties of any kind. ZeroTest Lab is not liable for any indirect, incidental, or consequential damages arising from use of the service. Our total liability shall not exceed the amount you paid in the past 12 months.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">8. Changes to Terms</h2>
            <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms. We will notify users of material changes via email.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3">9. Contact</h2>
            <p>For questions about these Terms, contact ZeroTest Lab. We respond within 48 hours.</p>
          </section>
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
