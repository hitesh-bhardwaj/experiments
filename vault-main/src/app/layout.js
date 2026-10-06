import "@/lib/progress-event-polyfill";
import localFont from "next/font/local";
import { IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import DeferredAnalytics from "@/components/WebsiteComps/DeferredAnalytics";
import DeferredGTM from "@/components/WebsiteComps/DeferredGTM";
import LazyRecaptchaProvider from "@/components/WebsiteComps/LazyRecaptchaProvider";
import {
  ImageObjectJsonLd,
  LocalBusiness,
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  WebsiteJsonLd,
} from "@/lib/json-ld";
import { createRootMetadata } from "@/lib/seo-metadata";
import CustomAnimationFormModal, {
  CustomAnimationFormProvider,
} from "@/components/WebsiteComps/modals/CustomAnimationFormModal";
import WorkWithHyperiuxModal from "@/components/WebsiteComps/modals/WorkWithHyperiuxModal";
import { ExitIntentInviteModal } from "@/components/WebsiteComps/modals/ExitIntentInviteModal";
import { CookieConsentNudge } from "@/components/WebsiteComps/CookieConsentNudge";
import PageTransition from "@/components/PageTransition/PageTransition";
import SiteInteractions from "@/components/WebsiteComps/SiteInteractions";

// The site's two faces: Aeonik Pro (headings / display) and Avenir Next (text),
// exposed to Tailwind as font-aeonik and font-avenir (globals.css @theme).
const aeonikPro = localFont({
  src: [
    { path: "../../public/assets/fonts/AeonikPro-Light.woff2", weight: "300", style: "normal" },
    { path: "../../public/assets/fonts/AeonikPro-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/assets/fonts/AeonikPro-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/assets/fonts/AeonikPro-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-aeonik",
  display: "swap",
  preload: false,
});

const avenirNext = localFont({
  src: [
    { path: "../../public/assets/fonts/AvenirNextCyr-Light.woff2", weight: "300", style: "normal" },
    { path: "../../public/assets/fonts/AvenirNextCyr-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/assets/fonts/AvenirNextCyr-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/assets/fonts/AvenirNextCyr-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-avenir",
  display: "swap",
  preload: false,
});

// Code face (code blocks, the homepage install windows, the remixer code box):
// exposed as font-code / font-mono via --font-code in globals.css
const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
});

export const metadata = createRootMetadata();

// Runs synchronously before any HTML is painted - adds a class when loader hasn't run yet
// so the CSS below can hide body content, preventing a flash of hero content before the loader canvas appears.
// Skips audit agents: UA/webdriver, plus software WebGL (PSI desktop often has a
// plain Chrome UA and no navigator.webdriver - see lib/audit.js).
const LOADER_FIRST_VISIT_BLOCK = `(function(){try{if(sessionStorage.getItem('hyperiux-loader-has-run')==='true')return;if(window.location.pathname!=='/')return;if(window.innerWidth<1025)return;if(navigator.webdriver||/Lighthouse|Chrome-Lighthouse|Google Page Speed|PTST|HeadlessChrome/i.test(navigator.userAgent||''))return;var c=document.createElement('canvas');var gl=c.getContext('webgl')||c.getContext('experimental-webgl');if(gl){var di=gl.getExtension('WEBGL_debug_renderer_info');var r=di?gl.getParameter(di.UNMASKED_RENDERER_WEBGL):(gl.getParameter(gl.RENDERER)||'');if(/SwiftShader|llvmpipe|Software Rasterizer|Mesa OffScreen/i.test(String(r||'')))return;}document.documentElement.classList.add('loader-first-visit');}catch(e){}})();`;

const CLEAR_STALE_CLERK_COOKIES = `(function(){
  var hasUat=document.cookie.indexOf('__client_uat=')!==-1;
  var hasSession=document.cookie.indexOf('__session=')!==-1;
  var uat=(document.cookie.match(/__client_uat=([^;]+)/)||[])[1];
  if(hasUat&&uat!=='0'&&!hasSession){
    var exp=new Date(0).toUTCString();
    document.cookie='__client_uat=0;path=/;expires='+exp+';secure;samesite=strict';
  }
})();`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${aeonikPro.variable} ${avenirNext.variable} ${plexMono.variable} antialiased`}
    >
      <head>
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        {/* Plain script tag, not next/script: this layout is a Server
            Component, so the tag ships in the SSR HTML and the browser
            executes it during parse - before first paint. next/script is a
            client component and triggers React's "scripts inside components
            are never executed" warning for inline beforeInteractive code. */}
        {/* <script
          id="loader-first-visit-block"
          dangerouslySetInnerHTML={{ __html: LOADER_FIRST_VISIT_BLOCK }}
        /> */}
        {/* <meta name="msvalidate.01" content="96AF31CC0830CC17D577425F2D8CEE36" /> */}
      </head>
      <body className="min-h-dvh text-foreground">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NCDH9PHF"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {/* <script
          id="clear-stale-clerk-cookies"
          dangerouslySetInnerHTML={{ __html: CLEAR_STALE_CLERK_COOKIES }}
        /> */}
        {/* ClerkProvider deliberately absent here - it lives in
            (app)/layout.js so marketing routes ship zero Clerk scripts. */}
        <OrganizationJsonLd />
        <LocalBusiness />
        <ImageObjectJsonLd />
        <WebsiteJsonLd />
        <SoftwareApplicationJsonLd />
        {/* One sound engine + liquid cursor, the full-page dotted grid and
            fluid, and the sound toggle - mounted here so they survive client
            navigation. Wraps PageTransition so it can play the route whoosh. */}
        <SiteInteractions>
          <PageTransition />
          <CookieConsentNudge />
          {/* CustomAnimationFormProvider adds no DOM of its own (just a
              Context.Provider) - it wraps children so any page's
              CustomAnimationFormTrigger can reach the single globally-mounted
              modal below via local state instead of a URL round-trip. */}
          <CustomAnimationFormProvider>
            {children}
            {/* LazyRecaptchaProvider mounts only when a modal opens - never
                wrap page children or the homepage remounts when reCAPTCHA
                arms. ExitIntentInviteModal has to live inside this provider
                (not on the homepage route itself) so its executeRecaptcha()
                call actually has a <ReCaptchaProvider> ancestor - it gates
                itself back down to homepage-only via usePathname(). */}
            <LazyRecaptchaProvider>
              <Suspense>
                <CustomAnimationFormModal />
              </Suspense>
              <Suspense>
                <WorkWithHyperiuxModal />
              </Suspense>
              <ExitIntentInviteModal />
            </LazyRecaptchaProvider>
          </CustomAnimationFormProvider>
        </SiteInteractions>
        <Analytics />
        <SpeedInsights />
        <DeferredGTM />
        <DeferredAnalytics />
      </body>
    </html>
  );
}
