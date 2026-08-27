import { MARKER_SIZES, sizedMarkerId } from "./Glyphs";
import type { ReactNode } from "react";

const PAGE = "#ffffff";

interface MarkerSpec {
  id: string;
  w: number; // base markerWidth
  h: number; // base markerHeight
  refX: number;
  refY: number;
  orient: string;
  vb: string;
  children: ReactNode;
}

const SPECS: MarkerSpec[] = [
  {
    id: "m-arrow", w: 7, h: 7, refX: 9, refY: 5, orient: "auto-start-reverse", vb: "0 0 10 10",
    children: <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" />,
  },
  {
    id: "m-arrow-open", w: 9, h: 9, refX: 11, refY: 6, orient: "auto-start-reverse", vb: "0 0 12 12",
    children: <path d="M1 1 L11 6 L1 11" fill="none" stroke="context-stroke" strokeWidth="1.6" strokeLinejoin="miter" />,
  },
  {
    id: "m-triangle", w: 11, h: 11, refX: 11, refY: 6, orient: "auto-start-reverse", vb: "0 0 12 12",
    children: <path d="M1 1 L11 6 L1 11 Z" fill={PAGE} stroke="context-stroke" strokeWidth="1.4" strokeLinejoin="miter" />,
  },
  {
    id: "m-diamond-filled-start", w: 13, h: 9, refX: 1, refY: 5, orient: "auto", vb: "0 0 16 10",
    children: <path d="M0 5 L8 0 L16 5 L8 10 Z" fill="context-stroke" stroke="context-stroke" strokeWidth="1" />,
  },
  {
    id: "m-diamond-open-start", w: 13, h: 9, refX: 1, refY: 5, orient: "auto", vb: "0 0 16 10",
    children: <path d="M0 5 L8 0 L16 5 L8 10 Z" fill={PAGE} stroke="context-stroke" strokeWidth="1.4" strokeLinejoin="miter" />,
  },
  {
    id: "m-diamond-filled", w: 13, h: 9, refX: 15, refY: 5, orient: "auto", vb: "0 0 16 10",
    children: <path d="M0 5 L8 0 L16 5 L8 10 Z" fill="context-stroke" stroke="context-stroke" strokeWidth="1" />,
  },
  {
    id: "m-diamond-open", w: 13, h: 9, refX: 15, refY: 5, orient: "auto", vb: "0 0 16 10",
    children: <path d="M0 5 L8 0 L16 5 L8 10 Z" fill={PAGE} stroke="context-stroke" strokeWidth="1.4" strokeLinejoin="miter" />,
  },
];

export function MarkerDefs() {
    return (
        <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
            <defs>
                {SPECS.map((spec) =>
                    MARKER_SIZES.map(({ size }) => (
                        <marker
                            key={sizedMarkerId(spec.id, size)}
                            id={sizedMarkerId(spec.id, size)}
                            viewBox={spec.vb}
                            refX={spec.refX}
                            refY={spec.refY}
                            markerWidth={spec.w * size}
                            markerHeight={spec.h * size}
                            orient={spec.orient}
                            markerUnits="userSpaceOnUse"
                        >
                            {spec.children}
                        </marker>
                    ))
                )}
            </defs>
        </svg>
    );
}
