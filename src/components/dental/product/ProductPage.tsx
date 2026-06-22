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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupabaseImage } from "@/components/dental/ui/SupabaseImage";
import { ImageLightbox, type LightboxImage } from "@/components/dental/ui/ImageLightbox";
import { ProductCard } from "@/components/dental/catalogue/ProductCard";
import { useTranslation } from "@/lib/i18n";
import { useData, useProductBySlug } from "@/lib/data-service";
import { useQuoteCart } from "@/hooks/useQuoteCart";
import { useCompare } from "@/hooks/useCompare";
import { navigate } from "@/lib/router";
import { getProductImageUrl } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";

export function ProductPage({ slug }: { slug?: string }) {
  const { t, lang } = useTranslation();
  const product = useProductBySlug(slug);
  const { categories, products, loading } = useData();
  const addToQuote = useQuoteCart((s) => s.add);
  const compare = useCompare((s) => s);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const category = useMemo(
    () =>
      product
        ? categories.find((c) => c.slug === product.categorySlug)
        : undefined,
    [product, categories]
  );

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (p) =>
          p.categorySlug === product.categorySlug && p.id !== product.id
      )
      .slice(0, 4);
  }, [product, products]);

  // Build the lightbox image list from the product's image filenames.
  // Filenames whose URL can't be resolved (Supabase not configured) are skipped.
  const lightboxImages: LightboxImage[] = useMemo(() => {
    if (!product) return [];
    return (product.images || [])
      .map((fn) => {
        const url = getProductImageUrl(fn);
        return url ? { url, filename: fn, alt: product.name[lang] } : null;
      })
      .filter(
        (x): x is { url: string; filename: string; alt: string } => x !== null
      );
  }, [product, lang]);

  if (!loading && !product) {
    return <ProductNotFound />;
  }

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

  // Open the full-screen lightbox at the image whose filename matches `fn`.
  const openLightbox = (fn: string) => {
    const lbIdx = lightboxImages.findIndex((img) => img.filename === fn);
    if (lbIdx === -1) return;
    setLightboxIndex(lbIdx);
    setLightboxOpen(true);
  };

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
            <button
              onClick={() => navigate("catalogue")}
              className="hover:text-brand-700"
            >
              {t("catalogue")}
            </button>
            {category && (
              <>
                <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                <button
                  onClick={() => navigate(`catalogue/${category.slug}`)}
                  className="hover:text-brand-700"
                >
                  {category.name[lang]}
                </button>
              </>
            )}
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <span className="line-clamp-1 text-slate-700">
              {product.name[lang]}
            </span>
          </nav>
        </div>
      </div>

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
                  {product.featured && (
                    <Badge variant="default">{t("featured")}</Badge>
                  )}
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
                    aria-label={`Image ${idx + 1}`}
                  >
                    <SupabaseImage
                      filename={img}
                      alt={`${product.name[lang]} ${idx + 1}`}
                      fallbackText=""
                      width={120}
                      height={120}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* RIGHT — Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex flex-col"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-brand-700">
                {product.brand}
              </span>
              <span>•</span>
              <span>{product.model}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {product.name[lang]}
            </h1>

            {category && (
              <button
                onClick={() => navigate(`catalogue/${category.slug}`)}
                className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                {category.name[lang]}
              </button>
            )}

            {/* Description */}
            <div className="prose prose-sm mt-5 max-w-none text-slate-700 [&_p]:mb-2 [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:mb-1">
              <div
                dangerouslySetInnerHTML={{
                  __html: product.description[lang] || "",
                }}
              />
            </div>

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
                {inCompare ? <Check className="h-5 w-5" /> : <GitCompare className="h-5 w-5" />}
                {t("addToCompare")}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("devis")}
              >
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
                <span className="text-xs font-semibold text-slate-600">
                  {t("audience")} :
                </span>
                {product.audience.map((a) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Full specs table */}
        {product.specs.length > 0 && (
          <Card className="mt-10 border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">{t("specs")}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <tbody>
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
                onClick={() =>
                  navigate(`catalogue/${product.categorySlug}`)
                }
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
      <h1 className="text-2xl font-bold text-slate-900">
        {t("productNotFound")}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{t("productNotFoundDesc")}</p>
      <Button className="mt-6" onClick={() => navigate("catalogue")}>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        {t("backToCatalogue")}
      </Button>
    </div>
  );
}
