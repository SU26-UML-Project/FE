// SVG marker definitions shared by all diagram edges.
// Rendered once at the app root so edges can reference them by id.
const INK = "#18181b";

export function MarkerDefs() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        {/* Filled arrow — control flow / sync call / transition */}
        <marker
          id="m-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0 0 L10 5 L0 10 Z" fill={INK} />
        </marker>

        {/* Open arrow — association / async */}
        <marker
          id="m-arrow-open"
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="9"
          markerHeight="9"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M1 1 L11 6 L1 11"
            fill="none"
            stroke={INK}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>

        {/* Open triangle — inheritance / generalization */}
        <marker
          id="m-triangle"
          viewBox="0 0 12 12"
          refX="11"
          refY="6"
          markerWidth="11"
          markerHeight="11"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M1 1 L11 6 L1 11 Z"
            fill="#ffffff"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </marker>

        {/* Filled diamond — composition */}
        <marker
          id="m-diamond-filled"
          viewBox="0 0 16 10"
          refX="15"
          refY="5"
          markerWidth="13"
          markerHeight="9"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M0 5 L8 0 L16 5 L8 10 Z"
            fill={INK}
            stroke={INK}
            strokeWidth="1"
          />
        </marker>

        {/* Open diamond — aggregation */}
        <marker
          id="m-diamond-open"
          viewBox="0 0 16 10"
          refX="15"
          refY="5"
          markerWidth="13"
          markerHeight="9"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M0 5 L8 0 L16 5 L8 10 Z"
            fill="#ffffff"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </marker>

        {/* Filled diamond at SOURCE (composition — whole end) */}
        <marker
          id="m-diamond-filled-start"
          viewBox="0 0 16 10"
          refX="1"
          refY="5"
          markerWidth="13"
          markerHeight="9"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M0 5 L8 0 L16 5 L8 10 Z"
            fill={INK}
            stroke={INK}
            strokeWidth="1"
          />
        </marker>

        {/* Open diamond at SOURCE (aggregation — whole end) */}
        <marker
          id="m-diamond-open-start"
          viewBox="0 0 16 10"
          refX="1"
          refY="5"
          markerWidth="13"
          markerHeight="9"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M0 5 L8 0 L16 5 L8 10 Z"
            fill="#ffffff"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </marker>
        {/* Open triangle at SOURCE (inheritance / generalization — parent end) */}
        <marker
          id="m-triangle-start"
          viewBox="0 0 12 12"
          refX="1"
          refY="6"
          markerWidth="11"
          markerHeight="11"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 L1 6 L11 11 Z"
            fill="#ffffff"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </marker>

        {/* Open arrow at SOURCE (association / async) */}
        <marker
          id="m-arrow-open-start"
          viewBox="0 0 12 12"
          refX="1"
          refY="6"
          markerWidth="9"
          markerHeight="9"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 L1 6 L11 11"
            fill="none"
            stroke={INK}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>

        {/* Filled arrow at SOURCE (control flow / sync) */}
        <marker
          id="m-arrow-start"
          viewBox="0 0 10 10"
          refX="1"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M10 0 L0 5 L10 10 Z" fill={INK} />
        </marker>
      </defs>
    </svg>
  );
}
