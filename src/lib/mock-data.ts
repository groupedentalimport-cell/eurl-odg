import type { Category, Product, BlogPost } from "./types";

export const CATEGORY_DESCRIPTIONS: Record<string, { fr: string; ar: string }> = {
  "fauteuil-dentaire": {
    fr: "Fauteuils dentaires Silver Fox — ergonomie, fiabilité et confort pour le praticien et le patient.",
    ar: "كراسي طب الأسنان Silver Fox — مريحة وموثوقة للطبيب والمريض.",
  },
  "unit-dentaire": {
    fr: "Units dentaires complets avec instrumentation intégrée pour un flux de travail optimal.",
    ar: "وحدات طب الأسنان الكاملة بأدوات متكاملة لسير عمل أمثل.",
  },
  radiologie: {
    fr: "Solutions de radiologie OWANDY — capteurs, radio murale, panoramique 3D et céphalométrie.",
    ar: "حلول الأشعة OWANDY — مستشعرات وأشعة جدارية وبانورامية ثلاثية الأبعاد.",
  },
  sterilisation: {
    fr: "Autoclaves ICANCLAVE — stérilisation conforme aux normes, de 18 à 45 litres.",
    ar: "أوتوكلاف ICANCLAVE — تعقيم مطابق للمعايير، من 18 إلى 45 لتر.",
  },
  consommables: {
    fr: "Consommables dentaires — tout pour la pratique quotidienne.",
    ar: "المستهلكات الطبية — كل ما تحتاجه للممارسة اليومية.",
  },
};

export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-fauteuil", slug: "fauteuil-dentaire", name: { fr: "Fauteuil Dentaire", ar: "كرسي الأسنان" }, description: CATEGORY_DESCRIPTIONS["fauteuil-dentaire"], icon: "Armchair", order: 1 },
  { id: "cat-unit", slug: "unit-dentaire", name: { fr: "Unit Dentaire", ar: "وحدة الأسنان" }, description: CATEGORY_DESCRIPTIONS["unit-dentaire"], icon: "Stethoscope", order: 2 },
  { id: "cat-radio", slug: "radiologie", name: { fr: "Radiologie", ar: "الأشعة" }, description: CATEGORY_DESCRIPTIONS["radiologie"], icon: "Radiation", order: 3 },
  { id: "cat-sterilisation", slug: "sterilisation", name: { fr: "Stérilisation", ar: "التعقيم" }, description: CATEGORY_DESCRIPTIONS["sterilisation"], icon: "ShieldCheck", order: 4 },
  { id: "cat-consommables", slug: "consommables", name: { fr: "Consommables", ar: "المستهلكات" }, description: CATEGORY_DESCRIPTIONS["consommables"], icon: "Package", order: 5 },
];

const spec = (fr: string, ar: string, value: string) => ({ label: { fr, ar }, value });

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1", slug: "fauteuil-dentaire-classique", name: { fr: "Fauteuil dentaire classique", ar: "كرسي الأسنان الكلاسيكي" },
    description: { fr: "<p>Le fauteuil dentaire Silver Fox 8000C offre un confort optimal avec un design ergonomique. Moteur silencieux, pétrin à compensation et éclairage LED.</p>", ar: "<p>كرسي الأسنان Silver Fox 8000C يوفر راحة مثالية بتصميم مريح. محرك هادئ وإضاءة LED.</p>" },
    specs: [spec("Marque","العلامة","Silver Fox"), spec("Modèle","الموديل","8000C"), spec("Alimentation","الطاقة","220V / 50Hz"), spec("Puissance","القدرة","1200 W"), spec("Garantie","الضمان","24 mois")],
    images: ["fauteuil-classique-1.jpg"], categoryId: "cat-fauteuil", categorySlug: "fauteuil-dentaire", brand: "Silver Fox", model: "8000C", featured: true, available: true, order: 1, audience: ["Cabinet dentaire","Clinique"],
  },
  {
    id: "p2", slug: "autoclave-18l", name: { fr: "Autoclave 18L", ar: "أوتوكلاف 18 لتر" },
    description: { fr: "<p>Autoclave ICANCLAVE STE-18-D classe B, stérilisation conforme EN 13060. 18 litres, écran tactile.</p>", ar: "<p>أوتوكلاف ICANCLAVE STE-18-D فئة B، تعقيم مطابق للمعايير. 18 لتر، شاشة لمس.</p>" },
    specs: [spec("Marque","العلامة","ICANCLAVE"), spec("Modèle","الموديل","STE-18-D"), spec("Capacité","السعة","18 L"), spec("Classe","الفئة","B"), spec("Garantie","الضمان","24 mois")],
    images: ["autoclave-18l-1.jpg"], categoryId: "cat-sterilisation", categorySlug: "sterilisation", brand: "ICANCLAVE", model: "STE-18-D", featured: true, available: true, order: 2, audience: ["Cabinet dentaire","Clinique","Hôpital"],
  },
  {
    id: "p3", slug: "unite-radiologie-panoramique-3d", name: { fr: "Unité de radiologie panoramique 3D et céphalométrie", ar: "وحدة أشعة بانورامية ثلاثية الأبعاد" },
    description: { fr: "<p>OWANDY I-MAX 3D XPRO CEPH — radiologie panoramique 3D avec céphalométrie. Imagerie haute définition, faible dose.</p>", ar: "<p>OWANDY I-MAX 3D XPRO CEPH — أشعة بانورامية ثلاثية الأبعاد مع رأس جانبي. صور عالية الدقة، جرعة منخفضة.</p>" },
    specs: [spec("Marque","العلامة","OWANDY"), spec("Modèle","الموديل","I-MAX 3D XPRO CEPH"), spec("Type","النوع","Panoramique 3D + CEPH"), spec("Capteur","المستشعر","CMOS"), spec("Garantie","الضمان","24 mois")],
    images: ["radio-pano-3d-1.jpg"], categoryId: "cat-radio", categorySlug: "radiologie", brand: "OWANDY", model: "I-MAX 3D XPRO CEPH", featured: false, available: true, order: 3, audience: ["Clinique","Centre d'imagerie"],
  },
  {
    id: "p4", slug: "fauteuil-dentaire-implant", name: { fr: "Fauteuil dentaire Implant", ar: "كرسي الأسنان للزراعة" },
    description: { fr: "<p>Silver Fox 8000C Implant — fauteuil dédié à la chirurgie implantaire, plateau renforcé et éclairage ciblable.</p>", ar: "<p>Silver Fox 8000C Implant — كرسي مخصص لجراحة الزرع، سطح مقوى وإضاءة موجّهة.</p>" },
    specs: [spec("Marque","العلامة","Silver Fox"), spec("Modèle","الموديل","8000C Implant"), spec("Usage","الاستخدام","Chirurgie implantaire"), spec("Garantie","الضمان","24 mois")],
    images: ["fauteuil-implant-1.jpg"], categoryId: "cat-fauteuil", categorySlug: "fauteuil-dentaire", brand: "Silver Fox", model: "8000C Implant", featured: true, available: true, order: 4, audience: ["Clinique","Cabinet spécialisé"],
  },
  {
    id: "p5", slug: "fauteuil-dentaire-pro", name: { fr: "Fauteuil dentaire pro", ar: "كرسي الأسنان برو" },
    description: { fr: "<p>Silver Fox 8000C pro — version professionnelle avec instrumentation étendue et affichage digital.</p>", ar: "<p>Silver Fox 8000C pro — النسخة الاحترافية بأدوات موسعة وعرض رقمي.</p>" },
    specs: [spec("Marque","العلامة","Silver Fox"), spec("Modèle","الموديل","8000C pro"), spec("Garantie","الضمان","24 mois")],
    images: ["fauteuil-pro-1.jpg"], categoryId: "cat-fauteuil", categorySlug: "fauteuil-dentaire", brand: "Silver Fox", model: "8000C pro", featured: false, available: true, order: 5, audience: ["Cabinet dentaire","Clinique"],
  },
  {
    id: "p6", slug: "radio-mural-standard", name: { fr: "Radio mural standard", ar: "جهاز أشعة جداري قياسي" },
    description: { fr: "<p>OWANDY-RX AC — radio murale standard pour clichés intra-oraux. Compacte et fiable.</p>", ar: "<p>OWANDY-RX AC — جهاز أشعة جداري قياسي للصور داخل الفم. مدمج وموثوق.</p>" },
    specs: [spec("Marque","العلامة","OWANDY"), spec("Modèle","الموديل","OWANDY-RX AC"), spec("Type","النوع","Mural AC"), spec("Garantie","الضمان","24 mois")],
    images: ["radio-mural-std-1.jpg"], categoryId: "cat-radio", categorySlug: "radiologie", brand: "OWANDY", model: "OWANDY-RX AC", featured: true, available: true, order: 6, audience: ["Cabinet dentaire"],
  },
  {
    id: "p7", slug: "fauteuil-dentaire-basique", name: { fr: "Fauteuil dentaire basique", ar: "كرسي الأسنان الأساسي" },
    description: { fr: "<p>Silver Fox 8000B-CRS0 — fauteuil basique robuste, idéal pour équiper un cabinet à coût maîtrisé.</p>", ar: "<p>Silver Fox 8000B-CRS0 — كرسي أساسي متين، مثالي لتجهيز عيادة بتكلفة مدروسة.</p>" },
    specs: [spec("Marque","العلامة","Silver Fox"), spec("Modèle","الموديل","8000B-CRS0"), spec("Garantie","الضمان","24 mois")],
    images: ["fauteuil-basique-1.jpg"], categoryId: "cat-fauteuil", categorySlug: "fauteuil-dentaire", brand: "Silver Fox", model: "8000B-CRS0", featured: true, available: true, order: 7, audience: ["Cabinet dentaire"],
  },
  {
    id: "p8", slug: "autoclave-45l", name: { fr: "Autoclave 45L", ar: "أوتوكلاف 45 لتر" },
    description: { fr: "<p>ICANCLAVE STE-45-T — autoclave classe B haute capacité 45 litres, pour les flux importants.</p>", ar: "<p>ICANCLAVE STE-45-T — أوتوكلاف فئة B بسعة كبيرة 45 لتر، للتدفقات الكبيرة.</p>" },
    specs: [spec("Marque","العلامة","ICANCLAVE"), spec("Modèle","الموديل","STE-45-T"), spec("Capacité","السعة","45 L"), spec("Classe","الفئة","B"), spec("Garantie","الضمان","24 mois")],
    images: ["autoclave-45l-1.jpg"], categoryId: "cat-sterilisation", categorySlug: "sterilisation", brand: "ICANCLAVE", model: "STE-45-T", featured: true, available: true, order: 8, audience: ["Clinique","Hôpital"],
  },
  {
    id: "p9", slug: "radio-murale-nouvelle-generation", name: { fr: "Radio murale nouvelle génération", ar: "جهاز أشعة جداري الجيل الجديد" },
    description: { fr: "<p>OWANDY-RX DC — radio murale à technologie DC, réduit la dose patient tout en améliorant la qualité d'image.</p>", ar: "<p>OWANDY-RX DC — جهاز أشعة جداري بتقنية DC، يقلل جرعة المريض ويحسّن جودة الصورة.</p>" },
    specs: [spec("Marque","العلامة","OWANDY"), spec("Modèle","الموديل","OWANDY-RX DC"), spec("Type","النوع","Mural DC"), spec("Garantie","الضمان","24 mois")],
    images: ["radio-mural-ng-1.jpg"], categoryId: "cat-radio", categorySlug: "radiologie", brand: "OWANDY", model: "OWANDY-RX DC", featured: false, available: true, order: 9, audience: ["Cabinet dentaire","Clinique"],
  },
];

export const MOCK_BLOG_POSTS: BlogPost[] = [
  {
    id: "b1", slug: "choisir-fauteuil-dentaire",
    title: { fr: "Comment choisir son fauteuil dentaire en 2026", ar: "كيف تختار كرسي الأسنان في 2026" },
    excerpt: { fr: "Les critères essentiels : ergonomie, fiabilité, service après-vente.", ar: "المعايير الأساسية: الراحة، الموثوقية، خدمة ما بعد البيع." },
    content: { fr: "<p>Le choix d'un fauteuil dentaire est central pour l'exercice quotidien. Ergonomie, silence, et disponibilité des pièces détachées sont les premiers critères. La gamme Silver Fox 8000C répond à ces exigences avec un excellent rapport qualité-prix.</p><h2>Ergonomie</h2><p>Un bon fauteuil doit s'adapter à la morphologie du patient comme à celle du praticien.</p>", ar: "<p>اختيار كرسي الأسنان مركزي للممارسة اليومية. الراحة والهدوء وتوفر قطع الغيار هي المعايير الأولى.</p>" },
    imageUrl: "blog-fauteuil.jpg", published: true, author: "Equipe ODG", createdAt: "2026-01-15T10:00:00Z", updatedAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "b2", slug: "sterilisation-normes-classe-b",
    title: { fr: "Stérilisation : comprendre les normes classe B", ar: "التعقيم: فهم معايير الفئة B" },
    excerpt: { fr: "Tout savoir sur la norme EN 13060 et les autoclaves classe B.", ar: "كل ما تحتاج معرفته عن معيار EN 13060 وأجهزة التعقيم فئة B." },
    content: { fr: "<p>Les autoclaves classe B sont requis pour stériliser tous types d'instruments, y compris les instruments creux et emballés. La norme EN 13060 définit les cycles et les performances attendues.</p>", ar: "<p>أجهزة التعقيم فئة B مطلوبة لتعقيم جميع أنواع الأدوات، بما في ذلك الأدوات المجوفة والمغلّفة.</p>" },
    imageUrl: "blog-sterilisation.jpg", published: true, author: "Equipe ODG", createdAt: "2026-02-10T10:00:00Z", updatedAt: "2026-02-10T10:00:00Z",
  },
  {
    id: "b3", slug: "radiologie-numerique-faible-dose",
    title: { fr: "Radiologie numérique : la faible dose au service du patient", ar: "الأشعة الرقمية: جرعة منخفضة في خدمة المريض" },
    excerpt: { fr: "Les capteurs OWANDY réduisent l'exposition tout en améliorant le diagnostic.", ar: "مستشعرات OWANDY تقلل التعرض وتحسّن التشخيص." },
    content: { fr: "<p>La radiologie numérique offre une qualité d'image supérieure avec une dose réduite. OWANDY propose une gamme complète de capteurs et de systèmes panoramiques 3D.</p>", ar: "<p>الأشعة الرقمية تقدم جودة صورة فائقة بجرعة مخفضة.</p>" },
    imageUrl: "blog-radio.jpg", published: true, author: "Equipe ODG", createdAt: "2026-03-05T10:00:00Z", updatedAt: "2026-03-05T10:00:00Z",
  },
  {
    id: "b4", slug: "entretenir-autoclave",
    title: { fr: "Entretenir son autoclave : le guide complet", ar: "صيانة الأوتوكلاف: الدليل الكامل" },
    excerpt: { fr: "Maintenance quotidienne, hebdomadaire et annuelle pour prolonger la durée de vie.", ar: "صيانة يومية وأسبوعية وسنوية لإطالة العمر الافتراضي." },
    content: { fr: "<p>Un autoclave bien entretenu dure plus longtemps et garantit une stérilisation conforme. Nettoyage quotidien de la chambre, tests hebdomadaires (Bowie-Dick, helix), et maintenance annuelle par un technicien agréé.</p>", ar: "<p>الأوتوكلاف المصان جيداً يدوم أطول ويضمن تعقيمًا مطابقًا للمعايير.</p>" },
    imageUrl: "blog-autoclave.jpg", published: true, author: "Equipe ODG", createdAt: "2026-04-01T10:00:00Z", updatedAt: "2026-04-01T10:00:00Z",
  },
];
