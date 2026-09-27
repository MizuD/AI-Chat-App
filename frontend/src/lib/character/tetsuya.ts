import { asset } from "@/lib/asset";
import type { CharacterProfile } from "./types";

export const TETSUYA: CharacterProfile = {
  name: "てつや",
  role: "ランニング仲間",
  model: asset("/models/friend.glb"),
  thumbnail: asset("/models/friend-thumb.png"),
  accentColor: "#ff7a45",
  motion: { mouth: 1, blink: 1, head: 1 },
  talkSpeed: 14,
};

export const MENU_LINES = {
  greeting: "おう、来たんか！今日は何の話するんや？",
  pickTopic: "ええやん。ほな、どの話にする？",
  again: ["おもろかったわ！他にも話すか？", "また何でも聞いてや。次はどないする？", "よっしゃ、次いこか！"],
};
