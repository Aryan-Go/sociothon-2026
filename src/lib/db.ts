import { del, get, set } from "idb-keyval";
import { createInitialState } from "../data/seed";
import type { AppState } from "../types";

const WORKSPACE_KEY = "loopr:workspace:v1";

export async function loadWorkspace(): Promise<AppState> {
  const seed = createInitialState();
  try {
    const saved = await get<Partial<AppState>>(WORKSPACE_KEY);
    if (!saved) return seed;
    return {
      ...seed,
      ...saved,
      settings: { ...seed.settings, ...(saved.settings ?? {}) },
      users: saved.users?.length ? saved.users : seed.users,
      collectors: saved.collectors?.length ? saved.collectors : seed.collectors,
      submissions: Array.isArray(saved.submissions) ? saved.submissions : seed.submissions,
      products: Array.isArray(saved.products) ? saved.products : seed.products,
      buyers: Array.isArray(saved.buyers) ? saved.buyers : seed.buyers,
      transactions: Array.isArray(saved.transactions) ? saved.transactions : seed.transactions,
    };
  } catch {
    return seed;
  }
}

export async function saveWorkspace(state: AppState): Promise<void> {
  try {
    await set(WORKSPACE_KEY, state);
  } catch {
    // IndexedDB can be unavailable in private windows; the app remains usable in-memory.
  }
}

export async function clearWorkspace(): Promise<void> {
  try {
    await del(WORKSPACE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
