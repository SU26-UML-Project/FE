import { useEffect, useCallback, useRef, useState } from "react";
import { toast } from "../lib/toast";
import { socketService, CursorData, SelectionData, CanvasChangeData } from "../../services";
import { useAuthStore } from "../../features/auth/model/useAuthStore";
import { FlowNode, FlowEdge } from "../../types";
import { useReactFlow } from "@xyflow/react";

const COLORS = [
  "#FF5733", "#33FF57", "#3357FF", "#F333FF", "#FF33A1", 
  "#33FFF6", "#F6FF33", "#FF8633", "#8633FF", "#33FF86"
];

export function useCollab(
  sheetId: string | undefined,
  isPublic: boolean | undefined,
  onRemoteCanvasChange: (data: CanvasChangeData) => void,
  onCollabDisabled?: () => void
) {
  const { user } = useAuthStore();
  const rf = useReactFlow();
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorData>>({});
  const [remoteSelections, setRemoteSelections] = useState<Record<string, SelectionData>>({});
  // Presence: userIds currently sharing this sheet room. Rebuilt from
  // user:joined / user:left / cursor:update events (the backend has no
  // "room users" snapshot event yet, so a silent pre-existing user only
  // appears once they emit something — cursor move, selection, canvas edit).
  const [presentUsers, setPresentUsers] = useState<Set<string>>(new Set());

  const trackPresent = useCallback((userId?: string) => {
    if (!userId) return;
    setPresentUsers((prev) => {
      if (prev.has(userId)) return prev;
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  }, []);
  const untrackPresent = useCallback((userId?: string) => {
    if (!userId) return;
    setPresentUsers((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []);
  
  const userColor = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const lastEmit = useRef<number>(0);

  useEffect(() => {
    if (!sheetId || !isPublic) {
      if (socketService.socket?.connected) {
        socketService.leaveRoom(sheetId || "");
      }
      setRemoteCursors({});
      setRemoteSelections({});
      setPresentUsers(new Set());
      return;
    }

    socketService.connect();
    socketService.joinRoom(sheetId);

    const socket = socketService.socket;
    if (!socket) return;

    // Reset presence for the new room.
    setPresentUsers(new Set());

    socket.on("collab:disabled", (message) => {
      toast.error(message || "The owner has disabled collaboration for this project.");
      // Force disconnect and clear
      socketService.leaveRoom(sheetId);
      setRemoteCursors({});
      setRemoteSelections({});
      
      // Trigger callback for Editor to handle redirect/kick
      if (onCollabDisabled) {
        onCollabDisabled();
      }
    });

    socket.on("cursor:update", (data) => {
      setRemoteCursors((prev) => ({ ...prev, [data.userId]: data }));
      trackPresent(data.userId); // presence bootstrap for pre-existing users
    });

    socket.on("selection:update", (data) => {
      setRemoteSelections((prev) => ({ ...prev, [data.userId]: data }));
    });

    socket.on("user:joined", (data) => {
      trackPresent(data.userId);
    });

    socket.on("canvas:update", (data) => {
      if (data.origin !== socketService.sessionId) {
        onRemoteCanvasChange(data);
      }
    });

    socket.on("user:left", (data) => {
      untrackPresent(data.userId);
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
      setRemoteSelections((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    });

    return () => {
      socketService.leaveRoom(sheetId);
      socket.off("collab:disabled");
      socket.off("cursor:update");
      socket.off("selection:update");
      socket.off("user:joined");
      socket.off("canvas:update");
      socket.off("user:left");
    };
  }, [sheetId, onRemoteCanvasChange]);

  // Emit cursor move
  const emitCursorMove = useCallback((x: number, y: number) => {
    if (!sheetId) return;
    const now = Date.now();
    if (now - lastEmit.current < 50) return; // Throttle 50ms
    lastEmit.current = now;

    socketService.socket?.emit("cursor:move", {
      username: user?.fullName || user?.username || "Anonymous",
      color: userColor.current,
      x,
      y,
      sheetId
    });
  }, [user, sheetId]);

  const emitSelectionChange = useCallback((nodeIds: string[], edgeIds: string[]) => {
    socketService.socket?.emit("selection:change", {
      nodeIds,
      edgeIds
    });
  }, []);

  // Emit canvas changes (nodes, edges)
  const emitCanvasChange = useCallback((data: Omit<CanvasChangeData, "senderId" | "sheetId">) => {
    if (!sheetId) return;
    socketService.socket?.emit("canvas:change", {
      ...data,
      senderId: socketService.sessionId,
      sheetId
    });
  }, [sheetId]);

  const emitNodeMove = useCallback((nodes: FlowNode[]) => {
    const now = Date.now();
    if (now - lastEmit.current < 50) return; // Throttle 50ms
    lastEmit.current = now;
    
    emitCanvasChange({ nodes, type: "move" });
  }, [emitCanvasChange]);

  return {
    remoteCursors,
    remoteSelections,
    // Self + distinct remote users known to be in the current sheet room.
    onlineCount: presentUsers.size + 1,
    emitCursorMove,
    emitSelectionChange,
    emitCanvasChange,
    emitNodeMove,
    sessionId: socketService.sessionId
  };
}
