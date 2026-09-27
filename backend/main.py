from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from db import connect

app = FastAPI()


class Choice(BaseModel):
    id: str
    label: str


class Node(BaseModel):
    id: str
    topic_id: str
    text: str
    emotion: str
    choices: list[Choice]


class Topic(BaseModel):
    id: str
    title: str
    visited: bool


class Category(BaseModel):
    id: str
    label: str
    topics: list[Topic]


class ChoiceIn(BaseModel):
    player_id: str


class ChoiceOut(BaseModel):
    next: Node | None


@app.get("/health")
def health():
    return {"status": "ok"}


def load_node(conn, node_id: str) -> Node:
    row = conn.execute("SELECT id, topic_id, text, emotion FROM nodes WHERE id = ?", (node_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "node not found")
    choices = conn.execute("SELECT id, label FROM choices WHERE node_id = ? ORDER BY sort", (node_id,)).fetchall()
    return Node(**dict(row), choices=[Choice(**dict(c)) for c in choices])


@app.get("/api/categories", response_model=list[Category])
def categories(player_id: str = Query("")):
    with connect() as conn:
        visited = {
            r["topic_id"]
            for r in conn.execute("SELECT DISTINCT topic_id FROM choice_log WHERE player_id = ?", (player_id,))
        }
        result = []
        for cat in conn.execute("SELECT id, label FROM categories ORDER BY sort"):
            topics = conn.execute("SELECT id, title FROM topics WHERE category_id = ? ORDER BY sort", (cat["id"],))
            result.append(
                Category(
                    id=cat["id"],
                    label=cat["label"],
                    topics=[Topic(id=t["id"], title=t["title"], visited=t["id"] in visited) for t in topics],
                )
            )
        return result


@app.get("/api/topics/{topic_id}/start", response_model=Node)
def start_topic(topic_id: str):
    with connect() as conn:
        row = conn.execute("SELECT start_node_id FROM topics WHERE id = ?", (topic_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "topic not found")
        return load_node(conn, row["start_node_id"])


@app.post("/api/choices/{choice_id}", response_model=ChoiceOut)
def choose(choice_id: str, body: ChoiceIn):
    with connect() as conn:
        row = conn.execute(
            "SELECT c.next_node_id, n.topic_id FROM choices c JOIN nodes n ON n.id = c.node_id WHERE c.id = ?",
            (choice_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(404, "choice not found")
        conn.execute(
            "INSERT INTO choice_log (player_id, topic_id, choice_id) VALUES (?, ?, ?)",
            (body.player_id, row["topic_id"], choice_id),
        )
        return ChoiceOut(next=load_node(conn, row["next_node_id"]) if row["next_node_id"] else None)
