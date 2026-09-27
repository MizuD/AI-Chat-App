"use client";

import { useState, type ReactNode } from "react";

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <header>
        <h3 className="text-sm font-bold tracking-wide">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-white/45">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export function Field({ label, children, aside }: { label: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-xs text-white/55">
        {label}
        {aside}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[var(--accent)] focus:bg-black/35";

export function TextInput(props: { value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  return (
    <input
      className={inputClass}
      value={props.value}
      maxLength={props.maxLength}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

export function TextArea(props: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      className={`${inputClass} resize-y leading-relaxed`}
      rows={props.rows ?? 3}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

// Keeps the raw text locally so separators can be typed; the parent only receives the parsed list.
export function ListInput({
  value,
  onChange,
  separator,
  placeholder,
  multiline,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  separator: "," | "\n";
  placeholder?: string;
  multiline?: boolean;
}) {
  const [text, setText] = useState(() => value.join(separator === "," ? ", " : "\n"));
  const commit = (next: string) => {
    setText(next);
    onChange(
      next
        .split(separator === "," ? /[,、，]/ : "\n")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  };
  return multiline ? (
    <TextArea value={text} onChange={commit} placeholder={placeholder} rows={3} />
  ) : (
    <TextInput value={text} onChange={commit} placeholder={placeholder} />
  );
}

const SWATCHES = ["#ffe3d3", "#f3c7a6", "#8a5a44", "#2b2233", "#ff9a4d", "#ff8fb8", "#ff5d73", "#ffd166", "#35b597", "#3fa7ff", "#7c5cff", "#8fa8d8", "#ffffff", "#2b2d4a"];

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/55">{label}</span>
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/25 py-1 pl-1 pr-3">
          <span className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-white/20" style={{ background: value }}>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label={label}
            />
          </span>
          <span className="font-mono text-xs uppercase text-white/70">{value}</span>
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            className={`h-5 w-5 rounded-full ring-offset-2 ring-offset-[#101016] transition hover:scale-110 ${
              c.toLowerCase() === value.toLowerCase() ? "ring-2 ring-white" : "ring-1 ring-white/15"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; sub?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-xl border px-2 py-2 text-left text-xs transition ${
            o.value === value
              ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_22%,transparent)] text-white"
              : "border-white/10 bg-black/20 text-white/60 hover:border-white/25 hover:text-white"
          }`}
        >
          <span className="block font-bold">{o.label}</span>
          {o.sub && <span className="mt-0.5 block text-[10px] text-white/45">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label} aside={<span className="font-mono text-white/70">{format ? format(value) : value}</span>}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </Field>
  );
}
