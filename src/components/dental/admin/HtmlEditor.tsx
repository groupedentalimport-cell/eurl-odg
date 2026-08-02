"use client";
import { useRef } from "react";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, Undo, Redo } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// HtmlEditor — a lightweight rich-text editor for admin panels.
// ---------------------------------------------------------------------------
//
// Uses `document.execCommand` (deprecated but still works in all browsers)
// on a contentEditable div. The HTML output is stored as-is in Supabase
// (TEXT columns). The same HTML is rendered server-side on public pages
// via `dangerouslySetInnerHTML`.
//
// Why not a full WYSIWYG library (TipTap, Slate)?
//   - Admin content is admin-only (RBAC gated), so XSS is not a concern
//     for the writer.
//   - Adding a library would bloat the bundle (200+ KB) for an admin-only
//     feature. execCommand is 0 KB.
//   - The HTML output is simple (b, i, h2, h3, ul, ol, a) and renders
//     correctly with the prose classes on the public side.
//
// Safety: the public pages use `dangerouslySetInnerHTML` only for HTML that
// came from this editor — never from user-generated content. The admin
// panel is gated by `requireRole(PERMISSIONS.products)` so only editors
// can write this HTML.

interface HtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
  dir?: "ltr" | "rtl";
}

export function HtmlEditor({
  value,
  onChange,
  placeholder = "Saisir le contenu (HTML autorisé)...",
  rows = 8,
  dir = "ltr",
}: HtmlEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync the contentEditable content when the external value changes
  // (e.g. when the admin switches language or loads a different product).
  // We compare with the current innerHTML to avoid resetting the caret
  // position on every keystroke.
  if (ref.current && ref.current.innerHTML !== value) {
    ref.current.innerHTML = value || "";
  }

  const exec = (command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  // Estimate a height based on `rows` (approx 24px per line + padding).
  const minHeight = rows * 24 + 32;

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => exec("bold")}
          title="Gras (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => exec("italic")}
          title="Italique (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => exec("formatBlock", "<h2>")}
          title="Titre H2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => exec("formatBlock", "<h3>")}
          title="Titre H3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => exec("formatBlock", "<p>")}
          title="Paragraphe"
        >
          <span className="text-xs font-bold">P</span>
        </Button>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => exec("insertUnorderedList")}
          title="Liste à puces"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => exec("insertOrderedList")}
          title="Liste numérotée"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => {
            const url = window.prompt("URL du lien :");
            if (url) exec("createLink", url);
          }}
          title="Insérer un lien"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => exec("undo")}
          title="Annuler (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => exec("redo")}
          title="Rétablir (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* ContentEditable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        dir={dir}
        data-placeholder={placeholder}
        className="prose prose-sm max-w-none px-3 py-2 text-slate-900 focus:outline-none [&_a]:text-brand-700 [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:list-disc [&_li]:ml-5 [&_li]:my-0.5 [&_ol>li]:list-decimal [&_p]:my-1.5 [&_p]:leading-relaxed [&_ul]:my-1.5 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        style={{ minHeight: `${minHeight}px` }}
      />

      {/* Hidden fallback textarea — keeps the form payload consistent.
          The actual value sent to the API is the contentEditable's HTML,
          but we expose a read-only textarea for debugging + accessibility. */}
      <details className="border-t border-slate-200 bg-slate-50">
        <summary className="cursor-pointer px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">
          Voir / éditer le HTML brut
        </summary>
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (ref.current) ref.current.innerHTML = e.target.value;
          }}
          rows={4}
          dir={dir}
          className="w-full border-t border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none"
        />
      </details>
    </div>
  );
}
