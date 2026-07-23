export interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMsg[];
  createdAt: number;
}
