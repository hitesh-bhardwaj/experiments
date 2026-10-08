"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { TemplatePaywallModal } from "@/components/ui/TemplatePaywallModal";
import { GetTemplateModal } from "./[slug]/GetTemplateModal";

/**
 * The template purchase flow used by the v4 cards and preview drawer: Buy
 * opens the "Get this template" popup first; its "Continue to payment" then
 * signs the visitor in (coming back to this page) or opens the paywall, and a
 * finished purchase downloads the source. A template you already own just
 * downloads.
 *
 *   const { buy, modals } = useTemplatePurchase();
 *   <button onClick={() => buy(template, hasAccess)}>Buy</button>
 *   {modals}
 */
export function useTemplatePurchase() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();
  const [template, setTemplate] = useState(null); // kept after closing so the popups can animate out
  const [getOpen, setGetOpen] = useState(false);
  const [getTab, setGetTab] = useState("buy");
  const [paywallOpen, setPaywallOpen] = useState(false);

  const buy = useCallback((t, owned = false) => {
    if (owned) {
      window.location.href = `/api/templates/${t.slug}/download`;
      return;
    }
    setTemplate(t);
    setGetTab("buy");
    setGetOpen(true);
  }, []);

  const closeGet = useCallback(() => setGetOpen(false), []);

  const continueToPayment = () => {
    setGetOpen(false);
    if (!isLoaded || !template) return;
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }
    setPaywallOpen(true);
  };

  const modals = template ? (
    <>
      <GetTemplateModal template={template} open={getOpen} tab={getTab} onTab={setGetTab} onClose={closeGet} onBuy={continueToPayment} />
      <TemplatePaywallModal
        template={template}
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onPurchased={() => {
          setPaywallOpen(false);
          window.location.href = `/api/templates/${template.slug}/download`;
        }}
      />
    </>
  ) : null;

  return { buy, modals };
}
