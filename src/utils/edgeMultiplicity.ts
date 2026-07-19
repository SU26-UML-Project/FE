import type { FlowEdgeData } from "../types";

export interface ResolvedEdgeMultiplicity {
    /** Association name shown at the middle of the connector. */
    name: string;
    /** Multiplicity at the source (start) end, e.g. "1", "0..*". */
    source: string;
    /** Multiplicity at the target end. */
    target: string;
}

// A multiplicity token looks like: 1, *, 0..1, 0..*, 1..*, 2..5, n, m, 0..n …
const MULTI_TOKEN = /^(\*|[0-9]+(\.\.\*|\.\.[0-9]+)?|[0-9]*\.\.[0-9*nm]+|[nm])$/;

/**
 * Strip a legacy "left right : name" label back into multiplicities + name.
 * Only triggers when both tokens before the first ":" look like multiplicities,
 * so labels such as "yes: confirm" on non-class diagrams are left untouched.
 */
function stripLegacy(label: string): { name: string; source: string; target: string } | null {
    const raw = label.trim();
    const idx = raw.indexOf(":");
    if (idx < 0) return null;
    const multis = raw.slice(0, idx).trim().split(/\s+/);
    if (multis.length !== 2) return null;
    if (!MULTI_TOKEN.test(multis[0]) || !MULTI_TOKEN.test(multis[1])) return null;
    return { name: raw.slice(idx + 1).trim(), source: multis[0], target: multis[1] };
}

/**
 * Resolve the association name + two-end multiplicities of an edge.
 *
 * The name always has any legacy "left right :" multiplicity prefix stripped,
 * so the middle label can never re-show the old combined string. Multiplicities
 * come from the dedicated `multiplicitySource` / `multiplicityTarget` fields
 * when present, otherwise from the legacy label (backwards compatible).
 */
export function resolveEdgeMultiplicity(
    data: Pick<FlowEdgeData, "multiplicitySource" | "multiplicityTarget"> | undefined,
    label: unknown
): ResolvedEdgeMultiplicity {
    const labelStr = typeof label === "string" ? label : label == null ? "" : String(label);
    const legacy = stripLegacy(labelStr);
    const name = legacy ? legacy.name : labelStr.trim();
    const source = (data?.multiplicitySource ?? "").toString().trim() || (legacy?.source ?? "");
    const target = (data?.multiplicityTarget ?? "").toString().trim() || (legacy?.target ?? "");
    return { name, source, target };
}
