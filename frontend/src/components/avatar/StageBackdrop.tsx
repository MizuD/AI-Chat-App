// Soft "room" behind the 3D character: warm wall light, window glow and defocused bokeh.
export function StageBackdrop({ accent }: { accent: string }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#1b1a22]">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 38%, #4a4150 0%, transparent 70%), radial-gradient(ellipse 50% 70% at 88% 20%, ${accent}40, transparent 70%), linear-gradient(to bottom, #2a2630, #121118)`,
        }}
      />
      {[
        [12, 22, 90, 0.35],
        [22, 64, 60, 0.25],
        [78, 58, 110, 0.3],
        [88, 30, 70, 0.4],
        [65, 14, 50, 0.25],
      ].map(([x, y, size, o], i) => (
        <span
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, opacity: o, background: i % 2 ? "#ffd9a8" : accent }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
}
