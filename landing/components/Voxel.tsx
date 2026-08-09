// ============================================================
// Voxel — isometric voxel art, generated as pure SVG
// ============================================================
// No images, no 3D library, no external assets: each cube is three
// parallelograms (top, left, right) on an isometric lattice, so the art is a
// few KB of markup, scales to any size and never 404s.
//
// Projection (one lattice cell):
//     px = (x + z) · W
//     py = (z − x) · H − y · T
// so +x moves up-right (AWAY from the viewer), +z moves down-right (TOWARD
// the viewer) and +y moves straight up.

import React from "react";

export interface Cube {
    x: number;      // lattice column, larger is farther
    y: number;      // height, up is positive
    z: number;      // lattice row, larger is nearer
    tone?: Tone;
}

export type Tone = "cyan" | "violet" | "emerald" | "amber" | "rose" | "slate" | "indigo";

/** Face colors per tone: [top, left, right] — lit from the upper left. */
const TONES: Record<Tone, [string, string, string]> = {
    cyan: ["#7dd3fc", "#22d3ee", "#0b7c93"],
    violet: ["#c4b5fd", "#a78bfa", "#6d4bc4"],
    emerald: ["#6ee7b7", "#34d399", "#18855f"],
    amber: ["#fcd34d", "#f59e0b", "#a86a06"],
    rose: ["#fda4af", "#fb7185", "#b83e51"],
    slate: ["#8b95ab", "#5b6478", "#343b4a"],
    indigo: ["#a5b4fc", "#818cf8", "#4a53b8"],
};

const W = 20;   // half-width of the top diamond
const H = 11;   // half-height of the top diamond
const T = 19;   // vertical extrusion

/**
 * Painter's algorithm for this projection: draw far cubes first.
 * Farther = larger x, smaller z, lower y → sort ascending by (z + y − x).
 * (Getting this backwards paints distant cubes over near ones.)
 */
function depthSort(cubes: Cube[]): Cube[] {
    return [...cubes].sort((a, b) => (a.z + a.y - a.x) - (b.z + b.y - b.x));
}

function project(c: Cube) {
    return { px: (c.x + c.z) * W, py: (c.z - c.x) * H - c.y * T };
}

function CubeShape({ c }: { c: Cube }) {
    const [top, left, right] = TONES[c.tone ?? "slate"];
    const { px, py } = project(c);

    // A hairline stroke in the face's own colour closes the anti-aliasing
    // seams that otherwise show as pale cracks between adjacent facets.
    const face = (d: string, fill: string) => (
        <path d={d} fill={fill} stroke={fill} strokeWidth={0.6} strokeLinejoin="round" />
    );

    return (
        <g transform={`translate(${px} ${py})`}>
            {face(`M0,0 L${W},${-H} L${2 * W},0 L${W},${H} Z`, top)}
            {face(`M0,0 L${W},${H} L${W},${H + T} L0,${T} Z`, left)}
            {face(`M${W},${H} L${2 * W},0 L${2 * W},${T} L${W},${H + T} Z`, right)}
        </g>
    );
}

export function VoxelScene({
    cubes,
    size = 160,
    className = "",
    shadow = true,
}: {
    cubes: Cube[];
    size?: number;
    className?: string;
    shadow?: boolean;
}) {
    if (cubes.length === 0) return null;
    const sorted = depthSort(cubes);

    // Bounds over every drawn vertex, not just the anchor points, so nothing
    // is ever clipped at the edges of the viewBox.
    const pts = sorted.map(project);
    const minX = Math.min(...pts.map((p) => p.px)) - 4;
    const maxX = Math.max(...pts.map((p) => p.px)) + 2 * W + 4;
    const minY = Math.min(...pts.map((p) => p.py)) - H - 4;
    const maxY = Math.max(...pts.map((p) => p.py)) + H + T + 4;

    // One soft shadow for the whole piece, centred on its ground footprint —
    // far cleaner than stacking a dark ellipse under every base cube.
    const ground = sorted.filter((c) => c.y === 0).map(project);
    const gx = ground.length ? ground.reduce((s, p) => s + p.px, 0) / ground.length + W : 0;
    const gy = ground.length ? Math.max(...ground.map((p) => p.py)) + H + T : 0;
    const spreadX = ground.length
        ? (Math.max(...ground.map((p) => p.px)) - Math.min(...ground.map((p) => p.px))) / 2 + W * 1.15
        : W;
    const id = React.useId().replace(/:/g, "");

    return (
        <svg
            viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY + (shadow ? 10 : 0)}`}
            width={size}
            height={size}
            className={className}
            role="presentation"
            aria-hidden="true"
        >
            {shadow && (
                <>
                    <defs>
                        <radialGradient id={`sh-${id}`}>
                            <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
                            <stop offset="70%" stopColor="rgba(0,0,0,0.16)" />
                            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                        </radialGradient>
                    </defs>
                    <ellipse cx={gx} cy={gy + 4} rx={spreadX} ry={H * 1.25} fill={`url(#sh-${id})`} />
                </>
            )}
            {sorted.map((c, i) => <CubeShape key={`${c.x}-${c.y}-${c.z}-${i}`} c={c} />)}
        </svg>
    );
}

/* ══════════════════════════════════════════════════════════════
   Helpers for building compositions
   ══════════════════════════════════════════════════════════════ */

/** A vertical column of `height` cubes at (x, z). */
function col(x: number, z: number, height: number, tone: Tone): Cube[] {
    return Array.from({ length: height }, (_, y) => ({ x, y, z, tone }));
}

/** A solid w×d slab at a given height. */
function slab(w: number, d: number, y: number, tone: Tone): Cube[] {
    const out: Cube[] = [];
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) out.push({ x, y, z, tone });
    return out;
}

/* ══════════════════════════════════════════════════════════════
   Compositions, one per concept on the site
   ══════════════════════════════════════════════════════════════ */

/** Bar towers rising left→right: the stock analyzer. */
export const STOCK_VOXELS: Cube[] = [
    ...col(2, 0, 1, "slate"), ...col(2, 1, 2, "slate"),
    ...col(1, 0, 2, "cyan"), ...col(1, 1, 3, "cyan"),
    ...col(0, 0, 4, "cyan"), ...col(0, 1, 5, "cyan"),
];

/** An interlocking block cluster: the crypto analyzer (chained blocks). */
export const CRYPTO_VOXELS: Cube[] = [
    ...slab(2, 2, 0, "slate"),
    { x: 1, y: 1, z: 0, tone: "amber" },
    { x: 0, y: 1, z: 0, tone: "amber" },
    { x: 0, y: 1, z: 1, tone: "amber" },
    { x: 0, y: 2, z: 0, tone: "amber" },
];

/** Stacked slabs: the ETF analyzer — a basket holding many things. */
export const ETF_VOXELS: Cube[] = [
    ...slab(3, 3, 0, "slate"),
    ...slab(2, 2, 1, "violet"),
    { x: 0, y: 2, z: 0, tone: "violet" },
];

/** A plinth with a raised key block: your own API key / the licence. */
export const KEY_VOXELS: Cube[] = [
    ...slab(2, 2, 0, "slate"),
    { x: 0, y: 1, z: 1, tone: "emerald" },
    { x: 0, y: 2, z: 1, tone: "emerald" },
];

/** A stepped pyramid: the layered, renormalized score. */
export const SCORE_VOXELS: Cube[] = [
    ...slab(3, 3, 0, "slate"),
    ...slab(2, 2, 1, "cyan"),
    { x: 0, y: 2, z: 0, tone: "emerald" },
];

/** A wide platform with one lit tile: local-first, on your own machine. */
export const LOCAL_VOXELS: Cube[] = [
    ...slab(3, 2, 0, "slate"),
    { x: 1, y: 1, z: 0, tone: "emerald" },
];

/** Orbiting rings around a core: the esoteric ephemeris engine. */
export const ESOTERIC_VOXELS: Cube[] = [
    // ring
    { x: 0, y: 0, z: 0, tone: "slate" }, { x: 1, y: 0, z: 0, tone: "slate" }, { x: 2, y: 0, z: 0, tone: "slate" },
    { x: 0, y: 0, z: 1, tone: "slate" }, { x: 2, y: 0, z: 1, tone: "slate" },
    { x: 0, y: 0, z: 2, tone: "slate" }, { x: 1, y: 0, z: 2, tone: "slate" }, { x: 2, y: 0, z: 2, tone: "slate" },
    // core, floating a level above the gap
    { x: 1, y: 1, z: 1, tone: "violet" },
    { x: 1, y: 2, z: 1, tone: "indigo" },
];

/** A single tall marker: used for small inline marks (nav, footer). */
export const MARK_VOXELS: Cube[] = [
    { x: 0, y: 0, z: 0, tone: "cyan" },
    { x: 0, y: 1, z: 0, tone: "violet" },
];

/** A grid with one candidate lifted out: the screener. */
export const SCREENER_VOXELS: Cube[] = [
    ...slab(3, 3, 0, "slate"),
    { x: 1, y: 1, z: 1, tone: "cyan" },
    { x: 1, y: 2, z: 1, tone: "emerald" },
];

/** Three economies at different heights: the country-macro dashboard. */
export const ECON_VOXELS: Cube[] = [
    ...col(2, 0, 2, "cyan"), ...col(2, 1, 2, "cyan"),
    ...col(1, 0, 3, "indigo"), ...col(1, 1, 3, "indigo"),
    ...col(0, 0, 1, "amber"), ...col(0, 1, 1, "amber"),
];

/** A calm base with one spike: the VIX / volatility regime. */
export const VIX_VOXELS: Cube[] = [
    ...col(3, 0, 1, "slate"), ...col(2, 0, 1, "slate"),
    ...col(1, 0, 4, "rose"),
    ...col(0, 0, 1, "slate"),
];

/** A shelf of assets with one marked: the watchlist. */
export const WATCHLIST_VOXELS: Cube[] = [
    ...slab(3, 1, 0, "slate"),
    { x: 0, y: 1, z: 0, tone: "amber" },
    { x: 2, y: 1, z: 0, tone: "slate" },
];

/** Two growing coin stacks: the simulated portfolio. */
export const CARTERA_VOXELS: Cube[] = [
    ...col(1, 0, 2, "emerald"), ...col(1, 1, 2, "emerald"),
    ...col(0, 0, 3, "emerald"), ...col(0, 1, 4, "cyan"),
];
