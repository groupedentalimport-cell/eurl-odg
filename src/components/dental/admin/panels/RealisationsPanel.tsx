"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, ImageIcon, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";

interface Realisation { id: string; nom: string; nom_ar: string; wilaya: string; description_fr: string; description_ar: string; image_url: string | null; produits: string[]; client_nom: string | null; date_projet: string | null; actif: boolean; ordre: number; }
const EMPTY = { nom: "", nom_ar: "", wilaya: "", description_fr: "", description_ar: "", image_url: "", produits: "", client_nom: "", date_projet: "", actif: true, ordre: 0 };

export function RealisationsPanel() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Realisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => { setLoading(true); try { const r = await fetch("/api/admin/realisations", { cache: "no-store" }); const d = await r.json(); if (r.ok) setItems(d.realisations || []); } catch {} setLoading(false); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const edit = (r: Realisation) => { setEditing(r.id); setForm({ nom: r.nom, nom_ar: r.nom_ar || "", wilaya: r.wilaya || "", description_fr: r.description_fr || "", description_ar: r.description_ar || "", image_url: r.image_url || "", produits: (r.produits || []).join(", "), client_nom: r.client_nom || "", date_projet: r.date_projet || "", actif: r.actif, ordre: r.ordre }); setShowForm(true); };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, produits: form.produits.split(",").map(s => s.trim()).filter(Boolean), ordre: Number(form.ordre) || 0 };
    try {
      const res = await fetch("/api/admin/realisations", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...payload, id: editing } : payload) });
      if (!res.ok) { toast.error("Erreur"); setSaving(false); return; }
      toast.success(t("saved")); setShowForm(false); setEditing(null); setForm(EMPTY); refresh();
    } catch { toast.error("Erreur réseau"); }
    setSaving(false);
  };

  const remove = async (id: string) => { if (!confirm(t("confirmDelete"))) return; await fetch(`/api/admin/realisations?id=${id}`, { method: "DELETE" }); toast.success(t("saved")); refresh(); };
  const toggleActive = async (id: string, actif: boolean) => { const item = items.find(r => r.id === id); if (!item) return; await fetch("/api/admin/realisations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, id, actif }) }); refresh(); };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-brand-700" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{t("realisationsTitle")}</h2><Button size="sm" onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" /> {t("add")}</Button></div>
      {showForm && (
        <Card className="border-brand-200"><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><Label>Nom (FR)</Label><Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></div>
            <div><Label>Nom (AR)</Label><Input value={form.nom_ar} onChange={e => setForm(f => ({ ...f, nom_ar: e.target.value }))} /></div>
            <div><Label>Wilaya</Label><Input value={form.wilaya} onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))} /></div>
            <div><Label>Client</Label><Input value={form.client_nom} onChange={e => setForm(f => ({ ...f, client_nom: e.target.value }))} /></div>
            <div><Label>Date projet</Label><Input type="date" value={form.date_projet} onChange={e => setForm(f => ({ ...f, date_projet: e.target.value }))} /></div>
            <div><Label>Ordre</Label><Input type="number" value={form.ordre} onChange={e => setForm(f => ({ ...f, ordre: Number(e.target.value) }))} /></div>
          </div>
          <div><Label>Description (FR)</Label><Textarea value={form.description_fr} onChange={e => setForm(f => ({ ...f, description_fr: e.target.value }))} /></div>
          <div><Label>Description (AR)</Label><Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} /></div>
          <div><Label>URL image</Label><Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." /></div>
          <div><Label>Produits installés (virgule)</Label><Input value={form.produits} onChange={e => setForm(f => ({ ...f, produits: e.target.value }))} placeholder="Silver Fox 8000C, ICANCLAVE" /></div>
          <div className="flex gap-2"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} {t("save")}</Button><Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4 mr-1" /> {t("cancel")}</Button></div>
        </CardContent></Card>
      )}
      <div className="space-y-2">
        {items.map(r => (
          <Card key={r.id} className={r.actif ? "border-slate-200" : "border-slate-100 opacity-60"}>
            <CardContent className="flex items-center gap-3 p-3">
              {r.image_url ? <img src={r.image_url} alt={r.nom} className="h-14 w-14 rounded object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded bg-slate-100"><ImageIcon className="h-6 w-6 text-slate-300" /></div>}
              <div className="min-w-0 flex-1"><p className="font-medium text-slate-900 truncate">{r.nom}</p><p className="text-xs text-slate-500">{r.wilaya} {r.client_nom ? `· ${r.client_nom}` : ""}</p></div>
              <Badge variant={r.actif ? "default" : "secondary"}>{r.actif ? "Actif" : "Inactif"}</Badge>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(r.id, !r.actif)}>{r.actif ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => edit(r)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Aucune réalisation. Cliquez sur "Ajouter".</p>}
      </div>
    </div>
  );
}
export default RealisationsPanel;
