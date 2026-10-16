"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DarkSegment } from "@/components/ui/DarkSegment";

// Whose data the admin pages count: customers (the default), our own team's
// internal accounts (lib/admin-data isInternalUser), or everyone. One choice
// for every admin page, remembered in this browser.
export const AUDIENCE_ITEMS = [
  { id: "customers", label: "Customers" },
  { id: "internal", label: "Internal" },
  { id: "all", label: "All" },
];

const STORAGE_KEY = "vault:admin-audience";
const CHANGE_EVENT = "vault:admin-audience-change";
const DEFAULT = "customers";

function read() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return AUDIENCE_ITEMS.some((item) => item.id === value) ? value : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function subscribe(onChange) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// [audience, setAudience] - pass `audience` to every admin API as ?audience=
export function useAdminAudience() {
  const audience = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const setAudience = useCallback((next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Without storage the choice can't be kept; the pages stay on Customers
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [audience, setAudience];
}

export function AdminAudienceToggle({ value, onChange }) {
  return (
    <DarkSegment
      buttonSize
      label="Accounts"
      items={AUDIENCE_ITEMS}
      value={value}
      onChange={onChange}
      itemClassName="w-[calc(var(--cvw)*6.5)] max-lg:w-20"
    />
  );
}
