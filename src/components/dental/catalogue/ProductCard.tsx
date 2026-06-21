"use client";
import { ShoppingCart, GitCompare, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupabaseImage } from "@/components/dental/ui/SupabaseImage";
import { useTranslation } from "@/lib/i18n";
import { useQuoteCart } from "@/hooks/useQuoteCart";
import { useCompare } from "@/hooks/useCompare";
import { navigate } from "@/lib/router";
import { toast } from "@/components/ui/sonner";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { t, lang } = useTranslation();
  const addToQuote = useQuoteCart((s) => s.add);
  const compare = useCompare((s) => s);
  const inCompare = compare.has(product.id);

  const handleAdd = () => {
    addToQuote(product, 1);
    toast.success(t("addedToQuote"), { description: product.name[lang] });
  };

  const handleCompare = () => {
    if (inCompare) {
      compare.remove(product.id);
    } else {
      if (compare.ids.length >= 4) {
        toast.error("Max 4 produits à comparer");
        return;
      }
      compare.add(product);
      toast.success("Ajouté au comparateur");
    }
  };

  return (
    <Card className="group flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
      <button
        onClick={() => navigate(`produit/${product.slug}`)}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100"
        aria-label={product.name[lang]}
      >
        <SupabaseImage
          filename={product.images[0]}
          alt={product.name[lang]}
          fallbackText={product.name[lang]}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.featured && <Badge variant="default">{t("featured")}</Badge>}
          {product.available && <Badge variant="success">{t("available")}</Badge>}
        </div>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-brand-700">{product.brand}</span>
          <span>•</span>
          <span>{product.model}</span>
        </div>
        <button
          onClick={() => navigate(`produit/${product.slug}`)}
          className="mb-2 line-clamp-2 text-left text-sm font-semibold text-slate-900 hover:text-brand-700"
        >
          {product.name[lang]}
        </button>

        <div className="mt-auto flex flex-col gap-2 pt-3">
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleAdd}>
              <ShoppingCart className="h-4 w-4" />
              {t("addToQuote")}
            </Button>
            <Button
              size="icon"
              variant={inCompare ? "default" : "outline"}
              onClick={handleCompare}
              aria-label={t("addToCompare")}
              className="h-9 w-9"
            >
              {inCompare ? <Check className="h-4 w-4" /> : <GitCompare className="h-4 w-4" />}
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate(`produit/${product.slug}`)}>
            {t("viewDetails")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
