"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export interface LightboxImage {
  url: string;
  filename?: string;
  alt?: string;
}

export interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Local bilingual labels — kept inside the component so we don't have to
// modify src/lib/i18n.ts (which is off-limits for this task).
const LABELS = {
  viewerTitle: { fr: "Visionneuse d'images", ar: "عارض الصور" },
  prev: { fr: "Image précédente", ar: "الصورة السابقة" },
  next: { fr: "Image suivante", ar: "الصورة التالية" },
  zoom: { fr: "Zoomer", ar: "تكبير" },
  unzoom: { fr: "Réduire", ar: "تصغير" },
  download: { fr: "Télécharger", ar: "تحميل" },
} as const;

/**
 * Reusable full-screen image viewer.
 *
 * Renders on top of any open dialog (the shadcn Dialog uses a Radix Portal
 * with z-50, so a second Dialog stacks above the first). Supports multiple
 * images with prev/next navigation, a download link, a counter, a filename
 * caption, and a click-to-zoom toggle.
 */
export function ImageLightbox({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
}: ImageLightboxProps) {
  const { lang } = useTranslation();
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  const total = images.length;
  const tr = (key: keyof typeof LABELS) => LABELS[key][lang];

  // Reset to the requested initial index (clamped) whenever the lightbox opens.
  useEffect(() => {
    if (open) {
      setIndex(Math.min(initialIndex, Math.max(0, total - 1)));
      setZoomed(false);
    }
    // Only depend on `open` — we want to reset exactly when it toggles true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clamp the index if the images array shrinks while the lightbox is open
  // (e.g. an admin removes an image in the edit dialog underneath).
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, total - 1)));
  }, [total]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
    setZoomed(false);
  }, [total]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % total);
    setZoomed(false);
  }, [total]);

  // Keyboard navigation: Left/Right to move between images.
  // Escape is handled natively by the Radix Dialog.
  useEffect(() => {
    if (!open || total <= 1) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, total, goPrev, goNext]);

  if (total === 0) return null;

  const safeIndex = Math.min(index, total - 1);
  const current = images[safeIndex];
  if (!current) return null;

  const altText = current.alt || current.filename || "Image";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid h-[95vh] max-h-[95vh] w-full max-w-[95vw] gap-0 border-0 bg-black/95 p-0 text-white sm:max-w-5xl sm:rounded-xl"
      >
        <DialogTitle className="sr-only">{tr("viewerTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {safeIndex + 1} / {total}
        </DialogDescription>

        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
          {/* Previous arrow */}
          {total > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label={tr("prev")}
            >
              <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
            </button>
          )}

          {/* The image — click toggles zoom */}
          <AnimatePresence mode="wait">
            <motion.img
              key={safeIndex}
              src={current.url}
              alt={altText}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, scale: zoomed ? 2 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              draggable={false}
              onClick={() => setZoomed((z) => !z)}
              className={`select-none object-contain ${
                zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
              }`}
              style={{ maxHeight: "100%", maxWidth: "100%" }}
            />
          </AnimatePresence>

          {/* Next arrow */}
          {total > 1 && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label={tr("next")}
            >
              <ChevronRight className="h-6 w-6 rtl:rotate-180" />
            </button>
          )}

          {/* Top-left: counter */}
          <span className="absolute left-3 top-3 z-20 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {safeIndex + 1} / {total}
          </span>

          {/* Bottom bar: zoom toggle · filename · download */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-3 py-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setZoomed((z) => !z)}
              className="h-9 px-3 text-white hover:bg-white/15 hover:text-white"
              aria-label={zoomed ? tr("unzoom") : tr("zoom")}
              title={zoomed ? tr("unzoom") : tr("zoom")}
            >
              {zoomed ? (
                <ZoomOut className="h-4 w-4" />
              ) : (
                <ZoomIn className="h-4 w-4" />
              )}
            </Button>

            {current.filename ? (
              <p
                className="flex-1 truncate text-center text-xs text-white/80"
                title={current.filename}
              >
                {current.filename}
              </p>
            ) : (
              <span className="flex-1" />
            )}

            <a
              href={current.url}
              download={current.filename || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white/15 px-3 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{tr("download")}</span>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageLightbox;
