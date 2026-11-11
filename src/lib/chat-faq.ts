// Server-side helper that renders the site's FAQ (src/lib/faq-data.ts) as a
// text block injected into the chatbot's system prompt.
//
// Why: the FAQ page answers are the company's curated, SEO-validated answers.
// Without this block the LLM improvises its own answer to FAQ-style questions
// ("comment choisir un fauteuil ?", "quelle taille d'autoclave ?"), which can
// diverge from what the site actually says. Feeding the FAQ to the model keeps
// the assistant aligned with the site's content and lets it point users to
// /faq for the full list.

import { FAQ_SECTIONS } from "./faq-data";

// Guard in case an answer gets much longer after an edit — keeps the whole
// FAQ block bounded (17 answers × 700 chars ≈ 12 KB worst case).
const MAX_ANSWER_CHARS = 700;

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

export function buildFaqContext(): string {
  const lines: string[] = [];

  lines.push("FAQ OFFICIELLE DU SITE ODG (réponses de référence — si la question de l'utilisateur correspond, appuie-toi sur ces réponses et n'invente rien):");
  lines.push("");

  for (const section of FAQ_SECTIONS) {
    lines.push(`[${section.category}]`);
    for (const item of section.items) {
      lines.push(`Q: ${item.q}`);
      lines.push(`R: ${truncate(item.a, MAX_ANSWER_CHARS)}`);
    }
  }

  lines.push("");
  lines.push("Pour toute autre question fréquente, oriente vers la page FAQ (#/faq).");

  return lines.join("\n");
}
