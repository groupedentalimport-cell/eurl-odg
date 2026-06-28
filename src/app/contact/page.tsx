"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { ContactPage } from "@/components/dental/contact/ContactPage";

/**
 * /contact — native route for the contact page.
 */
export default function ContactRoute() {
  return (
    <PublicLayout>
      <ContactPage />
    </PublicLayout>
  );
}
