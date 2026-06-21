"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { getProductImageUrl, placeholderImage } from "@/lib/supabase";

interface Props {
  filename?: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  width?: number;
  height?: number;
}

// Image component that resolves a Supabase storage filename into a public URL,
// with graceful fallback to a placeholder.
export function SupabaseImage({ filename, alt, className, fallbackText = "ODG", width = 600, height = 400 }: Props) {
  const [errored, setErrored] = useState(false);
  const url = getProductImageUrl(filename);

  if (!filename || !url || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 ${className || ""}`}
        style={{ aspectRatio: `${width}/${height}` }}
      >
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <ImageOff className="h-8 w-8 opacity-50" />
          <span className="text-xs font-medium line-clamp-2">{fallbackText}</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}

export { placeholderImage };
