import type { Emotion } from "@/lib/character/types";

export interface DialogueChoice {
  id: string;
  label: string;
}

export interface DialogueNode {
  id: string;
  topic_id: string;
  text: string;
  emotion: Emotion;
  choices: DialogueChoice[];
}

export interface TopicSummary {
  id: string;
  title: string;
  visited: boolean;
}

export interface Category {
  id: string;
  label: string;
  topics: TopicSummary[];
}

const PLAYER_KEY = "kokoro.player";

// Anonymous per-browser id so the backend can remember which topics were already talked about.
export function playerId() {
  try {
    let id = localStorage.getItem(PLAYER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(PLAYER_KEY, id);
    }
    return id;
  } catch {
    return "guest";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export const dialogueApi = {
  categories: () => request<Category[]>(`/categories?player_id=${encodeURIComponent(playerId())}`),
  startTopic: (topicId: string) => request<DialogueNode>(`/topics/${encodeURIComponent(topicId)}/start`),
  choose: (choiceId: string) =>
    request<{ next: DialogueNode | null }>(`/choices/${encodeURIComponent(choiceId)}`, {
      method: "POST",
      body: JSON.stringify({ player_id: playerId() }),
    }),
};
