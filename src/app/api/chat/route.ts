import { NextRequest, NextResponse } from "next/server";
import { buildCatalogueContext } from "@/lib/chat-context";
import { getLiveCompanyInfo, type LiveCompanyInfo } from "@/lib/chat-company";

// ---------------------------------------------------------------------------
// Language handling
// ---------------------------------------------------------------------------
type ChatLang = "fr" | "ar";

const LANG_WORD: Record<ChatLang, string> = {
  fr: "français",
  ar: "arabe (العربية)",
};

// ---------------------------------------------------------------------------
// System prompt assembly — uses LIVE company info from site_settings
// (the same source the admin Contact tab edits), NOT the hardcoded COMPANY
// constant. Falls back to COMPANY only if Supabase is unreachable.
// ---------------------------------------------------------------------------
function buildSystemPrompt(
  catalogueCtx: string,
  lang: ChatLang,
  c: LiveCompanyInfo
): string {
  const langWord = LANG_WORD[lang];
  const langLabel = lang === "ar" ? c.nameAr : c.name;
  return [
    `Tu es l'assistant virtuel de ${c.name} (ODG), importateur de matériel dentaire à ${c.city}, ${c.country}.`,
    ``,
    `À PROPOS D'ODG:`,
    `- Importateur exclusif de Silver Fox (fauteuils dentaires), ICANCLAVE (autoclaves), OWANDY (radiologie)`,
    `- Basé à ${c.city}, couvre toute l'Algérie (58 wilayas)`,
    `- Service après-vente, installation, formation inclus`,
    `- Garantie 24 mois sur tous les produits`,
    `- Contact: ${c.phone}${c.phone2 ? ` (ou ${c.phone2})` : ""}, ${c.email}`,
    `- Adresse: ${c.address_fr}, ${c.city}, ${c.country}`,
    `- Horaires: ${c.hours_fr}`,
    ``,
    catalogueCtx,
    ``,
    `RÈGLES:`,
    `- Réponds en ${langWord} (français ou arabe)`,
    `- Sois bref (3-4 phrases max), professionnel et chaleureux`,
    `- Cite des noms de produits spécifiques du catalogue quand pertinent`,
    `- NE donne JAMAIS de prix exact — dis "sur devis" et oriente vers une demande de devis`,
    `- Si l'utilisateur demande un prix, propose-lui de remplir le formulaire de devis (#/devis) ou de contacter le ${c.phone}`,
    `- Si l'utilisateur demande un produit spécifique, donne le nom exact + marque + modèle + catégorie`,
    `- Tu peux suggérer de comparer des produits, visiter le catalogue (#/catalogue), ou contacter l'équipe`,
    `- Reste dans le domaine du matériel dentaire — si la question est hors sujet, redirige poliment vers les produits ODG`,
    `- Important: l'entreprise s'appelle "${langLabel}" — utilise toujours ce nom exact`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Canned fallback — richer keyword routing (kept as a safety net).
// Also uses LIVE company info so the phone/email shown is always current.
// ---------------------------------------------------------------------------
function cannedReply(userMessage: string, c: LiveCompanyInfo): string {
  const msg = (userMessage || "").toLowerCase();

  // Greetings
  if (/(bonjour|salam|salut|hello|hi|coucou|مرحبا|السلام|صباح|مساء)/.test(msg)) {
    return `Bonjour ! Je suis l'assistant ${c.name}. Nous proposons des fauteuils Silver Fox, des autoclaves ICANCLAVE et des solutions de radiologie OWANDY. Comment puis-je vous aider aujourd'hui ?`;
  }

  // Fauteuils / chairs
  if (/fauteuil|chair|كرسي|كراسى|siège/.test(msg)) {
    return "Nous proposons plusieurs fauteuils dentaires Silver Fox : classique (8000C), implant (8000C Implant), pro (8000C pro) et basique (8000B-CRS0). Tous garantis 24 mois avec installation et formation. Souhaitez-vous recevoir un devis ?";
  }

  // Autoclaves / stérilisation
  if (/autoclave|stéril|steril|تعقيم|أوتوكلاف/.test(msg)) {
    return "Nos autoclaves ICANCLAVE classe B : 18 L (STE-18-D) pour cabinets, et 45 L (STE-45-T) pour flux importants. Conformes à la norme EN 13060. Voulez-vous un devis personnalisé ?";
  }

  // Radiologie / OWANDY
  if (/radio|radiolog|owandy|أشعة|اشعة|panoramique|ceph|céphalo/.test(msg)) {
    return "OWANDY propose : radio murale AC (standard), DC (faible dose) et unité panoramique 3D + céphalométrie I-MAX 3D XPRO CEPH. Filtrez la dose patient avec qualité d'image HD. Demandez un devis !";
  }

  // Prix / devis
  if (/devis|quote|prix|price|سعر|ثمن|عرض|tarif|coût|cout|combien/.test(msg)) {
    return `Avec plaisir ! Pour préparer votre devis, indiquez : votre type d'établissement (cabinet/clinique/centre), le ou les produits qui vous intéressent, et la quantité. Vous pouvez aussi utiliser le formulaire de contact (#/contact) ou demander un devis via le panier (#/devis).`;
  }

  // Contact / phone
  if (/contact|téléphone|telephone|phone|numéro|numero|اتصال|هاتف|jawal|جوال/.test(msg)) {
    return `Vous pouvez nous contacter au ${c.phone}${c.phone2 ? ` (ou ${c.phone2})` : ""} ou par email à ${c.email}. Adresse : ${c.address_fr}, ${c.city}.`;
  }

  // Livraison / shipping
  if (/livraison|shipping|delivery|expédition|expedition|توصيل|شحن|délai/.test(msg)) {
    return "Nous livrons dans toute l'Algérie (58 wilayas). Délais habituels : 2 à 7 jours ouvrés selon la wilaya. Frais de livraison sur devis selon le produit et la destination.";
  }

  // Garantie
  if (/garantie|warranty|ضمان/.test(msg)) {
    return `Tous nos produits sont garantis 24 mois (pièces et main-d'œuvre). Le SAV ${c.name} assure l'installation, la formation et le suivi. Pour toute réclamation, contactez le ${c.phone}.`;
  }

  // Formation / installation
  if (/formation|training|install|تدريب|تركيب|تثبيت/.test(msg)) {
    return "L'installation et la formation sont incluses pour tous nos fauteuils Silver Fox, autoclaves ICANCLAVE et équipements OWANDY. Nos techniciens se déplacent dans toute l'Algérie.";
  }

  // Brands (Silver Fox / ICANCLAVE / OWANDY)
  if (/(silver\s*fox|icanclave|owandy)/.test(msg)) {
    return "Silver Fox = fauteuils dentaires, ICANCLAVE = autoclaves classe B, OWANDY = radiologie. Quelle gamme vous intéresse ? Je peux vous orienter vers le produit adapté à votre pratique.";
  }

  // Horaires
  if (/horaires|heure|ouvert|temps|أوقات|دوام/.test(msg)) {
    return `Nos horaires : ${c.hours_fr}. Nous sommes basés à ${c.city}, ${c.country}.`;
  }

  // Default
  return `Bonjour ! Je suis l'assistant ${c.name}. Nous proposons des fauteuils Silver Fox, des autoclaves ICANCLAVE et des solutions de radiologie OWANDY. Pour un conseil personnalisé ou un devis, contactez-nous via #/contact ou au ${c.phone}.`;
}

// ---------------------------------------------------------------------------
// LLM call with timeout
// ---------------------------------------------------------------------------
const LLM_TIMEOUT_MS = 30_000;

async function callZaiLLM(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  // Indirect dynamic import to avoid Turbopack static-resolution warnings.
  const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
  const ZAIModule = await dynamicImport("z-ai-web-dev-sdk");
  const ZAI = ZAIModule?.default || ZAIModule;

  // The SDK's ZAI.create() looks for a .z-ai-config FILE in cwd/home//etc —
  // which doesn't exist on Vercel. So we instantiate the ZAI class directly
  // with config from environment variables (set on Vercel + locally in .env).
  //
  // Required env vars:
  //   ZAI_BASE_URL   — e.g. https://internal-api.z.ai/v1
  //   ZAI_API_KEY    — the API key
  //   ZAI_TOKEN      — JWT token (optional but recommended)
  //   ZAI_USER_ID    — user id (optional)
  //   ZAI_CHAT_ID    — chat session id (optional)
  const config: Record<string, string> = {
    baseUrl: process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1",
    apiKey: process.env.ZAI_API_KEY || "Z.ai",
  };
  if (process.env.ZAI_TOKEN) config.token = process.env.ZAI_TOKEN;
  if (process.env.ZAI_USER_ID) config.userId = process.env.ZAI_USER_ID;
  if (process.env.ZAI_CHAT_ID) config.chatId = process.env.ZAI_CHAT_ID;

  // Instantiate directly — bypasses the file-based loadConfig() that fails on Vercel
  const zai = new ZAI(config);

  const completionPromise = zai.chat.completions.create({
    messages,
    thinking: { type: "disabled" },
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`LLM call timed out after ${LLM_TIMEOUT_MS}ms`));
    }, LLM_TIMEOUT_MS);
    if (typeof t === "object" && t && "unref" in t && typeof (t as any).unref === "function") {
      (t as any).unref();
    }
  });

  const completion = await Promise.race([completionPromise, timeoutPromise]);
  const reply: string | undefined = completion?.choices?.[0]?.message?.content;
  return reply?.trim() || null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // 1. Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const message = (body?.message || "").toString().trim();
  if (!message) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  const lang: ChatLang = body?.lang === "ar" ? "ar" : "fr";

  // 2. Build history (last 8 messages, drop empty ones)
  const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(
    body?.history
  )
    ? body.history
        .slice(-8)
        .map((m: any) => ({
          role: (m?.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: String(m?.content || ""),
        }))
        .filter((m: { content: string }) => m.content.length > 0)
    : [];

  // 3. Fetch LIVE company info from site_settings (cached 5 min).
  //    This is the SAME source the admin Contact tab edits, so the chatbot
  //    always uses the current phone/email/address — never the hardcoded
  //    COMPANY constant.
  const company = await getLiveCompanyInfo();

  // 4. Build system prompt with live catalogue context (cached 5 min)
  let catalogueCtx: string;
  try {
    catalogueCtx = await buildCatalogueContext();
  } catch (err: any) {
    console.error("[chat] buildCatalogueContext threw:", err?.message || err);
    catalogueCtx =
      "CATALOGUE ODG (mode dégradé): Silver Fox, ICANCLAVE, OWANDY — consultez #/catalogue.";
  }

  const systemPrompt = buildSystemPrompt(catalogueCtx, lang, company);

  // 5. Try the LLM
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const reply = await callZaiLLM(messages);

    if (reply) {
      return NextResponse.json({ reply, provider: "zai" });
    }

    // Empty reply → fall back to canned (with live company info)
    return NextResponse.json({
      reply: cannedReply(message, company),
      provider: "canned",
      note: "LLM returned empty content; using canned response.",
    });
  } catch (err: any) {
    console.error("[chat] z-ai-web-dev-sdk failed:", err?.message || err);
    return NextResponse.json({
      reply: cannedReply(message, company),
      provider: "canned",
      note: "LLM SDK unavailable or timed out; using canned response.",
    });
  }
}
