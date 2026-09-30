"use client";

import { useSyncExternalStore } from "react";

// Page-wide state for /community. The crowd lives in one fixed canvas
// (CommunityCrowd) but the Stack chips and both waitlist forms drive it, and
// the chips' picks travel with the waitlist sign-up, so they share this store.

const JOINED_KEY = "hx-community-joined";

let crowd = null;
let state = { stack: [], joined: false, celebrateAt: 0 };
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn());

export function setCrowd(api) {
  crowd = api;
}

export const getCrowd = () => crowd;

export function setStack(stack) {
  state = { ...state, stack };
  emit();
}

// A fresh sign-up also stamps celebrateAt, which opens the "joined" toast
export function markJoined() {
  state = { ...state, joined: true, celebrateAt: Date.now() };
  try { localStorage.setItem(JOINED_KEY, "1"); } catch { /* storage blocked: joined for this visit only */ }
  emit();
}

// Read the remembered sign-up once, on the client, after hydration
export function restoreJoined() {
  let joined = false;
  try { joined = localStorage.getItem(JOINED_KEY) === "1"; } catch { /* storage blocked */ }
  if (joined && !state.joined) {
    state = { ...state, joined: true };
    emit();
  }
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const SERVER_STATE = { stack: [], joined: false, celebrateAt: 0 };

export function dismissCelebration() {
  state = { ...state, celebrateAt: 0 };
  emit();
}

export function useCommunity() {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}
