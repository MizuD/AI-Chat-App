"use client";

import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import { PortraitThumb } from "@/components/portrait/PortraitThumb";
import { TalkingPortrait } from "@/components/portrait/TalkingPortrait";
import { TopBar } from "@/components/ui/TopBar";
import { createBlankCharacter } from "@/lib/character/defaults";
import { resetCharacters, saveCharacters, updateCharacter, useCharacters } from "@/lib/character/store";
import type { Character, Emotion, Motion, Personality, Tone } from "@/lib/character/types";
import { fillTemplate, generateReply } from "@/lib/chat/replyEngine";
import { TONE_LABELS } from "@/lib/chat/toneLibrary";
import { useVoice } from "@/lib/chat/useVoice";
import { PortraitError, preparePortrait, type PortraitErrorCode } from "@/lib/portrait/prepare";
import { ColorField, Field, ListInput, Section, Segmented, Slider, TextArea, TextInput } from "./controls";

const EMOTION_OPTIONS: { value: Emotion; label: string }[] = [
  { value: "neutral", label: "ふつう" },
  { value: "happy", label: "うれしい" },
  { value: "surprised", label: "びっくり" },
  { value: "sad", label: "かなしい" },
  { value: "thinking", label: "考え中" },
];

type Tab = "photo" | "personality" | "dialogue";
const TABS: { value: Tab; label: string }[] = [
  { value: "photo", label: "写真と動き" },
  { value: "personality", label: "性格" },
  { value: "dialogue", label: "会話" },
];

const ERRORS: Record<PortraitErrorCode | "quota", string> = {
  model: "顔検出モデルを読み込めませんでした。インターネット接続を確認して、もう一度お試しください。",
  "no-face": "顔を検出できませんでした。顔がはっきり写った写真を選んでください。",
  "too-small": "顔が小さすぎます。顔のアップが写った写真を選んでください。",
  image: "画像を読み込めませんでした。JPEG や PNG の画像を選んでください。",
  quota: "保存容量が不足しています。不要なキャラクターを削除してから、もう一度お試しください。",
};

const QUOTA_WARNING = "保存容量が不足しているため、この変更はページを閉じると失われます。";

type Update = (patch: (c: Character) => Character) => void;

export function CharacterStudio() {
  const characters = useCharacters();
  const [selectedId, setSelectedId] = useState(characters[0].id);
  const [tab, setTab] = useState<Tab>("photo");
  const [warning, setWarning] = useState<string | null>(null);
  const character = characters.find((c) => c.id === selectedId) ?? characters[0];

  const update: Update = (patch) => setWarning(updateCharacter(character.id, patch) ? null : QUOTA_WARNING);

  const create = () => {
    const fresh = createBlankCharacter(crypto.randomUUID());
    setWarning(saveCharacters([...characters, fresh]) ? null : QUOTA_WARNING);
    setSelectedId(fresh.id);
    setTab("photo");
  };

  const remove = () => {
    const rest = characters.filter((c) => c.id !== character.id);
    saveCharacters(rest);
    setWarning(null);
    setSelectedId(rest[0].id);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#07070b] text-white" style={{ "--accent": character.accentColor } as CSSProperties}>
      <TopBar active="studio" />
      <div className="grid flex-1 gap-4 px-3 pb-6 lg:grid-cols-[15rem_minmax(0,1fr)_26rem] lg:px-6">
        <aside className="flex flex-col gap-3">
          <div className="px-1">
            <h2 className="text-[11px] font-semibold tracking-[0.35em] text-white/45">CHARACTERS</h2>
            <p className="mt-1 text-sm text-white/60">編集する相手を選択</p>
          </div>
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {characters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex shrink-0 items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                  c.id === character.id ? "border-[var(--accent)] bg-white/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
                }`}
              >
                <PortraitThumb character={c} className="h-10 w-10 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{c.name}</span>
                  <span className="block truncate text-[11px] text-white/45">
                    {TONE_LABELS[c.personality.tone].label}・{c.portrait ? "写真あり" : "写真なし"}
                  </span>
                </span>
              </button>
            ))}
            <button
              onClick={create}
              className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 p-3 text-sm text-white/60 transition hover:border-[var(--accent)] hover:text-white"
            >
              <span className="text-lg leading-none">＋</span> 新しい相手
            </button>
          </div>
        </aside>

        <Preview key={character.id} character={character} />

        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex-1 rounded-xl py-2 text-sm transition ${
                  tab === t.value ? "bg-white font-bold text-[#0b0b12]" : "text-white/55 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {warning && <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">{warning}</p>}
          <div key={`${character.id}-${tab}`} className="scrollbar-thin space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-9.5rem)]">
            {tab === "photo" && <PhotoEditor character={character} update={update} />}
            {tab === "personality" && <PersonalityEditor character={character} update={update} />}
            {tab === "dialogue" && <DialogueEditor character={character} update={update} />}
            <DangerZone canDelete={characters.length > 1} onDelete={remove} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Preview({ character }: { character: Character }) {
  const { signal, speak, setEmotion } = useVoice();
  const [line, setLine] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [trial, setTrial] = useState("");
  const [emotion, setEmotionState] = useState<Emotion>("neutral");
  const [showMesh, setShowMesh] = useState(false);

  const play = async (text: string, e: Emotion) => {
    setEmotionState(e);
    setSpeaking(true);
    await speak(text, { cps: character.personality.talkSpeed, emotion: e, onProgress: setLine });
    setSpeaking(false);
  };

  const pickEmotion = (e: Emotion) => {
    setEmotionState(e);
    setEmotion(e);
  };

  return (
    <section className="relative flex min-h-[62vh] flex-col overflow-hidden rounded-[28px] bg-black ring-1 ring-white/10 lg:min-h-0">
      <div className="relative min-h-[20rem] flex-1">
        {character.portrait ? (
          <TalkingPortrait portrait={character.portrait} signal={signal} motion={character.motion} showMesh={showMesh} />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <PortraitThumb character={character} className="mx-auto h-24 w-24 text-3xl" />
              <p className="mt-5 text-sm text-white/60">右の「写真と動き」から写真をアップロードすると、ここで動きを確認できます。</p>
            </div>
          </div>
        )}
        <div className="video-vignette" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="rounded-md bg-black/50 px-2 py-1 text-[10px] font-semibold tracking-[0.3em] text-white/80 backdrop-blur-md">PREVIEW</span>
          {character.portrait && (
            <button
              onClick={() => setShowMesh((v) => !v)}
              className={`rounded-full px-3 py-1 text-xs backdrop-blur-md transition ${showMesh ? "bg-white text-[#0b0b12]" : "bg-black/50 text-white/80"}`}
            >
              メッシュ表示
            </button>
          )}
        </div>
        {line && (
          <p className="pointer-events-none absolute inset-x-0 bottom-5 px-6 text-center text-lg font-medium leading-[1.9]">
            <span className="rounded-md bg-black/60 px-3 py-1 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
              {line}
              {speaking && <span className="ml-0.5 animate-pulse">▍</span>}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-white/10 bg-[#0d0d14] p-4">
        <div className="flex flex-wrap gap-1.5">
          {EMOTION_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => pickEmotion(o.value)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                emotion === o.value ? "border-white bg-white text-[#0b0b12]" : "border-white/15 text-white/70 hover:border-white/40"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => void play(fillTemplate(character.personality.greeting, character), "happy")}
            disabled={!character.portrait}
            className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            ▶ 挨拶を再生
          </button>
          <form
            className="flex flex-1 gap-2 rounded-full border border-white/10 bg-white/[0.05] p-1 pl-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!trial.trim()) return;
              const reply = generateReply(character, trial);
              setTrial("");
              void play(reply.text, reply.emotion);
            }}
          >
            <input
              value={trial}
              onChange={(e) => setTrial(e.target.value)}
              placeholder="試しに話しかける"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35"
            />
            <button className="rounded-full bg-white/10 px-3 text-xs hover:bg-white/20">送信</button>
          </form>
        </div>
      </div>
    </section>
  );
}

function PhotoEditor({ character, update }: { character: Character; update: Update }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const setMotion = <K extends keyof Motion>(key: K, value: Motion[K]) =>
    update((c) => ({ ...c, motion: { ...c.motion, [key]: value } }));

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const portrait = await preparePortrait(file);
      if (!updateCharacter(character.id, (c) => ({ ...c, portrait }))) setError(ERRORS.quota);
    } catch (e) {
      setError(ERRORS[e instanceof PortraitError ? e.code : "image"]);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void upload(e.dataTransfer.files[0]);
  };

  const percent = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <>
      <Section title="写真" hint="正面を向いて、顔がはっきり写った写真が最適です。写真はこのブラウザ内で処理・保存され、外部には送信されません。">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={busy}
          className={`flex w-full items-center gap-4 rounded-2xl border border-dashed p-4 text-left transition ${
            dragging ? "border-[var(--accent)] bg-white/[0.08]" : "border-white/20 hover:border-white/40 hover:bg-white/[0.04]"
          }`}
        >
          <PortraitThumb character={character} className="h-16 w-16 shrink-0 text-2xl" />
          <span className="text-sm">
            <span className="block font-bold">
              {busy ? "顔を検出しています…" : character.portrait ? "写真を変更" : "写真をアップロード"}
            </span>
            <span className="mt-0.5 block text-xs text-white/50">ドラッグ＆ドロップ、またはクリックして選択</span>
          </span>
          {busy && <span className="ml-auto h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
        {character.portrait && !busy && (
          <button onClick={() => update((c) => ({ ...c, portrait: null }))} className="text-xs text-white/45 hover:text-rose-300">
            写真を削除
          </button>
        )}
      </Section>

      <Section title="プロフィール">
        <div className="grid grid-cols-2 gap-3">
          <Field label="名前">
            <TextInput value={character.name} maxLength={16} onChange={(v) => update((c) => ({ ...c, name: v }))} />
          </Field>
          <Field label="ひとこと">
            <TextInput value={character.tagline} maxLength={30} onChange={(v) => update((c) => ({ ...c, tagline: v }))} />
          </Field>
        </div>
        <ColorField label="テーマカラー" value={character.accentColor} onChange={(v) => update((c) => ({ ...c, accentColor: v }))} />
      </Section>

      <Section title="動きの調整" hint="プレビューで話させながら、自然に見える強さに合わせてください">
        <Slider label="口の動き" value={character.motion.mouth} min={0.4} max={1.6} step={0.05} format={percent} onChange={(v) => setMotion("mouth", v)} />
        <Slider label="瞬きの頻度" value={character.motion.blink} min={0.3} max={2} step={0.05} format={percent} onChange={(v) => setMotion("blink", v)} />
        <Slider label="頭の揺れ" value={character.motion.head} min={0} max={2} step={0.05} format={percent} onChange={(v) => setMotion("head", v)} />
      </Section>
    </>
  );
}

function PersonalityEditor({ character, update }: { character: Character; update: Update }) {
  const p = character.personality;
  const setPersona = <K extends keyof Personality>(key: K, value: Personality[K]) =>
    update((c) => ({ ...c, personality: { ...c.personality, [key]: value } }));
  return (
    <>
      <Section title="口調" hint="内蔵の会話パターンがこの口調に切り替わります">
        <Segmented
          value={p.tone}
          options={(Object.keys(TONE_LABELS) as Tone[]).map((t) => ({ value: t, label: TONE_LABELS[t].label, sub: TONE_LABELS[t].description }))}
          onChange={(v) => setPersona("tone", v)}
        />
      </Section>
      <Section title="呼び方">
        <div className="grid grid-cols-2 gap-3">
          <Field label="一人称">
            <TextInput value={p.firstPerson} maxLength={8} onChange={(v) => setPersona("firstPerson", v)} />
          </Field>
          <Field label="相手（ユーザー）の呼び方">
            <TextInput value={p.callUser} maxLength={8} onChange={(v) => setPersona("callUser", v)} />
          </Field>
        </div>
      </Section>
      <Section title="挨拶とテンポ" hint="{name} {me} {you} は名前・一人称・呼び方に置き換わります">
        <Field label="通話がつながった時の第一声">
          <TextArea value={p.greeting} onChange={(v) => setPersona("greeting", v)} rows={2} />
        </Field>
        <Slider label="話す速さ" value={p.talkSpeed} min={5} max={16} step={1} format={(v) => `${v} 文字/秒`} onChange={(v) => setPersona("talkSpeed", v)} />
      </Section>
      <Section title="性格メモ" hint="将来AIと連携するときに、人物設定として使う予定の自由記述です">
        <TextArea value={p.traits} onChange={(v) => setPersona("traits", v)} rows={4} placeholder="例: 気さくで話しやすい。旅行と写真が好き。" />
      </Section>
    </>
  );
}

function DialogueEditor({ character, update }: { character: Character; update: Update }) {
  const setRules = (rules: Character["rules"]) => update((c) => ({ ...c, rules }));
  const patchRule = (id: string, patch: Partial<Character["rules"][number]>) =>
    setRules(character.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <>
      <Section title="オリジナル会話" hint="キーワードを含む発言には、ここでの返答が最優先で使われます（複数の返答はランダム。{name} {me} {you} も使えます）">
        {character.rules.length === 0 && <p className="text-xs text-white/40">まだありません。下のボタンから追加できます。</p>}
        {character.rules.map((rule, i) => (
          <div key={rule.id} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.3em] text-white/40">RULE {String(i + 1).padStart(2, "0")}</span>
              <button onClick={() => setRules(character.rules.filter((r) => r.id !== rule.id))} className="text-xs text-white/40 hover:text-rose-300">
                削除
              </button>
            </div>
            <Field label="キーワード（カンマ区切り）">
              <ListInput separator="," value={rule.keywords} onChange={(keywords) => patchRule(rule.id, { keywords })} placeholder="例: 旅行, 旅" />
            </Field>
            <Field label="返答（1行に1つ）">
              <ListInput separator={"\n"} multiline value={rule.replies} onChange={(replies) => patchRule(rule.id, { replies })} placeholder="例: 次はどこに行こうか！" />
            </Field>
            <Segmented value={rule.emotion} options={EMOTION_OPTIONS} onChange={(emotion) => patchRule(rule.id, { emotion })} />
          </div>
        ))}
        <button
          onClick={() => setRules([...character.rules, { id: crypto.randomUUID(), keywords: [], replies: [], emotion: "happy" }])}
          className="w-full rounded-2xl border border-dashed border-white/20 py-3 text-sm text-white/60 transition hover:border-[var(--accent)] hover:text-white"
        >
          ＋ 会話ルールを追加
        </button>
      </Section>
      <Section title="相づち" hint="どのキーワードにも当てはまらない時の返答。空なら口調に合わせた内蔵の相づちを使います">
        <ListInput separator={"\n"} multiline value={character.fallbacks} onChange={(fallbacks) => update((c) => ({ ...c, fallbacks }))} placeholder="1行に1つ" />
      </Section>
    </>
  );
}

function DangerZone({ canDelete, onDelete }: { canDelete: boolean; onDelete: () => void }) {
  const [confirm, setConfirm] = useState<"delete" | "reset" | null>(null);
  return (
    <section className="flex flex-wrap items-center gap-2 rounded-3xl border border-rose-400/20 bg-rose-500/[0.04] p-4 text-xs">
      {confirm ? (
        <>
          <span className="flex-1 text-rose-200">
            {confirm === "delete" ? "この相手を削除しますか？" : "すべての相手を初期状態に戻しますか？（写真も削除されます）"}
          </span>
          <button onClick={() => setConfirm(null)} className="rounded-full px-3 py-1.5 text-white/60 hover:text-white">
            キャンセル
          </button>
          <button
            onClick={() => {
              if (confirm === "delete") onDelete();
              else resetCharacters();
              setConfirm(null);
            }}
            className="rounded-full bg-rose-500 px-3 py-1.5 font-bold text-white"
          >
            実行する
          </button>
        </>
      ) : (
        <>
          <button
            disabled={!canDelete}
            onClick={() => setConfirm("delete")}
            className="rounded-full border border-rose-400/30 px-3 py-1.5 text-rose-200 hover:bg-rose-500/10 disabled:opacity-30"
          >
            この相手を削除
          </button>
          <button onClick={() => setConfirm("reset")} className="rounded-full px-3 py-1.5 text-white/50 hover:text-white">
            初期状態に戻す
          </button>
        </>
      )}
    </section>
  );
}
