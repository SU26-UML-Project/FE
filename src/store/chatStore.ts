import { nanoid } from "nanoid";
import type { ChatMsg, ChatSession } from "../types";
import { STORAGE_KEYS } from "../config";

const { chats: KEY, activeChat: ACTIVE_KEY, chatSeeded: SEED_FLAG } = STORAGE_KEYS;
const MIN_AGO = 60 * 1000;

// ---- MOCK DATA: demo chat sessions so the history panel isn't empty.
// Replace with GET /api/chats when the backend is wired (see services/chatService).
function mockSessions(): ChatSession[] {
  const now = Date.now();
  return [
    {
      id: "mock1",
      title: "Class diagram — ecommerce",
      createdAt: now - 8 * MIN_AGO,
      messages: [
        { role: "user", text: "draw a class diagram for an online store" },
        { role: "assistant", text: "Imported 6 shapes and 7 connectors as a Mermaid class diagram." },
      ],
    },
    {
      id: "mock2",
      title: "Sequence — login flow",
      createdAt: now - 95 * MIN_AGO,
      messages: [
        { role: "user", text: "sequenceDiagram\nactor User\nparticipant Auth" },
        { role: "assistant", text: "Imported 4 shapes and 5 connectors as a Mermaid sequence diagram." },
      ],
    },
    {
      id: "mock3",
      title: "State machine — order",
      createdAt: now - 26 * MIN_AGO,
      messages: [
        { role: "user", text: "model an order state machine" },
        { role: "assistant", text: "I parsed 5 shapes, but 3 relationships need your confirmation." },
      ],
    },
    {
      id: "mock4",
      title: "Flowchart — onboarding",
      createdAt: now - 240 * MIN_AGO,
      messages: [
        { role: "user", text: "flowchart TD\nA --> B" },
        { role: "assistant", text: "Imported 2 shapes and 1 connector as a Mermaid flowchart." },
      ],
    },
  ];
}

export function loadChats(): ChatSession[] {
  let saved: ChatSession[] = [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) saved = arr;
    }
  } catch {
    /* ignore */
  }
  if (!localStorage.getItem(SEED_FLAG)) {
    localStorage.setItem(SEED_FLAG, "1");
    const merged = [...mockSessions(), ...saved].slice(0, 40);
    saveChats(merged);
    return merged;
  }
  return saved;
}

export function saveChats(chats: ChatSession[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(chats.slice(0, 40)));
  } catch {
    /* ignore quota */
  }
}

export function loadActive(): ChatMsg[] | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveActive(msgs: ChatMsg[]) {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(msgs));
  } catch {
    /* ignore quota */
  }
}

export function deriveTitle(msgs: ChatMsg[]): string {
  const firstUser = msgs.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const t = firstUser.text.replace(/\s+/g, " ").trim();
  return t.length > 38 ? t.slice(0, 38) + "…" : t;
}

export function newSession(): ChatSession {
  return { id: nanoid(8), title: "New chat", messages: [], createdAt: Date.now() };
}
