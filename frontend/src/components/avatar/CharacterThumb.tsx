import Image from "next/image";
import type { CharacterProfile } from "@/lib/character/types";

export function CharacterThumb({ character, className = "" }: { character: CharacterProfile; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-full ${className}`}
      style={{ background: `radial-gradient(circle at 50% 30%, ${character.accentColor}55, #1a1a24 75%)` }}
    >
      <Image src={character.thumbnail} alt="" fill sizes="160px" className="object-cover" draggable={false} />
    </div>
  );
}
