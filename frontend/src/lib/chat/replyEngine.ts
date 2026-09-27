import type { Character, Emotion } from "@/lib/character/types";
import { TONE_FALLBACKS, TONE_RULES } from "./toneLibrary";

export interface Reply {
  text: string;
  emotion: Emotion;
}

function toHiragana(s: string) {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function normalizeText(s: string) {
  return toHiragana(s.normalize("NFKC").toLowerCase());
}

function pick(options: string[], avoid?: string) {
  const pool = options.length > 1 && avoid ? options.filter((o) => o !== avoid) : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function fillTemplate(text: string, character: Character) {
  return text
    .replaceAll("{name}", character.name)
    .replaceAll("{me}", character.personality.firstPerson)
    .replaceAll("{you}", character.personality.callUser);
}

export function generateReply(character: Character, input: string, lastReply?: string): Reply {
  const text = normalizeText(input);
  const matches = (keywords: string[]) =>
    keywords.some((k) => k.trim() && text.includes(normalizeText(k.trim())));

  const custom = character.rules.find((r) => r.replies.length > 0 && matches(r.keywords));
  if (custom) {
    return { text: fillTemplate(pick(custom.replies, lastReply), character), emotion: custom.emotion };
  }

  const tone = character.personality.tone;
  const builtin = TONE_RULES.find((r) => matches(r.keywords));
  if (builtin) {
    return { text: fillTemplate(pick(builtin.replies[tone], lastReply), character), emotion: builtin.emotion };
  }

  const fallbacks = character.fallbacks.length > 0 ? character.fallbacks : TONE_FALLBACKS[tone];
  return { text: fillTemplate(pick(fallbacks, lastReply), character), emotion: "neutral" };
}
