import type { ComponentType, CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";

export type RemixerValue = unknown;
export type RemixerValues = Record<string, RemixerValue>;

export type RemixerOption =
  | string
  | number
  | boolean
  | {
      label?: string;
      value?: string | number | boolean;
      [key: string]: unknown;
    };

export interface RemixerControl {
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  type?: string;
  control?: string;
  enabled?: boolean;
  disabled?: boolean;
  default?: RemixerValue;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: RemixerOption[];
  placeholder?: string;
  docsOnly?: boolean;
  copyable?: boolean;
  format?: (value: RemixerValue) => string;
  group?: string;
  groupTitle?: string;
  groupCollapsible?: boolean;
  [key: string]: unknown;
}

export interface RemixerGroup {
  id?: string;
  title?: string;
  collapsible?: boolean;
  controls?: RemixerControl[];
  [key: string]: unknown;
}

export interface RegistryPropRemixer {
  group?: string;
  groupTitle?: string;
  groupCollapsible?: boolean;
  control?: string;
  enabled?: boolean;
  disabled?: boolean;
  default?: RemixerValue;
  min?: number;
  max?: number;
  step?: number;
  options?: RemixerOption[];
  placeholder?: string;
  [key: string]: unknown;
}

export interface RegistryProp {
  name: string;
  label?: string;
  default?: RemixerValue;
  demoDefault?: RemixerValue;
  description?: string;
  docsOnly?: boolean;
  copyable?: boolean;
  remixer?: RegistryPropRemixer;
  [key: string]: unknown;
}

export interface RegistryRemixerConfig {
  enabled?: boolean;
  layout?: {
    buttonClassName?: string;
    controlsButtonClassName?: string;
    panelClassName?: string;
    containerClassName?: string;
    [key: string]: unknown;
  };
  panel?: {
    className?: string;
    [key: string]: unknown;
  };
  groups?: RemixerGroup[];
  controls?: RemixerControl[];
  defaultOpenGroupId?: string;
  [key: string]: unknown;
}

export interface RegistryLike {
  name?: string;
  category?: string;
  props?: RegistryProp[];
  remixer?: RegistryRemixerConfig;
  [key: string]: unknown;
}

export type RemixerComponent = ComponentType<Record<string, unknown>>;
export type RemixerRender = (values: RemixerValues) => ReactNode;
export type RemixerChildrenRender = (args: { values: RemixerValues; effect: ReactNode }) => ReactNode;
export type BuildRemixerCode = (args: {
  registry?: RegistryLike;
  values: RemixerValues;
  initialValues: RemixerValues;
  groups: RemixerGroup[];
  propsVariableName?: string;
  includeDemoHeader?: boolean;
  [key: string]: unknown;
}) => string;

export interface RegistryRemixerDemoProps {
  registry?: RegistryLike;
  component?: RemixerComponent;
  children?: RemixerChildrenRender;
  render?: RemixerRender;
  copyCodeOptions?: {
    buildCode?: BuildRemixerCode;
    propsVariableName?: string;
    includeDemoHeader?: boolean;
    [key: string]: unknown;
  };
}

export interface RemixerLauncherProps {
  groups: RemixerGroup[];
  values: RemixerValues;
  onChange: (id: string, value: RemixerValue) => void;
  onCopyCode?: () => string;
  onReset: () => void;
  defaultOpenGroupId?: string;
  buttonLabel?: string;
  buttonClassName?: string;
  panelClassName?: string;
  panelInnerClassName?: string;
  containerClassName?: string;
}

export interface RemixerPanelProps {
  isExpanded: boolean;
  groups: RemixerGroup[];
  values: RemixerValues;
  onChange: (id: string, value: RemixerValue) => void;
  onCopyCode?: () => string;
  onReset: () => void;
  defaultOpenGroupId?: string;
}

export interface UseRemixerControlsArgs {
  defaults?: RemixerValues;
  groups?: RemixerGroup[];
  props?: RegistryProp[];
}

export interface UseRemixerControlsResult {
  groups: RemixerGroup[];
  values: RemixerValues;
  initialValues: RemixerValues;
  setValues: Dispatch<SetStateAction<RemixerValues>>;
  updateValue: (id: string, value: RemixerValue) => void;
  resetValues: () => void;
}

export interface SuggestedPreviewProps {
  className: string;
  style: CSSProperties & Record<"--remixer-accent-color" | "--remixer-gap", string | undefined>;
}
