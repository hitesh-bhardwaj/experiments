"use client";

import { useCallback, useMemo, useState } from "react";
import {
  cloneRemixerValues,
  getDefaultsFromProps,
  getGroupsFromProps,
  normalizeRemixerGroups,
} from "./remixer-utils";
import type { UseRemixerControlsArgs, UseRemixerControlsResult } from "./types";

export function useRemixerControls({
  defaults,
  groups,
  props,
}: UseRemixerControlsArgs = {}): UseRemixerControlsResult {
  const groupsFromProps = useMemo(() => getGroupsFromProps(props ?? []), [props]);
  const normalizedGroups = useMemo(
    () => normalizeRemixerGroups(groups ?? groupsFromProps),
    [groups, groupsFromProps],
  );
  const initialValues = useMemo(
    () => cloneRemixerValues(defaults ?? getDefaultsFromProps(props ?? [])),
    [defaults, props],
  );
  const [values, setValues] = useState(initialValues);

  const updateValue = useCallback((id: string, value: unknown) => {
    setValues((current) => ({ ...current, [id]: value }));
  }, []);

  const resetValues = useCallback(() => {
    setValues(cloneRemixerValues(initialValues));
  }, [initialValues]);

  return { groups: normalizedGroups, values, initialValues, setValues, updateValue, resetValues };
}
