"use client";

import type { RegistryProp, RemixerControl, RemixerGroup, RemixerValues } from "./types";

export function cloneRemixerValues(values: RemixerValues = {}): RemixerValues {
  if (typeof structuredClone === "function") return structuredClone(values);
  return JSON.parse(JSON.stringify(values)) as RemixerValues;
}

export function getDefaultsFromProps(props: RegistryProp[] = []): RemixerValues {
  return props.reduce<RemixerValues>((defaults, prop) => {
    if (!prop || prop.docsOnly) return defaults;
    if ("demoDefault" in prop) {
      defaults[prop.name] = prop.demoDefault;
      return defaults;
    }
    if ("default" in (prop.remixer ?? {})) {
      defaults[prop.name] = prop.remixer?.default;
      return defaults;
    }
    if ("default" in prop) defaults[prop.name] = prop.default;
    return defaults;
  }, {});
}

export function getGroupsFromProps(props: RegistryProp[] = []): RemixerGroup[] {
  const groupMap = new Map<string, RemixerGroup>();

  for (const prop of props) {
    if (!prop?.remixer) continue;
    if (!isRemixerEnabled(prop.remixer)) continue;
    const groupId = prop.remixer.group ?? "controls";
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, {
        id: groupId,
        title: prop.remixer.groupTitle ?? toControlLabel(groupId),
        collapsible: prop.remixer.groupCollapsible ?? true,
        controls: [],
      });
    }
    groupMap.get(groupId)?.controls?.push(
      normalizeRemixerControl({
        id: prop.name,
        name: prop.name,
        label: prop.label,
        type: prop.remixer.control,
        default: prop.default,
        description: prop.description,
        min: prop.remixer.min,
        max: prop.remixer.max,
        step: prop.remixer.step,
        options: prop.remixer.options,
        placeholder: prop.remixer.placeholder,
        docsOnly: prop.docsOnly,
        copyable: prop.copyable,
      }),
    );
  }

  return [...groupMap.values()];
}

export function getCopyableRemixerValues(
  values: RemixerValues = {},
  groups: RemixerGroup[] = [],
): RemixerValues {
  const allowedIds = new Set<string>();
  for (const group of groups) {
    for (const control of group.controls ?? []) {
      if (!control || control.docsOnly || control.copyable === false || !control.id) continue;
      allowedIds.add(control.id);
    }
  }
  return Object.fromEntries(Object.entries(values).filter(([id]) => allowedIds.has(id)));
}

export function getChangedCopyableRemixerValues(
  values: RemixerValues = {},
  initialValues: RemixerValues = {},
  groups: RemixerGroup[] = [],
): RemixerValues {
  return Object.fromEntries(
    Object.entries(getCopyableRemixerValues(values, groups)).filter(
      ([id, value]) => !areRemixerValuesEqual(value, initialValues[id]),
    ),
  );
}

export function normalizeRemixerControl(control: RemixerControl = {}): RemixerControl {
  const type = control.control ?? control.type ?? "range";
  return {
    ...control,
    id: control.id ?? control.name,
    label: control.label ?? toControlLabel(control.name ?? control.id ?? ""),
    type,
  };
}

export function normalizeRemixerGroups(groups: RemixerGroup[] = []): RemixerGroup[] {
  return groups.map((group, index) => ({
    ...group,
    id: group.id ?? `group-${index}`,
    title: group.title,
    controls: (group.controls ?? [])
      .filter(isRemixerEnabled)
      .map(normalizeRemixerControl),
  }));
}

function isRemixerEnabled(config: { enabled?: boolean; disabled?: boolean } = {}) {
  return config.enabled !== false && config.disabled !== true;
}

function toControlLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function areRemixerValuesEqual(value: unknown, otherValue: unknown) {
  if (Object.is(value, otherValue)) return true;
  return JSON.stringify(value) === JSON.stringify(otherValue);
}
