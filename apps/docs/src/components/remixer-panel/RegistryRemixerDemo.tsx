"use client";

import { buildRemixerDemoCode } from "./build-remixer-code";
import RemixerLauncher from "./RemixerLauncher";
import { useRemixerControls } from "./useRemixerControls";
import type { RegistryRemixerDemoProps, RemixerControl, RemixerGroup } from "./types";

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

const legacyLauncherLayoutTokens = new Set([
  "right-4!",
  "top-25!",
  "right-0!",
  "top-[132px]!",
  "h-[calc(100%-102px)]!",
  "h-[calc(100%-132px)]!",
  "w-[344px]!",
]);

function removeLegacyLauncherLayoutClasses(className?: string) {
  if (!className) return "";

  return className
    .split(/\s+/)
    .filter((token) => token && !legacyLauncherLayoutTokens.has(token))
    .join(" ");
}

export default function RegistryRemixerDemo({
  registry,
  component: Component,
  children,
  render,
  copyCodeOptions,
}: RegistryRemixerDemoProps) {
  const remixerConfig = registry?.remixer ?? {};
  const layoutConfig = remixerConfig.layout ?? {};
  const panelConfig = remixerConfig.panel ?? {};
  const remixerGroups =
    remixerConfig.groups ?? getGroupsFromRemixerControls(remixerConfig.controls);
  const {
    groups,
    values,
    initialValues,
    updateValue,
    resetValues,
  } = useRemixerControls({ groups: remixerGroups, props: registry?.props ?? [] });

  const effect = render ? render(values) : Component ? <Component {...values} /> : null;
  const buildCode = copyCodeOptions?.buildCode;

  return (
    <>
      {children ? children({ values, effect }) : effect}
      {remixerConfig.enabled ? (
        <RemixerLauncher
          groups={groups}
          values={values}
          onChange={updateValue}
          onCopyCode={() =>
            buildCode
              ? buildCode({ registry, values, initialValues, groups })
              : buildRemixerDemoCode({
                  registry,
                  values,
                  initialValues,
                  groups,
                  ...copyCodeOptions,
                })
          }
          onReset={resetValues}
          defaultOpenGroupId={remixerConfig.defaultOpenGroupId}
          buttonClassName={removeLegacyLauncherLayoutClasses(
            layoutConfig.buttonClassName ?? layoutConfig.controlsButtonClassName,
          )}
          panelClassName={removeLegacyLauncherLayoutClasses(
            layoutConfig.panelClassName ?? panelConfig.className,
          )}
          containerClassName={layoutConfig.containerClassName as string | undefined}
        />
      ) : null}
    </>
  );
}
