import script from "@/data/dialogues.json";
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

// Same id scheme as backend/seed.py ("topic:node", "topic:node:index") so data can move to a server later.
const nodes = new Map<string, DialogueNode>();
const nextOf = new Map<string, string | null>();
const startOf = new Map<string, string>();
for (const topic of script.topics) {
  startOf.set(topic.id, `${topic.id}:${topic.nodes[0].id}`);
  for (const node of topic.nodes) {
    const id = `${topic.id}:${node.id}`;
    nodes.set(id, {
      id,
      topic_id: topic.id,
      text: node.text,
      emotion: node.emotion as Emotion,
      choices: node.choices.map((c, i) => ({ id: `${id}:${i}`, label: c.label })),
    });
    node.choices.forEach((c, i) => nextOf.set(`${id}:${i}`, c.next ? `${topic.id}:${c.next}` : null));
  }
}

const VISITED_KEY = "kokoro.visitedTopics";

// Progress lives in this browser only; the static site has no server to remember it.
function loadVisited(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markVisited(topicId: string) {
  const visited = loadVisited();
  visited.add(topicId);
  try {
    localStorage.setItem(VISITED_KEY, JSON.stringify([...visited]));
  } catch {
    // Storage unavailable (private mode): progress just isn't remembered.
  }
}

export const dialogueApi = {
  categories(): Category[] {
    const visited = loadVisited();
    return script.categories.map((c) => ({
      id: c.id,
      label: c.label,
      topics: script.topics
        .filter((t) => t.category === c.id)
        .map((t) => ({ id: t.id, title: t.title, visited: visited.has(t.id) })),
    }));
  },
  startTopic(topicId: string): DialogueNode {
    return nodes.get(startOf.get(topicId)!)!;
  },
  choose(choiceId: string): DialogueNode | null {
    const [topicId] = choiceId.split(":");
    markVisited(topicId);
    const next = nextOf.get(choiceId);
    return next ? nodes.get(next)! : null;
  },
};
