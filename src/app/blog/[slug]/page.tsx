"use client";

import { useParams } from "next/navigation";
import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { BlogPostPage } from "@/components/dental/blog/BlogPostPage";

/**
 * /blog/<slug> — native route for a single blog article.
 *
 * Client component (the BlogPostPage panel uses client-side hooks). The slug
 * is extracted via `useParams()` and forwarded to the panel. Per-article SEO
 * metadata is emitted by the adjacent server `layout.tsx`.
 */
export default function BlogPostRoute() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : undefined;

  return (
    <PublicLayout>
      <BlogPostPage slug={slug} />
    </PublicLayout>
  );
}
