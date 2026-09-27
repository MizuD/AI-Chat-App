"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Emotion } from "@/lib/character/types";
import { charToVowel, isPause, type Vowel } from "./viseme";

// Mutable signal read every frame by the 3D avatar; kept outside React state to avoid per-frame re-renders.
export interface SpeechSignal {
  speaking: boolean;
  vowel: Vowel | null;
  changedAt: number;
  emotion: Emotion;
}

export function createSpeechSignal(): SpeechSignal {
  return { speaking: false, vowel: null, changedAt: 0, emotion: "neutral" };
}

export function useVoice() {
  const signal = useRef<SpeechSignal>(createSpeechSignal());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finish = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    signal.current.speaking = false;
    signal.current.vowel = null;
    const done = finish.current;
    finish.current = null;
    done?.();
  }, []);

  const speak = useCallback(
    (text: string, options: { cps: number; emotion: Emotion; onProgress: (visible: string) => void }) => {
      stop();
      const chars = Array.from(text);
      const s = signal.current;
      s.emotion = options.emotion;
      s.speaking = true;
      const interval = 1000 / Math.max(4, options.cps);

      return new Promise<void>((resolve) => {
        let i = 0;
        let previous: Vowel | null = null;
        finish.current = () => {
          options.onProgress(text);
          resolve();
        };
        const tick = () => {
          i += 1;
          const ch = chars[i - 1];
          previous = charToVowel(ch, previous);
          s.vowel = previous;
          s.changedAt = performance.now();
          options.onProgress(chars.slice(0, i).join(""));
          if (i >= chars.length) {
            timer.current = setTimeout(stop, interval);
            return;
          }
          timer.current = setTimeout(tick, isPause(ch) ? interval * 4 : interval);
        };
        tick();
      });
    },
    [stop],
  );

  const setEmotion = useCallback((emotion: Emotion) => {
    signal.current.emotion = emotion;
  }, []);

  useEffect(() => stop, [stop]);

  return { signal, speak, stop, setEmotion };
}
