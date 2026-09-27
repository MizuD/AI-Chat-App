export type Emotion = "neutral" | "happy" | "surprised" | "sad" | "thinking";

export interface Motion {
  mouth: number;
  blink: number;
  head: number;
}

export interface CharacterProfile {
  name: string;
  role: string;
  // GLB exported from Blender; must contain morph targets aa/ih/ou/ee/oh/blink/happy/sad/surprised
  // and a "Head" node.
  model: string;
  thumbnail: string;
  accentColor: string;
  motion: Motion;
  talkSpeed: number;
}
