import Link from "next/link";

export function TopBar({ active }: { active: "call" | "studio" }) {
  const item = (href: string, label: string, key: typeof active) => (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm transition ${
        active === key ? "bg-white text-[#0b0b12] shadow-lg" : "text-white/55 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="relative z-20 flex items-center justify-between px-4 py-3 lg:px-6">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-sm font-bold text-[#0b0b12]">心</span>
        <span className="text-[15px] font-semibold tracking-[0.28em]">KOKORO</span>
      </Link>
      <nav className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
        {item("/", "通話", "call")}
        {item("/studio", "スタジオ", "studio")}
      </nav>
    </header>
  );
}
