"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  GitCompare,
  Check,
  FileText,
  ChevronLeft,
  PackageSearch,
  Download,
  Users,
  ZoomIn,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupabaseImage } from "@/components/dental/ui/SupabaseImage";
import { ImageLightbox, type LightboxImage } from "@/components/dental/ui/ImageLightbox";
import { ProductCard } from "@/components/dental/catalogue/ProductCard";
import { useTranslation } from "@/lib/i18n";
import { useData } from "@/lib/data-service";
import { useQuoteCart } from "@/hooks/useQuoteCart";
import { useCompare } from "@/hooks/useCompare";
import { navigate } from "@/lib/router";
import { getProductImageUrl } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";
import type { Product, ProductFaqItem } from "@/lib/types";
import { COMPANY } from "@/lib/types";

// RichContent renders HTML string content (server-side validated safe — admin-only).
function RichContent({ html }: { html?: string }) {
  if (!html) {
    return (
      <p className="text-sm text-slate-500 italic">
        Contenu en cours de rédaction. Contactez-nous pour plus d'informations.
      </p>
    );
  }
  return (
    <div
      className="prose prose-sm max-w-none text-slate-700 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_img]:rounded-lg [&_li]:ml-6 [&_li]:my-1 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function FaqList({ items }: { items?: ProductFaqItem[] }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        Aucune question fréquente pour ce produit. Contactez-nous pour plus d'informations.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <details
          key={idx}
          className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-300"
        >
          <summary className="cursor-pointer list-none">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{item.q}</h3>
              <span className="mt-0.5 text-brand-700 transition-transform group-open:rotate-45">+</span>
            </div>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

function Stars({ value, count }: { value: number; count: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[0, 1, 2, 3, 4].map((i) => {
          const filled = i < full;
          const isHalf = i === full && half;
          return (
            <Star
              key={i}
              className={
                "h-4 w-4 " +
                (filled
                  ? "fill-amber-400 text-amber-400"
                  : isHalf
                    ? "fill-amber-200 text-amber-400"
                    : "fill-none text-slate-300")
              }
            />
          );
        })}
      </div>
      <span className="text-sm font-medium text-slate-900">{value.toFixed(1)}</span>
      <span className="text-xs text-slate-500">({count} avis)</span>
    </div>
  );
}

export function ProductPage({
  slug,
  serverProduct,
}: {
  slug?: string;
  serverProduct?: Product;
}) {
  const { t, lang } = useTranslation();
  // Prefer the server-rendered product; fall back to client-side fetch.
  const clientProduct = useData().products.find((p) => p.slug === slug);
  const { categories, products } = useData();
  const addToQuote = useQuoteCart((s) => s.add);
  const compare = useCompare((s) => s);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const product = serverProduct || clientProduct;

  const category = useMemo(
    () => (product ? categories.find((c) => c.slug === product.categorySlug) : undefined),
    [product, categories]
  );

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
      .slice(0, 4);
  }, [product, products]);

  const lightboxImages: LightboxImage[] = useMemo(() => {
    if (!product) return [];
    return (product.images || [])
      .map((fn) => {
        const url = getProductImageUrl(fn);
        return url ? { url, filename: fn, alt: product.name[lang] } : null;
      })
      .filter((x): x is { url: string; filename: string; alt: string } => x !== null);
  }, [product, lang]);

  if (!product) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
      </div>
    );
  }

  const inCompare = compare.has(product.id);
  const images = product.images.length ? product.images : [""];
  const activeImg = images[activeImage] || images[0];

  const handleAddQuote = () => {
    addToQuote(product, 1);
    toast.success(t("addedToQuote"), { description: product.name[lang] });
  };

  const handleCompare = () => {
    if (inCompare) {
      compare.remove(product.id);
      toast.success("Retiré du comparateur");
      return;
    }
    if (compare.ids.length >= 4) {
      toast.error(t("maxCompareReached"));
      return;
    }
    compare.add(product);
    toast.success("Ajouté au comparateur");
  };

  const openLightbox = (fn: string) => {
    const lbIdx = lightboxImages.findIndex((img) => img.filename === fn);
    if (lbIdx === -1) return;
    setLightboxIndex(lbIdx);
    setLightboxOpen(true);
  };

  // Excerpt for "En bref" block — extractible by AI crawlers.
  const excerpt =
    product.descriptionLongue?.fr ||
    product.description.fr ||
    "";

  // Determine which tabs to show (only those with content).
  const showDescriptionLongue = Boolean(product.descriptionLongue?.fr || product.descriptionLongue?.ar);
  const showUsages = Boolean(product.usages?.fr || product.usages?.ar);
  const showMaintenance = Boolean(product.maintenance?.fr || product.maintenance?.ar);
  const showCompatibilite = Boolean(product.compatibilite?.fr || product.compatibilite?.ar);
  const showGarantie = Boolean(product.garantie?.fr || product.garantie?.ar);
  const showFaq = Boolean(product.faq?.fr && product.faq.fr.length > 0);
  const showSpecs = product.specs.length > 0;

  const priceLabel = (() => {
    if (!product.prixMin && !product.prixMax) return null;
    const fmt = (n: number) => new Intl.NumberFormat("fr-DZ").format(n) + " DZD";
    if (product.prixMin && product.prixMax && product.prixMin !== product.prixMax) {
      return fmt(product.prixMin) + " – " + fmt(product.prixMax);
    }
    return fmt(product.prixMin || product.prixMax || 0);
  })();

  return (
    <div className="bg-slate-50">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <button onClick={() => navigate("")} className="hover:text-brand-700">
              {t("breadcrumbHome")}
            </button>
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <button onClick={() => navigate("catalogue")} className="hover:text-brand-700">
              {t("catalogue")}
            </button>
            {category && (
              <>
                <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                <button
                  onClick={() => navigate("catalogue?category=" + category.slug)}
                  className="hover:text-brand-700"
                >
                  {category.name[lang]}
                </button>
              </>
            )}
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <span className="line-clamp-1 text-slate-700">{product.name[lang]}</span>
          </nav>
        </div>
      </div>

      {/* sr-only block — visible to AI crawlers (ChatGPT, Claude, Perplexity,
          Gemini) but hidden from humans. Provides a complete textual
          description of the product for AI knowledge graphs. */}
      <section className="sr-only" aria-label={"Description de " + product.name.fr}>
        <h1>
          {product.name.fr} — {product.brand} {product.model}
        </h1>
        <p>
          {product.name.fr} est un produit distribué par {COMPANY.name} à {COMPANY.city},{" "}
          {COMPANY.country}. Marque : {product.brand}. Modèle : {product.model}. Catégorie :{" "}
          {category?.name.fr || product.categorySlug}.
        </p>
        {product.descriptionLongue?.fr && (
          <p>{product.descriptionLongue.fr.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</p>
        )}
        {product.usages?.fr && (
          <p>Usages : {product.usages.fr.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</p>
        )}
        {product.maintenance?.fr && (
          <p>
            Maintenance :{" "}
            {product.maintenance.fr.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
          </p>
        )}
        {product.compatibilite?.fr && (
          <p>
            Compatibilité :{" "}
            {product.compatibilite.fr.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
          </p>
        )}
        {product.garantie?.fr && (
          <p>
            Garantie : {product.garantie.fr.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
          </p>
        )}
        {priceLabel && <p>Prix indicatif : {priceLabel}</p>}
        {product.faq?.fr && product.faq.fr.length > 0 && (
          <div>
            <h2>Questions fréquentes</h2>
            <ul>
              {product.faq.fr.map((f, i) => (
                <li key={i}>
                  <strong>{f.q}</strong> — {f.a}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p>
          Pour plus d'informations ou un devis personnalisé, contactez {COMPANY.name} au{" "}
          {COMPANY.phone} ou par email à {COMPANY.email}.
        </p>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* LEFT — Image gallery */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="overflow-hidden border-slate-200">
              <div className="relative aspect-square w-full bg-slate-100">
                <button
                  type="button"
                  onClick={() => openLightbox(activeImg)}
                  disabled={lightboxImages.length === 0}
                  className="group absolute inset-0 flex cursor-zoom-in items-center justify-center disabled:cursor-default"
                  aria-label="Zoom"
                >
                  <SupabaseImage
                    filename={activeImg}
                    alt={product.name[lang]}
                    fallbackText={product.name[lang]}
                    width={800}
                    height={800}
                    className="h-full w-full object-cover"
                  />
                  {lightboxImages.length > 0 && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-150 group-hover:bg-black/20 group-hover:opacity-100">
                      <ZoomIn className="h-10 w-10 text-white" />
                    </span>
                  )}
                </button>
                <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1.5">
                  {product.featured && <Badge variant="default">{t("featured")}</Badge>}
                  {product.available ? (
                    <Badge variant="success">{t("available")}</Badge>
                  ) : (
                    <Badge variant="warning">—</Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 bg-slate-100 transition-colors ${
                      idx === activeImage
                        ? "border-brand-700"
                        : "border-transparent hover:border-slate-300"
                    }`}
                    aria-label={"Image " + (idx + 1)}
                  >
                    <SupabaseImage
                      filename={img}
                      alt={product.name[lang] + " " + (idx + 1)}
                      fallbackText=""
                      width={120}
                      height={120}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Video */}
            {product.videoUrl && (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={product.videoUrl}
                    title={product.name[lang] + " — vidéo"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* RIGHT — Info + actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex flex-col"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-brand-700">{product.brand}</span>
              <span>•</span>
              <span>{product.model}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{product.name[lang]}</h1>

            {category && (
              <button
                onClick={() => navigate("catalogue?category=" + category.slug)}
                className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                {category.name[lang]}
              </button>
            )}

            {/* Rating + Price */}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {product.ratingValue && product.ratingCount && (
                <Stars value={product.ratingValue} count={product.ratingCount} />
              )}
              {priceLabel && (
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-slate-500">à partir de</span>
                  <span className="text-xl font-bold text-slate-900">{priceLabel}</span>
                </div>
              )}
            </div>

            {/* "En bref" — TL;DR extractible par IA */}
            {excerpt && (
              <aside className="mt-5 rounded-lg border-l-4 border-brand-600 bg-brand-50/60 px-5 py-4">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                  En bref
                </div>
                <p className="text-sm leading-relaxed text-slate-700 line-clamp-4">
                  {excerpt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
                </p>
              </aside>
            )}

            {/* Description courte */}
            {!showDescriptionLongue && product.description[lang] && (
              <div className="prose prose-sm mt-5 max-w-none text-slate-700 [&_p]:mb-2 [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:mb-1">
                <div dangerouslySetInnerHTML={{ __html: product.description[lang] }} />
              </div>
            )}

            <Separator className="my-6" />

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={handleAddQuote} className="flex-1 sm:flex-none">
                <ShoppingCart className="h-5 w-5" />
                {t("addToQuote")}
              </Button>
              <Button
                size="lg"
                variant={inCompare ? "default" : "outline"}
                onClick={handleCompare}
              >
                {inCompare ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <GitCompare className="h-5 w-5" />
                )}
                {t("addToCompare")}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("devis")}>
                <FileText className="h-5 w-5" />
                {t("requestQuote")}
              </Button>
            </div>

            {(product.brochurePdf || product.pdfUrl) && (
              <a
                href={product.brochurePdf || product.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
              >
                <Download className="h-4 w-4" />
                {t("downloadBrochure")}
              </a>
            )}

            {/* Quick specs */}
            <Card className="mt-6 border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("specs")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  <SpecRow label={t("brand")} value={product.brand} />
                  <SpecRow label={t("model")} value={product.model} />
                  <SpecRow
                    label={t("availability")}
                    value={product.available ? t("yes") : t("no")}
                  />
                  {product.specs.slice(0, 4).map((s, i) => (
                    <SpecRow key={i} label={s.label[lang]} value={s.value} />
                  ))}
                </dl>
              </CardContent>
            </Card>

            {product.audience && product.audience.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">{t("audience")} :</span>
                {product.audience.map((a) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* === ONGLETS — contenu riche === */}
        {(showDescriptionLongue ||
          showUsages ||
          showMaintenance ||
          showCompatibilite ||
          showGarantie ||
          showFaq ||
          showSpecs) && (
          <div className="mt-12">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="flex w-full flex-wrap gap-1 bg-slate-100 p-1">
                {showDescriptionLongue && (
                  <TabsTrigger value="description">Présentation</TabsTrigger>
                )}
                {showSpecs && <TabsTrigger value="specs">Caractéristiques</TabsTrigger>
                }
                {showUsages && <TabsTrigger value="usages">Usages</TabsTrigger>}
                {showMaintenance && (
                  <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                )}
                {showCompatibilite && (
                  <TabsTrigger value="compatibilite">Compatibilité</TabsTrigger>
                )}
                {showGarantie && <TabsTrigger value="garantie">Garantie</TabsTrigger>}
                {showFaq && <TabsTrigger value="faq">FAQ</TabsTrigger>}
              </TabsList>

              {showDescriptionLongue && (
                <TabsContent value="description">
                  <Card className="border-slate-200">
                    <CardContent className="pt-6">
                      <RichContent
                        html={
                          product.descriptionLongue?.[lang] || product.descriptionLongue?.fr
                        }
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {showSpecs && (
                <TabsContent value="specs">
                  <Card className="border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Caractéristiques techniques</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="bg-white">
                              <th className="w-1/3 px-4 py-2.5 text-start font-medium text-slate-600">
                                Marque
                              </th>
                              <td className="px-4 py-2.5 text-slate-900">{product.brand}</td>
                            </tr>
                            <tr className="bg-slate-50/60">
                              <th className="w-1/3 px-4 py-2.5 text-start font-medium text-slate-600">
                                Modèle
                              </th>
                              <td className="px-4 py-2.5 text-slate-900">{product.model}</td>
                            </tr>
                            {product.specs.map((s, i) => (
                              <tr
                                key={i}
                                className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                              >
                                <th className="w-1/3 px-4 py-2.5 text-start font-medium text-slate-600">
                                  {s.label[lang]}
                                </th>
                                <td className="px-4 py-2.5 text-slate-900">{s.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {showUsages && (
                <TabsContent value="usages">
                  <Card className="border-slate-200">
                    <CardContent className="pt-6">
                      <RichContent html={product.usages?.[lang] || product.usages?.fr} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {showMaintenance && (
                <TabsContent value="maintenance">
                  <Card className="border-slate-200">
                    <CardContent className="pt-6">
                      <RichContent
                        html={product.maintenance?.[lang] || product.maintenance?.fr}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {showCompatibilite && (
                <TabsContent value="compatibilite">
                  <Card className="border-slate-200">
                    <CardContent className="pt-6">
                      <RichContent
                        html={product.compatibilite?.[lang] || product.compatibilite?.fr}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {showGarantie && (
                <TabsContent value="garantie">
                  <Card className="border-slate-200">
                    <CardContent className="pt-6">
                      <RichContent html={product.garantie?.[lang] || product.garantie?.fr} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {showFaq && (
                <TabsContent value="faq">
                  <Card className="border-slate-200">
                    <CardContent className="pt-6">
                      <FaqList items={product.faq?.[lang] || product.faq?.fr} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {t("relatedProducts")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("catalogue?category=" + product.categorySlug)}
                className="text-brand-700 hover:bg-brand-50"
              >
                {t("viewAll")}
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function ProductNotFound() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <PackageSearch className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{t("productNotFound")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t("productNotFoundDesc")}</p>
      <Button className="mt-6" onClick={() => navigate("catalogue")}>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToCatalogue")}
      </Button>
    </div>
  );
}
