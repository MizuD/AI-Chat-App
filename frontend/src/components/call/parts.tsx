import type { ReactNode } from "react";
import { PortraitThumb } from "@/components/portrait/PortraitThumb";
import type { Character } from "@/lib/character/types";

export const icons = {
  camera: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="13" height="12" rx="3" />
      <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
    </svg>
  ),
  hangup: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 8.5c-3.7 0-7.1 1.2-9.3 3.3-.5.5-.6 1.3-.2 1.9l1.3 1.9c.4.6 1.2.8 1.9.5l2.6-1.2c.6-.3.9-.9.9-1.5v-1.5a13 13 0 0 1 5.6 0v1.5c0 .6.4 1.2.9 1.5l2.6 1.2c.7.3 1.5.1 1.9-.5l1.3-1.9c.4-.6.3-1.4-.2-1.9-2.2-2.1-5.6-3.3-9.3-3.3Z" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12.5a7.5 7.5 0 0 1-11.2 6.5L4 20l1.1-4.3A7.5 7.5 0 1 1 20 12.5Z" />
    </svg>
  ),
  captions: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
};

export function SignalBars() {
  return (
    <span className="flex items-end gap-[2px]" aria-label="接続良好">
      {[5, 8, 11, 14].map((h) => (
        <span key={h} className="w-[3px] rounded-sm bg-white/85" style={{ height: h }} />
      ))}
    </span>
  );
}

export function TypingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex gap-1.5 ${className}`}>
      <span className="typing-dot h-2 w-2 rounded-full bg-white" />
      <span className="typing-dot h-2 w-2 rounded-full bg-white" />
      <span className="typing-dot h-2 w-2 rounded-full bg-white" />
    </span>
  );
}

export function BlurredBackdrop({ character }: { character: Character }) {
  return (
    <>
      {character.portrait && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL portrait
        <img src={character.portrait.src} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-2xl" />
      )}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 35%, ${character.accentColor}33, transparent 60%), linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.72))` }}
      />
    </>
  );
}

export function RoundButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${
        active ? "bg-white text-[#0b0b12]" : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export function ContactList({
  characters,
  selectedId,
  onSelect,
}: {
  characters: Character[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {characters.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`flex items-center gap-3 rounded-2xl p-2.5 text-left transition ${
            c.id === selectedId ? "bg-white/10" : "hover:bg-white/[0.05]"
          }`}
        >
          <PortraitThumb character={c} className="h-11 w-11 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{c.name}</span>
            <span className="block truncate text-xs text-white/45">{c.portrait ? c.tagline || "ビデオ通話できます" : "写真が未設定"}</span>
          </span>
          {c.portrait && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
        </button>
      ))}
    </div>
  );
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
