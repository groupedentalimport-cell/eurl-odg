"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { BlogPage } from "@/components/dental/blog/BlogPage";

/**
 * /blog — native route for the blog index.
 */
export default function BlogRoute() {
  return (
    <PublicLayout>
      <BlogPage />
    </PublicLayout>
  );
}
