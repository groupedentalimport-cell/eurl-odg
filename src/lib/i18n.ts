"use client";
import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "./types";

interface LanguageStore {
  lang: Language;
  setLang: (l: Language) => void;
  toggle: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      lang: "fr",
      setLang: (l) => set({ lang: l }),
      toggle: () => set({ lang: get().lang === "fr" ? "ar" : "fr" }),
    }),
    { name: "odg-lang" }
  )
);

// Translation dictionary
export const T = {
  // Nav
  home: { fr: "Accueil", ar: "الرئيسية" },
  catalogue: { fr: "Catalogue", ar: "الكتالوج" },
  blog: { fr: "Blog", ar: "المدونة" },
  about: { fr: "À propos", ar: "من نحن" },
  contact: { fr: "Contact", ar: "اتصل بنا" },
  compare: { fr: "Comparer", ar: "مقارنة" },
  quote: { fr: "Devis", ar: "عرض سعر" },
  admin: { fr: "Admin", ar: "الإدارة" },
  // Actions
  viewProducts: { fr: "Voir les produits", ar: "عرض المنتجات" },
  requestQuote: { fr: "Demander un devis", ar: "طلب عرض سعر" },
  addToQuote: { fr: "Ajouter au devis", ar: "أضف للعرض" },
  addedToQuote: { fr: "Ajouté au devis", ar: "أضيف للعرض" },
  addToCompare: { fr: "Comparer", ar: "قارن" },
  viewDetails: { fr: "Voir détails", ar: "عرض التفاصيل" },
  readMore: { fr: "Lire la suite", ar: "اقرأ المزيد" },
  send: { fr: "Envoyer", ar: "إرسال" },
  subscribe: { fr: "S'abonner", ar: "اشترك" },
  search: { fr: "Rechercher", ar: "بحث" },
  allCategories: { fr: "Toutes les catégories", ar: "كل الفئات" },
  allBrands: { fr: "Toutes les marques", ar: "كل العلامات" },
  featured: { fr: "En vedette", ar: "مميز" },
  available: { fr: "Disponible", ar: "متوفر" },
  specs: { fr: "Spécifications", ar: "المواصفات" },
  description: { fr: "Description", ar: "الوصف" },
  // Home sections
  heroTitle: { fr: "Votre partenaire en matériel dentaire", ar: "شريكك في معدات طب الأسنان" },
  heroSubtitle: { fr: "Importateur exclusif de Silver Fox, ICANCLAVE et OWANDY en Algérie.", ar: "المستورد الحصري لـ Silver Fox وICANCLAVE وOWANDY في الجزائر." },
  heroCta: { fr: "Découvrir le catalogue", ar: "اكتشف الكتالوج" },
  heroCta2: { fr: "Nous contacter", ar: "تواصل معنا" },
  categoriesTitle: { fr: "Nos catégories", ar: "فئاتنا" },
  featuredTitle: { fr: "Produits en vedette", ar: "منتجات مميزة" },
  blogTitle: { fr: "Derniers articles", ar: "آخر المقالات" },
  statsTitle: { fr: "ODG en chiffres", ar: "ODG في أرقام" },
  whyUsTitle: { fr: "Pourquoi nous choisir ?", ar: "لماذا تختارنا؟" },
  ctaTitle: { fr: "Un projet d'équipement ?", ar: "مشروع تجهيز؟" },
  ctaSubtitle: { fr: "Nos experts vous accompagnent de A à Z.", ar: "خبراؤنا يرافقونك من الألف إلى الياء." },
  // Footer / contact
  newsletterTitle: { fr: "Newsletter", ar: "النشرة البريدية" },
  newsletterDesc: { fr: "Recevez nos nouveautés et offres.", ar: "استقبل مستجداتنا وعروضنا." },
  emailPlaceholder: { fr: "Votre email", ar: "بريدك الإلكتروني" },
  quickLinks: { fr: "Liens rapides", ar: "روابط سريعة" },
  contactUs: { fr: "Contactez-nous", ar: "اتصل بنا" },
  rights: { fr: "Tous droits réservés.", ar: "جميع الحقوق محفوظة." },
  // Why us
  why1Title: { fr: "Marques certifiées", ar: "علامات معتمدة" },
  why1Desc: { fr: "Silver Fox, ICANCLAVE, OWANDY — qualité internationale.", ar: "Silver Fox، ICANCLAVE، OWANDY — جودة دولية." },
  why2Title: { fr: "Service après-vente", ar: "خدمة ما بعد البيع" },
  why2Desc: { fr: "Pièces détachées et techniciens en Algérie.", ar: "قطع غيار وفنيون في الجزائر." },
  why3Title: { fr: "Formation incluse", ar: "تكوين مشمول" },
  why3Desc: { fr: "Installation et formation à la prise en main.", ar: "التركيب والتكوين على الاستعمال." },
  why4Title: { fr: "Garantie 24 mois", ar: "ضمان 24 شهر" },
  why4Desc: { fr: "Tous nos produits sont garantis 2 ans.", ar: "كل منتجاتنا مضمونة سنتين." },
  // Contact form
  contactTitle: { fr: "Contactez-nous", ar: "اتصل بنا" },
  contactDesc: { fr: "Une question, un devis ? Écrivez-nous.", ar: "سؤال أو عرض سعر؟ راسلنا." },
  name: { fr: "Nom complet", ar: "الاسم الكامل" },
  email: { fr: "Email", ar: "البريد الإلكتروني" },
  phone: { fr: "Téléphone", ar: "الهاتف" },
  subject: { fr: "Sujet", ar: "الموضوع" },
  message: { fr: "Message", ar: "الرسالة" },
  sending: { fr: "Envoi…", ar: "جاري الإرسال…" },
  sentOk: { fr: "Message envoyé ! Nous vous répondrons vite.", ar: "تم إرسال الرسالة! سنرد عليك قريبًا." },
  sentFail: { fr: "Erreur d'envoi. Réessayez ou appelez-nous.", ar: "خطأ في الإرسال. أعد المحاولة أو اتصل بنا." },
  // Quote
  quoteTitle: { fr: "Ma demande de devis", ar: "طلب عرض السعر" },
  quoteEmpty: { fr: "Votre panier de devis est vide.", ar: "سلة عرض السعر فارغة." },
  quoteEmptyDesc: { fr: "Parcourez le catalogue et ajoutez des produits.", ar: "تصفح الكتالوج وأضف منتجات." },
  quantity: { fr: "Quantité", ar: "الكمية" },
  remove: { fr: "Retirer", ar: "إزالة" },
  submitQuote: { fr: "Envoyer la demande", ar: "إرسال الطلب" },
  clearQuote: { fr: "Vider", ar: "تفريغ" },
  // Compare
  compareTitle: { fr: "Comparateur", ar: "المقارنة" },
  compareEmpty: { fr: "Ajoutez des produits à comparer.", ar: "أضف منتجات للمقارنة." },
  // Admin
  adminLogin: { fr: "Connexion admin", ar: "دخول الإدارة" },
  password: { fr: "Mot de passe", ar: "كلمة المرور" },
  login: { fr: "Se connecter", ar: "تسجيل الدخول" },
  dashboard: { fr: "Tableau de bord", ar: "لوحة التحكم" },
  messages: { fr: "Messages", ar: "الرسائل" },
  products: { fr: "Produits", ar: "المنتجات" },
  posts: { fr: "Articles", ar: "المقالات" },
  logout: { fr: "Déconnexion", ar: "تسجيل الخروج" },
  markAsRead: { fr: "Marquer comme lu", ar: "وضع علامة مقروء" },
  unread: { fr: "Non lu", ar: "غير مقروء" },
  noMessages: { fr: "Aucun message.", ar: "لا توجد رسائل." },
  loading: { fr: "Chargement…", ar: "جاري التحميل…" },
  // Blog extra
  blogIntro: { fr: "Conseils, guides et actualités du matériel dentaire.", ar: "نصائح وأدلة وأخبار معدات طب الأسنان." },
  blogSearchPlaceholder: { fr: "Rechercher un article…", ar: "ابحث عن مقال…" },
  noPosts: { fr: "Aucun article trouvé.", ar: "لا يوجد مقالات." },
  articleNotFound: { fr: "Article introuvable", ar: "المقال غير موجود" },
  backToBlog: { fr: "Retour au blog", ar: "العودة للمدونة" },
  relatedPosts: { fr: "Articles liés", ar: "مقالات ذات صلة" },
  by: { fr: "par", ar: "بواسطة" },
  zoom: { fr: "Agrandir l'image", ar: "تكبير الصورة" },
  download: { fr: "Télécharger", ar: "تحميل" },
  // Contact extra
  contactInfo: { fr: "Informations", ar: "المعلومات" },
  addressLabel: { fr: "Adresse", ar: "العنوان" },
  hoursLabel: { fr: "Horaires", ar: "أوقات العمل" },
  followUs: { fr: "Suivez-nous", ar: "تابعنا" },
  findUs: { fr: "Nous trouver", ar: "موقعنا" },
  // About
  aboutTitle: { fr: "À propos d'ODG", ar: "عن ODG" },
  aboutHero: { fr: "Votre partenaire de confiance en matériel dentaire", ar: "شريكك الموثوق في معدات طب الأسنان" },
  storyTitle: { fr: "Notre histoire", ar: "قصتنا" },
  valuesTitle: { fr: "Nos valeurs", ar: "قيمنا" },
  brandsTitle: { fr: "Nos marques exclusives", ar: "علاماتنا الحصرية" },
  // Brands
  brandSilverFox: { fr: "Silver Fox", ar: "Silver Fox" },
  brandSilverFoxDesc: { fr: "Fauteuils dentaires ergonomiques et fiables.", ar: "كراسي أسنان مريحة وموثوقة." },
  brandIcanclave: { fr: "ICANCLAVE", ar: "ICANCLAVE" },
  brandIcanclaveDesc: { fr: "Autoclaves classe B conformes EN 13060.", ar: "أوتوكلاف فئة B مطابق للمعايير." },
  brandOwandy: { fr: "OWANDY", ar: "OWANDY" },
  brandOwandyDesc: { fr: "Radiologie numérique et capteurs haute définition.", ar: "أشعة رقمية ومستشعرات عالية الدقة." },
  // Chatbot
  chatTitle: { fr: "Assistant ODG", ar: "مساعد ODG" },
  chatWelcome: { fr: "Bonjour ! Je suis l'assistant ODG. Comment puis-je vous aider ?", ar: "مرحبا! أنا مساعد ODG. كيف يمكنني مساعدتك؟" },
  chatPlaceholder: { fr: "Écrivez votre message…", ar: "اكتب رسالتك…" },
  chatSend: { fr: "Envoyer", ar: "إرسال" },
  chatTyping: { fr: "Assistant écrit…", ar: "يكتب المساعد…" },
  suggestion1: { fr: "Quels fauteuils proposez-vous ?", ar: "ما هي الكراسي المتوفرة؟" },
  suggestion2: { fr: "Vos autoclaves", ar: "أجهزة التعقيم" },
  suggestion3: { fr: "Demander un devis", ar: "طلب عرض سعر" },
  openChat: { fr: "Ouvrir le chat", ar: "افتح المحادثة" },
  // Catalogue page extras
  productsCount: { fr: "produit(s)", ar: "منتج" },
  noProducts: { fr: "Aucun produit trouvé", ar: "لا يوجد منتج" },
  noProductsDesc: { fr: "Essayez de modifier vos filtres.", ar: "جرّب تعديل الفلاتر." },
  clearFilters: { fr: "Réinitialiser", ar: "إعادة تعيين" },
  browseCatalogue: { fr: "Parcourir le catalogue", ar: "تصفح الكتالوج" },
  viewAll: { fr: "Voir tout", ar: "عرض الكل" },
  filterBy: { fr: "Filtrer", ar: "تصفية" },
  // Product page extras
  productNotFound: { fr: "Produit introuvable", ar: "المنتج غير موجود" },
  productNotFoundDesc: { fr: "Ce produit n'existe pas ou n'est plus disponible.", ar: "هذا المنتج غير موجود أو لم يعد متوفرًا." },
  backToCatalogue: { fr: "Retour au catalogue", ar: "العودة للكتالوج" },
  relatedProducts: { fr: "Produits similaires", ar: "منتجات مشابهة" },
  audience: { fr: "Public cible", ar: "الجمهور المستهدف" },
  brand: { fr: "Marque", ar: "العلامة" },
  model: { fr: "Modèle", ar: "الموديل" },
  category: { fr: "Catégorie", ar: "الفئة" },
  downloadBrochure: { fr: "Télécharger la brochure", ar: "تحميل البروشور" },
  availability: { fr: "Disponibilité", ar: "التوفر" },
  yes: { fr: "Oui", ar: "نعم" },
  no: { fr: "Non", ar: "لا" },
  breadcrumbHome: { fr: "Accueil", ar: "الرئيسية" },
  // Compare page extras
  compareEmptyDesc: { fr: "Ajoutez 2 à 4 produits depuis le catalogue pour les comparer côte à côte.", ar: "أضف من 2 إلى 4 منتجات من الكتالوج لمقارنتها جنبًا إلى جنب." },
  clearAll: { fr: "Tout effacer", ar: "مسح الكل" },
  requestQuoteSelected: { fr: "Demander un devis pour la sélection", ar: "طلب عرض سعر للمحدد" },
  maxCompareReached: { fr: "Maximum 4 produits", ar: "الحد الأقصى 4 منتجات" },
  // Quote page extras
  customerInfo: { fr: "Vos coordonnées", ar: "معلوماتك" },
  company: { fr: "Société (optionnel)", ar: "الشركة (اختياري)" },
  quoteSummary: { fr: "Récapitulatif", ar: "الملخص" },
  totalItems: { fr: "Total articles", ar: "إجمالي المقالات" },
  quoteSent: { fr: "Demande envoyée ! Nous vous recontactons sous 24h.", ar: "تم إرسال الطلب! سنتواصل معك خلال 24 ساعة." },
  quoteSentDesc: { fr: "Votre panier a été vidé.", ar: "تم تفريغ السلة." },
  requiredField: { fr: "Ce champ est requis", ar: "هذا الحقل مطلوب" },
  // === Admin extended tabs ===
  settingsHome: { fr: "Accueil", ar: "الرئيسية" },
  settingsAbout: { fr: "À propos", ar: "من نحن" },
  settingsContact: { fr: "Contact", ar: "اتصل بنا" },
  settings: { fr: "Paramètres", ar: "الإعدادات" },
  edit: { fr: "Modifier", ar: "تعديل" },
  create: { fr: "Créer", ar: "إنشاء" },
  delete: { fr: "Supprimer", ar: "حذف" },
  save: { fr: "Enregistrer", ar: "حفظ" },
  cancel: { fr: "Annuler", ar: "إلغاء" },
  confirmDelete: { fr: "Confirmer la suppression ?", ar: "تأكيد الحذف؟" },
  saved: { fr: "Enregistré !", ar: "تم الحفظ!" },
  saveFailed: { fr: "Échec de l'enregistrement", ar: "فشل الحفظ" },
  newProduct: { fr: "Nouveau produit", ar: "منتج جديد" },
  newArticle: { fr: "Nouvel article", ar: "مقال جديد" },
  editProduct: { fr: "Modifier le produit", ar: "تعديل المنتج" },
  editArticle: { fr: "Modifier l'article", ar: "تعديل المقال" },
  content_fr: { fr: "Contenu (FR)", ar: "المحتوى (FR)" },
  content_ar: { fr: "Contenu (AR)", ar: "المحتوى (AR)" },
  name_fr: { fr: "Nom (FR)", ar: "الاسم (FR)" },
  name_ar: { fr: "Nom (AR)", ar: "الاسم (AR)" },
  title_fr: { fr: "Titre (FR)", ar: "العنوان (FR)" },
  title_ar: { fr: "Titre (AR)", ar: "العنوان (AR)" },
  excerpt: { fr: "Extrait", ar: "مقتطف" },
  author: { fr: "Auteur", ar: "الكاتب" },
  published: { fr: "Publié", ar: "منشور" },
  slug: { fr: "Slug (URL)", ar: "الرابط" },
  images: { fr: "Images (noms de fichiers, séparés par virgule)", ar: "الصور (أسماء الملفات، مفصولة بفواصل)" },
  categoryField: { fr: "Catégorie", ar: "الفئة" },
  audience_field: { fr: "Public cible (séparé par virgule)", ar: "الجمهور (مفصول بفواصل)" },
  pdfUrl: { fr: "URL PDF", ar: "رابط PDF" },
  brochurePdf: { fr: "URL brochure", ar: "رابط البروشور" },
  videoUrl: { fr: "URL vidéo", ar: "رابط الفيديو" },
  specsField: { fr: "Spécifications (une par ligne: Clé|Valeur)", ar: "المواصفات (واحدة لكل سطر: مفتاح|قيمة)" },
  order: { fr: "Ordre", ar: "الترتيب" },
  // Settings panels
  homeSettings: { fr: "Contenu de la page d'accueil", ar: "محتوى الصفحة الرئيسية" },
  aboutSettings: { fr: "Contenu de la page À propos", ar: "محتوى صفحة من نحن" },
  contactSettings: { fr: "Informations de contact", ar: "معلومات الاتصال" },
  heroTitle_fr: { fr: "Titre principal (FR)", ar: "العنوان الرئيسي (FR)" },
  heroTitle_ar: { fr: "Titre principal (AR)", ar: "العنوان الرئيسي (AR)" },
  heroSubtitle_fr: { fr: "Sous-titre (FR)", ar: "العنوان الفرعي (FR)" },
  heroSubtitle_ar: { fr: "Sous-titre (AR)", ar: "العنوان الفرعي (AR)" },
  ctaTitle_fr: { fr: "Titre CTA (FR)", ar: "عنوان الدعوة (FR)" },
  ctaTitle_ar: { fr: "Titre CTA (AR)", ar: "عنوان الدعوة (AR)" },
  ctaSubtitle_fr: { fr: "Sous-titre CTA (FR)", ar: "عنوان فرعي للدعوة (FR)" },
  ctaSubtitle_ar: { fr: "Sous-titre CTA (AR)", ar: "عنوان فرعي للدعوة (AR)" },
  story_fr: { fr: "Texte de présentation (FR)", ar: "نص التعريف (FR)" },
  story_ar: { fr: "Texte de présentation (AR)", ar: "نص التعريف (AR)" },
  companyName: { fr: "Nom de l'entreprise", ar: "اسم الشركة" },
  companyNameAr: { fr: "Nom (Arabe)", ar: "الاسم (عربي)" },
  companyPhone: { fr: "Téléphone principal", ar: "الهاتف الرئيسي" },
  companyPhone2: { fr: "Téléphone secondaire", ar: "الهاتف الثانوي" },
  email_field: { fr: "Email", ar: "البريد الإلكتروني" },
  address_fr: { fr: "Adresse (FR)", ar: "العنوان (FR)" },
  address_ar: { fr: "Adresse (AR)", ar: "العنوان (AR)" },
  city: { fr: "Ville", ar: "المدينة" },
  country: { fr: "Pays", ar: "البلد" },
  hours_fr: { fr: "Horaires (FR)", ar: "ساعات العمل (FR)" },
  hours_ar: { fr: "Horaires (AR)", ar: "ساعات العمل (AR)" },
  facebook: { fr: "Facebook URL", ar: "رابط فيسبوك" },
  instagram: { fr: "Instagram URL", ar: "رابط إنستغرام" },
  linkedin: { fr: "LinkedIn URL", ar: "رابط لينكدإن" },
  statsSettings: { fr: "Statistiques (affichées sur l'accueil)", ar: "الإحصائيات (تظهر في الرئيسية)" },
  statValue: { fr: "Valeur", ar: "القيمة" },
  statLabelFr: { fr: "Libellé (FR)", ar: "التسمية (FR)" },
  statLabelAr: { fr: "Libellé (AR)", ar: "التسمية (AR)" },
  addStat: { fr: "Ajouter une stat", ar: "أضف إحصائية" },
  tableMissingNotice: { fr: "La table n'existe pas encore. Exécutez le script SQL dans Supabase Dashboard → SQL Editor.", ar: "الجدول غير موجود. نفّذ سكريبت SQL في لوحة تحكم Supabase." },
  copyEmail: { fr: "Copier l'email", ar: "نسخ البريد" },
  copied: { fr: "Copié !", ar: "تم النسخ!" },
  call: { fr: "Appeler", ar: "اتصال" },
  retry: { fr: "Réessayer", ar: "إعادة المحاولة" },
} as const;

export type TKey = keyof typeof T;

export function useTranslation() {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  const toggle = useLanguageStore((s) => s.toggle);
  const dir = lang === "ar" ? "rtl" : "ltr";
  // Memoize t so it's stable across renders when lang doesn't change.
  // Prevents infinite re-render loops in components that depend on `t` in useEffect.
  const t = useCallback((key: TKey) => T[key]?.[lang] ?? key, [lang]);
  return { lang, setLang, toggle, t, dir };
}
