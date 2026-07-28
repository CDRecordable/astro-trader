// ============================================================
// Voxel — isometric voxel art, generated as pure SVG
// ============================================================
// No images, no 3D library, no external assets: each cube is three
// parallelograms (top, left, right) placed on an isometric lattice, so the
// art is a few KB of markup, scales to any size and never 404s.
//
// Lattice: one cell = (x + z) horizontally, (x - z)/2 - y vertically.

import React from "react";

export interface Cube {
    x: number;      // lattice column
    y: number;      // height (up is positive)
    z: number;      // lattice row
    tone?: Tone;
}

export type Tone = "cyan" | "violet" | "emerald" | "amber" | "rose" | "slate";

/** Face colors per tone: [top, left, right] — light to dark for volume. */
const TONES: Record<Tone, [string, string, string]> = {
    cyan: ["#67e8f9", "#22d3ee", "#0e93ab"],
    violet: ["#c4b5fd", "#a78bfa", "#7c5cd6"],
    emerald: ["#6ee7b7", "#34d399", "#1f9d75"],
    amber: ["#fcd34d", "#fbbf24", "#c98a0c"],
    rose: ["#fda4af", "#fb7185", "#c94f62"],
    slate: ["#7c8598", "#5b6478", "#3d4455"],
};

const W = 22;   // half-width of a cube in px
const H = 12;   // half-depth
const T = 20;   // cube height

/** Draw order: farther cubes first so nearer ones overlap correctly. */
function depthSort(cubes: Cube[]): Cube[] {
    return [...cubes].sort((a, b) => (a.x + a.z + a.y) - (b.x + b.z + b.y));
}

function CubeShape({ c }: { c: Cube }) {
    const [top, left, right] = TONES[c.tone ?? "slate"];
    // Isometric projection of the cube's top-front corner.
    const px = (c.x + c.z) * W;
    const py = (c.z - c.x) * H - c.y * T;

    return (
        <g transform={`translate(${px} ${py})`}>
            {/* top face */}
            <path d={`M0,0 L${W},${-H} L${2 * W},0 L${W},${H} Z`} fill={top} />
            {/* left face */}
            <path d={`M0,0 L${W},${H} L${W},${H + T} L0,${T} Z`} fill={left} />
            {/* right face */}
            <path d={`M${W},${H} L${2 * W},0 L${2 * W},${T} L${W},${H + T} Z`} fill={right} />
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
    const sorted = depthSort(cubes);

    // Fit the viewBox to the drawn cubes so any composition centers itself.
    const xs = sorted.map((c) => (c.x + c.z) * W);
    const ys = sorted.map((c) => (c.z - c.x) * H - c.y * T);
    const minX = Math.min(...xs) - 6;
    const maxX = Math.max(...xs) + 2 * W + 6;
    const minY = Math.min(...ys) - H - 6;
    const maxY = Math.max(...ys) + T + H + 14;

    // Ground shadow sits under the lowest layer.
    const baseCubes = sorted.filter((c) => c.y === 0);
    const shadowPts = baseCubes.map((c) => ({
        x: (c.x + c.z) * W + W,
        y: (c.z - c.x) * H + H + T - 2,
    }));

    return (
        <svg
            viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
            width={size}
            height={size}
            className={className}
            role="presentation"
            aria-hidden="true"
        >
            {shadow && shadowPts.map((p, i) => (
                <ellipse key={i} cx={p.x} cy={p.y + 6} rx={W * 0.95} ry={H * 0.7} fill="rgba(0,0,0,0.35)" />
            ))}
            {sorted.map((c, i) => <CubeShape key={i} c={c} />)}
        </svg>
    );
}

/* ══════════════════════════════════════════════════════════════
   Compositions — one per concept on the page
   ══════════════════════════════════════════════════════════════ */

/** Rising bar towers — the stock analyzer. */
export const STOCK_VOXELS: Cube[] = [
    ...col(0, 0, 1, "slate"), ...col(1, 0, 2, "cyan"),
    ...col(2, 0, 3, "cyan"), ...col(0, 1, 1, "slate"),
    ...col(1, 1, 2, "cyan"), ...col(2, 1, 4, "cyan"),
];

/** A clustered cube — the crypto analyzer (network / blocks). */
export const CRYPTO_VOXELS: Cube[] = [
    { x: 0, y: 0, z: 0, tone: "slate" }, { x: 1, y: 0, z: 0, tone: "amber" },
    { x: 0, y: 0, z: 1, tone: "amber" }, { x: 1, y: 0, z: 1, tone: "slate" },
    { x: 0, y: 1, z: 0, tone: "amber" }, { x: 1, y: 1, z: 1, tone: "amber" },
    { x: 1, y: 1, z: 0, tone: "slate" }, { x: 0, y: 2, z: 0, tone: "amber" },
];

/** Stacked slabs — the ETF analyzer (a basket of many things). */
export const ETF_VOXELS: Cube[] = [
    { x: 0, y: 0, z: 0, tone: "slate" }, { x: 1, y: 0, z: 0, tone: "slate" }, { x: 2, y: 0, z: 0, tone: "slate" },
    { x: 0, y: 0, z: 1, tone: "slate" }, { x: 1, y: 0, z: 1, tone: "slate" }, { x: 2, y: 0, z: 1, tone: "slate" },
    { x: 0, y: 1, z: 0, tone: "violet" }, { x: 1, y: 1, z: 0, tone: "violet" },
    { x: 1, y: 1, z: 1, tone: "violet" }, { x: 2, y: 1, z: 1, tone: "violet" },
    { x: 1, y: 2, z: 0, tone: "violet" },
];

/** A single elevated cube on a plinth — "your own key" / privacy. */
export const KEY_VOXELS: Cube[] = [
    { x: 0, y: 0, z: 0, tone: "slate" }, { x: 1, y: 0, z: 0, tone: "slate" },
    { x: 0, y: 0, z: 1, tone: "slate" }, { x: 1, y: 0, z: 1, tone: "slate" },
    { x: 0, y: 1, z: 1, tone: "emerald" }, { x: 1, y: 2, z: 0, tone: "emerald" },
];

/** A stepped pyramid — the honest, layered score. */
export const SCORE_VOXELS: Cube[] = [
    ...plane(3, 3, 0, "slate"),
    ...plane(2, 2, 1, "cyan"),
    { x: 0, y: 2, z: 0, tone: "emerald" },
];

/** Scattered plates — the local-first / your-machine idea. */
export const LOCAL_VOXELS: Cube[] = [
    { x: 0, y: 0, z: 0, tone: "slate" }, { x: 1, y: 0, z: 0, tone: "slate" },
    { x: 2, y: 0, z: 0, tone: "slate" }, { x: 0, y: 0, z: 1, tone: "slate" },
    { x: 1, y: 0, z: 1, tone: "emerald" }, { x: 2, y: 0, z: 1, tone: "slate" },
    { x: 1, y: 1, z: 1, tone: "emerald" },
];

// ── helpers ──────────────────────────────────────────────────
function col(x: number, z: number, height: number, tone: Tone): Cube[] {
    return Array.from({ length: height }, (_, y) => ({ x, y, z, tone }));
}
function plane(w: number, d: number, y: number, tone: Tone): Cube[] {
    const out: Cube[] = [];
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) out.push({ x, y, z, tone });
    return out;
}
