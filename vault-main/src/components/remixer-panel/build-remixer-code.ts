"use client";

import { getCopyableRemixerValues } from "./remixer-utils";
import type { RemixerGroup, RemixerValues } from "./types";

interface BuildRemixerDemoCodeArgs {
  values: RemixerValues;
  initialValues: RemixerValues;
  groups: RemixerGroup[];
  propsVariableName?: string;
  [key: string]: unknown;
}

export function buildRemixerDemoCode({
  values,
  initialValues: _initialValues,
  groups,
  propsVariableName = "props",
}: BuildRemixerDemoCodeArgs) {
  const copyableValues = getCopyableRemixerValues(values, groups);
  const entries = Object.entries(copyableValues);
  const propLines = entries.map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`).join("\n");

  // `as const` narrows each value to its literal type (e.g. "bottom" instead
  // of string), so pasting this into a strict TS project type-checks against
  // components whose props use a union type (e.g. direction?: "top" | "bottom" | ...).
  // Without it, plain object-literal assignment widens string properties to
  // `string`, which TS then rejects when the object is spread onto a
  // component prop typed as a narrower union.
  if (!entries.length) return `const ${propsVariableName} = {} as const;`;
  return `const ${propsVariableName} = {
${propLines}
} as const;`;
}

function toComponentName(value = "Effect") {
  const name = value.replace(/[^a-z0-9]+/gi, " ").trim().split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  return /^[A-Z]/.test(name) ? name : `Effect${name}`;
}

// `<Effect prop={value} />` for the current values - what the panel shows and copies.
export function buildRemixerJsx({
  componentName,
  values,
  groups,
}: {
  componentName?: string;
  values: RemixerValues;
  groups: RemixerGroup[];
}) {
  const name = toComponentName(componentName);
  const entries = Object.entries(getCopyableRemixerValues(values, groups));
  if (!entries.length) return `<${name} />`;
  const lines = entries.map(([key, value]) =>
    typeof value === "string" ? `  ${key}=${JSON.stringify(value)}` : `  ${key}={${JSON.stringify(value)}}`,
  );
  return `<${name}\n${lines.join("\n")}\n/>`;
}
