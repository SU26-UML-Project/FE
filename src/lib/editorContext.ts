import { createContext, useContext } from "react";
import type { FlowNodeData } from "../types";

interface EditorContextValue {
  updateNodeData: (id: string, patch: Partial<FlowNodeData>) => void;
  /** Grow a node so it never clips its text (auto-fit, not an undo step). */
  growNode: (id: string, minW: number, minH: number) => void;
}

export const EditorContext = createContext<EditorContextValue>({
  updateNodeData: () => {},
  growNode: () => {},
});

export const useEditor = () => useContext(EditorContext);
