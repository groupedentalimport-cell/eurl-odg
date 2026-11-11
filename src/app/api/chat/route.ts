import { NextRequest, NextResponse } from "next/server";
import { buildCatalogueContext } from "@/lib/chat-context";
import { getLiveCompanyInfo, type LiveCompanyInfo } from "@/lib/chat-company";
import { buildFaqContext } from "@/lib/chat-faq";
import { buildBlogContext } from "@/lib/chat-blog";

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
// ---------------------------------------------------------------------------
function buildSystemPrompt(
  catalogueCtx: string,
  faqCtx: string,
  blogCtx: string,
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
    `- Contact: ${c.phone}${c.phone2 ? ` (ou ${c.phone2})` : ""}, ${c.email}`,
    `- Adresse: ${c.address_fr}, ${c.city}, ${c.country}`,
    `- Horaires: ${c.hours_fr}`,
    ``,
    catalogueCtx,
    ``,
    ...(faqCtx ? [faqCtx, ``] : []),
    ...(blogCtx ? [blogCtx, ``] : []),
    `RÈGLES:`,
    `- Réponds en ${langWord} (français ou arabe)`,
    `- Sois bref (3-4 phrases max), professionnel et chaleureux`,
    `- Cite des noms de produits spécifiques du catalogue quand pertinent`,
    `- La FAQ OFFICIELLE DU SITE ci-dessus fait autorité : si la question correspond à une entrée, suis sa réponse (reformulée brièvement)`,
    `- Pour approfondir un sujet (choisir un équipement, normes, entretien, radiologie…), propose l'article de blog correspondant (titre + lien #/blog/...) ou la page FAQ (#/faq)`,
    `- NE donne JAMAIS de prix exact — dis "sur devis" et oriente vers une demande de devis`,
    `- Si l'utilisateur demande un prix, propose-lui de remplir le formulaire de devis (#/devis) ou de contacter le ${c.phone}`,
    `- Si l'utilisateur demande un produit spécifique, donne le nom exact + marque + modèle + catégorie`,
    `- Tu peux suggérer de comparer des produits, visiter le catalogue (#/catalogue), ou contacter l'équipe`,
    `- Reste dans le domaine du matériel dentaire — si la question est hors sujet, redirige poliment vers les produits ODG`,
    `- Important: l'entreprise s'appelle "${langLabel}" — utilise toujours ce nom exact`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Canned fallback — keyword routing (safety net when LLM is unavailable)
// Bilingual: when lang is "ar" the same keyword families (which already match
// Arabic keywords) return Arabic replies instead of French.
// ---------------------------------------------------------------------------
function cannedReply(userMessage: string, c: LiveCompanyInfo, lang: ChatLang): string {
  const msg = (userMessage || "").toLowerCase();
  const ar = lang === "ar";

  if (/(bonjour|salam|salut|hello|hi|coucou|مرحبا|السلام|صباح|مساء)/.test(msg)) {
    return ar
      ? `مرحباً! أنا المساعد الافتراضي لـ ${c.nameAr}. نوفر كراسى أسنان Silver Fox وأوتوكلافات ICANCLAVE وحلول الأشعة OWANDY. كيف يمكنني مساعدتك اليوم؟`
      : `Bonjour ! Je suis l'assistant ${c.name}. Nous proposons des fauteuils Silver Fox, des autoclaves ICANCLAVE et des solutions de radiologie OWANDY. Comment puis-je vous aider aujourd'hui ?`;
  }
  if (/fauteuil|chair|كرسي|كراسى|siège/.test(msg)) {
    return ar
      ? `نوفر عدة موديلات من كراسى الأسنان Silver Fox: الكلاسيكي (8000C)، مخصص الزراعة (8000C Implant)، الاحترافي (8000C Pro) والأساسي (8000B-CRS0). التركيب والتكوين مشمولان. هل ترغب في عرض سعر؟`
      : "Nous proposons plusieurs fauteuils dentaires Silver Fox : classique (8000C), implant (8000C Implant), pro (8000C pro) et basique (8000B-CRS0). Installation et formation incluses. Souhaitez-vous recevoir un devis ?";
  }
  if (/autoclave|stéril|steril|تعقيم|أوتوكلاف/.test(msg)) {
    return ar
      ? `أوتوكلافاتنا ICANCLAVE من الفئة B: سعة 18 لتراً (STE-18-D) للعيادات، و45 لتراً (STE-45-T) للتدفق الكبير. مطابقة للمعيار EN 13060. هل ترغب في عرض سعر مخصص؟`
      : "Nos autoclaves ICANCLAVE classe B : 18 L (STE-18-D) pour cabinets, et 45 L (STE-45-T) pour flux importants. Conformes à la norme EN 13060. Voulez-vous un devis personnalisé ?";
  }
  if (/radio|radiolog|owandy|أشعة|اشعة|panoramique|ceph|céphalo/.test(msg)) {
    return ar
      ? `تقدم OWANDY: أشعة جدارية AC (قياسية)، جدارية DC (جرعة منخفضة)، ووحدة بانورامية ثلاثية الأبعاد مع قياس القحف I-MAX 3D XPRO CEPH. جودة صورة عالية مع جرعة أقل للمرضى. اطلب عرض سعر!`
      : "OWANDY propose : radio murale AC (standard), DC (faible dose) et unité panoramique 3D + céphalométrie I-MAX 3D XPRO CEPH. Filtrez la dose patient avec qualité d'image HD. Demandez un devis !";
  }
  if (/devis|quote|prix|price|سعر|ثمن|عرض|tarif|coût|cout|combien/.test(msg)) {
    return ar
      ? `بكل سرور! لإعداد عرض السعر، أخبرنا بنوع منشأتك (عيادة/مركز/مستشفى)، الأجهزة التي تهمك والكمية. يمكنك أيضاً استخدام نموذج الاتصال (#/contact) أو طلب عرض عبر السلة (#/devis).`
      : `Avec plaisir ! Pour préparer votre devis, indiquez : votre type d'établissement (cabinet/clinique/centre), le ou les produits qui vous intéressent, et la quantité. Vous pouvez aussi utiliser le formulaire de contact (#/contact) ou demander un devis via le panier (#/devis).`;
  }
  if (/contact|téléphone|telephone|phone|numéro|numero|اتصال|هاتف|jawal|جوال/.test(msg)) {
    return ar
      ? `يمكنك الاتصال بنا على ${c.phone}${c.phone2 ? ` أو ${c.phone2}` : ""} أو عبر البريد الإلكتروني ${c.email}. العنوان: ${c.address_ar}، ${c.city}.`
      : `Vous pouvez nous contacter au ${c.phone}${c.phone2 ? ` (ou ${c.phone2})` : ""} ou par email à ${c.email}. Adresse : ${c.address_fr}, ${c.city}.`;
  }
  if (/livraison|shipping|delivery|expédition|expedition|توصيل|شحن|délai/.test(msg)) {
    return ar
      ? `نوصل إلى جميع أنحاء الجزائر (58 ولاية). المدة المعتادة: من 2 إلى 7 أيام عمل حسب الولاية. مصاريف التوصيل تُحدد في عرض السعر حسب المنتج والوجهة.`
      : "Nous livrons dans toute l'Algérie (58 wilayas). Délais habituels : 2 à 7 jours ouvrés selon la wilaya. Frais de livraison sur devis selon le produit et la destination.";
  }
  if (/garantie|warranty|ضمان/.test(msg)) {
    return ar
      ? `منتجاتنا مغطاة بضمان المصنّع (القطع والعمالة)؛ المدة تختلف حسب الموديل ويُحدد في عرض السعر. تضمن ${c.nameAr} خدمة ما بعد البيع: التركيب والتكوين والمتابعة. لأي شكوى، اتصل بـ ${c.phone}.`
      : `Nos produits sont couverts par la garantie fabricant (pièces et main-d'œuvre) ; la durée varie selon le modèle et est précisée sur votre devis. Le SAV ${c.name} assure l'installation, la formation et le suivi. Pour toute réclamation, contactez le ${c.phone}.`;
  }
  if (/formation|training|install|تدريب|تركيب|تثبيت/.test(msg)) {
    return ar
      ? `التركيب والتكوين مشمولان لجميع كراسى Silver Fox وأوتوكلافات ICANCLAVE وأجهزة OWANDY. فنيونا يتنقلون في جميع أنحاء الجزائر.`
      : "L'installation et la formation sont incluses pour tous nos fauteuils Silver Fox, autoclaves ICANCLAVE et équipements OWANDY. Nos techniciens se déplacent dans toute l'Algérie.";
  }
  if (/(silver\s*fox|icanclave|owandy)/.test(msg)) {
    return ar
      ? `Silver Fox = كراسى الأسنان، ICANCLAVE = أوتوكلافات الفئة B، OWANDY = الأشعة. أي مجال يهمك؟ يمكنني توجيهك إلى الجهاز المناسب لممارستك.`
      : "Silver Fox = fauteuils dentaires, ICANCLAVE = autoclaves classe B, OWANDY = radiologie. Quelle gamme vous intéresse ? Je peux vous orienter vers le produit adapté à votre pratique.";
  }
  if (/horaires|heure|ouvert|temps|أوقات|دوام/.test(msg)) {
    return ar
      ? `ساعات العمل: ${c.hours_ar}. مقرنا في ${c.city}، ${c.country}.`
      : `Nos horaires : ${c.hours_fr}. Nous sommes basés à ${c.city}, ${c.country}.`;
  }
  return ar
    ? `مرحباً! أنا المساعد الافتراضي لـ ${c.nameAr}. نوفر كراسى أسنان Silver Fox وأوتوكلافات ICANCLAVE وحلول الأشعة OWANDY. لاستشارة مخصصة أو عرض سعر، تواصل معنا عبر #/contact أو على ${c.phone}.`
    : `Bonjour ! Je suis l'assistant ${c.name}. Nous proposons des fauteuils Silver Fox, des autoclaves ICANCLAVE et des solutions de radiologie OWANDY. Pour un conseil personnalisé ou un devis, contactez-nous via #/contact ou au ${c.phone}.`;
}

// ---------------------------------------------------------------------------
// Google Gemini API call — native generateContent endpoint, x-goog-api-key auth.
// NOT the OpenAI-compatible route (/v1beta/openai + Authorization: Bearer):
// since mid-2026 Google AI Studio issues keys in the new AQ.Ab8… format, and
// those keys are rejected (400/401) on the OpenAI-compatible route while the
// native route accepts both AQ. and legacy AIza keys via x-goog-api-key.
// ---------------------------------------------------------------------------
const LLM_TIMEOUT_MS = 30_000;
const GEMINI_GENERATE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callGeminiLLM(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[chat] GEMINI_API_KEY not set — falling back to canned responses.");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    // Native format: system prompt → systemInstruction, history → contents
    // (role "assistant" becomes "model" in the native API).
    const systemTurn = messages[0]?.role === "system" ? messages[0] : undefined;
    const rest = systemTurn ? messages.slice(1) : messages;
    const res = await fetch(GEMINI_GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        ...(systemTurn
          ? { systemInstruction: { parts: [{ text: systemTurn.content }] } }
          : {}),
        contents: rest.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[chat] Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const reply: string | undefined = candidate?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("");
    if (!reply?.trim()) {
      const block = data?.promptFeedback?.blockReason;
      console.error(
        block
          ? `[chat] Gemini blocked the prompt: ${block}`
          : "[chat] Gemini returned empty content"
      );
      return null;
    }
    return reply.trim();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error(`[chat] Gemini call timed out after ${LLM_TIMEOUT_MS}ms`);
    } else {
      console.error("[chat] Gemini call failed:", err?.message || err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
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

  // 2. Build history (last 8 messages)
  const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body?.history)
    ? body.history
        .slice(-8)
        .map((m: any) => ({
          role: (m?.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: String(m?.content || ""),
        }))
        .filter((m: { content: string }) => m.content.length > 0)
    : [];

  // 3. Fetch LIVE company info from site_settings
  const company = await getLiveCompanyInfo();

  // 4. Build system prompt with live catalogue + FAQ + blog context
  const [catalogueCtx, blogCtx] = await Promise.all([
    buildCatalogueContext().catch((err: any) => {
      console.error("[chat] buildCatalogueContext threw:", err?.message || err);
      return "CATALOGUE ODG (mode dégradé): Silver Fox, ICANCLAVE, OWANDY — consultez #/catalogue.";
    }),
    buildBlogContext(), // internal try/catch, returns "" on failure
  ]);
  const faqCtx = buildFaqContext();

  const systemPrompt = buildSystemPrompt(catalogueCtx, faqCtx, blogCtx, lang, company);

  // 5. Try the LLM (Google Gemini)
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const reply = await callGeminiLLM(messages);

    if (reply) {
      return NextResponse.json({ reply, provider: "gemini" });
    }

    // Empty reply → fall back to canned
    return NextResponse.json({
      reply: cannedReply(message, company, lang),
      provider: "canned",
      note: "LLM returned empty content; using canned response.",
    });
  } catch (err: any) {
    console.error("[chat] LLM call failed:", err?.message || err);
    return NextResponse.json({
      reply: cannedReply(message, company, lang),
      provider: "canned",
      note: "LLM unavailable or timed out; using canned response.",
    });
  }
}
