import type { Metadata } from "next";
import { CharacterStudio } from "@/components/studio/CharacterStudio";

export const metadata: Metadata = {
  title: "Studio — KOKORO",
};

export default function StudioPage() {
  return <CharacterStudio />;
}
