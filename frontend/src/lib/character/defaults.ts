import type { Character } from "./types";

export function createBlankCharacter(id: string): Character {
  return {
    id,
    name: "新しい相手",
    tagline: "",
    accentColor: "#4f8cff",
    portrait: null,
    motion: { mouth: 1, blink: 1, head: 1 },
    personality: {
      tone: "casual",
      firstPerson: "僕",
      callUser: "きみ",
      traits: "",
      greeting: "もしもし、{name}だよ。聞こえてる？",
      talkSpeed: 9,
    },
    rules: [],
    fallbacks: [],
  };
}

export const DEFAULT_CHARACTERS: Character[] = [
  {
    ...createBlankCharacter("friend"),
    name: "ともだち",
    tagline: "いつでも話せる親友",
    personality: {
      tone: "casual",
      firstPerson: "僕",
      callUser: "きみ",
      traits: "気さくで話しやすい。旅行と写真が好き。",
      greeting: "おー、つながった！{name}だよ。元気してた？",
      talkSpeed: 9,
    },
  },
];
