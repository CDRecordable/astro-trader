// ============================================================
// User-data location
// ============================================================
// Everything personal (watchlist, portfolio, settings with your API keys,
// cached analyses, licence) lives in ONE directory. Where that directory is
// depends on how the app is running:
//
//   · from source (npm run dev)  → ./user-data next to the code, as always;
//   · packaged as a desktop app  → the OS's per-user app-data folder, which
//     the desktop shell passes in via ASTRO_DATA_DIR.
//
// That distinction matters: an installed app lives in a read-only location
// (Program Files on Windows), so writing beside the executable would fail.

import path from "path";

export const USER_DATA_DIR = process.env.ASTRO_DATA_DIR?.trim()
    ? process.env.ASTRO_DATA_DIR.trim()
    : path.join(process.cwd(), "user-data");

/** Build a path inside the user-data directory. */
export function userDataPath(...segments: string[]): string {
    return path.join(USER_DATA_DIR, ...segments);
}
