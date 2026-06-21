"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, QuoteItem } from "@/lib/types";

interface QuoteStore {
  items: QuoteItem[];
  add: (p: Product, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  totalItems: number;
}

export const useQuoteCart = create<QuoteStore>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      add: (p, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === p.id);
          let items: QuoteItem[];
          if (existing) {
            items = state.items.map((i) =>
              i.productId === p.id ? { ...i, quantity: i.quantity + qty } : i
            );
          } else {
            items = [
              ...state.items,
              {
                productId: p.id,
                slug: p.slug,
                name: p.name,
                image: p.images[0] || "",
                brand: p.brand,
                model: p.model,
                quantity: qty,
              },
            ];
          }
          return { items, totalItems: items.reduce((s, i) => s + i.quantity, 0) };
        }),
      remove: (productId) =>
        set((state) => {
          const items = state.items.filter((i) => i.productId !== productId);
          return { items, totalItems: items.reduce((s, i) => s + i.quantity, 0) };
        }),
      setQty: (productId, qty) =>
        set((state) => {
          const items = state.items
            .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i))
            .filter((i) => i.quantity > 0);
          return { items, totalItems: items.reduce((s, i) => s + i.quantity, 0) };
        }),
      clear: () => set({ items: [], totalItems: 0 }),
      count: () => get().totalItems,
    }),
    { name: "odg-quote-cart" }
  )
);
