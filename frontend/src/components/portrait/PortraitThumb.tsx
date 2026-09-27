import type { Character } from "@/lib/character/types";

// Square crop centered on the face, derived from the stored landmarks.
export function PortraitThumb({ character, className = "" }: { character: Character; className?: string }) {
  const p = character.portrait;
  if (!p) {
    return (
      <div
        className={`grid place-items-center overflow-hidden rounded-full font-bold text-white ${className}`}
        style={{ background: `linear-gradient(135deg, ${character.accentColor}, #1c1b29)` }}
      >
        {character.name.slice(0, 1)}
      </div>
    );
  }
  const [x10, y10, x152, y152] = [p.landmarks[20], p.landmarks[21], p.landmarks[304], p.landmarks[305]];
  const face = Math.hypot(x152 - x10, y152 - y10);
  const k = 0.6 / face;
  const cx = (x10 + x152) / 2;
  const cy = (y10 + y152) / 2;
  return (
    <div className={`relative overflow-hidden rounded-full bg-black ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL portrait */}
      <img
        src={p.src}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: `${p.width * k * 100}%`, left: `${(0.5 - cx * k) * 100}%`, top: `${(0.52 - cy * k) * 100}%` }}
      />
    </div>
  );
}
