import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CursorData } from "../../../services";
import { useReactFlow } from "@xyflow/react";

interface RemoteCursorsProps {
  cursors: Record<string, CursorData>;
}

export function RemoteCursors({ cursors }: RemoteCursorsProps) {
  const rf = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[100] overflow-hidden">
      <AnimatePresence>
        {Object.entries(cursors).map(([id, data]) => {
          const screenPos = rf.flowToScreenPosition({ x: data.x, y: data.y });
          const containerRect = containerRef.current?.getBoundingClientRect();
          
          const x = screenPos.x - (containerRect?.left ?? 0);
          const y = screenPos.y - (containerRect?.top ?? 0);
          
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                x,
                y,
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                type: "spring", 
                damping: 30, 
                stiffness: 300, 
                mass: 0.5 
              }}
              className="absolute left-0 top-0 flex flex-col items-start gap-1"
            >
              {/* Cursor Arrow */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ color: data.color }}
              >
                <path
                  d="M1 1L6 15L8.5 8.5L15 6L1 1Z"
                  fill="currentColor"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>

              {/* User Name Tag */}
              <div
                style={{ backgroundColor: data.color }}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
              >
                {data.username}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
