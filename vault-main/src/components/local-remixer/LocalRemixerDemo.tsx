"use client";

import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type {
  RegistryLike,
  RegistryProp,
  RegistryRemixerConfig,
  RemixerChildrenRender,
  RemixerComponent,
  RemixerRender,
} from "@/components/remixer-panel/types";

export interface LocalRemixerDemoProps {
  name: string;
  category?: string;
  props: RegistryProp[];
  remixer?: RegistryRemixerConfig;
  component?: RemixerComponent;
  children?: RemixerChildrenRender;
  render?: RemixerRender;
}

/**
 * Phase 0 scratch space: same controls/UI as the production RegistryRemixerDemo,
 * but sourced from a draft { props, remixer } object literal in the demo file
 * instead of an existing registry.json - for components that don't have one yet.
 * Delete this usage once Phase 2 (`codegen`) swaps the demo to RegistryRemixerDemo
 * reading from the real registry.json.
 */
export default function LocalRemixerDemo({
  name,
  category,
  props,
  remixer = { enabled: true, layout: {}, panel: {} },
  component,
  children,
  render,
}: LocalRemixerDemoProps) {
  const draftRegistry: RegistryLike = { name, category, props, remixer };

  return (
    <RegistryRemixerDemo
      registry={draftRegistry}
      component={component}
      render={render}
    >
      {children}
    </RegistryRemixerDemo>
  );
}
