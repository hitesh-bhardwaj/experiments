"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { buildRemixerJsx } from "./build-remixer-code";
import { useRemixerControls } from "./useRemixerControls";
import { DemoHeaderProvider } from "@/components/preview-chrome/DemoHeader";
import { onEmbedValues, readEmbed } from "@/components/preview-chrome/embed";
import type { RegistryRemixerDemoProps, RemixerControl, RemixerGroup, RemixerValues } from "./types";

function toGroupTitle(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getGroupsFromRemixerControls(controls: RemixerControl[] = []) {
  if (!controls.length) return undefined;

  const groupMap = new Map<string, RemixerGroup>();

  for (const control of controls) {
    const groupId = control.group ?? "controls";
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, {
        id: groupId,
        title: control.groupTitle ?? toGroupTitle(groupId),
        controls: [],
      });
    }
    groupMap.get(groupId)?.controls?.push({
      ...control,
      id: control.id ?? control.name,
    });
  }

  return [...groupMap.values()];
}

// `?embed=1` is the device iframe DemoHeader opens for Tablet / Phone;
// `?rm=1` asks it to preview reduced motion. Read before the effect mounts so
// matchMedia already answers for reduced motion on the first render.
function useEmbedMode() {
  const [mode] = useState(() =>
    typeof window === "undefined" ? { embed: false, rm: false } : readEmbed(),
  );
  return mode;
}

export default function RegistryRemixerDemo({
  registry,
  component: Component,
  children,
  render,
  copyCodeOptions,
}: RegistryRemixerDemoProps) {
  const remixerConfig = registry?.remixer ?? {};
  const remixerGroups =
    remixerConfig.groups ?? getGroupsFromRemixerControls(remixerConfig.controls);
  const {
    groups,
    values,
    initialValues,
    setValues,
    updateValue,
    resetValues,
  } = useRemixerControls({ groups: remixerGroups, props: registry?.props ?? [] });
  const { embed } = useEmbedMode();
  const [replayKey, setReplayKey] = useState(0);

  // Inside the device iframe, props edited in the host's panel arrive here.
  useEffect(() => {
    if (!embed) return undefined;
    return onEmbedValues((incoming: RemixerValues) =>
      setValues((current) => ({ ...current, ...incoming })),
    );
  }, [embed, setValues]);

  const replay = useCallback(() => setReplayKey((k) => k + 1), []);

  // The keyed fragment remounts only the effect, so Replay restarts its intro.
  const effectNode = render ? render(values) : Component ? <Component {...values} /> : null;
  const effect = effectNode ? <Fragment key={replayKey}>{effectNode}</Fragment> : null;
  const buildCode = copyCodeOptions?.buildCode;

  const copyCode = () =>
    buildCode
      ? buildCode({ registry, values, initialValues, groups })
      : buildRemixerJsx({ componentName: String(registry?.title ?? registry?.name ?? ""), values, groups });

  // The page's <DemoHeader /> reads this: the registry, the props panel and replay.
  const header = {
    registry,
    groups,
    values,
    hasProps: !!remixerConfig.enabled,
    onChange: updateValue,
    onCopyCode: remixerConfig.enabled ? copyCode : undefined,
    onReset: resetValues,
    onReplay: replay,
    defaultOpenGroupId: remixerConfig.defaultOpenGroupId,
  };

  return (
    <DemoHeaderProvider value={header}>
      {children ? children({ values, effect }) : effect}
    </DemoHeaderProvider>
  );
}
