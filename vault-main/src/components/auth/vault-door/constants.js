// Routing
export const DEFAULT_REDIRECT = "/effects";
export const SSO_CALLBACK_URL = "/sso-callback";
export const MODE_PATHS = { "sign-in": "/sign-in", "sign-up": "/sign-up" };

// Timing
export const RESEND_COOLDOWN_SECONDS = 30;
export const TICKER_INTERVAL_MS = 1800;

// Validation
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD_LENGTH = 8;
export const STRENGTH_LABELS = ["Too short", "Could be stronger", "Getting there", "Strong", "Very strong"];

// OAuth
export const OAUTH_PROVIDERS = [
  { strategy: "oauth_google", label: "Google" },
  { strategy: "oauth_github", label: "GitHub" },
];

// Fields
export const FIELDS = {
  name: { label: "Name", type: "text", autoComplete: "name", placeholder: "Your name" },
  email: { label: "Email", type: "email", autoComplete: "email", placeholder: "you@studio.com" },
  password: { label: "Password", type: "password", autoComplete: "current-password", placeholder: "" },
  newPassword: { label: "Password", type: "password", autoComplete: "new-password", placeholder: "8+ characters" },
  code: { label: "Verification code", type: "text", autoComplete: "one-time-code", placeholder: "000000", inputMode: "numeric" },
};

// Typed length that counts as a "full" field when charging the seam
export const FIELD_FILL_LENGTH = { email: 18, password: 12, newPassword: 12, default: 10 };

// Panes
export const PANES = {
  "sign-in": { eyebrow: "Sign in", lead: "Welcome", accent: "back.", title: "Sign in", steps: ["email", "password"] },
  "sign-up": {
    eyebrow: "Create account",
    lead: "Cut your",
    accent: "key.",
    title: "Create account",
    steps: ["name", "email", "newPassword", "code"],
    showCount: true,
  },
  reset: { eyebrow: "Reset password", lead: "Lost your", accent: "key?", title: "Reset password", steps: ["email", "code", "newPassword"] },
};

// Accessible label for a step's submit arrow when it calls Clerk
export const SUBMIT_LABELS = {
  "sign-in": { password: "Open the door", code: "Verify device" },
  "sign-up": { newPassword: "Create account", code: "Verify email" },
  reset: { email: "Send reset code", code: "Verify code", newPassword: "Set password" },
};

// Brand colours for the canvas renderers (rgb triplets; orange is --primary)
export const CANVAS_COLORS = { orange: "255,95,0", grey: "147,147,147", offWhite: "244,244,244" };

// Clerk error `meta.paramName` -> the step that owns that value
export const CLERK_PARAM_FIELDS = {
  identifier: "email",
  email_address: "email",
  password: ["password", "newPassword"],
  first_name: "name",
  last_name: "name",
  code: "code",
};

export const LEGAL_LINKS = { terms: "/legal/terms-of-service", privacy: "/legal/privacy-policy" };

// Shared styles, following the homepage (src/homepage) conventions
export const LABEL_CLASS = "font-avenir text-[11px] font-medium uppercase tracking-[.14em]";
export const FOCUS_RING_CLASS = "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary";
// Feeds the dark autofill rule in globals.css, as the footer newsletter does
export const INPUT_AUTOFILL_STYLE = { "--input-autofill-bg": "#111210", "--input-autofill-text": "#ffffff" };
