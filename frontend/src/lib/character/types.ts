export type Tone = "cheerful" | "casual" | "cool" | "gentle" | "tsundere";
export type Emotion = "neutral" | "happy" | "surprised" | "sad" | "thinking";

export interface Portrait {
  src: string;
  width: number;
  height: number;
  // 468 MediaPipe face-mesh landmarks as flat [x0, y0, x1, y1, ...] in pixels of `src`.
  landmarks: number[];
}

export interface Motion {
  mouth: number;
  blink: number;
  head: number;
}

export interface Personality {
  tone: Tone;
  firstPerson: string;
  callUser: string;
  traits: string;
  greeting: string;
  talkSpeed: number;
}

export interface ResponseRule {
  id: string;
  keywords: string[];
  replies: string[];
  emotion: Emotion;
}

export interface Character {
  id: string;
  name: string;
  tagline: string;
  accentColor: string;
  portrait: Portrait | null;
  motion: Motion;
  personality: Personality;
  rules: ResponseRule[];
  fallbacks: string[];
}
