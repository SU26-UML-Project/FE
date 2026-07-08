import React, { useState } from "react";
import { detectAndParse, parseMermaid, parsePlantUml } from "../../lib/importers";
import type { FlowNode, FlowEdge, DiagramType } from "../../types";

interface ImportModalProps {
  onClose: () => void;
  onImport: (nodes: FlowNode[], edges: FlowEdge[], type?: DiagramType) => void;
}

type ImportFormat = "auto" | "plantuml";

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [code, setCode] = useState("");
  const [format, setFormat] = useState<ImportFormat>("auto");
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    if (!code.trim()) return;
    setError(null);

    try {
      let result;
      if (format === "plantuml") {
        result = parsePlantUml(code);
      } else {
        // Auto-detect currently focuses on PlantUML as Mermaid is disabled
        result = parsePlantUml(code);
      }

      if (result.nodes.length === 0) {
        setError("Could not find any nodes in the provided code. Please check your PlantUML syntax.");
        return;
      }

      onImport(result.nodes, result.edges, result.type);
      onClose();
    } catch (err) {
      setError("Parsing error: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-admin-outline/30 bg-white shadow-2xl animate-pop">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-admin-outline/10 px-6 py-4 bg-admin-bg/30">
          <h2 className="text-[16px] font-bold text-admin-on-surface">Import PlantUML Code</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-admin-secondary/50 hover:bg-admin-bg hover:text-admin-on-surface transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="mb-4 text-[13px] text-admin-secondary">
            Paste your <strong>PlantUML</strong> code below (Class, Use Case, Activity, or Component diagrams).
          </p>

          <div className="mb-4 flex gap-2">
            {(["auto", "plantuml"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all ${
                  format === f
                    ? "bg-admin-primary text-white shadow-sm"
                    : "bg-admin-bg text-admin-secondary hover:bg-admin-outline/20"
                }`}
              >
                {f === "auto" ? "Auto-detect" : "PlantUML"}
              </button>
            ))}
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="@startuml\nA -> B\n@enduml"
            className="h-64 w-full rounded-xl border border-admin-outline/30 bg-admin-bg/20 p-4 font-mono text-[13px] text-admin-on-surface focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary/20 resize-none"
          />

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-[12px] font-medium text-red-600 border border-red-100 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-admin-outline/10 bg-admin-bg/30 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-[13px] font-bold text-admin-secondary hover:bg-admin-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!code.trim()}
            className="rounded-lg bg-admin-primary px-6 py-2 text-[13px] font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Import & Auto-layout
          </button>
        </div>
      </div>
    </div>
  );
}
