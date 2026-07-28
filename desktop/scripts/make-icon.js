// ============================================================
// App icon generator — writes a real PNG with no dependencies
// ============================================================
// Draws the same isometric voxel mark the website uses, straight into a pixel
// buffer, then encodes it as PNG by hand (IHDR + IDAT + IEND). Keeping this in
// code means the icon can be regenerated at any size without design tooling.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 512;
const OUT_DIR = path.resolve(__dirname, "..", "build");

// ── Pixel buffer ─────────────────────────────────────────────
const px = new Uint8Array(SIZE * SIZE * 4);

function setPx(x, y, [r, g, b, a = 255]) {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const i = (y * SIZE + x) * 4;
    if (a === 255) {
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
        return;
    }
    // Source-over blend, so soft edges sit correctly on the background.
    const sa = a / 255, da = px[i + 3] / 255, oa = sa + da * (1 - sa);
    if (oa === 0) return;
    px[i] = Math.round((r * sa + px[i] * da * (1 - sa)) / oa);
    px[i + 1] = Math.round((g * sa + px[i + 1] * da * (1 - sa)) / oa);
    px[i + 2] = Math.round((b * sa + px[i + 2] * da * (1 - sa)) / oa);
    px[i + 3] = Math.round(oa * 255);
}

/** Fill a convex polygon with 3×3 supersampling for clean diagonal edges. */
function fillPoly(points, color) {
    const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(SIZE - 1, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(SIZE - 1, Math.ceil(Math.max(...ys)));

    const inside = (x, y) => {
        let sign = 0;
        for (let i = 0; i < points.length; i++) {
            const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
            const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
            if (cross !== 0) {
                const s = Math.sign(cross);
                if (sign === 0) sign = s; else if (s !== sign) return false;
            }
        }
        return true;
    };

    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            let hits = 0;
            for (let sy = 0; sy < 3; sy++)
                for (let sx = 0; sx < 3; sx++)
                    if (inside(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3)) hits++;
            if (hits) setPx(x, y, [...color, Math.round((hits / 9) * 255)]);
        }
    }
}

/** Rounded-rectangle background. */
function fillRoundRect(x, y, w, h, r, color) {
    for (let py = y; py < y + h; py++) {
        for (let pxx = x; pxx < x + w; pxx++) {
            const dx = Math.max(x + r - pxx, pxx - (x + w - r - 1), 0);
            const dy = Math.max(y + r - py, py - (y + h - r - 1), 0);
            const d = Math.hypot(dx, dy);
            if (d <= r) setPx(pxx, py, [...color, d > r - 1.5 ? Math.round((r - d) / 1.5 * 255) : 255]);
        }
    }
}

/** One isometric cube: top, left and right faces. */
function cube(cx, cy, w, h, t, tones) {
    const [top, left, right] = tones;
    fillPoly([[cx, cy], [cx + w, cy - h], [cx + 2 * w, cy], [cx + w, cy + h]], top);
    fillPoly([[cx, cy], [cx + w, cy + h], [cx + w, cy + h + t], [cx, cy + t]], left);
    fillPoly([[cx + w, cy + h], [cx + 2 * w, cy], [cx + 2 * w, cy + t], [cx + w, cy + h + t]], right);
}

// ── Draw ─────────────────────────────────────────────────────
fillRoundRect(0, 0, SIZE, SIZE, 112, [14, 17, 24]);       // dark rounded plate

const W = 92, H = 50, T = 84;
const baseX = SIZE / 2 - W;      // centred horizontally
const baseY = 300;

// Lower cube (cyan) then the one stacked on it (violet) — far to near.
cube(baseX, baseY, W, H, T, [[125, 211, 252], [34, 211, 238], [11, 124, 147]]);
cube(baseX, baseY - T - 6, W, H, T, [[196, 181, 253], [167, 139, 250], [109, 75, 196]]);

// ── Encode PNG ───────────────────────────────────────────────
function crc32(buf) {
    let c, crc = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
        c = (crc ^ buf[n]) & 0xff;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crc = c ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

function encodePng() {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(SIZE, 0);
    ihdr.writeUInt32BE(SIZE, 4);
    ihdr[8] = 8;    // bit depth
    ihdr[9] = 6;    // colour type: RGBA
    // 10-12: compression, filter, interlace = 0

    // Each scanline is prefixed with filter type 0 (none).
    const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
    for (let y = 0; y < SIZE; y++) {
        raw[y * (SIZE * 4 + 1)] = 0;
        Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const png = encodePng();
fs.writeFileSync(path.join(OUT_DIR, "icon.png"), png);
console.log(`✓ icon.png written — ${SIZE}×${SIZE}, ${(png.length / 1024).toFixed(0)} KB`);
console.log("  electron-builder derives the .ico and .icns from this file.");
