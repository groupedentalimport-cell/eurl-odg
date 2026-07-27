"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, User, ZoomIn, Download, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useBlogBySlug, useData, getBlogImageUrl } from "@/lib/data-service";
import { useTranslation } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import type { BlogPost } from "@/lib/types";

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

export function BlogPostPage({ slug, serverPost }: { slug?: string; serverPost?: BlogPost }) {
  // If we have a server-rendered post, use it immediately (no client fetch).
  // Otherwise fall back to the client-side data context.
  const clientPost = useBlogBySlug(slug);
  const { blogPosts } = useData();
  const { lang, t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [rotation, setRotation] = useState(0);

  const post = serverPost || clientPost;

  if (!post) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{t("articleNotFound")}</h1>
        <p className="mt-2 text-slate-600">{slug ? `slug: ${slug}` : ""}</p>
        <Button className="mt-6" onClick={() => navigate("blog")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToBlog")}
        </Button>
      </div>
    );
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const related = blogPosts.filter((p) => p.id !== post.id).slice(0, 3);
  const imageUrl = getBlogImageUrl(post.imageUrl) || "";

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back link */}
      <button
        onClick={() => navigate("blog")}
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToBlog")}
      </button>

      {/* Header */}
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          {post.title[lang]}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{t("by")} {post.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            <span>{formatDate(post.createdAt)}</span>
          </div>
        </div>
      </motion.header>

      {/* TL;DR / Résumé — extractible par les IA génératives */}
      {post.excerpt[lang] && (
        <aside
          className="mt-6 rounded-lg border-l-4 border-brand-600 bg-brand-50/60 px-5 py-4"
          aria-label="Résumé de l'article"
        >
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
            En bref
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {post.excerpt[lang]}
          </p>
        </aside>
      )}

      {/* Hero image (clickable) */}
      <div className="mt-8 overflow-hidden rounded-xl bg-brand-50 shadow-sm">
        <button
          onClick={() => { setRotation(0); setLightboxOpen(true); }}
          className="group relative block w-full"
          aria-label={t("zoom")}
        >
          <BlogImage
            filename={post.imageUrl}
            alt={post.title[lang]}
            className="aspect-[16/9] w-full object-cover"
            fallbackText={post.title[lang]}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <ZoomIn className="h-8 w-8 text-white" />
          </div>
        </button>
      </div>

      {/* Content */}
      <div
        className="mt-8 text-slate-700 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-900 [&_img]:rounded-lg [&_li]:ml-6 [&_li]:my-1 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:my-4 [&_p]:leading-relaxed [&_ul]:my-4"
        dangerouslySetInnerHTML={{ __html: post.content[lang] || post.content.fr }}
      />

      {/* Related posts */}
      {related.length > 0 && (
        <section className="mt-14 border-t border-slate-200 pt-8">
          <h2 className="mb-5 text-xl font-bold text-slate-900">{t("relatedPosts")}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((rp) => (
              <Card
                key={rp.id}
                className="group cursor-pointer overflow-hidden border-slate-200 transition-all hover:-translate-y-1 hover:shadow-md"
                onClick={() => navigate(`blog/${rp.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(`blog/${rp.slug}`); }}
              >
                <div className="aspect-[16/10] overflow-hidden bg-brand-50">
                  <BlogImage
                    filename={rp.imageUrl}
                    alt={rp.title[lang]}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    fallbackText={rp.title[lang]}
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{rp.title[lang]}</h3>
                </CardContent>
                <CardFooter className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                  {formatDate(rp.createdAt)}
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl border-0 bg-black/95 p-2">
          <DialogTitle className="sr-only">{post.title[lang]}</DialogTitle>
          <DialogDescription className="sr-only">{t("zoom")}</DialogDescription>
          <div className="flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={post.title[lang]}
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain transition-transform"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            ) : (
              <div className="flex h-[60vh] w-full items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                {post.title[lang]}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw className="mr-1 h-4 w-4" />
              90°
            </Button>
            {imageUrl && (
              <a href={imageUrl} download target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">
                  <Download className="mr-1 h-4 w-4" />
                  {t("download")}
                </Button>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
