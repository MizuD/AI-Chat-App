"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { PortraitThumb } from "@/components/portrait/PortraitThumb";
import { TalkingPortrait } from "@/components/portrait/TalkingPortrait";
import { TopBar } from "@/components/ui/TopBar";
import { useCharacters } from "@/lib/character/store";
import type { Character, Emotion } from "@/lib/character/types";
import { fillTemplate, generateReply } from "@/lib/chat/replyEngine";
import { SUGGESTIONS } from "@/lib/chat/toneLibrary";
import { useVoice } from "@/lib/chat/useVoice";
import { BlurredBackdrop, ContactList, formatDuration, icons, RoundButton, SignalBars, TypingDots } from "./parts";

type Phase = "lobby" | "ringing" | "live" | "ended";
type Status = "idle" | "thinking" | "speaking";

interface Message {
  id: string;
  role: "user" | "character";
  text: string;
  at: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clock = (at: number) => new Date(at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

export function CallExperience() {
  const characters = useCharacters();
  const [selectedId, setSelectedId] = useState(characters[0].id);
  const character = characters.find((c) => c.id === selectedId) ?? characters[0];

  const [phase, setPhase] = useState<Phase>("lobby");
  const [startedAt, setStartedAt] = useState(0);
  const [endedAt, setEndedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [caption, setCaption] = useState("");
  const [captionVisible, setCaptionVisible] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [echo, setEcho] = useState<Message | null>(null);
  const [input, setInput] = useState("");

  const { signal, speak, stop, setEmotion } = useVoice();
  const turn = useRef(0);
  const lastReply = useRef<string | undefined>(undefined);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, showChat]);

  const say = useCallback(
    async (target: Character, text: string, emotion: Emotion, token: number) => {
      const id = crypto.randomUUID();
      setMessages((m) => [...m, { id, role: "character", text: "", at: Date.now() }]);
      setStatus("speaking");
      setCaptionVisible(true);
      if (captionTimer.current) clearTimeout(captionTimer.current);
      lastReply.current = text;
      await speak(text, {
        cps: target.personality.talkSpeed,
        emotion,
        onProgress: (visible) => {
          setCaption(visible);
          setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text: visible } : msg)));
        },
      });
      if (token !== turn.current) return;
      setStatus("idle");
      captionTimer.current = setTimeout(() => setCaptionVisible(false), 3500);
      setTimeout(() => {
        if (token === turn.current) setEmotion("neutral");
      }, 2500);
    },
    [speak, setEmotion],
  );

  const startCall = async () => {
    if (!character.portrait) return;
    const token = ++turn.current;
    const target = character;
    stop();
    setEmotion("neutral");
    setMessages([]);
    setCaption("");
    setCaptionVisible(false);
    setStatus("idle");
    setVideoReady(false);
    setShowChat(window.matchMedia("(min-width: 1024px)").matches);
    setPhase("ringing");
    await wait(2200);
    if (token !== turn.current) return;
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
    setPhase("live");
    await wait(1400);
    if (token !== turn.current) return;
    await say(target, fillTemplate(target.personality.greeting, target), "happy", token);
  };

  const endCall = () => {
    turn.current += 1;
    stop();
    setStatus("idle");
    setEndedAt(Date.now());
    setPhase("ended");
  };

  const cancelRinging = () => {
    turn.current += 1;
    setPhase("lobby");
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || phase !== "live") return;
    const token = ++turn.current;
    const target = character;
    stop();
    setInput("");
    const message: Message = { id: crypto.randomUUID(), role: "user", text, at: Date.now() };
    setMessages((m) => [...m, message]);
    setEcho(message);
    setStatus("thinking");
    setCaptionVisible(true);
    setEmotion("thinking");
    await wait(700 + Math.random() * 700);
    if (token !== turn.current) return;
    const reply = generateReply(target, text, lastReply.current);
    await say(target, reply.text, reply.emotion, token);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter during IME composition only confirms the conversion.
    if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault();
  };

  const onReady = useCallback(() => setVideoReady(true), []);

  const accent = character.accentColor;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#07070b] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] opacity-60 transition-[background] duration-700"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}26, transparent 70%)` }}
      />
      <TopBar active="call" />

      <main className="relative z-10 flex min-h-0 flex-1 gap-4 px-3 pb-3 lg:px-6 lg:pb-6">
        {phase === "lobby" ? (
          <>
            <section className="relative flex min-h-0 flex-1 overflow-hidden rounded-[28px] ring-1 ring-white/10">
              <BlurredBackdrop character={character} />
              {characters.length > 1 && (
                <div className="scrollbar-thin absolute inset-x-3 top-3 z-10 flex gap-2 overflow-x-auto lg:hidden">
                  {characters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm backdrop-blur-xl ${
                        c.id === character.id ? "bg-white/20" : "bg-black/30"
                      }`}
                    >
                      <PortraitThumb character={c} className="h-7 w-7" />
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              <div key={character.id} className="relative z-10 m-auto flex animate-rise-in flex-col items-center px-6 text-center">
                <PortraitThumb character={character} className="h-36 w-36 text-5xl shadow-2xl ring-4 ring-white/15" />
                <p className="mt-7 text-[11px] font-semibold tracking-[0.35em] text-white/50">VIDEO CALL</p>
                <h1 className="mt-2 text-4xl font-bold">{character.name}</h1>
                {character.tagline && <p className="mt-2 text-white/60">{character.tagline}</p>}
                {character.portrait ? (
                  <button
                    onClick={() => void startCall()}
                    className="mt-9 inline-flex items-center gap-3 rounded-full bg-emerald-500 px-7 py-3.5 font-bold shadow-[0_14px_40px_-10px_rgba(16,185,129,0.9)] transition hover:scale-[1.03] hover:bg-emerald-400"
                  >
                    {icons.camera}
                    ビデオ通話をかける
                  </button>
                ) : (
                  <div className="mt-8 max-w-xs space-y-4">
                    <p className="text-sm leading-relaxed text-white/65">
                      まだ写真が設定されていません。スタジオで写真をアップロードすると、ビデオ通話で話せるようになります。
                    </p>
                    <Link href="/studio" className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-[#0b0b12]">
                      スタジオで写真を設定
                    </Link>
                  </div>
                )}
              </div>
            </section>
            <aside className="hidden w-[300px] shrink-0 flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.03] p-3 lg:flex">
              <p className="px-2 pt-2 text-xs font-semibold tracking-[0.25em] text-white/45">連絡先</p>
              <ContactList characters={characters} selectedId={character.id} onSelect={setSelectedId} />
            </aside>
          </>
        ) : (
          <>
            <section className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] bg-black shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
              {/* Mounted while ringing so the video is already decoded when the call connects. */}
              {(phase === "ringing" || phase === "live") && character.portrait && (
                <div
                  className={`absolute inset-0 transition-opacity duration-700 ${phase === "live" && videoReady ? "opacity-100" : "opacity-0"}`}
                  style={{ filter: "contrast(1.04) saturate(1.05)" }}
                >
                  <TalkingPortrait portrait={character.portrait} signal={signal} motion={character.motion} onReady={onReady} />
                </div>
              )}
              {phase !== "live" && <BlurredBackdrop character={character} />}
              <div className="video-vignette" />
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="video-grain" />
              </div>

              {phase === "ringing" && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative">
                      <span className="animate-ring absolute inset-0 rounded-full" style={{ background: accent }} />
                      <span className="animate-ring-delay absolute inset-0 rounded-full" style={{ background: accent }} />
                      <PortraitThumb character={character} className="relative h-32 w-32 ring-4 ring-white/20" />
                    </div>
                    <p className="mt-8 text-3xl font-bold">{character.name}</p>
                    <p className="mt-2 text-white/60">呼び出し中…</p>
                    <button
                      onClick={cancelRinging}
                      aria-label="発信をキャンセル"
                      className="mt-12 grid h-14 w-14 place-items-center rounded-full bg-red-500 shadow-[0_12px_32px_-8px_rgba(239,68,68,0.9)] transition hover:bg-red-400"
                    >
                      {icons.hangup}
                    </button>
                  </div>
                </div>
              )}

              {phase === "live" && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-14 pt-4 lg:px-6">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 rounded-md bg-red-500 px-2 py-0.5 text-[11px] font-bold tracking-wider">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        LIVE
                      </span>
                      <div>
                        <p className="text-[15px] font-semibold leading-tight">{character.name}</p>
                        <p className="text-xs tabular-nums text-white/70">{formatDuration(now - startedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 pt-1">
                      <SignalBars />
                      <span className="rounded border border-white/50 px-1 text-[10px] font-bold leading-4">HD</span>
                    </div>
                  </div>

                  <p className="animate-toast pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rounded-full bg-black/55 px-4 py-1.5 text-sm backdrop-blur-md">
                    接続しました
                  </p>

                  {showCaptions && (
                    <div
                      className={`pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-5 transition-opacity duration-500 lg:bottom-32 ${
                        captionVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {status === "thinking" ? (
                        <TypingDots className="rounded-xl bg-black/55 px-4 py-3.5" />
                      ) : (
                        <p className="max-w-3xl text-center text-lg font-medium leading-[1.9] lg:text-[22px]">
                          <span className="rounded-md bg-black/60 px-3 py-1 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
                            {caption}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {!showChat && echo && (
                    <p
                      key={echo.id}
                      className="animate-toast pointer-events-none absolute bottom-24 right-4 max-w-[70%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm lg:bottom-28 lg:right-8"
                      style={{ background: accent }}
                    >
                      {echo.text}
                    </p>
                  )}

                  <form
                    onSubmit={onSubmit}
                    className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/45 p-2 backdrop-blur-2xl lg:bottom-6 lg:left-1/2 lg:right-auto lg:w-[min(760px,calc(100%-3rem))] lg:-translate-x-1/2"
                  >
                    <RoundButton label="字幕" active={showCaptions} onClick={() => setShowCaptions((v) => !v)}>
                      {icons.captions}
                    </RoundButton>
                    <RoundButton label="チャット" active={showChat} onClick={() => setShowChat((v) => !v)}>
                      {icons.chat}
                    </RoundButton>
                    <div className="flex h-11 min-w-0 flex-1 items-center rounded-full bg-white/10 pl-4 pr-1 transition focus-within:bg-white/15">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={`${character.name}に話しかける…`}
                        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-white/40"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim()}
                        aria-label="送信"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition disabled:opacity-30"
                        style={{ background: accent }}
                      >
                        {icons.send}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={endCall}
                      aria-label="通話を終了"
                      title="通話を終了"
                      className="grid h-11 w-14 shrink-0 place-items-center rounded-full bg-red-500 transition hover:bg-red-400"
                    >
                      {icons.hangup}
                    </button>
                  </form>
                </>
              )}

              {phase === "ended" && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex animate-rise-in flex-col items-center text-center">
                    <PortraitThumb character={character} className="h-24 w-24 text-3xl opacity-80 grayscale" />
                    <p className="mt-6 text-2xl font-bold">通話が終了しました</p>
                    <p className="mt-1 tabular-nums text-white/55">{formatDuration(endedAt - startedAt)}</p>
                    <div className="mt-9 flex gap-3">
                      <button
                        onClick={() => void startCall()}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold transition hover:bg-emerald-400"
                      >
                        {icons.camera}
                        もう一度かける
                      </button>
                      <button onClick={() => setPhase("lobby")} className="rounded-full bg-white/10 px-6 py-3 transition hover:bg-white/20">
                        連絡先に戻る
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {phase === "live" && showChat && (
              <aside className="fixed inset-x-3 bottom-[76px] top-16 z-30 flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#101018]/95 backdrop-blur-2xl lg:static lg:inset-auto lg:z-auto lg:w-[340px] lg:shrink-0 lg:bg-white/[0.035]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <p className="font-semibold">チャット</p>
                  <button onClick={() => setShowChat(false)} aria-label="チャットを閉じる" className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
                    {icons.close}
                  </button>
                </div>
                <div ref={logRef} className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                  {messages.map((m) =>
                    m.role === "user" ? (
                      <div key={m.id} className="animate-rise-in max-w-[85%] self-end">
                        <p className="rounded-2xl rounded-br-md px-3.5 py-2 text-[14px] leading-relaxed" style={{ background: accent }}>
                          {m.text}
                        </p>
                        <p className="mt-1 text-right text-[10px] tabular-nums text-white/35">{clock(m.at)}</p>
                      </div>
                    ) : (
                      <div key={m.id} className="animate-rise-in max-w-[85%] self-start">
                        <p className="rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2 text-[14px] leading-relaxed">{m.text || "…"}</p>
                        <p className="mt-1 text-[10px] tabular-nums text-white/35">
                          {character.name}・{clock(m.at)}
                        </p>
                      </div>
                    ),
                  )}
                  {status === "thinking" && <TypingDots className="self-start rounded-2xl bg-white/10 px-3.5 py-3" />}
                </div>
                <div className="scrollbar-thin flex gap-2 overflow-x-auto border-t border-white/10 p-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </aside>
            )}
          </>
        )}
      </main>
    </div>
  );
}
