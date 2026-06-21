"use client";
import { Toaster as SonnerToaster, toast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg",
        },
      }}
    />
  );
}

export { toast };
