"use client";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// FaqEditor — dynamic list of {q, a} pairs for the product FAQ field.
// ---------------------------------------------------------------------------
//
// Each item is a question + answer. The state is kept in sync with the
// parent form via the `value`/`onChange` props. The output is an array
// of {q, a} objects — the API serializes it to JSONB for Postgres.

export interface FaqItem {
  q: string;
  a: string;
}

export function FaqEditor({
  value,
  onChange,
}: {
  value: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}) {
  const update = (idx: number, field: "q" | "a", v: string) => {
    const next = value.map((it, i) => (i === idx ? { ...it, [field]: v } : it));
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([...value, { q: "", a: "" }]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...value];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveDown = (idx: number) => {
    if (idx === value.length - 1) return;
    const next = [...value];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
          Aucune question pour le moment. Cliquez sur « Ajouter une question » pour
          commencer. Chaque question/réponse génère automatiquement le schema
          FAQPage JSON-LD (visible dans Google Rich Results).
        </p>
      )}

      {value.map((item, idx) => (
        <div
          key={idx}
          className="rounded-md border border-slate-200 bg-white p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <GripVertical className="h-3 w-3" />
              Question {idx + 1}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                title="Monter"
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => moveDown(idx)}
                disabled={idx === value.length - 1}
                title="Descendre"
              >
                ↓
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                onClick={() => remove(idx)}
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <Label htmlFor={`faq-q-${idx}`} className="text-xs">
                Question
              </Label>
              <Input
                id={`faq-q-${idx}`}
                value={item.q}
                onChange={(e) => update(idx, "q", e.target.value)}
                placeholder="Ex: Quelle est la durée de la garantie ?"
              />
            </div>
            <div>
              <Label htmlFor={`faq-a-${idx}`} className="text-xs">
                Réponse
              </Label>
              <Textarea
                id={`faq-a-${idx}`}
                value={item.a}
                onChange={(e) => update(idx, "a", e.target.value)}
                rows={2}
                placeholder="Ex: Le fauteuil est garanti 2 ans pièces et main-d'œuvre..."
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" />
        Ajouter une question
      </Button>
    </div>
  );
}
