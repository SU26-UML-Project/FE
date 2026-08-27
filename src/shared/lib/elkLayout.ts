import ELK from "elkjs/lib/elk.bundled.js";

import type {
    FlowEdge,
    FlowNode,
    FlowNodeData,
    DiagramType,
} from "../../types";

import {
    classMinSize,
    actionMinSize,
    noteMinSize,
    componentMinSize,
    swimlaneMinSize,
} from "./sizing";

const elk = new ELK();

/* ============================================================
 * CONSTANTS
 * ============================================================ */

const HANDLE_POINTS = [25, 50, 75] as const;

/*
 * Lưới anchor dày cho node có nhiều cạnh cùng phía
 * (fan-out >= 4 cạnh ngang). Phải khớp chính xác tập điểm
 * được render trong AllHandles
 * (src/features/workspace/Canvas/Nodes.tsx) — React Flow
 * sẽ drop edge khi handle id không tồn tại trên node.
 */
const DENSE_HANDLE_POINTS = [
    10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90,
] as const;

const ACTIVITY = {
    NODE_GAP: 45,
    LAYER_GAP: 65,
    EDGE_NODE_GAP: 35,
    EDGE_EDGE_GAP: 25,

    MIN_LANE_HEIGHT: 280,

    LANE_HEADER_H: 34,
    LANE_PADDING_X: 35,
    LANE_PADDING_TOP: 35,
    LANE_PADDING_BOTTOM: 40,

    BRANCH_GAP: 55,

    TERMINAL_CENTER_TOLERANCE: 8,
} as const;

const USE_CASE = {
    UC_W: 170,
    UC_H: 76,

    UC_GAP_X: 60,
    UC_GAP_Y: 40,

    ACTOR_W: 76,
    ACTOR_H: 124,

    ACTOR_MIN_GAP: 45,

    BOUNDARY_PAD: 40,
    ACTOR_UC_GAP: 200, // was 120 — đủ chỗ cho các đường toả góc, tránh chồng lên nhau ở đoạn đầu

    GROUP_GAP: 70,
} as const;

/* ============================================================
 * NODE SIZE ESTIMATION
 * ============================================================ */

function estimateSize(node: FlowNode): {
    width: number;
    height: number;
} {
    const measured = (node as Record<string, unknown>).measured as
        | {
              width?: number;
              height?: number;
          }
        | undefined;

    const w = measured?.width ?? node.width;
    const h = measured?.height ?? node.height;

    if (
        typeof w === "number" &&
        typeof h === "number" &&
        w > 1 &&
        h > 1
    ) {
        return {
            width: w,
            height: h,
        };
    }

    const d = node.data as FlowNodeData;

    switch (node.type) {
        case "cls": {
            const s = classMinSize(d);

            return {
                width: s.w,
                height: s.h,
            };
        }

        case "action": {
            const s = actionMinSize(d.label ?? "");

            return {
                width: s.w,
                height: s.h,
            };
        }

        case "note": {
            const s = noteMinSize(d);

            return {
                width: s.w,
                height: s.h,
            };
        }

        case "component": {
            const s = componentMinSize(d);

            return {
                width: s.w,
                height: s.h,
            };
        }

        case "usecase":
            return {
                width: USE_CASE.UC_W,
                height: USE_CASE.UC_H,
            };

        case "actor":
            return {
                width: USE_CASE.ACTOR_W,
                height: USE_CASE.ACTOR_H,
            };

        case "start":
        case "final":
            return {
                width: 40,
                height: 40,
            };

        case "decision": {
            const label = d.label || "";
            const lines = label.split("\n");

            const maxLen = Math.max(
                8,
                ...lines.map((line) => line.length),
            );

            return {
                width: Math.max(120, maxLen * 9 + 50),
                height: Math.max(80, lines.length * 20 + 40),
            };
        }

        case "fork":
            return {
                width: 130,
                height: 14,
            };

        case "package":
        case "boundary":
        case "swimlane": {
            const s = swimlaneMinSize(d);

            return {
                width: s.w,
                height: s.h,
            };
        }

        default:
            return {
                width: 150,
                height: 60,
            };
    }
}

/* ============================================================
 * ABSOLUTE POSITION HELPERS
 * ============================================================ */

function createNodeMap(
    nodes: FlowNode[],
): Map<string, FlowNode> {
    return new Map(nodes.map((node) => [node.id, node]));
}

function getAbsolutePosition(
    node: FlowNode,
    nodeById: Map<string, FlowNode>,
): {
    x: number;
    y: number;
} {
    let x = node.position.x;
    let y = node.position.y;

    let parentId = node.parentId;

    const visited = new Set<string>();

    while (parentId && !visited.has(parentId)) {
        visited.add(parentId);

        const parent = nodeById.get(parentId);

        if (!parent) {
            break;
        }

        x += parent.position.x;
        y += parent.position.y;

        parentId = parent.parentId;
    }

    return {
        x,
        y,
    };
}

function buildPositionMap(nodes: FlowNode[]) {
    const nodeById = createNodeMap(nodes);

    const result = new Map<
        string,
        {
            x: number;
            y: number;
            w: number;
            h: number;
            cx: number;
            cy: number;
        }
    >();

    for (const node of nodes) {
        const size = estimateSize(node);
        const position = getAbsolutePosition(node, nodeById);

        result.set(node.id, {
            x: position.x,
            y: position.y,
            w: size.width,
            h: size.height,
            cx: position.x + size.width / 2,
            cy: position.y + size.height / 2,
        });
    }

    return result;
}

/* ============================================================
 * EDGE HELPERS
 * ============================================================ */

function isDashedEdge(edge: FlowEdge): boolean {
    return (edge.data as { dashed?: boolean } | undefined)?.dashed === true;
}

function isNoteLink(edge: FlowEdge): boolean {
    return isDashedEdge(edge);
}

function isIncludeExtend(edge: FlowEdge): boolean {
    const label =
        typeof edge.label === "string"
            ? edge.label
            : "";

    const marker =
        (edge.data as { marker?: string } | undefined)?.marker ?? "";

    return (
        label.includes("«") ||
        marker.includes("open")
    );
}

/* ============================================================
 * HANDLE ASSIGNMENT
 *
 * Activity / State:
 *   - Control flow => TOP/BOTTOM
 *   - Note link => LEFT/RIGHT
 *   - Decision => LEFT/RIGHT branch
 *
 * Class / Component / UseCase:
 *   - Automatically choose horizontal/vertical
 * ============================================================ */

function assignHandles(
    nodes: FlowNode[],
    edges: FlowEdge[],
    diagramType?: DiagramType,
): FlowEdge[] {
    const nodeById = createNodeMap(nodes);
    const posMap = buildPositionMap(nodes);

    const handleUsage = new Map<string, Set<number>>();

    const pickPercent = (
        nodeId: string,
        side: string,
        ideal: number,
        poolOverride?: readonly number[],
    ): string => {
        const key = `${nodeId}-${side}`;

        const used =
            handleUsage.get(key) ??
            new Set<number>();

        /*
         * poolOverride cho phép một nhánh cụ thể (vd fan-out
         * >= 4 cạnh ngang) dùng lưới anchor dày hơn thay vì
         * 3 điểm 25/50/75 mặc định. Mọi giá trị trong pool
         * phải khớp với các <Handle> được render trong
         * AllHandles (Nodes.tsx), nếu không React Flow sẽ
         * drop edge vì không tìm thấy handle id.
         */
        const basePoints =
            poolOverride ?? HANDLE_POINTS;

        const available = basePoints.filter(
            (point) => !used.has(point),
        );

        const pool =
            available.length > 0
                ? available
                : [...basePoints];

        const best = pool.reduce(
            (bestPoint, point) =>
                Math.abs(point - ideal) <
                Math.abs(bestPoint - ideal)
                    ? point
                    : bestPoint,
            pool[0],
        );

        used.add(best);

        handleUsage.set(key, used);

        return `${side}-${best}`;
    };

    const clamp = (value: number) =>
        Math.max(0, Math.min(100, value));

    /*
     * Activity and State Machine share the same geometric
     * vocabulary: start / decision / final nodes with control
     * flow that should always run vertically. State Machine is
     * treated as an Activity-style diagram here so it benefits
     * from the same handle-assignment rules (decision fan-out,
     * note-link routing, final-merge alignment, vertical control
     * flow) instead of falling through to the generic
     * horizontal/vertical heuristic below.
     */
    const isActivity =
        diagramType === "activity" ||
        diagramType === "state";

    return edges.map((edge) => {
        const source = posMap.get(edge.source);
        const target = posMap.get(edge.target);

        if (!source || !target) {
            return edge;
        }

        const sourceNode =
            nodeById.get(edge.source);

        const targetNode =
            nodeById.get(edge.target);

        const dx =
            target.cx - source.cx;

        const dy =
            target.cy - source.cy;

        /* ====================================================
         * ACTIVITY / STATE
         * ==================================================== */

        if (isActivity) {
            /*
             * Decision fan-out:
             *
             *             Action
             *            /
             * Decision
             *            \
             *             Action
             *
             * Keep branches horizontally separated.
             */
            if (
                sourceNode?.type === "decision"
            ) {
                const outgoing =
                    edges.filter(
                        (e) =>
                            e.source === edge.source,
                    );

                if (outgoing.length > 1) {
                    const targetIsLeft =
                        target.cx < source.cx;

                    return {
                        ...edge,
                        sourceHandle: targetIsLeft
                            ? "l-50"
                            : "r-50",
                        targetHandle: "t-50",
                    };
                }
            }

            /*
             * Note links are semantic relations.
             *
             * They are allowed to exit horizontally.
             */
            if (isNoteLink(edge)) {
                const horizontalRatio =
                    Math.abs(dx) /
                    (
                        Math.abs(dx) +
                        Math.abs(dy) ||
                        1
                    );

                if (horizontalRatio > 0.45) {
                    const sourceSide =
                        dx >= 0 ? "r" : "l";

                    const targetSide =
                        dx >= 0 ? "l" : "r";

                    const sourceIdeal = clamp(
                        (
                            (target.cy - source.y) /
                            source.h
                        ) * 100,
                    );

                    const targetIdeal = clamp(
                        (
                            (source.cy - target.y) /
                            target.h
                        ) * 100,
                    );

                    return {
                        ...edge,

                        sourceHandle: pickPercent(
                            edge.source,
                            sourceSide,
                            sourceIdeal,
                        ),

                        targetHandle: pickPercent(
                            edge.target,
                            targetSide,
                            targetIdeal,
                        ),
                    };
                }
            }

            /*
             * Three edges into one Final node:
             *
             *   left  -> t-25
             *   middle -> t-50  (perfectly vertical)
             *   right -> t-75
             *
             * The middle source node is normalized to the Final
             * center by normalizeActivityFinalMerges(), so the
             * middle edge can remain a true straight vertical line.
             */
            if (targetNode?.type === "final") {
                const incoming = edges
                    .filter((e) => e.target === edge.target)
                    .map((e) => {
                        const sourcePosition = posMap.get(e.source);

                        return sourcePosition
                            ? {
                                  edge: e,
                                  cx: sourcePosition.cx,
                              }
                            : null;
                    })
                    .filter(
                        (item): item is {
                            edge: FlowEdge;
                            cx: number;
                        } => Boolean(item),
                    )
                    .sort((a, b) => a.cx - b.cx);

                /*
                 * Any number of edges merging into Final:
                 * spread their target handles evenly across
                 * the 25/50/75 points instead of only handling
                 * the exact-3 case. This keeps 2, 4, 5+ merges
                 * from falling back to the generic (and less
                 * predictable) percent heuristic below.
                 */
                if (incoming.length >= 2) {
                    const index = incoming.findIndex(
                        (item) => item.edge.id === edge.id,
                    );

                    if (index >= 0) {
                        const idealPercent =
                            incoming.length === 1
                                ? 50
                                : 25 +
                                  (
                                      index /
                                      (incoming.length - 1)
                                  ) *
                                      50;

                        const nearestPoint =
                            HANDLE_POINTS.reduce(
                                (best, point) =>
                                    Math.abs(
                                        point -
                                            idealPercent,
                                    ) <
                                    Math.abs(
                                        best -
                                            idealPercent,
                                    )
                                        ? point
                                        : best,
                                HANDLE_POINTS[0],
                            );

                        return {
                            ...edge,
                            sourceHandle: "b-50",
                            targetHandle: `t-${nearestPoint}`,
                        };
                    }
                }
            }

            /*
             * Edges leaving a Start node all exit from the
             * same bottom-center point.
             *
             * Start nodes are tiny (40px), so spreading their
             * exits across separate handle percents (25/50/75)
             * produces a visible zig-zag hook right after
             * leaving the node, with no real benefit — the
             * edges diverge naturally once they clear the node.
             * Only the target side still gets a personalized
             * percent so multiple branches land cleanly.
             */
            if (sourceNode?.type === "start") {
                const targetIdeal = clamp(
                    (
                        (source.cx - target.x) /
                        target.w
                    ) * 100,
                );

                return {
                    ...edge,

                    sourceHandle: "b-50",

                    targetHandle: pickPercent(
                        edge.target,
                        "t",
                        targetIdeal,
                    ),
                };
            }

            /*
             * Main Activity / State control flow.
             *
             * ALWAYS vertical.
             */
            const sourceSide =
                dy >= 0 ? "b" : "t";

            const targetSide =
                dy >= 0 ? "t" : "b";

            const sourceIdeal = clamp(
                (
                    (target.cx - source.x) /
                    source.w
                ) * 100,
            );

            const targetIdeal = clamp(
                (
                    (source.cx - target.x) /
                    target.w
                ) * 100,
            );

            return {
                ...edge,

                sourceHandle: pickPercent(
                    edge.source,
                    sourceSide,
                    sourceIdeal,
                ),

                targetHandle: pickPercent(
                    edge.target,
                    targetSide,
                    targetIdeal,
                ),
            };
        }

        /* ====================================================
         * CLASS HIERARCHY FAN-OUT
         *
         * Comparable
         *    /  |  |  \
         * Animal Animal Animal Animal
         *
         * Với generalization/realization một-nhiều, không thể xử
         * lý từng cạnh độc lập theo thứ tự mảng `edges` — thứ tự
         * đó không liên quan gì tới vị trí trái/phải thực tế của
         * các node con, nên các "thân" xuất phát từ node cha bị
         * lệch tâm ngẫu nhiên (do pickPercent xử lý greedy theo
         * thứ tự cạnh, không theo toạ độ), kéo theo đoạn ngang dài
         * bất đối xứng ở các nhánh ngoài cùng.
         *
         * Sắp xếp các "anh em" (cùng nguồn) theo cx rồi trải đều
         * 25→75 và snap về điểm gần nhất — cùng kỹ thuật đã dùng ở
         * normalizeActivityFinalMerges/targetHandle phía trên cho
         * nhiều nhánh đổ vào 1 Final — để thân cây luôn đối xứng,
         * bất kể thứ tự khai báo cạnh trong dữ liệu.
         * ==================================================== */

        if (
            diagramType === "class" &&
            sourceNode?.type === "cls" &&
            targetNode?.type === "cls" &&
            !isDashedEdge(edge)
        ) {
            const siblings = edges
                .filter(
                    (e) =>
                        e.source === edge.source &&
                        nodeById.get(e.target)?.type === "cls" &&
                        !isDashedEdge(e),
                )
                .map((e) => {
                    const t = posMap.get(e.target);

                    return t
                        ? { edge: e, cx: t.cx }
                        : null;
                })
                .filter(
                    (item): item is { edge: FlowEdge; cx: number } =>
                        Boolean(item),
                )
                .sort((a, b) => a.cx - b.cx);

            if (siblings.length > 1) {
                const index = siblings.findIndex(
                    (s) => s.edge.id === edge.id,
                );

                if (index >= 0) {
                    const idealPercent =
                        25 +
                        (index / (siblings.length - 1)) * 50;

                    const nearestPoint = HANDLE_POINTS.reduce(
                        (best, point) =>
                            Math.abs(point - idealPercent) <
                            Math.abs(best - idealPercent)
                                ? point
                                : best,
                        HANDLE_POINTS[0],
                    );

                    return {
                        ...edge,
                        sourceHandle: `b-${nearestPoint}`,
                        targetHandle: "t-50",
                    };
                }
            }
        }

        /* ====================================================
         * PACKAGE / BOUNDARY
         * ==================================================== */

        const isPackage =
            sourceNode?.type === "package" ||
            targetNode?.type === "package" ||
            sourceNode?.type === "boundary" ||
            targetNode?.type === "boundary";

        const horizontalRatio =
            Math.abs(dx) /
            (
                Math.abs(dx) +
                Math.abs(dy) ||
                1
            );

        if (isPackage) {
            if (
                horizontalRatio > 0.6 ||
                isIncludeExtend(edge)
            ) {
                return {
                    ...edge,

                    sourceHandle:
                        dx >= 0
                            ? "r-50"
                            : "l-50",

                    targetHandle:
                        dx >= 0
                            ? "l-50"
                            : "r-50",
                };
            }

            return {
                ...edge,

                sourceHandle:
                    dy >= 0
                        ? "b-50"
                        : "t-50",

                targetHandle:
                    dy >= 0
                        ? "t-50"
                        : "b-50",
            };
        }

        /* ====================================================
         * HORIZONTAL RELATION
         * ==================================================== */

        if (
            horizontalRatio > 0.6 ||
            isIncludeExtend(edge)
        ) {
            const sourceSide =
                dx >= 0 ? "r" : "l";

            const targetSide =
                dx >= 0 ? "l" : "r";

            /*
             * Nhiều cạnh cùng xuất phát từ 1 actor/node (fan-out
             * ngang) không thể tính sourceIdeal độc lập theo từng
             * cạnh rồi để pickPercent xử lý greedy theo thứ tự mảng
             * edges — thứ tự đó không liên quan gì tới vị trí trên/
             * dưới thực tế của các target, gây bắt chéo ngay sát
             * node nguồn (y hệt bug đã sửa ở CLASS HIERARCHY
             * FAN-IN / FAN-OUT và final-merge). Sắp xếp anh em
             * theo target.cy rồi trải đều 25→75 để thứ tự handle
             * luôn khớp thứ tự target trên/dưới.
             */
            const siblings = edges
                .filter(
                    (e) => e.source === edge.source,
                )
                .map((e) => {
                    const t = posMap.get(e.target);

                    return t
                        ? { edge: e, cy: t.cy }
                        : null;
                })
                .filter(
                    (
                        item,
                    ): item is {
                        edge: FlowEdge;
                        cy: number;
                    } => Boolean(item),
                )
                .sort((a, b) => a.cy - b.cy);

            /*
             * Fan-out >3 cạnh: 3 điểm 25/50/75 quá sít trên node cao
             * 124px (height), khiến các đường xuất phát gần như chồng
             * lên nhau trước khi tách. Dùng lưới DENSE_HANDLE_POINTS
             * (đã khai báo sẵn, khớp AllHandles trong Nodes.tsx) để
             * trải rộng điểm xuất phát hơn.
             */
            const pool =
                siblings.length > 3
                    ? DENSE_HANDLE_POINTS
                    : undefined;

            const sourceIdeal =
                siblings.length > 1
                    ? (() => {
                          const index =
                              siblings.findIndex(
                                  (s) =>
                                      s.edge.id ===
                                      edge.id,
                              );

                          const points =
                              pool ?? HANDLE_POINTS;
                          const lo = points[0];
                          const hi =
                              points[
                                  points.length - 1
                              ];

                          return index >= 0
                              ? lo +
                                    (index /
                                        (siblings.length -
                                            1)) *
                                        (hi - lo)
                              : clamp(
                                    ((target.cy -
                                        source.y) /
                                        source.h) *
                                        100,
                                    );
                      })()
                    : clamp(
                          ((target.cy - source.y) /
                              source.h) *
                              100,
                      );

            const targetIdeal = clamp(
                (
                    (source.cy - target.y) /
                    target.h
                ) * 100,
            );

            return {
                ...edge,

                sourceHandle: pickPercent(
                    edge.source,
                    sourceSide,
                    sourceIdeal,
                    pool,
                ),

                targetHandle: pickPercent(
                    edge.target,
                    targetSide,
                    targetIdeal,
                ),
            };
        }

        /* ====================================================
         * VERTICAL RELATION
         * ==================================================== */

        const sourceSide =
            dy >= 0 ? "b" : "t";

        const targetSide =
            dy >= 0 ? "t" : "b";

        const sourceIdeal = clamp(
            (
                (target.cx - source.x) /
                source.w
            ) * 100,
        );

        const targetIdeal = clamp(
            (
                (source.cx - target.x) /
                target.w
            ) * 100,
        );

        return {
            ...edge,

            sourceHandle: pickPercent(
                edge.source,
                sourceSide,
                sourceIdeal,
            ),

            targetHandle: pickPercent(
                edge.target,
                targetSide,
                targetIdeal,
            ),
        };
    });
}

/* ============================================================
 * ELK OPTIONS
 * ============================================================ */

function elkOptions(
    type?: DiagramType,
    direction?: "TB" | "LR",
): Record<string, string> {
    const base: Record<string, string> = {
        "elk.algorithm": "layered",

        /*
         * Crossing minimization
         */
        "elk.layered.crossingMinimization.strategy":
            "LAYER_SWEEP",

        "elk.layered.crossingMinimization.greedySwitch.type1":
            "true",

        "elk.layered.crossingMinimization.greedySwitch.type2":
            "true",

        /*
         * Straight edges
         */
        "elk.layered.nodePlacement.favorStraightEdges":
            "true",

        /*
         * Routing
         */
        "elk.layered.edgeRouting":
            "ORTHOGONAL",

        "elk.layered.unnecessaryBendpoints":
            "false",

        /*
         * Hierarchy
         */
        "elk.hierarchyHandling":
            "INCLUDE_CHILDREN",

        "elk.layered.hierarchyHandling":
            "INCLUDE_CHILDREN",

        /*
         * Labels
         */
        "elk.edgeLabels.placement":
            "CENTER",

        "elk.layered.edgeLabels.sideSelection":
            "ALWAYS_UP",

        /*
         * Components
         */
        "elk.separateConnectedComponents":
            "true",

        /*
         * General spacing
         */
        "elk.layered.spacing.edgeNode":
            String(ACTIVITY.EDGE_NODE_GAP),

        "elk.layered.spacing.edgeEdge":
            String(ACTIVITY.EDGE_EDGE_GAP),

        "elk.spacing.edgeEdge":
            String(ACTIVITY.EDGE_EDGE_GAP),

        "elk.layered.spacing.labelNode":
            "35",

        "elk.layered.spacing.labelLabel":
            "25",

        /*
         * Padding
         */
        "elk.padding":
            "[top=35,left=40,bottom=40,right=40]",

        /*
         * Quality
         */
        "elk.layered.thoroughness":
            "8",

        /*
         * Component spacing
         */
        "elk.spacing.componentComponent":
            "100",
    };

    switch (type) {
        /* ====================================================
         * ACTIVITY
         * ==================================================== */

        case "activity":
            return {
                ...base,

                /*
                 * Activity ALWAYS flows down.
                 */
                "elk.direction":
                    "DOWN",

                /*
                 * Longest path produces a much more
                 * natural lifecycle than NETWORK_SIMPLEX
                 * for Activity diagrams.
                 */
                "elk.layered.layering.strategy":
                    "LONGEST_PATH",

                /*
                 * Brandes-Koepf gives much better
                 * horizontal alignment.
                 */
                "elk.layered.nodePlacement.strategy":
                    "BRANDES_KOEPF",

                "elk.layered.nodePlacement.bk.fixedAlignment":
                    "BALANCED",

                "elk.layered.nodePlacement.bk.edgeStraightening":
                    "IMPROVE_STRAIGHTNESS",

                /*
                 * Activity spacing.
                 */
                "elk.layered.spacing.nodeNodeBetweenLayers":
                    String(ACTIVITY.LAYER_GAP),

                "elk.spacing.nodeNode":
                    String(ACTIVITY.NODE_GAP),

                /*
                 * Keep Activity compact.
                 */
                "elk.padding":
                    "[top=30,left=35,bottom=35,right=35]",

                /*
                 * Prefer model order.
                 */
                "elk.layered.considerModelOrder.strategy":
                    "NODES_AND_EDGES",
            };

        /* ====================================================
         * STATE
         *
         * State Machine shares the same start/decision/final
         * vocabulary as Activity, so it uses the same layering
         * strategy, node placement, spacing, and padding to get
         * the same compact, straight-edge result.
         * ==================================================== */

        case "state":
            return {
                ...base,

                "elk.direction":
                    direction === "LR"
                        ? "RIGHT"
                        : "DOWN",

                "elk.layered.layering.strategy":
                    "LONGEST_PATH",

                "elk.layered.nodePlacement.strategy":
                    "BRANDES_KOEPF",

                "elk.layered.nodePlacement.bk.fixedAlignment":
                    "BALANCED",

                "elk.layered.nodePlacement.bk.edgeStraightening":
                    "IMPROVE_STRAIGHTNESS",

                "elk.layered.spacing.nodeNodeBetweenLayers":
                    String(ACTIVITY.LAYER_GAP),

                "elk.spacing.nodeNode":
                    String(ACTIVITY.NODE_GAP),

                "elk.padding":
                    "[top=30,left=35,bottom=35,right=35]",

                "elk.layered.considerModelOrder.strategy":
                    "NODES_AND_EDGES",
            };

        /* ====================================================
         * CLASS
         *
         * Class diagrams read most naturally top-down for
         * generalization/inheritance (parent above, children
         * below), the same way UML tools typically render them.
         * Default to DOWN and only go horizontal (RIGHT) when
         * the caller explicitly asks for "LR". This mirrors the
         * Activity/State pattern above but is scoped entirely to
         * this case block, so Activity/State behavior above is
         * untouched.
         *
         * edgeStraightening + considerModelOrder are added here
         * (same options Activity/State already use) so that:
         *   - parent/child classes stay vertically aligned
         *     instead of drifting a few px and creating the
         *     small zig-zags seen with the previous RIGHT default
         *   - ELK keeps classes close to their declared order,
         *     avoiding the long, wrap-around edges that appeared
         *     when nodes got reordered freely.
         * ==================================================== */

        case "class":
            return {
                ...base,

                "elk.direction":
                    direction === "LR"
                        ? "RIGHT"
                        : "DOWN",

                "elk.layered.layering.strategy":
                    "NETWORK_SIMPLEX",

                "elk.layered.nodePlacement.strategy":
                    "BRANDES_KOEPF",

                "elk.layered.nodePlacement.bk.fixedAlignment":
                    "BALANCED",

                "elk.layered.nodePlacement.bk.edgeStraightening":
                    "IMPROVE_STRAIGHTNESS",

                "elk.layered.considerModelOrder.strategy":
                    "NODES_AND_EDGES",

                /*
                 * Realization / generalization fan-out:
                 *
                 *          Comparable
                 *         /   |   |   \
                 *    Animal Animal Animal Animal
                 *
                 * ORTHOGONAL forces every segment to be
                 * perfectly horizontal/vertical, so edges to
                 * the outermost siblings (which aren't directly
                 * below the interface) have nowhere to go but
                 * around the box — producing the long loop seen
                 * with 4+ implementers. POLYLINE allows short
                 * diagonal segments, letting those edges fan out
                 * directly instead of detouring.
                 */
                "elk.layered.edgeRouting":
                    "POLYLINE",

                /*
                 * Bundle edges leaving the same node (e.g. the
                 * interface) into a single trunk near the node,
                 * splitting only close to each target. This is
                 * what keeps multi-implementer fan-outs looking
                 * like a clean "comb" instead of separate wires
                 * each finding their own long path.
                 */
                "elk.layered.mergeEdges":
                    "true",

                /*
                 * Clearance between a node box and any edge it
                 * is not directly connected to. Defaults are too
                 * tight, so an edge passing a neighbouring class
                 * used to slide under / hug the box and get
                 * hidden behind the node. Raising this forces
                 * ELK to route around boxes instead of through
                 * the space right beside them.
                 */
                "elk.layered.spacing.edgeNode":
                    "34",

                "elk.spacing.edgeNode":
                    "34",
                /*
                 * Room for fan-out edges to separate from node
                 * borders before bending, instead of hugging
                 * edges and looping further out to avoid the
                 * overlap.
                 */
                "elk.layered.spacing.edgeNodeBetweenLayers":
                    "55",

                "elk.layered.spacing.nodeNodeBetweenLayers":
                    "95",

                "elk.spacing.nodeNode":
                    "60",

                "elk.padding":
                    "[top=48,left=48,bottom=48,right=48]",
            };

        /* ====================================================
         * COMPONENT
         * ==================================================== */

        case "component":
            return {
                ...base,

                "elk.direction":
                    direction === "TB"
                        ? "DOWN"
                        : "RIGHT",

                "elk.layered.layering.strategy":
                    "NETWORK_SIMPLEX",

                "elk.layered.nodePlacement.strategy":
                    "BRANDES_KOEPF",

                "elk.layered.nodePlacement.bk.fixedAlignment":
                    "BALANCED",

                "elk.layered.spacing.nodeNodeBetweenLayers":
                    "80",

                "elk.spacing.nodeNode":
                    "50",
            };

        default:
            return {
                ...base,

                "elk.direction":
                    direction === "LR"
                        ? "RIGHT"
                        : "DOWN",

                "elk.layered.spacing.nodeNodeBetweenLayers":
                    "70",

                "elk.spacing.nodeNode":
                    "50",
            };
    }
}

/* ============================================================
 * FINALIZE CONTAINERS
 * ============================================================ */

export function finalizeLayout(
    nodes: FlowNode[],
    edges: FlowEdge[] = [],
): FlowNode[] {
    const PADDING = 30;

    const nodeById = createNodeMap(nodes);

    const containers = nodes.filter(
        (node) =>
            node.type === "package" ||
            node.type === "boundary" ||
            node.type === "swimlane",
    );

    /*
     * ELK positions are absolute at this point.
     */
    const absolute = new Map<
        string,
        {
            x: number;
            y: number;
        }
    >();

    for (const node of nodes) {
        absolute.set(node.id, {
            x: node.position.x,
            y: node.position.y,
        });
    }

    const depthOf = (
        id: string,
    ): number => {
        let depth = 0;

        let current =
            nodeById.get(id);

        const visited =
            new Set<string>();

        while (
            current?.parentId &&
            !visited.has(
                current.parentId,
            )
        ) {
            visited.add(
                current.parentId,
            );

            depth++;

            current =
                nodeById.get(
                    current.parentId,
                );
        }

        return depth;
    };

    /*
     * Process deepest containers first.
     */
    [...containers]
        .sort(
            (a, b) =>
                depthOf(b.id) -
                depthOf(a.id),
        )
        .forEach((container) => {
            const children =
                nodes.filter(
                    (node) =>
                        node.parentId ===
                        container.id,
                );

            if (!children.length) {
                return;
            }

            const containerAbs =
                absolute.get(
                    container.id,
                );

            if (!containerAbs) {
                return;
            }

            let minX =
                Number.POSITIVE_INFINITY;

            let minY =
                Number.POSITIVE_INFINITY;

            let maxX =
                Number.NEGATIVE_INFINITY;

            let maxY =
                Number.NEGATIVE_INFINITY;

            for (const child of children) {
                const childAbs =
                    absolute.get(
                        child.id,
                    );

                if (!childAbs) {
                    continue;
                }

                const size =
                    estimateSize(child);

                const relativeX =
                    childAbs.x -
                    containerAbs.x;

                const relativeY =
                    childAbs.y -
                    containerAbs.y;

                minX = Math.min(
                    minX,
                    relativeX,
                );

                minY = Math.min(
                    minY,
                    relativeY,
                );

                maxX = Math.max(
                    maxX,
                    relativeX +
                        size.width,
                );

                maxY = Math.max(
                    maxY,
                    relativeY +
                        size.height,
                );
            }

            if (!Number.isFinite(minX)) {
                return;
            }

            const minimum =
                estimateSize(container);

            const width = Math.max(
                minimum.width,
                container.width ?? 0,
                maxX + PADDING,
            );

            const height = Math.max(
                minimum.height,
                container.height ?? 0,
                maxY + PADDING,
            );

            container.width = width;
            container.height = height;

            container.style = {
                ...(container.style as object),
                width,
                height,
                pointerEvents: "none",
            };

            container.zIndex = -1;
        });

    /*
     * Convert child coordinates from absolute
     * to React Flow relative coordinates ONCE.
     */
    const finalNodes =
        nodes.map((node) => {
            const position =
                absolute.get(
                    node.id,
                );

            if (!position) {
                return node;
            }

            let finalPosition = {
                x: position.x,
                y: position.y,
            };

            if (node.parentId) {
                const parentAbs =
                    absolute.get(
                        node.parentId,
                    );

                if (parentAbs) {
                    finalPosition = {
                        x:
                            position.x -
                            parentAbs.x,

                        y:
                            position.y -
                            parentAbs.y,
                    };
                }
            }

            const size =
                estimateSize(node);

            return {
                ...node,

                position:
                    finalPosition,

                width:
                    node.width ??
                    size.width,

                height:
                    node.height ??
                    size.height,

                zIndex:
                    node.parentId
                        ? 10
                        : node.zIndex ??
                          10,

                style: {
                    ...(node.style as object),

                    width:
                        node.width ??
                        size.width,

                    height:
                        node.height ??
                        size.height,
                },
            };
        });

    /*
     * Edge visual type.
     */
    for (const edge of edges) {
        const source =
            nodeById.get(
                edge.source,
            );

        const target =
            nodeById.get(
                edge.target,
            );

        if (!source || !target) {
            continue;
        }

        const sourceAbs =
            absolute.get(
                source.id,
            );

        const targetAbs =
            absolute.get(
                target.id,
            );

        if (!sourceAbs || !targetAbs) {
            continue;
        }

        const sourceSize =
            estimateSize(source);

        const targetSize =
            estimateSize(target);

        const sx =
            sourceAbs.x +
            sourceSize.width / 2;

        const sy =
            sourceAbs.y +
            sourceSize.height / 2;

        const tx =
            targetAbs.x +
            targetSize.width / 2;

        const ty =
            targetAbs.y +
            targetSize.height / 2;

        const dx =
            Math.abs(tx - sx);

        const dy =
            Math.abs(ty - sy);

        const dashed =
            isDashedEdge(edge);

        /*
         * Notes are always smoothstep.
         */
        if (dashed) {
            edge.type = "smoothstep";
            edge.zIndex = 20;
            continue;
        }

        /*
         * Cross-container relations should
         * stay above containers.
         */
        if (
            source.parentId !==
            target.parentId
        ) {
            edge.type = "smoothstep";
            edge.zIndex = 200;
        } else if (
            dx < 12 ||
            dy < 12
        ) {
            edge.type = "straight";
            edge.zIndex = 5;
        } else {
            edge.type = "smoothstep";
            edge.zIndex = 5;
        }
    }

    return finalNodes;
}

/* ============================================================
 * BUILD ELK HIERARCHY
 * ============================================================ */

function buildElkGraph(
    nodes: FlowNode[],
    validEdges: FlowEdge[],
    parentId?: string,
    depth = 0,
): {
    children: any[];
    edges: any[];
} {
    if (depth > 32) {
        throw new Error(
            "ELK hierarchy is too deep or contains a parentId cycle",
        );
    }

    const children =
        parentId == null
            ? nodes.filter(
                  (node) =>
                      node.parentId ==
                      null,
              )
            : nodes.filter(
                  (node) =>
                      node.parentId ===
                      parentId,
              );

    const elkChildren: any[] = [];

    for (const node of children) {
        const size =
            estimateSize(node);

        const isContainer =
            node.type === "package" ||
            node.type === "boundary" ||
            node.type === "swimlane" ||
            node.type === "cls";

        if (isContainer) {
            const childGraph =
                buildElkGraph(
                    nodes,
                    validEdges,
                    node.id,
                    depth + 1,
                );

            elkChildren.push({
                id: node.id,

                width:
                    size.width,

                height:
                    size.height,

                children:
                    childGraph.children,

                edges:
                    childGraph.edges,

                layoutOptions: {
                    "elk.padding":
                        node.type ===
                        "swimlane"
                            ? "[top=45,left=30,bottom=30,right=30]"
                            : "[top=40,left=40,bottom=40,right=40]",

                    "elk.hierarchyHandling":
                        "INCLUDE_CHILDREN",
                },
            });
        } else {
            elkChildren.push({
                id: node.id,

                width:
                    size.width,

                height:
                    size.height,
            });
        }
    }

    const elkEdges =
        validEdges
            .filter((edge) => {
                const source =
                    nodes.find(
                        (node) =>
                            node.id ===
                            edge.source,
                    );

                const target =
                    nodes.find(
                        (node) =>
                            node.id ===
                            edge.target,
                    );

                if (
                    parentId == null
                ) {
                    return (
                        source?.parentId ==
                            null &&
                        target?.parentId ==
                            null
                    );
                }

                return (
                    source?.parentId ===
                        parentId &&
                    target?.parentId ===
                        parentId
                );
            })
            .map((edge) => {
                const label =
                    typeof edge.label ===
                    "string"
                        ? edge.label
                        : "";

                return {
                    id: edge.id,

                    sources: [
                        edge.source,
                    ],

                    targets: [
                        edge.target,
                    ],

                    ...(label
                        ? {
                              labels: [
                                  {
                                      id: `${edge.id}-label`,
                                      text: label,
                                      width:
                                          Math.max(
                                              20,
                                              label.length *
                                                  8 +
                                                  20,
                                          ),
                                      height: 20,
                                  },
                              ],
                          }
                        : {}),
                };
            });

    return {
        children: elkChildren,
        edges: elkEdges,
    };
}

/* ============================================================
 * ELK LAYOUT
 * ============================================================ */

async function elkLayout(
    nodes: FlowNode[],
    edges: FlowEdge[],
    type?: DiagramType,
    direction?: "TB" | "LR",
): Promise<{
    nodes: FlowNode[];
    edges: FlowEdge[];
}> {
    if (!nodes.length) {
        return {
            nodes,
            edges,
        };
    }

    const nodeIds =
        new Set(
            nodes.map(
                (node) =>
                    node.id,
            ),
        );

    /*
     * Ignore dangling edges.
     */
    const validEdges =
        edges.filter(
            (edge) =>
                nodeIds.has(
                    edge.source,
                ) &&
                nodeIds.has(
                    edge.target,
                ),
        );

    const rootGraph =
        buildElkGraph(
            nodes,
            validEdges,
        );

    /*
     * Cross hierarchy edges.
     */
    const crossEdges =
        validEdges
            .filter((edge) => {
                const source =
                    nodes.find(
                        (node) =>
                            node.id ===
                            edge.source,
                    );

                const target =
                    nodes.find(
                        (node) =>
                            node.id ===
                            edge.target,
                    );

                return (
                    source?.parentId !==
                    target?.parentId
                );
            })
            .map((edge) => {
                const label =
                    typeof edge.label ===
                    "string"
                        ? edge.label
                        : "";

                return {
                    id: edge.id,

                    sources: [
                        edge.source,
                    ],

                    targets: [
                        edge.target,
                    ],

                    labels: label
                        ? [
                              {
                                  id: `${edge.id}-label`,
                                  text: label,
                                  width:
                                      label.length *
                                          8 +
                                      20,
                                  height: 20,
                              },
                          ]
                        : [],
                };
            });

    const graph = {
        id: "root",

        layoutOptions:
            elkOptions(
                type,
                direction,
            ),

        children:
            rootGraph.children,

        edges: [
            ...rootGraph.edges,
            ...crossEdges,
        ],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result =
        await elk.layout(
            graph as any,
        );

    /*
     * Flatten ELK hierarchy into absolute coordinates.
     */
    const positionMap =
        new Map<
            string,
            {
                x: number;
                y: number;
                width?: number;
                height?: number;
            }
        >();

    const flattenResult = (
        parent: any,
        offsetX = 0,
        offsetY = 0,
    ) => {
        for (
            const child of
                parent.children ?? []
        ) {
            const x =
                child.x +
                offsetX;

            const y =
                child.y +
                offsetY;

            positionMap.set(
                child.id,
                {
                    x,
                    y,

                    width:
                        child.width,

                    height:
                        child.height,
                },
            );

            if (
                child.children
            ) {
                flattenResult(
                    child,
                    x,
                    y,
                );
            }
        }
    };

    flattenResult(result);

    /*
     * Apply ELK coordinates.
     */
    let layoutedNodes =
        nodes.map(
            (node) => {
                const position =
                    positionMap.get(
                        node.id,
                    );

                if (!position) {
                    return {
                        ...node,
                    };
                }

                const size =
                    estimateSize(
                        node,
                    );

                const width =
                    position.width ??
                    node.width ??
                    size.width;

                const height =
                    position.height ??
                    node.height ??
                    size.height;

                return {
                    ...node,

                    position: {
                        x: position.x,
                        y: position.y,
                    },

                    width,

                    height,

                    style: {
                        ...(node.style as object),
                        width,
                        height,
                    },
                };
            },
        );

    /*
     * Container finalization.
     */
    layoutedNodes =
        finalizeLayout(
            layoutedNodes,
            edges,
        );

    /*
     * Activity / State post processing.
     *
     * State Machine shares the same terminal / decision /
     * final-merge geometry as Activity, so it gets the same
     * normalization passes.
     */
    if (
        type === "activity" ||
        type === "state"
    ) {
        layoutedNodes =
            normalizeActivityTerminals(
                layoutedNodes,
                edges,
            );

        layoutedNodes =
            normalizeActivityBranches(
                layoutedNodes,
                edges,
            );

        layoutedNodes =
            normalizeActivityFinalMerges(
                layoutedNodes,
                edges,
            );
    }

    /*
     * Class post processing.
     *
     * Generalization / realization edges are straightened so a
     * single parent / child pair sits on the same vertical line,
     * producing clean top-center → bottom-center connectors that
     * never cross sibling class boxes. Sibling fan-outs under an
     * interface are re-centered symmetrically under the parent.
     */
    if (type === "class") {
        layoutedNodes =
            normalizeClassHierarchy(
                layoutedNodes,
                edges,
            );
    }

    /*
     * Edge type.
     */
    const routedEdges =
        edges.map(
            (edge) => {
                if (
                    type ===
                    "state"
                ) {
                    return {
                        ...edge,
                        type:
                            "smoothstep",
                    };
                }

                if (
                    type ===
                    "activity"
                ) {
                    return {
                        ...edge,

                        type:
                            isDashedEdge(
                                edge,
                            )
                                ? "smoothstep"
                                : "smoothstep",
                    };
                }

                return {
                    ...edge,
                };
            },
        );

    const finalEdges =
        assignHandles(
            layoutedNodes,
            routedEdges,
            type,
        );

    /*
     * Re-evaluate straight edges after
     * final node normalization.
     */
    const finalPositionMap =
        buildPositionMap(
            layoutedNodes,
        );

    const smartEdges =
        finalEdges.map(
            (edge) => {
                const source =
                    finalPositionMap.get(
                        edge.source,
                    );

                const target =
                    finalPositionMap.get(
                        edge.target,
                    );

                if (
                    !source ||
                    !target
                ) {
                    return edge;
                }

                if (
                    isDashedEdge(
                        edge,
                    )
                ) {
                    return {
                        ...edge,
                        type:
                            "smoothstep",
                    };
                }

                const dx =
                    Math.abs(
                        target.cx -
                            source.cx,
                    );

                const dy =
                    Math.abs(
                        target.cy -
                            source.cy,
                    );

                if (
                    (type === "activity" ||
                        type === "state") &&
                    dx < 1
                ) {
                    return {
                        ...edge,
                        type:
                            "straight",
                    };
                }

                if (
                    type ===
                        "state" &&
                    dx < 10
                ) {
                    return {
                        ...edge,
                        type:
                            "smoothstep",
                    };
                }

                return edge;
            },
        );

    return {
        nodes: layoutedNodes,
        edges: smartEdges,
    };
}


/* ============================================================
 * ACTIVITY FINAL MERGE NORMALIZATION
 *
 * When exactly 3 activity/state edges enter the same Final node,
 * keep the middle branch perfectly centered on the Final node.
 * This removes the small horizontal jog that can appear after
 * ELK routing because the source node center and Final center
 * differ by a few pixels.
 * ============================================================ */
function normalizeActivityFinalMerges(
    nodes: FlowNode[],
    edges: FlowEdge[],
): FlowNode[] {
    const result = nodes.map((node) => ({
        ...node,
        position: {
            ...node.position,
        },
    }));

    const nodeById = createNodeMap(result);
    const absolute = buildPositionMap(result);

    const finals = result.filter(
        (node) => node.type === "final",
    );

    for (const finalNode of finals) {
        const incoming = edges
            .filter((edge) => edge.target === finalNode.id)
            .map((edge) => {
                const source = absolute.get(edge.source);
                const sourceNode = nodeById.get(edge.source);

                return source && sourceNode
                    ? {
                          edge,
                          source,
                          sourceNode,
                      }
                    : null;
            })
            .filter(
                (item): item is {
                    edge: FlowEdge;
                    source: {
                        x: number;
                        y: number;
                        w: number;
                        h: number;
                        cx: number;
                        cy: number;
                    };
                    sourceNode: FlowNode;
                } => Boolean(item),
            )
            .sort((a, b) => a.source.cx - b.source.cx);

        /*
         * Only an odd count has a true middle branch to
         * align straight under Final's center. Even counts
         * are split symmetrically already by the handle
         * spread above, so nudging one of them off-center
         * would just reintroduce a jog.
         */
        if (
            incoming.length < 3 ||
            incoming.length % 2 === 0
        ) {
            continue;
        }

        const middle =
            incoming[
                Math.floor(
                    incoming.length / 2,
                )
            ];

        const finalAbs = absolute.get(finalNode.id);

        if (!finalAbs) {
            continue;
        }

        const desiredSourceCenterX = finalAbs.cx;
        const desiredSourceX =
            desiredSourceCenterX - middle.source.w / 2;

        const parentAbs = middle.sourceNode.parentId
            ? absolute.get(middle.sourceNode.parentId)
            : undefined;

        const desiredRelativeX =
            desiredSourceX - (parentAbs?.x ?? 0);

        const index = result.findIndex(
            (node) => node.id === middle.sourceNode.id,
        );

        if (index < 0) {
            continue;
        }

        result[index] = {
            ...result[index],
            position: {
                ...result[index].position,
                x: desiredRelativeX,
            },
        };
    }

    return result;
}

/* ============================================================
 * ACTIVITY TERMINAL NORMALIZATION
 *
 * Start / Final should not randomly drift horizontally.
 *
 * If they belong to a swimlane/container:
 *
 *        ┌──────────────────────┐
 *        │          ●           │
 *        │          │           │
 *        │        Action        │
 *        │          │           │
 *        │          ●           │
 *        └──────────────────────┘
 * ============================================================ */

function normalizeActivityTerminals(
    nodes: FlowNode[],
    edges: FlowEdge[],
): FlowNode[] {
    const nodeById =
        createNodeMap(nodes);

    const terminals =
        nodes.filter(
            (node) =>
                node.type ===
                    "start" ||
                node.type ===
                    "final",
        );

    if (!terminals.length) {
        return nodes;
    }

    /*
     * Find a reasonable central X for each terminal.
     *
     * Priority:
     * 1. Container center
     * 2. Average of connected nodes
     */
    const getConnectedCenterX = (
        terminal: FlowNode,
    ): number | undefined => {
        const connected =
            edges
                .filter(
                    (edge) =>
                        edge.source ===
                            terminal.id ||
                        edge.target ===
                            terminal.id,
                )
                .map((edge) => {
                    const id =
                        edge.source ===
                            terminal.id
                            ? edge.target
                            : edge.source;

                    return nodeById.get(
                        id,
                    );
                })
                .filter(
                    (
                        node,
                    ): node is FlowNode =>
                        Boolean(node),
                );

        if (!connected.length) {
            return undefined;
        }

        let total = 0;

        for (
            const node of
                connected
        ) {
            total +=
                node.position.x +
                (
                    node.width ??
                    estimateSize(
                        node,
                    ).width
                ) /
                    2;
        }

        return (
            total /
            connected.length
        );
    };

    return nodes.map(
        (node) => {
            if (
                node.type !==
                    "start" &&
                node.type !==
                    "final"
            ) {
                return node;
            }

            const size =
                estimateSize(
                    node,
                );

            /*
             * If inside a container,
             * center relative to container.
             */
            if (node.parentId) {
                const parent =
                    nodeById.get(
                        node.parentId,
                    );

                if (parent) {
                    const parentSize =
                        estimateSize(
                            parent,
                        );

                    const centeredX =
                        (
                            parentSize.width -
                            size.width
                        ) / 2;

                    /*
                     * Only center if the
                     * terminal is not part
                     * of a horizontal branch.
                     */
                    const connectedX =
                        getConnectedCenterX(
                            node,
                        );

                    if (
                        connectedX ===
                            undefined ||
                        Math.abs(
                            connectedX -
                                (
                                    parent.position.x +
                                    parentSize.width /
                                        2
                                ),
                        ) <
                            parentSize.width *
                                0.35
                    ) {
                        return {
                            ...node,

                            position: {
                                ...node.position,

                                x: centeredX,
                            },
                        };
                    }
                }
            }

            return node;
        },
    );
}

/* ============================================================
 * ACTIVITY BRANCH NORMALIZATION
 *
 * Decision:
 *
 *                  Decision
 *                 /        \
 *              Left       Right
 *
 * Keep branch nodes separated.
 * ============================================================ */

function normalizeActivityBranches(
    nodes: FlowNode[],
    edges: FlowEdge[],
): FlowNode[] {
    const nodeById =
        createNodeMap(nodes);

    const result =
        nodes.map(
            (node) => ({
                ...node,
                position: {
                    ...node.position,
                },
            }),
        );

    const decisions =
        result.filter(
            (node) =>
                node.type ===
                "decision",
        );

    for (
        const decision of
            decisions
    ) {
        const outgoing =
            edges.filter(
                (edge) =>
                    edge.source ===
                    decision.id,
            );

        if (
            outgoing.length !==
            2
        ) {
            continue;
        }

        const targets =
            outgoing
                .map(
                    (edge) =>
                        nodeById.get(
                            edge.target,
                        ),
                )
                .filter(
                    (
                        node,
                    ): node is FlowNode =>
                        Boolean(node),
                );

        if (
            targets.length !==
            2
        ) {
            continue;
        }

        const sorted =
            [...targets].sort(
                (a, b) =>
                    a.position.x -
                    b.position.x,
            );

        const left =
            sorted[0];

        const right =
            sorted[1];

        const decisionCenter =
            decision.position.x +
            (
                decision.width ??
                estimateSize(
                    decision,
                ).width
            ) /
                2;

        const leftSize =
            estimateSize(left);

        const rightSize =
            estimateSize(right);

        /*
         * If ELK already separated them,
         * don't touch.
         */
        const currentGap =
            right.position.x -
            (
                left.position.x +
                leftSize.width
            );

        if (
            currentGap >=
            ACTIVITY.BRANCH_GAP
        ) {
            continue;
        }

        const desiredLeftX =
            decisionCenter -
            ACTIVITY.BRANCH_GAP / 2 -
            leftSize.width;

        const desiredRightX =
            decisionCenter +
            ACTIVITY.BRANCH_GAP / 2;

        /*
         * Only change X.
         * Never modify Y.
         */
        const leftIndex =
            result.findIndex(
                (node) =>
                    node.id ===
                    left.id,
            );

        const rightIndex =
            result.findIndex(
                (node) =>
                    node.id ===
                    right.id,
            );

        if (
            leftIndex >= 0
        ) {
            result[leftIndex] = {
                ...result[leftIndex],

                position: {
                    ...result[
                        leftIndex
                    ].position,

                    x:
                        desiredLeftX,
                },
            };
        }

        if (
            rightIndex >= 0
        ) {
            result[
                rightIndex
            ] = {
                ...result[
                    rightIndex
                ],

                position: {
                    ...result[
                        rightIndex
                    ].position,

                    x:
                        desiredRightX,
                },
            };
        }
    }

    return result;
}

/* ============================================================
 * CLASS GENERALIZATION NORMALIZATION
 *
 * Push a child class directly under its (single) generalization /
 * realization parent so that vertical inheritance edges become
 * clean straight lines instead of detouring diagonally across
 * sibling boxes.
 *
 *         ┌─────────────┐
 *         │   Shape     │
 *         └─────┬───────┘
 *               │  (straight)
 *         ┌─────┴───────┐
 *         │   Circle    │
 *         └─────────────┘
 * ============================================================ */

function normalizeClassHierarchy(
    nodes: FlowNode[],
    edges: FlowEdge[],
): FlowNode[] {
    const nodeById = createNodeMap(nodes);
    const result = nodes.map((node) => ({
        ...node,
        position: { ...node.position },
    }));

    /*
     * Only straighten nodes that have a SINGLE upward edge
     * (one parent). Nodes with multiple parents (multiple
     * inheritance) are left to ELK so the fan keeps its shape.
     */
    const singleParentTargets = new Set<string>();

    for (const edge of edges) {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);

        if (!source || !target) continue;

        if (source.type !== "cls" || target.type !== "cls") continue;

        if (singleParentTargets.has(target.id)) {
            singleParentTargets.delete(target.id);
        } else {
            singleParentTargets.add(target.id);
        }
    }

    for (const id of singleParentTargets) {
        const child = nodeById.get(id);
        if (!child) continue;

        const parentEdge = edges.find((e) => e.target === id);
        if (!parentEdge) continue;

        const parent = nodeById.get(parentEdge.source);
        if (!parent || parent.type !== "cls") continue;

        const childSize = estimateSize(child);
        const parentAbs = getAbsolutePosition(parent, nodeById);
        const parentSize = estimateSize(parent);

        const parentCenterX = parentAbs.x + parentSize.width / 2;
        const childAbs = getAbsolutePosition(child, nodeById);

        /*
         * Only straighten if the parent is truly ABOVE the child
         * (downward flow) and they aren't already perfectly
         * aligned. If the parent is to the left/right, ELK already
         * chose a horizontal relation we should respect.
         */
        const parentAbove = parentAbs.y + parentSize.height < childAbs.y;
        const alreadyAligned = Math.abs(parentCenterX - (childAbs.x + childSize.width / 2)) < 4;

        if (!parentAbove || alreadyAligned) continue;

        const parentContainer = parent.parentId
            ? nodeById.get(parent.parentId)
            : undefined;

        const desiredRelativeX =
            parentCenterX -
            childSize.width / 2 -
            (parentContainer?.position.x ?? 0);

        const index = result.findIndex((n) => n.id === child.id);
        if (index >= 0) {
            result[index] = {
                ...result[index],
                position: {
                    ...result[index].position,
                    x: desiredRelativeX,
                },
            };
        }
    }

    /*
     * Fan-out alignment: when an interface/abstract class has
     * 2+ child pairs at the same depth, nudge siblings so their
     * gap around the parent center is symmetric.
     */
    const parents = new Set(
        edges
            .filter((e) => nodeById.get(e.source)?.type === "cls" && nodeById.get(e.target)?.type === "cls")
            .map((e) => e.source),
    );

    for (const parentId of parents) {
        const childrenIn = edges.filter((e) => e.source === parentId && nodeById.get(e.target)?.type === "cls");

        if (childrenIn.length < 2) continue;

        const children = childrenIn
            .map((e) => nodeById.get(e.target))
            .filter((n): n is FlowNode => Boolean(n));

        if (children.length !== childrenIn.length) continue;

        const sorted = [...children].sort((a, b) => a.position.x - b.position.x);
        const parentNode = nodeById.get(parentId);
        if (!parentNode) continue;
        const parentAbs = getAbsolutePosition(parentNode, nodeById);
        const parentSize = estimateSize(parentNode);

        const totalWidth = children.reduce((sum, child) => sum + estimateSize(child).width, 0);
        const gaps = (children.length - 1) * 55;
        const startX = parentAbs.x + parentSize.width / 2 - (totalWidth + gaps) / 2;

        let cursor = startX;
        for (const child of sorted) {
            const childSize = estimateSize(child);
            const childAbs = getAbsolutePosition(child, nodeById);
            const childContainer = child.parentId
                ? nodeById.get(child.parentId)
                : undefined;
            const relativeX = cursor - (childContainer?.position.x ?? 0);
            const index = result.findIndex((n) => n.id === child.id);
            if (index >= 0 && childAbs.y > parentAbs.y + parentSize.height) {
                result[index] = {
                    ...result[index],
                    position: {
                        ...result[index].position,
                        x: relativeX,
                    },
                };
            }
            cursor += childSize.width + 55;
        }
    }

    return result;
}

/* ============================================================
 * USE CASE LAYOUT
 * ============================================================ */

function ucGroupMetrics(
    count: number,
) {
    const cols =
        count <= 2
            ? 1
            : Math.min(
                  2,
                  Math.ceil(
                      count / 2,
                  ),
              );

    const rows =
        Math.ceil(
            count / cols,
        );

    return {
        cols,
        rows,

        width:
            cols *
                USE_CASE.UC_W +
            (cols - 1) *
                USE_CASE.UC_GAP_X,

        height:
            rows *
                USE_CASE.UC_H +
            (rows - 1) *
                USE_CASE.UC_GAP_Y,
    };
}

/* ============================================================
 * USE CASE ALIGNMENT NORMALIZATION
 *
 * positionUCsByActor stacks use cases in columns to avoid
 * overlap, which can push a UC away from its actor's ideal Y
 * and leave a jagged (non-straight) connector. For TRUE 1:1
 * pairs — one actor with exactly one use case, and that use
 * case connected to exactly one actor — there is no ambiguity
 * about "which side to average toward", so we can safely snap
 * the actor's Y to match the use case's center, producing a
 * clean straight edge. Fan-out/fan-in cases are left untouched
 * since placeActors/positionUCsByActor already centered them.
 * ============================================================ */

function normalizeUseCaseAlignment(
    nodes: FlowNode[],
    edges: FlowEdge[],
): FlowNode[] {
    const result = nodes.map((node) => ({
        ...node,
        position: { ...node.position },
    }));

    const nodeById =
        createNodeMap(result);

    const actors = result.filter(
        (node) => node.type === "actor",
    );

    const useCases = result.filter(
        (node) => node.type === "usecase",
    );

    const actorToUCs =
        new Map<string, string[]>();

    const ucToActors =
        new Map<string, string[]>();

    for (const actor of actors) {
        actorToUCs.set(actor.id, []);
    }

    for (const uc of useCases) {
        ucToActors.set(uc.id, []);
    }

    for (const edge of edges) {
        const source = nodeById.get(
            edge.source,
        );

        const target = nodeById.get(
            edge.target,
        );

        if (!source || !target) {
            continue;
        }

        if (
            source.type === "actor" &&
            target.type === "usecase"
        ) {
            actorToUCs
                .get(source.id)
                ?.push(target.id);

            ucToActors
                .get(target.id)
                ?.push(source.id);
        } else if (
            target.type === "actor" &&
            source.type === "usecase"
        ) {
            actorToUCs
                .get(target.id)
                ?.push(source.id);

            ucToActors
                .get(source.id)
                ?.push(target.id);
        }
    }

    const MIN_ACTOR_GAP =
        USE_CASE.ACTOR_H +
        USE_CASE.ACTOR_MIN_GAP;

    /*
     * Process top-to-bottom so gap checks compare against
     * already finalized neighbors, keeping the result
     * deterministic.
     */
    const sortedActors = [...actors].sort(
        (a, b) => a.position.y - b.position.y,
    );

    for (const actor of sortedActors) {
        const ucIds =
            actorToUCs.get(actor.id) ?? [];

        if (ucIds.length !== 1) {
            continue;
        }

        const uc = nodeById.get(ucIds[0]);

        if (
            !uc ||
            (ucToActors.get(uc.id) ?? [])
                .length !== 1
        ) {
            continue;
        }

        const targetCy =
            uc.position.y + USE_CASE.UC_H / 2;

        const desiredY =
            targetCy - USE_CASE.ACTOR_H / 2;

        const index = result.findIndex(
            (node) => node.id === actor.id,
        );

        if (index < 0) {
            continue;
        }

        const siblings = result.filter(
            (node) =>
                node.type === "actor" &&
                node.id !== actor.id &&
                node.position.x ===
                    actor.position.x,
        );

        const collides = siblings.some(
            (sibling) =>
                Math.abs(
                    sibling.position.y - desiredY,
                ) < MIN_ACTOR_GAP,
        );

        if (!collides) {
            result[index] = {
                ...result[index],
                position: {
                    ...result[index].position,
                    y: desiredY,
                },
            };
        }
    }

    return result;
}


function layoutUseCase(
    nodes: FlowNode[],
    edges: FlowEdge[],
): {
    nodes: FlowNode[];
    edges: FlowEdge[];
} {
    const actors =
        nodes.filter(
            (node) =>
                node.type ===
                "actor",
        );

    const useCases =
        nodes.filter(
            (node) =>
                node.type ===
                "usecase",
        );

    const packages =
        nodes.filter(
            (node) =>
                node.type ===
                    "package" ||
                node.type ===
                    "boundary",
        );

    const others =
        nodes.filter(
            (node) =>
                node.type !==
                    "actor" &&
                node.type !==
                    "usecase" &&
                node.type !==
                    "package" &&
                node.type !==
                    "boundary",
        );

    if (
        !useCases.length &&
        !actors.length
    ) {
        return {
            nodes,
            edges:
                assignHandles(
                    nodes,
                    edges,
                    "usecase",
                ),
        };
    }

    /*
     * Build adjacency.
     */
    const actorToUCs =
        new Map<
            string,
            string[]
        >();

    const ucToActors =
        new Map<
            string,
            string[]
        >();

    for (
        const actor of
            actors
    ) {
        actorToUCs.set(
            actor.id,
            [],
        );
    }

    for (
        const useCase of
            useCases
    ) {
        ucToActors.set(
            useCase.id,
            [],
        );
    }

    for (
        const edge of edges
    ) {
        const sourceActor =
            actors.find(
                (actor) =>
                    actor.id ===
                    edge.source,
            );

        const targetActor =
            actors.find(
                (actor) =>
                    actor.id ===
                    edge.target,
            );

        const sourceUC =
            useCases.find(
                (uc) =>
                    uc.id ===
                    edge.source,
            );

        const targetUC =
            useCases.find(
                (uc) =>
                    uc.id ===
                    edge.target,
            );

        if (
            sourceActor &&
            targetUC
        ) {
            actorToUCs
                .get(
                    sourceActor.id,
                )
                ?.push(
                    targetUC.id,
                );

            ucToActors
                .get(
                    targetUC.id,
                )
                ?.push(
                    sourceActor.id,
                );
        } else if (
            targetActor &&
            sourceUC
        ) {
            actorToUCs
                .get(
                    targetActor.id,
                )
                ?.push(
                    sourceUC.id,
                );

            ucToActors
                .get(
                    sourceUC.id,
                )
                ?.push(
                    targetActor.id,
                );
        }
    }

    /*
     * Primary actor.
     */
    const ucPrimaryActor =
        new Map<
            string,
            string
        >();

    for (
        const uc of
            useCases
    ) {
        const connected =
            ucToActors.get(
                uc.id,
            ) ?? [];

        if (
            !connected.length
        ) {
            continue;
        }

        let best =
            connected[0];

        let bestCount =
            Infinity;

        for (
            const actorId of
                connected
        ) {
            const count =
                (
                    actorToUCs.get(
                        actorId,
                    ) ?? []
                ).length;

            if (
                count <
                bestCount
            ) {
                bestCount =
                    count;

                best =
                    actorId;
            }
        }

        ucPrimaryActor.set(
            uc.id,
            best,
        );
    }

    const sortedActors =
        [...actors].sort(
            (a, b) =>
                a.position.y -
                b.position.y,
        );

    const boundary =
        packages[0];

    const boundaryCenterX =
        boundary
            ? boundary.position.x +
              estimateSize(
                  boundary,
              ).width /
                  2
            : 0;

    const leftActorIds =
        new Set<string>();

    const rightActorIds =
        new Set<string>();

    /*
     * Preserve existing side intent.
     */
    for (
        const actor of
            sortedActors
    ) {
        if (
            !boundary ||
            actor.position.x <=
                boundaryCenterX
        ) {
            leftActorIds.add(
                actor.id,
            );
        } else {
            rightActorIds.add(
                actor.id,
            );
        }
    }

    /*
     * Balance actors.
     */
    while (
        Math.abs(
            leftActorIds.size -
                rightActorIds.size,
        ) > 1
    ) {
        const takeFromLeft =
            leftActorIds.size >
            rightActorIds.size;

        const pool =
            sortedActors.filter(
                (actor) =>
                    takeFromLeft
                        ? leftActorIds.has(
                              actor.id,
                          )
                        : rightActorIds.has(
                              actor.id,
                          ),
            );

        if (!pool.length) {
            break;
        }

        pool.sort(
            (a, b) =>
                Math.abs(
                    a.position.x -
                        boundaryCenterX,
                ) -
                Math.abs(
                    b.position.x -
                        boundaryCenterX,
                ),
        );

        const moved =
            pool[0];

        if (
            takeFromLeft
        ) {
            leftActorIds.delete(
                moved.id,
            );

            rightActorIds.add(
                moved.id,
            );
        } else {
            rightActorIds.delete(
                moved.id,
            );

            leftActorIds.add(
                moved.id,
            );
        }
    }

    /*
     * Group use cases.
     */
    const leftUCs: string[] =
        [];

    const rightUCs: string[] =
        [];

    const centerUCs: string[] =
        [];

    for (
        const uc of
            useCases
    ) {
        const primary =
            ucPrimaryActor.get(
                uc.id,
            );

        const connected =
            ucToActors.get(
                uc.id,
            ) ?? [];

        const hasLeft =
            connected.some(
                (id) =>
                    leftActorIds.has(
                        id,
                    ),
            );

        const hasRight =
            connected.some(
                (id) =>
                    rightActorIds.has(
                        id,
                    ),
            );

        if (
            hasLeft &&
            hasRight
        ) {
            centerUCs.push(
                uc.id,
            );
        } else if (
            primary &&
            leftActorIds.has(
                primary,
            )
        ) {
            leftUCs.push(
                uc.id,
            );
        } else if (
            primary &&
            rightActorIds.has(
                primary,
            )
        ) {
            rightUCs.push(
                uc.id,
            );
        } else {
            centerUCs.push(
                uc.id,
            );
        }
    }

    /*
     * Geometry.
     */
    const leftMetrics =
        ucGroupMetrics(
            leftUCs.length,
        );

    const centerMetrics =
        ucGroupMetrics(
            centerUCs.length,
        );

    const rightMetrics =
        ucGroupMetrics(
            rightUCs.length,
        );

    const ucMaxH =
        Math.max(
            leftMetrics.height,
            centerMetrics.height,
            rightMetrics.height,
            120,
        );

    let boundaryH =
        ucMaxH +
        USE_CASE.BOUNDARY_PAD *
            2;

    let cursorX = 0;

    const leftActorX =
        cursorX;

    cursorX +=
        USE_CASE.ACTOR_W +
        USE_CASE.ACTOR_UC_GAP;

    const leftUCStartX =
        cursorX;

    cursorX +=
        leftMetrics.width +
        (
            leftMetrics.width
                ? USE_CASE.GROUP_GAP
                : 0
        );

    const centerUCStartX =
        cursorX;

    cursorX +=
        centerMetrics.width +
        (
            centerMetrics.width
                ? USE_CASE.GROUP_GAP
                : 0
        );

    const rightUCStartX =
        cursorX;

    cursorX +=
        rightMetrics.width +
        (
            rightMetrics.width
                ? USE_CASE.ACTOR_UC_GAP
                : 0
        );

    const rightActorX =
        cursorX;

    /*
     * Actor placement.
     */
    const placeActors = (
        list: FlowNode[],
        x: number,
    ): FlowNode[] => {
        const count =
            list.length;

        if (!count) {
            return [];
        }

        const blockHeight =
            count *
                USE_CASE.ACTOR_H +
            (count - 1) *
                USE_CASE.ACTOR_MIN_GAP;

        boundaryH =
            Math.max(
                boundaryH,
                blockHeight +
                    USE_CASE.BOUNDARY_PAD *
                        2,
            );

        const centerY =
            boundaryH / 2;

        const startY =
            centerY -
            blockHeight / 2;

        return list.map(
            (actor, index) => ({
                ...actor,

                position: {
                    x,

                    y:
                        startY +
                        index *
                            (
                                USE_CASE.ACTOR_H +
                                USE_CASE.ACTOR_MIN_GAP
                            ),
                },

                width:
                    USE_CASE.ACTOR_W,

                height:
                    USE_CASE.ACTOR_H,

                style: {
                    ...(actor.style as object),

                    width:
                        USE_CASE.ACTOR_W,

                    height:
                        USE_CASE.ACTOR_H,
                },

                zIndex: 5,
            }),
        );
    };

    const leftActors =
        placeActors(
            sortedActors.filter(
                (actor) =>
                    leftActorIds.has(
                        actor.id,
                    ),
            ),
            leftActorX,
        );

    const rightActors =
        placeActors(
            sortedActors.filter(
                (actor) =>
                    rightActorIds.has(
                        actor.id,
                    ),
            ),
            rightActorX,
        );

    const actorCenterY =
        new Map<
            string,
            number
        >();

    for (
        const actor of [
            ...leftActors,
            ...rightActors,
        ]
    ) {
        actorCenterY.set(
            actor.id,
            actor.position.y +
                USE_CASE.ACTOR_H /
                    2,
        );
    }

    /*
     * Position UCs.
     */
    const positionUCsByActor = (
        ucIds: string[],
        startX: number,
        sideActors: Set<string>,
    ): FlowNode[] => {
        if (!ucIds.length) {
            return [];
        }

        const {
            cols,
        } =
            ucGroupMetrics(
                ucIds.length,
            );

        const items =
            ucIds.map(
                (ucId) => {
                    const connected =
                        (
                            ucToActors.get(
                                ucId,
                            ) ?? []
                        ).filter(
                            (id) =>
                                sideActors.has(
                                    id,
                                ),
                        );

                    let idealY =
                        boundaryH /
                            2 -
                        USE_CASE.UC_H /
                            2;

                    if (
                        connected.length
                    ) {
                        const ys =
                            connected
                                .map(
                                    (
                                        id,
                                    ) =>
                                        actorCenterY.get(
                                            id,
                                        ),
                                )
                                .filter(
                                    (
                                        y,
                                    ): y is number =>
                                        y !==
                                        undefined,
                                );

                        if (
                            ys.length
                        ) {
                            idealY =
                                ys.reduce(
                                    (
                                        sum,
                                        y,
                                    ) =>
                                        sum +
                                        y,
                                    0,
                                ) /
                                    ys.length -
                                USE_CASE.UC_H /
                                    2;
                        }
                    }

                    return {
                        ucId,
                        idealY,
                    };
                },
            );

        const sourceKey = (
            ucId: string,
        ) => {
            const connected =
                (
                    ucToActors.get(
                        ucId,
                    ) ?? []
                ).filter(
                    (id) =>
                        sideActors.has(
                            id,
                        ),
                );

            return connected.length ===
                1
                ? connected[0]
                : "__multi__";
        };

        const sorted =
            [...items].sort(
                (a, b) =>
                    a.idealY -
                    b.idealY,
            );

        const usedBySource =
            new Map<
                string,
                number
            >();

        const colNext =
            new Array<number>(
                cols,
            ).fill(
                Number.NEGATIVE_INFINITY,
            );

        const slotHeight =
            USE_CASE.UC_H +
            USE_CASE.UC_GAP_Y;

        const placed: {
            ucId: string;
            col: number;
            y: number;
        }[] = [];

        for (
            const item of
                sorted
        ) {
            const source =
                sourceKey(
                    item.ucId,
                );

            /*
             * Choose the least occupied
             * column instead of simply
             * using i % cols.
             */
            let bestColumn = 0;

            for (
                let col = 1;
                col < cols;
                col++
            ) {
                if (
                    colNext[col] <
                    colNext[
                        bestColumn
                    ]
                ) {
                    bestColumn =
                        col;
                }
            }

            const sourceFloor =
                usedBySource.get(
                    source,
                ) ??
                Number.NEGATIVE_INFINITY;

            let y = Math.max(
                item.idealY,
                sourceFloor +
                    slotHeight,
                colNext[
                    bestColumn
                ] +
                    slotHeight,
            );

            if (
                !usedBySource.has(
                    source,
                )
            ) {
                y = Math.max(
                    item.idealY,
                    colNext[
                        bestColumn
                    ] +
                        slotHeight,
                );
            }

            usedBySource.set(
                source,
                y,
            );

            colNext[
                bestColumn
            ] = y;

            placed.push({
                ucId:
                    item.ucId,

                col:
                    bestColumn,

                y,
            });
        }

        const results: FlowNode[] =
            [];

        for (
            const item of
                placed
        ) {
            const node =
                useCases.find(
                    (uc) =>
                        uc.id ===
                        item.ucId,
                );

            if (!node) {
                continue;
            }

            results.push({
                ...node,

                position: {
                    x:
                        startX +
                        item.col *
                            (
                                USE_CASE.UC_W +
                                USE_CASE.UC_GAP_X
                            ),

                    y:
                        item.y,
                },

                width:
                    USE_CASE.UC_W,

                height:
                    USE_CASE.UC_H,

                style: {
                    ...(node.style as object),

                    width:
                        USE_CASE.UC_W,

                    height:
                        USE_CASE.UC_H,
                },

                zIndex: 5,
            });
        }

        return results;
    };

    const leftUCNodes =
        positionUCsByActor(
            leftUCs,
            leftUCStartX,
            leftActorIds,
        );

    const rightUCNodes =
        positionUCsByActor(
            rightUCs,
            rightUCStartX,
            rightActorIds,
        );

    /*
     * Center UCs.
     */
    const centerUCNodes =
        centerUCs.map(
            (ucId, index) => {
                const col =
                    index % 2;

                const row =
                    Math.floor(
                        index / 2,
                    );

                const node =
                    useCases.find(
                        (uc) =>
                            uc.id ===
                            ucId,
                    )!;

                const metrics =
                    centerMetrics;

                const startY =
                    boundaryH /
                        2 -
                    metrics.height /
                        2;

                return {
                    ...node,

                    position: {
                        x:
                            centerUCStartX +
                            col *
                                (
                                    USE_CASE.UC_W +
                                    USE_CASE.UC_GAP_X
                                ),

                        y:
                            startY +
                            row *
                                (
                                    USE_CASE.UC_H +
                                    USE_CASE.UC_GAP_Y
                                ),
                    },

                    width:
                        USE_CASE.UC_W,

                    height:
                        USE_CASE.UC_H,

                    style: {
                        ...(node.style as object),

                        width:
                            USE_CASE.UC_W,

                        height:
                            USE_CASE.UC_H,
                    },

                    zIndex: 5,
                };
            },
        );

    /*
     * Attach UCs to boundary.
     */
    const allUCNodes = [
        ...leftUCNodes,
        ...centerUCNodes,
        ...rightUCNodes,
    ].map(
        (useCase) =>
            boundary
                ? {
                      ...useCase,

                      parentId:
                          boundary.id,

                      extent:
                          "parent" as const,
                  }
                : useCase,
    );

    /*
     * Calculate boundary bounds.
     */
    let ucMinX =
        Number.POSITIVE_INFINITY;

    let ucMaxX =
        Number.NEGATIVE_INFINITY;

    let ucMinY =
        Number.POSITIVE_INFINITY;

    let ucMaxY =
        Number.NEGATIVE_INFINITY;

    for (
        const uc of
            allUCNodes
    ) {
        ucMinX =
            Math.min(
                ucMinX,
                uc.position.x,
            );

        ucMaxX =
            Math.max(
                ucMaxX,
                uc.position.x +
                    USE_CASE.UC_W,
            );

        ucMinY =
            Math.min(
                ucMinY,
                uc.position.y,
            );

        ucMaxY =
            Math.max(
                ucMaxY,
                uc.position.y +
                    USE_CASE.UC_H,
            );
    }

    const boundaryX =
        (
            Number.isFinite(
                ucMinX,
            )
                ? ucMinX
                : 0
        ) -
        USE_CASE.BOUNDARY_PAD;

    const boundaryY =
        (
            Number.isFinite(
                ucMinY,
            )
                ? ucMinY
                : 0
        ) -
        USE_CASE.BOUNDARY_PAD;

    const boundaryHeight =
        (
            Number.isFinite(
                ucMaxY,
            )
                ? ucMaxY -
                  ucMinY
                : 200
        ) +
        USE_CASE.BOUNDARY_PAD *
            2;

    /*
     * Other nodes.
     */
    const positionedOthers =
        others.map(
            (node, index) => {
                const size =
                    estimateSize(
                        node,
                    );

                return {
                    ...node,

                    position: {
                        x:
                            boundaryX +
                            20 +
                            index *
                                180,

                        y:
                            boundaryY +
                            boundaryHeight +
                            USE_CASE.BOUNDARY_PAD,
                    },

                    width:
                        size.width,

                    height:
                        size.height,

                    zIndex: 5,
                };
            },
        );

    /*
     * Parent MUST appear before children.
     */
    const allNodes = [
        ...packages.map(
            (node) => ({
                ...node,

                position: {
                    x:
                        boundaryX,

                    y:
                        boundaryY,
                },

                width:
                    node.width ??
                    Math.max(
                        node.width ??
                            0,
                        cursorX -
                            boundaryX,
                    ),

                height:
                    boundaryHeight,
            }),
        ),

        ...leftActors,

        ...rightActors,

        ...allUCNodes,

        ...positionedOthers,
    ];

    const finalizedNodes =
        finalizeLayout(
            allNodes,
            edges,
        );

    /*
     * Snap TRUE 1:1 actor <-> use-case pairs onto a straight
     * horizontal connector, without disturbing fan-out / fan-in
     * groups (already centered) or re-introducing overlaps.
     */
    const alignedNodes =
        normalizeUseCaseAlignment(
            finalizedNodes,
            edges,
        );

    /*
     * Reposition actors after boundary finalization.
     */
    const finalBoundary =
        alignedNodes.find(
            (node) =>
                node.type ===
                    "boundary" ||
                node.type ===
                    "package",
        );

    const finalNodes =
        finalBoundary
            ? alignedNodes.map(
                  (node) => {
                      if (
                          node.type !==
                              "actor" ||
                          node.parentId
                      ) {
                          return node;
                      }

                      const width =
                          finalBoundary.width ??
                          estimateSize(
                              finalBoundary,
                          ).width;

                      const gap =
                          USE_CASE.ACTOR_UC_GAP;

                      if (
                          leftActorIds.has(
                              node.id,
                          )
                      ) {
                          return {
                              ...node,

                              position: {
                                  ...node.position,

                                  x:
                                      finalBoundary.position.x -
                                      USE_CASE.ACTOR_W -
                                      gap,
                              },
                          };
                      }

                      if (
                          rightActorIds.has(
                              node.id,
                          )
                      ) {
                          return {
                              ...node,

                              position: {
                                  ...node.position,

                                  x:
                                      finalBoundary.position.x +
                                      width +
                                      gap,
                              },
                          };
                      }

                      return node;
                  },
              )
            : alignedNodes;

    /*
     * Use-case edges.
     *
     * Actor <-> Use case connectors must always be straight lines
     * (diagonal included) — that is the standard UML look. The
     * old |source.cy - target.cy| < 12 check almost never passed
     * because placeActors pins actors to a fixed column while
     * positionUCsByActor stacks use cases into rows/columns, so
     * nearly every edge fell through to smoothstep and rendered
     * as an ugly right-angle staircase. A straight diagonal is
     * always correct here.
     *
     * Dashed edges (include / extend, notes/dependencies) keep
     * smoothstep routing.
     */
    const layoutedEdges =
        assignHandles(
            finalNodes,
            edges,
            "usecase",
        ).map(
            (edge) => {
                return {
                    ...edge,

                    type: isDashedEdge(
                        edge,
                    )
                        ? "smoothstep"
                        : "straight",

                    zIndex: 10,
                };
            },
        );

    return {
        nodes: finalNodes,
        edges: layoutedEdges,
    };
}

/* ============================================================
 * ACTIVITY + SWIMLANE FALLBACK
 *
 * Used only if ELK fails.
 * ============================================================ */

export function layoutActivityWithSwimlanes(
    inputNodes: FlowNode[],
    edges: FlowEdge[],
): {
    nodes: FlowNode[];
    edges: FlowEdge[];
} | null {
    const lanes =
        inputNodes.filter(
            (node) =>
                node.type ===
                "swimlane",
        );

    if (!lanes.length) {
        return null;
    }

    const nodes =
        inputNodes.map(
            (node) => ({
                ...node,

                position: {
                    ...node.position,
                },

                style: node.style
                    ? {
                          ...(node.style as object),
                      }
                    : node.style,
            }),
        );

    const activities =
        nodes.filter(
            (node) =>
                node.type !==
                "swimlane",
        );

    const sortedLanes =
        [...lanes].sort(
            (a, b) => {
                const aIndex =
                    (
                        a.data as FlowNodeData
                    )?.laneIndex ??
                    0;

                const bIndex =
                    (
                        b.data as FlowNodeData
                    )?.laneIndex ??
                    0;

                return (
                    aIndex -
                    bIndex
                );
            },
        );

    /*
     * Build adjacency.
     */
    const outgoing =
        new Map<
            string,
            string[]
        >();

    const incoming =
        new Map<
            string,
            string[]
        >();

    for (
        const node of
            activities
    ) {
        outgoing.set(
            node.id,
            [],
        );

        incoming.set(
            node.id,
            [],
        );
    }

    const activityIds =
        new Set(
            activities.map(
                (node) =>
                    node.id,
            ),
        );

    for (
        const edge of edges
    ) {
        if (
            !activityIds.has(
                edge.source,
            ) ||
            !activityIds.has(
                edge.target,
            )
        ) {
            continue;
        }

        outgoing
            .get(
                edge.source,
            )
            ?.push(
                edge.target,
            );

        incoming
            .get(
                edge.target,
            )
            ?.push(
                edge.source,
            );
    }

    /*
     * Kahn rank.
     */
    const ranks =
        new Map<
            string,
            number
        >();

    const inDegree =
        new Map<
            string,
            number
        >();

    const queue: string[] =
        [];

    for (
        const node of
            activities
    ) {
        const degree =
            incoming.get(
                node.id,
            )?.length ?? 0;

        inDegree.set(
            node.id,
            degree,
        );

        ranks.set(
            node.id,
            0,
        );

        if (degree === 0) {
            queue.push(
                node.id,
            );
        }
    }

    while (
        queue.length
    ) {
        const current =
            queue.shift()!;

        const currentRank =
            ranks.get(
                current,
            ) ?? 0;

        for (
            const next of
                outgoing.get(
                    current,
                ) ?? []
        ) {
            ranks.set(
                next,
                Math.max(
                    ranks.get(
                        next,
                    ) ?? 0,
                    currentRank +
                        1,
                ),
            );

            const degree =
                (
                    inDegree.get(
                        next,
                    ) ?? 0
                ) - 1;

            inDegree.set(
                next,
                degree,
            );

            if (
                degree ===
                0
            ) {
                queue.push(
                    next,
                );
            }
        }
    }

    /*
     * Rank Y.
     */
    const uniqueRanks =
        [
            ...new Set(
                ranks.values(),
            ),
        ].sort(
            (a, b) =>
                a - b,
        );

    const rankY =
        new Map<
            number,
            number
        >();

    const rankHeight =
        new Map<
            number,
            number
        >();

    let currentY =
        ACTIVITY.LANE_HEADER_H +
        ACTIVITY.LANE_PADDING_TOP;

    for (
        const rank of
            uniqueRanks
    ) {
        rankY.set(
            rank,
            currentY,
        );

        const nodesAtRank =
            activities.filter(
                (node) =>
                    (
                        ranks.get(
                            node.id,
                        ) ?? 0
                    ) === rank,
            );

        let maxHeight =
            40;

        for (
            const node of
                nodesAtRank
        ) {
            maxHeight =
                Math.max(
                    maxHeight,
                    estimateSize(
                        node,
                    ).height,
                );
        }

        rankHeight.set(
            rank,
            maxHeight,
        );

        currentY +=
            maxHeight +
            ACTIVITY.NODE_GAP;
    }

    /*
     * Lane widths.
     */
    const laneInfo =
        new Map<
            string,
            {
                x: number;
                width: number;
                height: number;
            }
        >();

    for (
        const lane of
            sortedLanes
    ) {
        const kids =
            activities.filter(
                (node) =>
                    node.parentId ===
                    lane.id,
            );

        let maxContentWidth =
            220;

        const rankGroups =
            new Map<
                number,
                FlowNode[]
            >();

        for (
            const child of
                kids
        ) {
            const rank =
                ranks.get(
                    child.id,
                ) ?? 0;

            const list =
                rankGroups.get(
                    rank,
                ) ?? [];

            list.push(
                child,
            );

            rankGroups.set(
                rank,
                list,
            );
        }

        rankGroups.forEach(
            (group) => {
                let width = 0;

                group.forEach(
                    (
                        node,
                        index,
                    ) => {
                        width +=
                            estimateSize(
                                node,
                            ).width;

                        if (
                            index >
                            0
                        ) {
                            width +=
                                ACTIVITY.BRANCH_GAP;
                        }
                    },
                );

                maxContentWidth =
                    Math.max(
                        maxContentWidth,
                        width,
                    );
            },
        );

        let maxY =
            ACTIVITY.LANE_HEADER_H +
            ACTIVITY.LANE_PADDING_TOP;

        for (
            const child of
                kids
        ) {
            const rank =
                ranks.get(
                    child.id,
                ) ?? 0;

            const y =
                rankY.get(
                    rank,
                ) ?? 0;

            const size =
                estimateSize(
                    child,
                );

            maxY =
                Math.max(
                    maxY,
                    y +
                        size.height,
                );
        }

        laneInfo.set(
            lane.id,
            {
                x: 0,

                width:
                    maxContentWidth +
                    ACTIVITY.LANE_PADDING_X *
                        2,

                height:
                    maxY +
                    ACTIVITY.LANE_PADDING_BOTTOM,
            },
        );
    }

    /*
     * Touching lanes.
     */
    let cursorX = 0;

    for (
        const lane of
            sortedLanes
    ) {
        const info =
            laneInfo.get(
                lane.id,
            )!;

        info.x =
            cursorX;

        cursorX +=
            info.width;
    }

    const maxHeight =
        Math.max(
            ACTIVITY.MIN_LANE_HEIGHT,
            ...[
                ...laneInfo.values(),
            ].map(
                (info) =>
                    info.height,
            ),
        );

    /*
     * Position children.
     */
    for (
        const lane of
            sortedLanes
    ) {
        const info =
            laneInfo.get(
                lane.id,
            )!;

        const groups =
            new Map<
                number,
                FlowNode[]
            >();

        for (
            const child of
                activities.filter(
                    (node) =>
                        node.parentId ===
                        lane.id,
                )
        ) {
            const rank =
                ranks.get(
                    child.id,
                ) ?? 0;

            const group =
                groups.get(
                    rank,
                ) ?? [];

            group.push(
                child,
            );

            groups.set(
                rank,
                group,
            );
        }

        groups.forEach(
            (
                group,
                rank,
            ) => {
                let totalWidth =
                    0;

                group.forEach(
                    (
                        node,
                        index,
                    ) => {
                        totalWidth +=
                            estimateSize(
                                node,
                            ).width;

                        if (
                            index >
                            0
                        ) {
                            totalWidth +=
                                ACTIVITY.BRANCH_GAP;
                        }
                    },
                );

                const contentWidth =
                    info.width -
                    ACTIVITY.LANE_PADDING_X *
                        2;

                let x =
                    info.x +
                    ACTIVITY.LANE_PADDING_X +
                    (
                        contentWidth -
                        totalWidth
                    ) /
                        2;

                for (
                    const node of
                        group
                ) {
                    const size =
                        estimateSize(
                            node,
                        );

                    node.position = {
                        x:
                            x -
                            info.x,

                        y:
                            rankY.get(
                                rank,
                            )!,
                    };

                    node.width =
                        size.width;

                    node.height =
                        size.height;

                    node.style = {
                        ...(node.style as object),

                        width:
                            size.width,

                        height:
                            size.height,
                    };

                    x +=
                        size.width +
                        ACTIVITY.BRANCH_GAP;
                }
            },
        );
    }

    /*
     * Lane sizes.
     */
    for (
        const lane of
            sortedLanes
    ) {
        const info =
            laneInfo.get(
                lane.id,
            )!;

        lane.position = {
            x: info.x,
            y: 0,
        };

        lane.width =
            info.width;

        lane.height =
            maxHeight;

        lane.style = {
            ...(lane.style as object),

            width:
                info.width,

            height:
                maxHeight,

            pointerEvents:
                "none",
        };

        lane.zIndex = -1;
    }

    /*
     * Smart edges.
     */
    const layoutedEdges =
        assignHandles(
            nodes,
            edges.map(
                (edge) => ({
                    ...edge,

                    type:
                        "smoothstep",
                }),
            ),
            "activity",
        );

    return {
        nodes,
        edges:
            layoutedEdges,
    };
}

/* ============================================================
 * PUBLIC API
 * ============================================================ */

export async function layoutElements(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options: {
        diagramType?: DiagramType;
        direction?: "TB" | "LR";
    } = {},
): Promise<{
    nodes: FlowNode[];
    edges: FlowEdge[];
}> {
    if (!nodes.length) {
        return {
            nodes,
            edges,
        };
    }

    /*
     * ========================================================
     * USE CASE
     * ========================================================
     */

    const hasActors =
        nodes.some(
            (node) =>
                node.type ===
                "actor",
        );

    const hasUseCases =
        nodes.some(
            (node) =>
                node.type ===
                "usecase",
        );

    if (
        options.diagramType ===
            "usecase" ||
        (
            hasActors &&
            hasUseCases
        )
    ) {
        return layoutUseCase(
            nodes,
            edges,
        );
    }

    /*
     * ========================================================
     * ACTIVITY + SWIMLANE
     * ========================================================
     */

    const hasSwimlanes =
        nodes.some(
            (node) =>
                node.type ===
                "swimlane",
        );

    if (
        hasSwimlanes
    ) {
        try {
            return await elkLayout(
                nodes,
                edges,
                options.diagramType,
                options.direction,
            );
        } catch (
            error
        ) {
            console.warn(
                "ELK Activity/Swimlane layout failed. Using fallback layout.",
                error,
            );

            const fallback =
                layoutActivityWithSwimlanes(
                    nodes,
                    edges,
                );

            if (
                fallback
            ) {
                return fallback;
            }

            throw error;
        }
    }

    /*
     * ========================================================
     * NORMAL ELK
     * ========================================================
     */

    return elkLayout(
        nodes,
        edges,
        options.diagramType,
        options.direction,
    );
}