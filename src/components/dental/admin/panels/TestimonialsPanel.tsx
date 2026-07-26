"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Save, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";

interface Testimonial { id: string; nom: string; etablissement: string | null; wilaya: string | null; note: number; texte_fr: string; texte_ar: string; photo_url: string | null; actif: boolean; ordre: number; }
const EMPTY = { nom: "", etablissement: "", wilaya: "", note: 5, texte_fr: "", texte_ar: "", photo_url: "", actif: true, ordre: 0 };

export function TestimonialsPanel() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => { setLoading(true); try { const r = await fetch("/api/admin/testimonials", { cache: "no-store" }); const d = await r.json(); if (r.ok) setItems(d.testimonials || []); } catch {} setLoading(false); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const edit = (r: Testimonial) => { setEditing(r.id); setForm({ nom: r.nom, etablissement: r.etablissement || "", wilaya: r.wilaya || "", note: r.note, texte_fr: r.texte_fr, texte_ar: r.texte_ar || "", photo_url: r.photo_url || "", actif: r.actif, ordre: r.ordre }); setShowForm(true); };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/testimonials", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...form, id: editing } : form) });
      if (!res.ok) { toast.error("Erreur"); setSaving(false); return; }
      toast.success(t("saved")); setShowForm(false); setEditing(null); setForm(EMPTY); refresh();
    } catch { toast.error("Erreur réseau"); }
    setSaving(false);
  };

  const remove = async (id: string) => { if (!confirm(t("confirmDelete"))) return; await fetch(`/api/admin/testimonials?id=${id}`, { method: "DELETE" }); toast.success(t("saved")); refresh(); };
  const toggleActive = async (id: string, actif: boolean) => { const item = items.find(r => r.id === id); if (!item) return; await fetch("/api/admin/testimonials", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, id, actif }) }); refresh(); };

  const renderStars = (n: number) => <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</div>;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-brand-700" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Témoignages</h2><Button size="sm" onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" /> {t("add")}</Button></div>
      {showForm && (
        <Card className="border-brand-200"><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><Label>Nom</Label><Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></div>
            <div><Label>Établissement</Label><Input value={form.etablissement} onChange={e => setForm(f => ({ ...f, etablissement: e.target.value }))} /></div>
            <div><Label>Wilaya</Label><Input value={form.wilaya} onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))} /></div>
            <div><Label>Note</Label><div className="flex gap-1 mt-1">{[1,2,3,4,5].map(i => <button key={i} type="button" onClick={() => setForm(f => ({ ...f, note: i }))}><Star className={`h-5 w-5 ${i <= form.note ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} /></button>)}</div></div>
            <div><Label>Ordre</Label><Input type="number" value={form.ordre} onChange={e => setForm(f => ({ ...f, ordre: Number(e.target.value) }))} /></div>
            <div><Label>URL photo</Label><Input value={form.photo_url} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} /></div>
          </div>
          <div><Label>Témoignage (FR)</Label><Textarea value={form.texte_fr} onChange={e => setForm(f => ({ ...f, texte_fr: e.target.value }))} /></div>
          <div><Label>Témoignage (AR)</Label><Textarea value={form.texte_ar} onChange={e => setForm(f => ({ ...f, texte_ar: e.target.value }))} /></div>
          <div className="flex gap-2"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} {t("save")}</Button><Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4 mr-1" /> {t("cancel")}</Button></div>
        </CardContent></Card>
      )}
      <div className="space-y-2">
        {items.map(r => (
          <Card key={r.id} className={r.actif ? "border-slate-200" : "border-slate-100 opacity-60"}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-medium text-slate-900">{r.nom}</p>{renderStars(r.note)}</div><p className="text-xs text-slate-500">{r.etablissement} {r.wilaya ? `· ${r.wilaya}` : ""}</p><p className="text-sm text-slate-600 mt-1 line-clamp-2">{r.texte_fr}</p></div>
                <Badge variant={r.actif ? "default" : "secondary"}>{r.actif ? "Actif" : "Inactif"}</Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(r.id, !r.actif)}>{r.actif ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => edit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Aucun témoignage.</p>}
      </div>
    </div>
  );
}
export default TestimonialsPanel;
