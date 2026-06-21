"use client";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import { useCompanyInfo } from "@/lib/settings-service";

/**
 * WhatsApp floating widget.
 *
 * - Floats on the bottom-LEFT of the viewport (the ChatbotWidget occupies
 *   the bottom-right, so the two never overlap).
 * - Builds a `https://wa.me/<digits>` link from `useCompanyInfo().phone`.
 *   All non-digit characters are stripped (including the leading `+`).
 * - If no phone is configured (or only whitespace), the widget is hidden
 *   entirely (returns `null`).
 * - Uses framer-motion for a subtle scale-in entrance and a pulsing ring
 *   to draw attention.
 * - On hover a small tooltip shows the localized "Chat on WhatsApp" label.
 * - Visible on both mobile and desktop (responsive sizing).
 */
export function WhatsAppWidget() {
  const { t } = useTranslation();
  const company = useCompanyInfo();
  const [hovered, setHovered] = useState(false);

  // Strip every non-digit character from the phone → wa.me expects the
  // international number WITHOUT the leading "+" (e.g. "213540000000").
  const waUrl = useMemo(() => {
    const raw = (company?.phone ?? "").trim();
    if (!raw) return "";
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) return "";
    return `https://wa.me/${digits}`;
  }, [company?.phone]);

  // No phone configured → hide the widget entirely.
  if (!waUrl) return null;

  return (
    <div className="fixed left-4 bottom-4 z-40 sm:left-6 sm:bottom-6">
      <motion.button
        type="button"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.4 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={t("whatsapp")}
        title={t("whatsapp")}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 ring-2 ring-white/40 transition-colors hover:bg-[#1ebe57] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:h-16 sm:w-16"
      >
        {/* Pulsing ring to draw attention (Tailwind's built-in animate-ping) */}
        <span
          aria-hidden
          className="pointer-events-none absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-60"
        />
        {/* WhatsApp logo (inline SVG so we don't add a dependency) */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          className="relative h-7 w-7 sm:h-8 sm:w-8"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
        </svg>
      </motion.button>

      {/* Tooltip on hover/focus (desktop) */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            key="wa-tooltip"
            initial={{ opacity: 0, x: -8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-none absolute left-16 bottom-4 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg sm:left-20 sm:bottom-5 sm:block"
          >
            {t("whatsappChat")}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WhatsAppWidget;
