import { io, Socket } from "socket.io-client";
import { FlowNode, FlowEdge } from "../../../types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:9092";

export interface CursorData {
  userId?: string;
  username: string;
  color: string;
  x: number;
  y: number;
  sheetId?: string;
}

export interface SelectionData {
  userId?: string;
  nodeIds: string[];
  edgeIds: string[];
  sheetId?: string;
}

export interface CanvasChangeData {
  senderId: string;
  sheetId: string;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  type?: "move" | "add" | "remove" | "update" | "layout";
}

export interface ServerToClientEvents {
  "cursor:update": (data: CursorData) => void;
  "selection:update": (data: SelectionData) => void;
  "canvas:update": (data: CanvasChangeData) => void;
  "user:joined": (data: { userId: string; userName: string }) => void;
  "user:left": (data: { userId: string }) => void;
  // Cây file workspace thay đổi (BE phát sau khi DB commit) → client refetch tree
  "workspace:update": (data: { projectId: string }) => void;
}

export interface ClientToServerEvents {
  "room:join": (sheetId: string) => void;
  "room:leave": (sheetId: string) => void;
  "cursor:move": (data: Omit<CursorData, "userId">) => void;
  "selection:change": (data: Omit<SelectionData, "userId">) => void;
  "canvas:change": (data: CanvasChangeData) => void;
}

class SocketService {
  public socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  public sessionId: string = Math.random().toString(36).substring(2, 15);

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("Connected to collab server", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from collab server");
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(sheetId: string) {
    this.socket?.emit("room:join", sheetId);
  }

  leaveRoom(sheetId: string) {
    this.socket?.emit("room:leave", sheetId);
  }

  // Room theo project cho sự kiện cây file (room:join của BE nhận chuỗi bất kỳ)
  joinProjectRoom(projectId: string) {
    this.socket?.emit("room:join", `project:${projectId}`);
  }

  leaveProjectRoom(projectId: string) {
    this.socket?.emit("room:leave", `project:${projectId}`);
  }
}

export const socketService = new SocketService();
