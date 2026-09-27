export type Vowel = "a" | "i" | "u" | "e" | "o" | "n";

const KANA_ROWS: Record<Exclude<Vowel, "n">, string> = {
  a: "あかさたなはまやらわがざだばぱぁゃゎ",
  i: "いきしちにひみりぎじぢびぴぃ",
  u: "うくすつぬふむゆるぐずづぶぷぅゅゔ",
  e: "えけせてねへめれげぜでべぺぇ",
  o: "おこそとのほもよろをごぞどぼぽぉょ",
};

const KANA_TO_VOWEL = new Map<string, Vowel>();
for (const [vowel, chars] of Object.entries(KANA_ROWS)) {
  for (const ch of chars) KANA_TO_VOWEL.set(ch, vowel as Vowel);
}

const VOWELS: Vowel[] = ["a", "i", "u", "e", "o"];
const PAUSE = /[\s、。，．,.!！?？…・「」『』（）()〜~ー—-]/;

// Returns null for characters where the mouth should close (punctuation, pauses).
export function charToVowel(ch: string, previous: Vowel | null): Vowel | null {
  if (ch === "ー" || ch === "〜") return previous;
  if (PAUSE.test(ch)) return null;
  const hira = ch.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  if (hira === "ん" || hira === "っ") return "n";
  const kana = KANA_TO_VOWEL.get(hira);
  if (kana) return kana;
  const lower = ch.toLowerCase();
  if ("aiueo".includes(lower)) return lower as Vowel;
  // Kanji and other glyphs: pick a stable pseudo-vowel so the mouth keeps moving naturally.
  return VOWELS[ch.codePointAt(0)! % VOWELS.length];
}

export function isPause(ch: string) {
  return /[、。，．,.!！?？…\n]/.test(ch);
}
