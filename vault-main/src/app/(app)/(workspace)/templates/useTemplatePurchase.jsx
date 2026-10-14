"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { TemplatePaywallModal } from "@/components/ui/TemplatePaywallModal";
import { SignInRequiredModal } from "@/components/ui/SignInRequiredModal";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { GetTemplateModal } from "./[slug]/GetTemplateModal";
import { markTemplateOwned } from "./useTemplateAccess";

/**
 * The template purchase flow used by the v4 cards and preview drawer: Buy
 * opens the "Get this template" popup first; its "Continue to payment" then
 * signs the visitor in (coming back to this page) or opens the paywall, and a
 * finished purchase downloads the source and says so in a toast. A template you
 * already own just downloads.
 *
 *   const { buy, modals } = useTemplatePurchase();
 *   <button onClick={() => buy(template, hasAccess)}>Buy</button>
 *   {modals}
 */
export function useTemplatePurchase() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();
  const [template, setTemplate] = useState(null); // kept after closing so the popups can animate out
  const [getOpen, setGetOpen] = useState(false);
  const [getTab, setGetTab] = useState("buy");
  const [paywallOpen, setPaywallOpen] = useState(false);
  // Signed out: the sign-in modal, then back to the "Get this template" popup
  const [signInOpen, setSignInOpen] = useState(false);
  const { toast, showToast, dismissToast } = useToastQueue();

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
      setSignInOpen(true);
      return;
    }
    setPaywallOpen(true);
  };

  const modals = template ? (
    <>
      <GetTemplateModal template={template} open={getOpen} tab={getTab} onTab={setGetTab} onClose={closeGet} onBuy={continueToPayment} />
      <SignInRequiredModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => setGetOpen(true)}
        redirect={pathname}
        action="buy this template"
      />
      <TemplatePaywallModal
        template={template}
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onPurchased={() => {
          setPaywallOpen(false);
          window.location.href = `/api/templates/${template.slug}/download`;
          markTemplateOwned(template.slug);
          showToast({ title: `${template.title} purchased`, description: `${template.title} has been purchased and downloaded.` });
        }}
      />
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </>
  ) : null;

  return { buy, modals };
}
