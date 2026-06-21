"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/types";

interface CompareStore {
  ids: string[];
  items: Product[];
  add: (p: Product) => void;
  remove: (id: string) => void;
  toggle: (p: Product) => void;
  has: (id: string) => boolean;
  clear: () => void;
}

export const useCompare = create<CompareStore>()(
  persist(
    (set, get) => ({
      ids: [],
      items: [],
      add: (p) =>
        set((state) => {
          if (state.ids.includes(p.id)) return state;
          if (state.ids.length >= 4) return state; // max 4
          return { ids: [...state.ids, p.id], items: [...state.items, p] };
        }),
      remove: (id) =>
        set((state) => ({
          ids: state.ids.filter((x) => x !== id),
          items: state.items.filter((x) => x.id !== id),
        })),
      toggle: (p) =>
        set((state) => {
          if (state.ids.includes(p.id)) {
            return {
              ids: state.ids.filter((x) => x !== p.id),
              items: state.items.filter((x) => x.id !== p.id),
            };
          }
          if (state.ids.length >= 4) return state;
          return { ids: [...state.ids, p.id], items: [...state.items, p] };
        }),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [], items: [] }),
    }),
    { name: "odg-compare" }
  )
);
