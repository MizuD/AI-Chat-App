"""Rebuild the dialogue tables from data/dialogues.json.

Usage: python seed.py
"""

import json

from db import BASE_DIR, DB_PATH, connect

EMOTIONS = {"neutral", "happy", "surprised", "sad", "thinking"}


def main():
    data = json.loads((BASE_DIR / "data" / "dialogues.json").read_text(encoding="utf-8"))
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript((BASE_DIR / "schema.sql").read_text(encoding="utf-8"))
        for table in ("choices", "nodes", "topics", "categories"):
            conn.execute(f"DELETE FROM {table}")

        for i, c in enumerate(data["categories"]):
            conn.execute("INSERT INTO categories (id, label, sort) VALUES (?, ?, ?)", (c["id"], c["label"], i))

        node_count = choice_count = 0
        for t_sort, topic in enumerate(data["topics"]):
            tid = topic["id"]
            node_id = lambda local: f"{tid}:{local}"  # noqa: E731
            conn.execute(
                "INSERT INTO topics (id, category_id, title, start_node_id, sort) VALUES (?, ?, ?, ?, ?)",
                (tid, topic["category"], topic["title"], node_id(topic["nodes"][0]["id"]), t_sort),
            )
            for node in topic["nodes"]:
                if node["emotion"] not in EMOTIONS:
                    raise ValueError(f"unknown emotion {node['emotion']!r} in {tid}:{node['id']}")
                conn.execute(
                    "INSERT INTO nodes (id, topic_id, text, emotion) VALUES (?, ?, ?, ?)",
                    (node_id(node["id"]), tid, node["text"], node["emotion"]),
                )
                node_count += 1
            # Choices after all nodes so forward references resolve.
            for node in topic["nodes"]:
                for c_sort, choice in enumerate(node["choices"]):
                    nxt = choice["next"]
                    conn.execute(
                        "INSERT INTO choices (id, node_id, label, next_node_id, sort) VALUES (?, ?, ?, ?, ?)",
                        (f"{node_id(node['id'])}:{c_sort}", node_id(node["id"]), choice["label"], node_id(nxt) if nxt else None, c_sort),
                    )
                    choice_count += 1

    print(f"seeded {len(data['topics'])} topics, {node_count} lines, {choice_count} choices -> {DB_PATH}")


if __name__ == "__main__":
    main()
