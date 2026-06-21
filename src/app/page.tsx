"use client";
import dynamic from "next/dynamic";
import { Header } from "@/components/dental/layout/Header";
import { Footer } from "@/components/dental/layout/Footer";
import { useHashRoute, parseRoute } from "@/lib/router";
import { useTranslation } from "@/lib/i18n";

// Lazy-load page components (hash router, single / route)
const HomePage = dynamic(() => import("@/components/dental/home/HomePage").then(m => m.HomePage), { ssr: false, loading: () => <PageLoader /> });
const CataloguePage = dynamic(() => import("@/components/dental/catalogue/CataloguePage").then(m => m.CataloguePage), { ssr: false, loading: () => <PageLoader /> });
const ProductPage = dynamic(() => import("@/components/dental/product/ProductPage").then(m => m.ProductPage), { ssr: false, loading: () => <PageLoader /> });
const BlogPage = dynamic(() => import("@/components/dental/blog/BlogPage").then(m => m.BlogPage), { ssr: false, loading: () => <PageLoader /> });
const BlogPostPage = dynamic(() => import("@/components/dental/blog/BlogPostPage").then(m => m.BlogPostPage), { ssr: false, loading: () => <PageLoader /> });
const AboutPage = dynamic(() => import("@/components/dental/about/AboutPage").then(m => m.AboutPage), { ssr: false, loading: () => <PageLoader /> });
const ContactPage = dynamic(() => import("@/components/dental/contact/ContactPage").then(m => m.ContactPage), { ssr: false, loading: () => <PageLoader /> });
const ComparePage = dynamic(() => import("@/components/dental/compare/ComparePage").then(m => m.ComparePage), { ssr: false, loading: () => <PageLoader /> });
const QuotePage = dynamic(() => import("@/components/dental/quote/QuotePage").then(m => m.QuotePage), { ssr: false, loading: () => <PageLoader /> });
const AdminPage = dynamic(() => import("@/components/dental/admin/AdminPage").then(m => m.AdminPage), { ssr: false, loading: () => <PageLoader /> });
const ChatbotWidget = dynamic(() => import("@/components/dental/chatbot/ChatbotWidget").then(m => m.ChatbotWidget), { ssr: false });
const WhatsAppWidget = dynamic(() => import("@/components/dental/chatbot/WhatsAppWidget").then(m => m.WhatsAppWidget), { ssr: false });

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
    </div>
  );
}

export default function Home() {
  const route = useHashRoute();
  const { lang } = useTranslation();
  const { page, params } = parseRoute(route);

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage />;
      case "catalogue": return <CataloguePage category={params.category} />;
      case "product": return <ProductPage slug={params.slug} />;
      case "blog": return <BlogPage />;
      case "blog-post": return <BlogPostPage slug={params.slug} />;
      case "about": return <AboutPage />;
      case "contact": return <ContactPage />;
      case "compare": return <ComparePage />;
      case "quote": return <QuotePage />;
      case "admin": return <AdminPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col" dir={lang === "ar" ? "rtl" : "ltr"} key={lang}>
      <Header />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
      <ChatbotWidget />
      <WhatsAppWidget />
    </div>
  );
}
