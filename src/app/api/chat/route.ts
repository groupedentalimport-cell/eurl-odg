import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "Tu es l'assistant virtuel de OUADAH DENTAL GROUPE (ODG), importateur de matériel dentaire à Oran, Algérie. Tu aides les clients à choisir du matériel dentaire (fauteuils Silver Fox, autoclaves ICANCLAVE, radiologie OWANDY). Réponds en français ou arabe selon la langue de l'utilisateur. Sois bref, professionnel et oriente vers une demande de devis si pertinent. Ne donne pas de prix exacts — propose un devis.";

// Canned fallback if the SDK is unavailable or fails
function cannedReply(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  if (/fauteuil|chair|كرسي|كراسى/.test(msg)) {
    return "Nous proposons plusieurs fauteuils dentaires Silver Fox : classique (8000C), implant (8000C Implant), pro (8000C pro) et basique (8000B-CRS0). Tous garantis 24 mois avec installation et formation. Souhaitez-vous recevoir un devis ?";
  }
  if (/autoclave|stéril|steril|تعقيم|أوتوكلاف/.test(msg)) {
    return "Nos autoclaves ICANCLAVE classe B : 18 L (STE-18-D) pour cabinets, et 45 L (STE-45-T) pour flux importants. Conformes à la norme EN 13060. Voulez-vous un devis personnalisé ?";
  }
  if (/radio|radiolog|owandy|أشعة|اشعة/.test(msg)) {
    return "OWANDY propose : radio murale AC (standard), DC (faible dose) et unité panoramique 3D + céphalométrie I-MAX 3D XPRO CEPH. Filtrez la dose patient avec qualité d'image HD. Demandez un devis !";
  }
  if (/devis|quote|prix|price|سعر|ثمن|عرض/.test(msg)) {
    return "Avec plaisir ! Pour préparer votre devis, indiquez : votre type d'établissement (cabinet/clinique/centre), le ou les produits qui vous intéressent, et la quantité. Vous pouvez aussi utiliser le formulaire de contact (#contact) ou demander un devis via le panier (#devis).";
  }
  return "Bonjour ! Je suis l'assistant ODG. Nous proposons des fauteuils Silver Fox, des autoclaves ICANCLAVE et des solutions de radiologie OWANDY. Pour un conseil personnalisé ou un devis, contactez-nous via #contact ou au +213 540 00 00 00.";
}

export async function POST(req: NextRequest) {
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

  // Build history (last 8 messages max)
  const history: Array<{ role: string; content: string }> = Array.isArray(body?.history)
    ? body.history.slice(-8).map((m: any) => ({
        role: m?.role === "user" ? "user" : "assistant",
        content: String(m?.content || ""),
      }))
    : [];

  // Try the z-ai-web-dev-sdk
  try {
    // Use indirect dynamic import to avoid Turbopack static-resolution warnings
    // (the SDK is server-only and resolves fine at runtime via Node resolution)
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
    const ZAIModule = await dynamicImport("z-ai-web-dev-sdk");
    const ZAI = ZAIModule?.default || ZAIModule;
    const zai = await ZAI.create();

    const messages = [
      { role: "assistant", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });

    const reply: string =
      completion?.choices?.[0]?.message?.content?.trim() ||
      cannedReply(message);

    return NextResponse.json({ reply, provider: "zai" });
  } catch (err: any) {
    console.error("[chat] z-ai-web-dev-sdk failed:", err?.message || err);
    // Fall back to canned response
    return NextResponse.json({
      reply: cannedReply(message),
      provider: "canned",
      note: "LLM SDK unavailable; using canned response.",
    });
  }
}
