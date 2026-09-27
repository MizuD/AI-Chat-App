import type { Emotion, Motion } from "@/lib/character/types";
import type { SpeechSignal } from "@/lib/chat/useVoice";
import type { Vowel } from "@/lib/chat/viseme";

// Morph target names baked into the Blender export.
export const VISEMES = ["aa", "ih", "ou", "ee", "oh"] as const;
export const EXPRESSIONS = ["happy", "sad", "surprised"] as const;
export type MorphName = (typeof VISEMES)[number] | (typeof EXPRESSIONS)[number] | "blink";

const VOWEL_MORPH: Record<Vowel, Partial<Record<MorphName, number>>> = {
  a: { aa: 1 },
  i: { ih: 1 },
  u: { ou: 1 },
  e: { ee: 1 },
  o: { oh: 1 },
  n: { ih: 0.15 },
};

export interface AvatarPose {
  morphs: Record<MorphName, number>;
  head: { pitch: number; yaw: number; roll: number };
  body: { lift: number; sway: number };
}

export interface Animator {
  morphs: Record<MorphName, number>;
  mood: Record<Emotion, number>;
  speaking: number;
  blinkStart: number;
  nextBlink: number;
  look: { x: number; y: number };
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

const ease = (x: number) => x * x * (3 - 2 * x);

export function createAnimator(): Animator {
  return {
    morphs: { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0, blink: 0, happy: 0, sad: 0, surprised: 0 },
    mood: { neutral: 1, happy: 0, surprised: 0, sad: 0, thinking: 0 },
    speaking: 0,
    blinkStart: -1,
    nextBlink: 1.5,
    look: { x: 0, y: 0 },
  };
}

// Fast close, slower reopen, occasional double blink.
function blink(a: Animator, t: number, rate: number) {
  if (a.blinkStart < 0 && t >= a.nextBlink) a.blinkStart = t;
  if (a.blinkStart < 0) return 0;
  const p = t - a.blinkStart;
  if (p < 0.07) return ease(p / 0.07);
  if (p < 0.1) return 1;
  if (p < 0.24) return 1 - ease((p - 0.1) / 0.14);
  a.blinkStart = -1;
  a.nextBlink = t + (Math.random() < 0.15 ? 0.25 : (2.2 + Math.random() * 3.8) / Math.max(0.2, rate));
  return 0;
}

export function animate(
  a: Animator,
  signal: SpeechSignal,
  motion: Motion,
  pointer: { x: number; y: number },
  t: number,
  dt: number,
): AvatarPose {
  for (const key of Object.keys(a.mood) as Emotion[]) {
    a.mood[key] = damp(a.mood[key], signal.emotion === key ? 1 : 0, 5, dt);
  }
  a.speaking = damp(a.speaking, signal.speaking ? 1 : 0, 4, dt);

  const fresh = signal.speaking && signal.vowel !== null && performance.now() - signal.changedAt < 240;
  const shape = fresh ? VOWEL_MORPH[signal.vowel!] : {};
  const flutter = fresh ? 0.85 + 0.15 * Math.sin(t * 31) : 1;
  for (const v of VISEMES) {
    a.morphs[v] = damp(a.morphs[v], (shape[v] ?? 0) * flutter * motion.mouth * 0.9, 20, dt);
  }
  a.morphs.happy = damp(a.morphs.happy, 0.75 * a.mood.happy, 6, dt);
  a.morphs.sad = damp(a.morphs.sad, 0.8 * a.mood.sad, 6, dt);
  a.morphs.surprised = damp(a.morphs.surprised, 0.8 * a.mood.surprised, 6, dt);
  a.morphs.blink = Math.min(1, blink(a, t, motion.blink) + 0.25 * a.mood.thinking);

  a.look.x = damp(a.look.x, pointer.x, 3, dt);
  a.look.y = damp(a.look.y, pointer.y, 3, dt);
  const m = motion.head;
  const env = a.speaking;
  return {
    morphs: a.morphs,
    head: {
      yaw: a.look.x * 0.35 + m * (0.05 * Math.sin(t * 0.43) + env * 0.03 * Math.sin(t * 1.9)),
      pitch:
        -a.look.y * 0.18 +
        m * (0.02 * Math.sin(t * 0.61) + env * (0.035 * Math.sin(t * 4.6) + 0.02 * Math.sin(t * 7.3))) +
        0.08 * a.mood.sad -
        0.05 * a.mood.surprised -
        0.06 * a.mood.thinking,
      roll: m * (0.03 * Math.sin(t * 0.37) + env * 0.015 * Math.sin(t * 2.3)) + 0.12 * a.mood.thinking,
    },
    body: {
      lift: 0.012 * Math.sin(t * 1.5) + 0.02 * a.mood.happy * Math.abs(Math.sin(t * 6)),
      sway: m * 0.02 * Math.sin(t * 0.29),
    },
  };
}
