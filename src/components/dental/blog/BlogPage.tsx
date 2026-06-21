"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, CalendarDays, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData, getBlogImageUrl } from "@/lib/data-service";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";

// Local image component for blog bucket (blog-images, not product-images)
function BlogImage({ filename, alt, className, fallbackText = "ODG" }: { filename?: string; alt: string; className?: string; fallbackText?: string }) {
  const [errored, setErrored] = useState(false);
  const url = getBlogImageUrl(filename);
  if (!filename || !url || errored) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 ${className || ""}`}>
        <span className="px-2 text-xs font-medium line-clamp-2 text-center">{fallbackText}</span>
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" onError={() => setErrored(true)} className={className} />;
}

export function BlogPage() {
  const { blogPosts, loading } = useData();
  const { lang, t } = useTranslation();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return blogPosts;
    return blogPosts.filter((p) => {
      const title = p.title[lang]?.toLowerCase() || "";
      const excerpt = p.excerpt[lang]?.toLowerCase() || "";
      return title.includes(q) || excerpt.includes(q);
    });
  }, [blogPosts, query, lang]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <Badge variant="secondary" className="mb-3 bg-brand-50 text-brand-700">
          {t("blog")}
        </Badge>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{t("blog")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">{t("blogIntro")}</p>
      </div>

      {/* Search */}
      <div className="mb-10 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("blogSearchPlaceholder")}
            className="pl-9"
            aria-label={t("search")}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-slate-500">{t("noPosts")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card
                className="group h-full cursor-pointer overflow-hidden border-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg"
                onClick={() => navigate(`blog/${post.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`blog/${post.slug}`);
                }}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-brand-50">
                  <BlogImage
                    filename={post.imageUrl}
                    alt={post.title[lang]}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    fallbackText={post.title[lang]}
                  />
                </div>
                <CardContent className="p-5">
                  <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">
                    {post.title[lang]}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                    {post.excerpt[lang]}
                  </p>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
