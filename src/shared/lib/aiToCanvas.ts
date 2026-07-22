import type { AINode, AIEdge, AIResponse } from "../../types/aiContract";
import type { DiagramType, FlowEdge, FlowNode, FlowNodeData } from "../../types";
import { resolveRelation } from "./relationMapper";
import { classMinSize, actionMinSize, noteMinSize, componentMinSize } from "./sizing";

/**
 * Tính size cho node từ AI response.
 *
 * <p>Trước đây dùng size CỨNG từ bảng `sizes` → ELK layout sai vì:
 * <ul>
 *   <li>Class có 10 attributes + 10 methods (text dài) mà vẫn bị ép 210×150 → bị
 *       clip, ELK layout con dồn cục.</li>
 *   <li>Action có label 50 ký tự vẫn bị ép 150×54 → text tràn.</li>
 * </ul>
 *
 * <p>Fix: dùng các helper `classMinSize` / `actionMinSize` / `noteMinSize` /
 * `componentMinSize` từ {@link ./sizing} (đã được Mermaid parser dùng và chạy đúng).
 * Các loại ngắn (actor, start, final, fork, usecase, package) vẫn dùng size cứng
 * vì text thường ngắn → estimate cứng đủ chính xác.
 */
function estimateAINodeSize(type: string, data: FlowNodeData): [number, number] {
    switch (type) {
        case "cls": {
            const s = classMinSize(data);
            return [s.w, s.h];
        }
        case "action": {
            const s = actionMinSize(data.label || "");
            return [s.w, s.h];
        }
        case "note": {
            const s = noteMinSize(data);
            return [s.w, s.h];
        }
        case "component": {
            const s = componentMinSize(data);
            return [s.w, s.h];
        }
        // Size cứng cho các loại có text ngắn, không cần ước lượng
        case "decision": return [48, 48];
        case "start": return [38, 38];
        case "final": return [40, 40];
        case "fork": return [130, 12];
        case "usecase": return [170, 76];
        case "actor": return [76, 124];
        case "package":
        case "boundary":
        case "swimlane": return [400, 300];
        default: return [150, 60];
    }
}

export function aiNodeToFlow(ai: AINode): FlowNode {
    const data: FlowNodeData = {
        label: ai.label,
        stereotype: ai.stereotype,
        attributes: ai.attributes?.join("\n") || "",
        methods: ai.methods?.join("\n") || "",
    };

    const [w, h] = estimateAINodeSize(ai.type, data);

    return {
        id: ai.id,
        type: ai.type,
        position: { x: 0, y: 0 },
        data,
        width: w,
        height: h,
    } as FlowNode;
}

export function aiEdgeToFlow(ai: AIEdge): FlowEdge {
    const r = resolveRelation(ai.relation);
    const label = (ai.label && ai.label.trim()) ? ai.label : (r.autoLabel ?? "");
    return {
        id: ai.id,
        source: ai.source,
        target: ai.target,
        type: r.pathType,
        label,
        data: { marker: r.marker, markerStart: r.markerStart, dashed: r.dashed },
    } as FlowEdge;
}

export function aiResponseToCanvas(
    res: Extract<AIResponse, { kind: "diagram" }>
): { nodes: FlowNode[]; edges: FlowEdge[]; diagramType: DiagramType } {
    return {
        nodes: (res.nodes || []).map(aiNodeToFlow),
        edges: (res.edges || []).map(aiEdgeToFlow),
        diagramType: res.diagramType as DiagramType,
    };
}
