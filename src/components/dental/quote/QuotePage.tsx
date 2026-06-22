"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  FileText,
  ChevronLeft,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupabaseImage } from "@/components/dental/ui/SupabaseImage";
import { useTranslation } from "@/lib/i18n";
import { useQuoteCart } from "@/hooks/useQuoteCart";
import { navigate } from "@/lib/router";
import { toast } from "@/components/ui/sonner";

// 58 Algerian wilayas. The value sent to the API is the wilaya NAME
// (e.g. "Oran"), not the number — the number is only a display prefix.
const WILAYAS: string[] = [
  "Adrar",
  "Chlef",
  "Laghouat",
  "Oum El Bouaghi",
  "Batna",
  "Béjaïa",
  "Biskra",
  "Béchar",
  "Blida",
  "Bouira",
  "Tamanrasset",
  "Tébessa",
  "Tlemcen",
  "Tiaret",
  "Tizi Ouzou",
  "Alger",
  "Djelfa",
  "Jijel",
  "Sétif",
  "Saïda",
  "Skikda",
  "Sidi Bel Abbès",
  "Annaba",
  "Guelma",
  "Constantine",
  "Médéa",
  "Mostaganem",
  "M'Sila",
  "Mascara",
  "Ouargla",
  "Oran",
  "El Bayadh",
  "Illizi",
  "Bordj Bou Arréridj",
  "Boumerdès",
  "El Tarf",
  "Tindouf",
  "Tissemsilt",
  "El Oued",
  "Khenchela",
  "Souk Ahras",
  "Tipaza",
  "Mila",
  "Aïn Defla",
  "Naâma",
  "Aïn Témouchent",
  "Ghardaïa",
  "Relizane",
  "Timimoun",
  "Bordj Badji Mokhtar",
  "Ouled Djellal",
  "Béni Abbès",
  "In Salah",
  "In Guezzam",
  "Touggourt",
  "Djanet",
  "El M'Ghair",
  "El Meniaa",
];

// Display label with the official wilaya number prefix (01..58).
function wilayaLabel(idx: number, name: string): string {
  const num = String(idx + 1).padStart(2, "0");
  return `${num} ${name}`;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  wilaya: string;
  type_client: string;
  message: string;
}

const DEFAULT_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  wilaya: "Oran",
  type_client: "dentiste",
  message: "",
};

export function QuotePage() {
  const { t, lang } = useTranslation();
  const items = useQuoteCart((s) => s.items);
  const totalItems = useQuoteCart((s) => s.totalItems);
  const setQty = useQuoteCart((s) => s.setQty);
  const remove = useQuoteCart((s) => s.remove);
  const clear = useQuoteCart((s) => s.clear);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const totalProducts = items.length;
  const totalQuantity = totalItems;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error(t("requiredField"));
      return;
    }
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      // There is no `company` column in the `quotes` table. When the user
      // provides a company, we prepend it to the message so it is preserved.
      const composedMessage = form.company
        ? `Société: ${form.company}\n\n${form.message}`.trim()
        : form.message.trim();

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: form.name,
          email: form.email,
          telephone: form.phone,
          wilaya: form.wilaya,
          type_client: form.type_client,
          message: composedMessage,
          produits_selectionnes: items,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Erreur d'envoi");
      }

      toast.success(t("quoteReceived"), {
        description: t("quoteReceivedDesc"),
      });
      clear();
      setForm(DEFAULT_FORM);
    } catch (err: any) {
      toast.error(t("sentFail"), { description: err.message || "" });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return <QuoteEmpty />;
  }

  return (
    <div className="bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
            <button onClick={() => navigate("")} className="hover:text-brand-700">
              {t("breadcrumbHome")}
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <span className="text-slate-700">{t("quoteTitle")}</span>
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  {t("quoteTitle")}
                </h1>
                <p className="text-sm text-slate-500">
                  {totalProducts} {t("productsCount")} · {totalQuantity}{" "}
                  {t("totalItems").toLowerCase()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                clear();
                toast.success(t("clearQuote"));
              }}
            >
              <Trash2 className="h-4 w-4" />
              {t("clearQuote")}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT — Items list */}
          <div className="space-y-4 lg:col-span-2">
            {items.map((item, i) => (
              <motion.div
                key={item.productId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Card className="border-slate-200">
                  <CardContent className="flex gap-4 p-4">
                    {/* Image */}
                    <button
                      onClick={() => navigate(`produit/${item.slug}`)}
                      className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-28"
                      aria-label={item.name[lang]}
                    >
                      <SupabaseImage
                        filename={item.image}
                        alt={item.name[lang]}
                        fallbackText={item.name[lang]}
                        className="h-full w-full object-cover"
                      />
                    </button>

                    {/* Info */}
                    <div className="flex flex-1 flex-col">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-brand-700">
                          {item.brand}
                        </span>
                        <span>•</span>
                        <span>{item.model}</span>
                      </div>
                      <button
                        onClick={() => navigate(`produit/${item.slug}`)}
                        className="mt-0.5 line-clamp-2 text-start text-sm font-semibold text-slate-900 hover:text-brand-700"
                      >
                        {item.name[lang]}
                      </button>

                      {/* Quantity stepper */}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => setQty(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="-"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              setQty(
                                item.productId,
                                parseInt(e.target.value || "1", 10)
                              )
                            }
                            className="h-8 w-14 text-center"
                            aria-label={t("quantity")}
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => setQty(item.productId, item.quantity + 1)}
                            aria-label="+"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            remove(item.productId);
                            toast.success(t("remove"), {
                              description: item.name[lang],
                            });
                          }}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("remove")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <Button
              variant="ghost"
              onClick={() => navigate("catalogue")}
              className="text-brand-700 hover:bg-brand-50"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              {t("browseCatalogue")}
            </Button>
          </div>

          {/* RIGHT — Customer info form + summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Summary */}
              <Card className="border-slate-200 bg-brand-50/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("quoteSummary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t("products")}</span>
                    <span className="font-semibold">{totalProducts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t("totalItems")}</span>
                    <span className="font-semibold">{totalQuantity}</span>
                  </div>
                  <Separator />
                  <p className="text-xs text-slate-500">
                    {lang === "ar"
                      ? "سيتم إرسال عرض السعر عبر البريد الإلكتروني خلال 24 ساعة."
                      : "Le devis détaillé vous sera envoyé par email sous 24h."}
                  </p>
                </CardContent>
              </Card>

              {/* Form */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-brand-700" />
                    {t("customerInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Field label={t("name")} required>
                      <Input
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        required
                        placeholder={t("name")}
                      />
                    </Field>
                    <Field label={t("email")} required>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        required
                        placeholder="email@exemple.com"
                      />
                    </Field>
                    <Field label={t("phone")} required>
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                        required
                        placeholder="+213 ..."
                      />
                    </Field>

                    {/* Wilaya + Type de client — 2 columns on >= sm */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label={t("wilaya")}>
                        <Select
                          value={form.wilaya}
                          onValueChange={(v) =>
                            setForm({ ...form, wilaya: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("wilaya")} />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {WILAYAS.map((w, idx) => (
                              <SelectItem key={w} value={w}>
                                {wilayaLabel(idx, w)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label={t("clientType")}>
                        <Select
                          value={form.type_client}
                          onValueChange={(v) =>
                            setForm({ ...form, type_client: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("clientType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dentiste">
                              {t("clientTypeDentist")}
                            </SelectItem>
                            <SelectItem value="clinique">
                              {t("clientTypeClinic")}
                            </SelectItem>
                            <SelectItem value="hopital">
                              {t("clientTypeHospital")}
                            </SelectItem>
                            <SelectItem value="revendeur">
                              {t("clientTypeReseller")}
                            </SelectItem>
                            <SelectItem value="autre">
                              {t("clientTypeOther")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field label={t("company")}>
                      <Input
                        value={form.company}
                        onChange={(e) =>
                          setForm({ ...form, company: e.target.value })
                        }
                        placeholder={t("company")}
                      />
                    </Field>
                    <Field label={t("message")}>
                      <Textarea
                        value={form.message}
                        onChange={(e) =>
                          setForm({ ...form, message: e.target.value })
                        }
                        rows={3}
                        placeholder={t("message")}
                      />
                    </Field>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {t("sending")}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 rtl:rotate-180" />
                          {t("submitQuote")}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function QuoteEmpty() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <ShoppingCart className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{t("quoteEmpty")}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {t("quoteEmptyDesc")}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => navigate("catalogue")}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t("browseCatalogue")}
        </Button>
      </div>

      <div className="mx-auto mt-10 flex max-w-md items-start gap-3 rounded-lg border border-brand-100 bg-brand-50/60 p-4 text-start text-sm text-brand-800">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />
        <span>{t("quoteEmptyCart")}</span>
      </div>
    </div>
  );
}
