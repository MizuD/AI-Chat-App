import type { Emotion, Motion } from "@/lib/character/types";
import type { SpeechSignal } from "@/lib/chat/useVoice";
import type { Vowel } from "@/lib/chat/viseme";
import type { Pose } from "./rig";

const MOUTH_SHAPES: Record<Vowel, { open: number; wide: number }> = {
  a: { open: 1, wide: 0.1 },
  i: { open: 0.28, wide: 0.75 },
  u: { open: 0.32, wide: -0.7 },
  e: { open: 0.55, wide: 0.5 },
  o: { open: 0.72, wide: -0.45 },
  n: { open: 0.06, wide: 0 },
};

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function ease(x: number) {
  return x * x * (3 - 2 * x);
}

export interface Performer {
  open: number;
  wide: number;
  speaking: number;
  blinkStart: number;
  nextBlink: number;
  mood: Record<Emotion, number>;
}

export function createPerformer(): Performer {
  return {
    open: 0,
    wide: 0,
    speaking: 0,
    blinkStart: -1,
    nextBlink: 1.2,
    mood: { neutral: 1, happy: 0, surprised: 0, sad: 0, thinking: 0 },
  };
}

// Blink with a fast close and slower reopen, like a real eyelid.
function blinkAmount(p: Performer, t: number, rate: number) {
  if (p.blinkStart < 0 && t >= p.nextBlink) p.blinkStart = t;
  if (p.blinkStart < 0) return 0;
  const phase = t - p.blinkStart;
  if (phase < 0.07) return ease(phase / 0.07);
  if (phase < 0.1) return 1;
  if (phase < 0.24) return 1 - ease((phase - 0.1) / 0.14);
  p.blinkStart = -1;
  p.nextBlink = t + (Math.random() < 0.15 ? 0.25 : (2.2 + Math.random() * 3.8) / Math.max(0.2, rate));
  return 0;
}

export function perform(p: Performer, signal: SpeechSignal, motion: Motion, t: number, dt: number): Pose {
  for (const key of Object.keys(p.mood) as Emotion[]) {
    p.mood[key] = damp(p.mood[key], signal.emotion === key ? 1 : 0, 5, dt);
  }
  const { happy, surprised, sad, thinking } = p.mood;

  const fresh = signal.speaking && signal.vowel !== null && performance.now() - signal.changedAt < 240;
  const shape = fresh ? MOUTH_SHAPES[signal.vowel!] : { open: 0, wide: 0 };
  const flutter = fresh ? 0.85 + 0.15 * Math.sin(t * 31) : 1;
  p.open = damp(p.open, shape.open * flutter * motion.mouth, 22, dt);
  p.wide = damp(p.wide, shape.wide * 0.8, 14, dt);
  p.speaking = damp(p.speaking, signal.speaking ? 1 : 0, 4, dt);

  const lid = blinkAmount(p, t, motion.blink);
  const env = p.speaking;
  const m = motion.head;

  return {
    open: p.open,
    wide: p.wide + 0.3 * happy,
    smile: 0.7 * happy - 0.5 * sad,
    lid: Math.max(-0.4, Math.min(1, lid + 0.18 * happy + 0.12 * thinking - 0.35 * surprised)),
    brow: 0.9 * surprised + 0.2 * happy - 0.35 * thinking + env * 0.15 * Math.max(0, Math.sin(t * 1.7)),
    browInner: 0.9 * sad,
    roll: m * (0.014 * Math.sin(t * 0.37) + 0.006 * Math.sin(t * 0.91 + 1.3) + env * 0.006 * Math.sin(t * 2.3) + 0.05 * thinking),
    tx: m * (0.007 * Math.sin(t * 0.29 + 0.5) + 0.003 * Math.sin(t * 0.83)),
    ty:
      m *
      (0.004 * Math.sin(t * 0.47 + 2) +
        env * (0.006 * Math.sin(t * 4.7) + 0.004 * Math.sin(t * 7.9)) +
        0.004 * p.open +
        0.01 * sad -
        0.006 * happy * Math.abs(Math.sin(t * 5))),
    scale: m * (0.006 * Math.sin(t * 0.19) + 0.01 * surprised),
    breath: Math.sin(t * 1.45),
  };
}
