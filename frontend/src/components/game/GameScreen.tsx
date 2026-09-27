"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CharacterThumb } from "@/components/avatar/CharacterThumb";
import { StageBackdrop } from "@/components/avatar/StageBackdrop";
import { TalkingModel } from "@/components/avatar/TalkingModel";
import { MENU_LINES, TETSUYA } from "@/lib/character/tetsuya";
import type { Emotion } from "@/lib/character/types";
import { setSoundOn, useSoundOn } from "@/lib/chat/soundSetting";
import { cancelTts, ttsSupported, unlockTts } from "@/lib/chat/tts";
import { useVoice } from "@/lib/chat/useVoice";
import { dialogueApi, type Category, type DialogueChoice, type DialogueNode, type TopicSummary } from "@/lib/dialogue/api";

type Mode = "menu" | "topics" | "talk";

interface LogEntry {
  id: string;
  who: "tetsuya" | "you";
  text: string;
}

type Option =
  | { kind: "category"; key: string; label: string; category: Category }
  | { kind: "choice"; key: string; label: string; choice: DialogueChoice };

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export function GameScreen() {
  const { signal, speak, stop } = useVoice();
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const soundOn = useSoundOn();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mode, setMode] = useState<Mode>("menu");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [topic, setTopic] = useState<{ category: string; title: string } | null>(null);
  const [line, setLine] = useState("");
  const [typing, setTyping] = useState(false);
  const [choices, setChoices] = useState<DialogueChoice[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const turn = useRef(0);
  const started = useRef(false);
  const optionsRef = useRef<Option[]>([]);

  const addLog = useCallback((who: LogEntry["who"], text: string) => {
    setLog((l) => [...l, { id: crypto.randomUUID(), who, text }]);
  }, []);

  const say = useCallback(
    async (text: string, emotion: Emotion) => {
      const token = ++turn.current;
      setTyping(true);
      addLog("tetsuya", text);
      const audio = soundOn && ttsSupported();
      // Slow the typewriter to roughly the speaking rate so text and voice finish together.
      await speak(text, { cps: audio ? 9 : TETSUYA.talkSpeed, emotion, audio, onProgress: setLine });
      if (token === turn.current) setTyping(false);
      return token === turn.current;
    },
    [speak, addLog, soundOn],
  );

  const openMenu = useCallback(
    async (text: string) => {
      setMode("menu");
      setTopic(null);
      setChoices([]);
      setCategories(dialogueApi.categories());
      await say(text, "happy");
    },
    [say],
  );

  useEffect(() => {
    if (!ready || !entered || started.current) return;
    started.current = true;
    void openMenu(MENU_LINES.greeting);
  }, [ready, entered, openMenu]);

  const showNode = async (node: DialogueNode) => {
    setChoices([]);
    if (await say(node.text, node.emotion)) setChoices(node.choices);
  };

  const pickCategory = (category: Category) => {
    addLog("you", `${category.label}の話がしたい`);
    setCategoryId(category.id);
    setMode("topics");
    void say(MENU_LINES.pickTopic, "happy");
  };

  const pickTopic = async (category: Category, item: TopicSummary) => {
    addLog("you", `「${item.title}」の話`);
    setMode("talk");
    setTopic({ category: category.label, title: item.title });
    await showNode(dialogueApi.startTopic(item.id));
  };

  const pickChoice = async (choice: DialogueChoice) => {
    addLog("you", choice.label);
    setChoices([]);
    const next = dialogueApi.choose(choice.id);
    if (next) await showNode(next);
    else await openMenu(pick(MENU_LINES.again));
  };

  const select = (option: Option) => {
    if (option.kind === "category") pickCategory(option.category);
    else void pickChoice(option.choice);
  };
  const selectRef = useRef(select);

  const idle = ready && entered && !typing;
  const options: Option[] = !idle
    ? []
    : mode === "menu"
      ? categories.map((c) => ({ kind: "category", key: c.id, label: `${c.label}の話をしよう`, category: c }))
      : mode === "talk"
        ? choices.map((c) => ({ kind: "choice", key: c.id, label: c.label, choice: c }))
        : [];

  useEffect(() => {
    optionsRef.current = options;
    selectRef.current = select;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if ((e.key === " " || e.key === "Enter") && typing) {
        e.preventDefault();
        stop();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= optionsRef.current.length) selectRef.current(optionsRef.current[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typing, stop]);

  const activeCategory = categories.find((c) => c.id === categoryId) ?? categories[0];
  const accent = TETSUYA.accentColor;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#07070b] p-2 text-white sm:p-4">
      <main className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] ring-1 ring-white/10">
        <StageBackdrop accent={accent} />
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <TalkingModel src={TETSUYA.model} signal={signal} motion={TETSUYA.motion} accent={accent} onReady={() => setReady(true)} />
        </div>
        <div className="video-vignette" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="video-grain" />
        </div>

        {!ready && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-4 text-sm text-white/70">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/80" />
              てつやを呼んでいます…
            </div>
          </div>
        )}

        <Hud
          topic={topic}
          soundOn={soundOn}
          onSound={() => {
            if (soundOn) cancelTts();
            setSoundOn(!soundOn);
          }}
          onLog={() => setShowLog(true)}
          onChangeTopic={mode === "talk" ? () => void openMenu(MENU_LINES.pickTopic) : undefined}
        />

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-3 sm:p-6">
          {idle && mode === "topics" && activeCategory && (
            <TopicPicker
              categories={categories}
              active={activeCategory}
              accent={accent}
              onCategory={(c) => setCategoryId(c.id)}
              onPick={(c, t) => void pickTopic(c, t)}
              onBack={() => void openMenu(MENU_LINES.greeting)}
            />
          )}
          {options.length > 0 && (
            <div className="flex w-full max-w-3xl flex-col items-stretch gap-2 sm:items-end">
              {options.map((o, i) => (
                <ChoiceButton key={o.key} index={i} accent={accent} onClick={() => select(o)}>
                  {o.label}
                </ChoiceButton>
              ))}
            </div>
          )}
          <DialogueBox line={line} typing={typing} accent={accent} onSkip={stop} />
        </div>

        {showLog && <LogPanel log={log} onClose={() => setShowLog(false)} />}

        {ready && !entered && (
          <TitleScreen
            accent={accent}
            soundOn={soundOn}
            onSound={() => setSoundOn(!soundOn)}
            onStart={() => {
              // Must run inside the tap so mobile browsers allow the voice afterwards.
              if (soundOn) unlockTts();
              setEntered(true);
            }}
          />
        )}
      </main>
    </div>
  );
}

function Hud({
  topic,
  soundOn,
  onSound,
  onLog,
  onChangeTopic,
}: {
  topic: { category: string; title: string } | null;
  soundOn: boolean;
  onSound: () => void;
  onLog: () => void;
  onChangeTopic?: () => void;
}) {
  return (
    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/50 to-transparent p-3 pb-10 sm:p-5">
      <div className="flex items-center gap-3">
        <CharacterThumb character={TETSUYA} className="h-11 w-11 ring-2 ring-white/20" />
        <div>
          <p className="text-[15px] font-bold leading-tight">{TETSUYA.name}</p>
          <p className="whitespace-nowrap text-xs text-white/60">{TETSUYA.role}</p>
        </div>
        {topic && (
          <span className="ml-1 hidden animate-rise-in rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs text-white/80 backdrop-blur-md sm:inline">
            {topic.category}・{topic.title}
          </span>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {onChangeTopic && (
          <HudButton onClick={onChangeTopic} label="話題を変える">
            <span className="sm:hidden">話題</span>
            <span className="hidden sm:inline">話題を変える</span>
          </HudButton>
        )}
        <HudButton onClick={onSound} label={soundOn ? "音声をオフにする" : "音声をオンにする"}>
          <SpeakerIcon on={soundOn} />
        </HudButton>
        <HudButton onClick={onLog}>ログ</HudButton>
      </div>
    </div>
  );
}

function HudButton({ onClick, label, children }: { onClick: () => void; label?: string; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="flex items-center whitespace-nowrap rounded-full border border-white/15 bg-black/40 px-3.5 py-1.5 text-xs backdrop-blur-md transition hover:bg-black/60">
      {children}
    </button>
  );
}

function ChoiceButton({ index, accent, onClick, children }: { index: number; accent: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full animate-rise-in items-center gap-3 rounded-2xl border border-white/15 bg-black/55 px-4 py-3 text-left shadow-lg backdrop-blur-xl transition hover:-translate-x-1 hover:bg-black/75 sm:w-auto sm:min-w-[20rem]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white transition group-hover:scale-110"
        style={{ background: accent }}
      >
        {index + 1}
      </span>
      <span className="flex-1 text-[15px] leading-snug">{children}</span>
      <span className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70">›</span>
    </button>
  );
}

function DialogueBox({ line, typing, accent, onSkip }: { line: string; typing: boolean; accent: string; onSkip: () => void }) {
  return (
    <div
      onClick={() => typing && onSkip()}
      className="relative w-full max-w-3xl cursor-pointer rounded-3xl border border-white/10 bg-[#0c0c13]/80 px-5 pb-5 pt-7 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:px-7"
    >
      <span className="absolute -top-4 left-5 rounded-full px-4 py-1.5 text-sm font-bold shadow-lg sm:left-7" style={{ background: accent }}>
        {TETSUYA.name}
      </span>
      <p className="min-h-[3.8em] text-[16px] leading-[1.9] sm:text-[18px]">
        {line}
      </p>
      {!typing && line && <span className="absolute bottom-3 right-5 animate-bounce text-xs text-white/50">▼</span>}
      {typing && <span className="absolute bottom-3 right-5 text-[11px] text-white/35">クリック / Space でスキップ</span>}
    </div>
  );
}

function TopicPicker({
  categories,
  active,
  accent,
  onCategory,
  onPick,
  onBack,
}: {
  categories: Category[];
  active: Category;
  accent: string;
  onCategory: (c: Category) => void;
  onPick: (c: Category, t: TopicSummary) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex max-h-[45vh] w-full max-w-3xl animate-rise-in flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c13]/85 backdrop-blur-xl">
      <div className="scrollbar-thin flex items-center gap-1 overflow-x-auto border-b border-white/10 p-2">
        {categories.map((c) => {
          const fresh = c.topics.filter((t) => !t.visited).length;
          return (
            <button
              key={c.id}
              onClick={() => onCategory(c)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition sm:px-4 ${c.id === active.id ? "bg-white font-bold text-[#0b0b12]" : "text-white/60 hover:text-white"}`}
            >
              {c.label}
              {fresh > 0 && <span className="rounded-full px-1.5 text-[10px] font-bold text-white" style={{ background: accent }}>{fresh}</span>}
            </button>
          );
        })}
        <button onClick={onBack} className="ml-auto shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-white/50 hover:text-white">
          もどる
        </button>
      </div>
      <div className="scrollbar-thin grid grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
        {active.topics.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(active, t)}
            className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm transition hover:border-white/30 hover:bg-white/[0.09]"
          >
            <span>{t.title}</span>
            {t.visited ? (
              <span className="text-[11px] text-white/35">話した</span>
            ) : (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: accent }}>
                NEW
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function LogPanel({ log, onClose }: { log: LogEntry[]; onClose: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView();
  }, []);
  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0c13]/95">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <p className="font-bold">会話ログ</p>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-white/60 hover:bg-white/10 hover:text-white">
            閉じる
          </button>
        </div>
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {log.map((entry) => (
            <div key={entry.id}>
              <p className={`text-xs font-bold ${entry.who === "you" ? "text-sky-300" : ""}`} style={entry.who === "tetsuya" ? { color: TETSUYA.accentColor } : undefined}>
                {entry.who === "you" ? "あなた" : TETSUYA.name}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-white/85">{entry.text}</p>
            </div>
          ))}
          <div ref={end} />
        </div>
      </aside>
    </div>
  );
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
      {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
    </svg>
  );
}

function TitleScreen({ accent, soundOn, onSound, onStart }: { accent: string; soundOn: boolean; onSound: () => void; onStart: () => void }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/55 p-6 backdrop-blur-md">
      <div className="flex animate-rise-in flex-col items-center text-center">
        <CharacterThumb character={TETSUYA} className="h-28 w-28 shadow-2xl ring-4 ring-white/15" />
        <p className="mt-6 text-[11px] font-semibold tracking-[0.35em] text-white/55">RUNNING BUDDY</p>
        <h1 className="mt-2 text-4xl font-bold">{TETSUYA.name}と話そう</h1>
        <p className="mt-3 text-sm text-white/65">ランニングのこと、日常のこと、恋バナまで。</p>
        <button
          onClick={onStart}
          className="mt-9 rounded-full px-10 py-4 text-lg font-bold shadow-[0_14px_40px_-10px_rgba(255,122,69,0.9)] transition hover:scale-[1.04]"
          style={{ background: accent }}
        >
          タップしてはじめる
        </button>
        {ttsSupported() && (
          <button onClick={onSound} className="mt-5 flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/10">
            <SpeakerIcon on={soundOn} />
            音声 {soundOn ? "オン" : "オフ"}
          </button>
        )}
      </div>
    </div>
  );
}
