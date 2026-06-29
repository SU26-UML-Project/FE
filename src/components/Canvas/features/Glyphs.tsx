const GLYPH = "#3f3f46";

export function ShapeGlyph({ type }: { type: string }) {
  const common = {
    width: 26,
    height: 20,
    viewBox: "0 0 26 20",
    fill: "none" as const,
    stroke: GLYPH,
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "start":
      return (
        <svg {...common}>
          <circle cx="13" cy="10" r="6" fill={GLYPH} stroke="none" />
        </svg>
      );
    case "final":
      return (
        <svg {...common}>
          <circle cx="13" cy="10" r="7" fill="#fff" />
          <circle cx="13" cy="10" r="3.4" fill={GLYPH} stroke="none" />
        </svg>
      );
    case "action":
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="21" height="10" rx="3" fill="#fff" />
        </svg>
      );
    case "decision":
      return (
        <svg {...common}>
          <polygon points="13,2 24,10 13,18 2,10" fill="#fff" />
        </svg>
      );
    case "fork":
      return (
        <svg {...common}>
          <rect x="2" y="8.5" width="22" height="3" rx="1.5" fill={GLYPH} stroke="none" />
        </svg>
      );
    case "cls":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="20" height="14" rx="2" fill="#fff" />
          <line x1="3" y1="8" x2="23" y2="8" />
          <line x1="3" y1="12" x2="23" y2="12" />
        </svg>
      );
    case "component":
      return (
        <svg {...common}>
          <rect x="6" y="4" width="16" height="12" rx="2" fill="#fff" />
          <rect x="2" y="6.5" width="5" height="3" fill="#fff" />
          <rect x="2" y="10.5" width="5" height="3" fill="#fff" />
        </svg>
      );
    case "usecase":
      return (
        <svg {...common}>
          <ellipse cx="13" cy="10" rx="10.5" ry="6" fill="#fff" />
        </svg>
      );
    case "actor":
      return (
        <svg {...common}>
          <circle cx="13" cy="4.5" r="2.4" fill="#fff" />
          <line x1="13" y1="7" x2="13" y2="13.5" />
          <line x1="8" y1="9.5" x2="18" y2="9.5" />
          <line x1="13" y1="13.5" x2="10" y2="18" />
          <line x1="13" y1="13.5" x2="16" y2="18" />
        </svg>
      );
    case "lifeline":
      return (
        <svg {...common}>
          <rect x="4" y="2.5" width="18" height="6" rx="2" fill="#fff" />
          <line x1="13" y1="8.5" x2="13" y2="18" strokeDasharray="2 2" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M3 3 H17 L23 8 V18 H3 Z" fill="#f6f6f7" />
          <path d="M17 3 V8 H23" />
        </svg>
      );
    case "text":
      return (
        <svg {...common}>
          <text x="13" y="14" fontSize="9" textAnchor="middle" fill={GLYPH} stroke="none" fontFamily="Inter">
            Aa
          </text>
        </svg>
      );
    case "package":
      return (
        <svg {...common}>
          <path d="M3 6 V17 H23 V8 H12 L10 6 Z" fill="#fff" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="4" y="4" width="18" height="12" rx="2" fill="#fff" />
        </svg>
      );
  }
}
