// Browser built-in text-to-speech (Web Speech API). Voices differ per device/OS.

const MALE_HINT = /otoya|hattori|ichiro|keita|daichi|男性|male/i;

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("ja"));
  return voices.find((v) => MALE_HINT.test(v.name)) ?? voices.find((v) => v.localService) ?? voices[0];
}

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// Mobile browsers only allow speech that starts inside a user gesture; call this from a tap handler.
export function unlockTts() {
  if (!ttsSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
}

export function cancelTts() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

// Speaks `text` and calls onEnd once when it finishes (or fails). Returns a canceller that skips onEnd.
export function speakAloud(text: string, onEnd: () => void): () => void {
  if (!ttsSupported()) {
    queueMicrotask(onEnd);
    return () => {};
  }
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  const voice = japaneseVoice();
  if (voice) utterance.voice = voice;
  // A deeper pitch reads more like てつや when only a female Japanese voice is installed.
  utterance.pitch = voice && MALE_HINT.test(voice.name) ? 1 : 0.8;
  utterance.rate = 1.1;

  let done = false;
  // Some browsers occasionally never fire "end"; don't let the conversation hang on it.
  const guard = setTimeout(() => finish(), Math.max(4000, Array.from(text).length * 350));
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(guard);
    onEnd();
  }
  utterance.onend = finish;
  utterance.onerror = finish;
  synth.cancel();
  synth.speak(utterance);
  return () => {
    done = true;
    clearTimeout(guard);
    synth.cancel();
  };
}
