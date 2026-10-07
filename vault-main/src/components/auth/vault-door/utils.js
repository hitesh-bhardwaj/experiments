import {
  CLERK_PARAM_FIELDS,
  EMAIL_PATTERN,
  FIELD_FILL_LENGTH,
  MIN_PASSWORD_LENGTH,
  STRENGTH_LABELS,
} from "./constants";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function passwordStrength(value) {
  let score = 0;
  if (value.length >= MIN_PASSWORD_LENGTH) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  return score;
}

// Returns an error message, or "" when the value can be submitted
export function validateField(field, value) {
  const trimmed = value.trim();

  if (field === "email") {
    if (!trimmed) return "Add your email.";
    return EMAIL_PATTERN.test(trimmed) ? "" : "That email doesn’t look quite right.";
  }
  if (field === "password") return value ? "" : "Add your password.";
  if (field === "newPassword") {
    if (!value) return "Choose a password.";
    if (value.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    return passwordStrength(value) < 3 ? "Add a number or a symbol to make it stronger." : "";
  }
  if (field === "name") return trimmed ? "" : "Add your name.";
  if (field === "code") return trimmed ? "" : "Enter the code from your email.";
  return "";
}

// 0..1 progress through a pane, used to charge the seam and the core
export function getFillEnergy(stepIndex, totalSteps, field, value) {
  const full = FIELD_FILL_LENGTH[field] ?? FIELD_FILL_LENGTH.default;
  return (stepIndex + Math.min(1, value.length / full)) / totalSteps;
}

// Clerk stores first/last name separately; the form asks for one name
export function splitName(name) {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") || undefined };
}

export function maskValue(field, value) {
  return field === "password" || field === "newPassword" ? "••••••" : value.trim();
}

// Picks the step a Clerk error belongs to, falling back to the current one
export function getClerkErrorField(err, steps, currentField) {
  const param = err?.errors?.[0]?.meta?.paramName;
  const candidates = [].concat(CLERK_PARAM_FIELDS[param] ?? []);
  return candidates.find((field) => steps.includes(field)) ?? currentField;
}

// Neutral guidance under a field when there's no error to show
export function getStepHint(mode, field, value, email) {
  if (field === "newPassword" && value) return { text: STRENGTH_LABELS[passwordStrength(value)], tone: "info" };
  if (field !== "code") return null;
  const intro = mode === "sign-in" ? "New device. Enter" : "Enter";
  return { text: `${intro} the code we sent to ${email.trim()}.`, tone: "info" };
}

export function padStep(number) {
  return String(number).padStart(2, "0");
}

// Where the door's seam sits: on the boundary between the two columns, along
// the core column's content box (so it starts below the header). CSS px,
// relative to the door canvas.
export function measureSeam(canvas, coreColumn) {
  const canvasRect = canvas.getBoundingClientRect();
  const column = coreColumn.getBoundingClientRect();
  const style = getComputedStyle(coreColumn);
  const portrait = window.innerHeight >= window.innerWidth;

  if (portrait) {
    return { portrait, seam: column.bottom - canvasRect.top, start: column.left - canvasRect.left, end: column.right - canvasRect.left };
  }

  return {
    portrait,
    seam: column.left - canvasRect.left,
    start: column.top + parseFloat(style.paddingTop) - canvasRect.top,
    end: column.bottom - parseFloat(style.paddingBottom) - canvasRect.top,
  };
}
