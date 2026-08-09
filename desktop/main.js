// ============================================================
// Desktop shell — Electron main process
// ============================================================
// Wraps the app so it installs and launches like any other program: no Node
// to install, no terminal, no localhost URL to remember.
//
// How it works:
//   1. start the bundled Next.js standalone server on a free port,
//   2. wait until it actually answers,
//   3. show it in a window.
//
// Personal data is written to the OS's per-user app-data folder (passed to the
// server as ASTRO_DATA_DIR), never beside the executable — an installed app
// lives in a read-only location.

const { app, BrowserWindow, shell, dialog, Menu } = require("electron");
const path = require("path");
const http = require("http");
const { fork } = require("child_process");
const net = require("net");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
let serverProcess = null;
let mainWindow = null;
let serverPort = 0;

/** Ask the OS for a free port, so two installs never collide. */
function findFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.unref();
        srv.on("error", reject);
        srv.listen(0, "127.0.0.1", () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
    });
}

/** Resolve when the server answers, or reject after `timeoutMs`. */
function waitForServer(port, timeoutMs = 60_000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => {
                res.destroy();
                resolve();
            });
            req.on("error", retry);
            req.on("timeout", () => { req.destroy(); retry(); });
        };
        const retry = () => {
            if (Date.now() - started > timeoutMs) {
                reject(new Error("El servidor interno no respondió a tiempo."));
            } else {
                setTimeout(attempt, 300);
            }
        };
        attempt();
    });
}

function startServer(port) {
    // In the packaged app the standalone build sits in resources/app-server.
    const serverEntry = path.join(process.resourcesPath, "app-server", "server.js");

    serverProcess = fork(serverEntry, [], {
        env: {
            ...process.env,
            NODE_ENV: "production",
            PORT: String(port),
            HOSTNAME: "127.0.0.1",
            // Keep every personal file in the per-user data folder.
            ASTRO_DATA_DIR: path.join(app.getPath("userData"), "user-data"),
        },
        cwd: path.join(process.resourcesPath, "app-server"),
        stdio: ["ignore", "pipe", "pipe", "ipc"],
    });

    serverProcess.stdout?.on("data", (d) => console.log("[server]", String(d).trim()));
    serverProcess.stderr?.on("data", (d) => console.error("[server]", String(d).trim()));
    serverProcess.on("exit", (code) => {
        console.log("[server] exited with", code);
        serverProcess = null;
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        backgroundColor: "#0a0c12",
        show: false,
        autoHideMenuBar: true,
        title: "Astro Trader Insights",
        icon: path.join(__dirname, "build", "icon.png"),
        webPreferences: {
            // The window only ever loads our own local server, and it needs no
            // Node access, so the renderer stays sandboxed.
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.once("ready-to-show", () => mainWindow.show());

    // External links open in the real browser, not inside the app.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });
    mainWindow.webContents.on("will-navigate", (e, url) => {
        if (!url.startsWith(`http://127.0.0.1:${serverPort}`) && !url.startsWith(`http://localhost:${serverPort}`)) {
            e.preventDefault();
            shell.openExternal(url);
        }
    });

    mainWindow.on("closed", () => { mainWindow = null; });
}

/**
 * Keep the installed app current from GitHub Releases.
 *
 * The in-app updater (/api/update) only works for git clones — it shells out
 * to `git pull`. Anyone who installed the .exe had no update path at all,
 * which is the whole point of shipping to subscribers. electron-builder
 * already publishes the `latest.yml` this reads.
 *
 * Deliberately quiet: it downloads in the background and only interrupts once
 * the update is on disk and ready. A failed check is a non-event — no network,
 * GitHub down, a rate limit — and must never greet someone with an error box.
 */
function setupUpdates() {
    if (isDev) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;   // silent catch-up if they never click
    autoUpdater.logger = null;

    autoUpdater.on("update-downloaded", async ({ version }) => {
        if (!mainWindow) return;
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: "info",
            buttons: ["Reiniciar ahora", "Más tarde"],
            defaultId: 0,
            cancelId: 1,
            title: "Actualización lista",
            message: `Astro Trader ${version} está preparada.`,
            detail:
                "Se instalará al reiniciar la aplicación. Tu watchlist, tu cartera y " +
                "tus análisis se conservan.",
        });
        if (response === 0) autoUpdater.quitAndInstall();
    });

    // Swallowed on purpose: see above.
    autoUpdater.on("error", (err) => console.error("[updater]", err?.message ?? err));

    const check = () => autoUpdater.checkForUpdates().catch(() => { });
    check();
    setInterval(check, UPDATE_INTERVAL_MS).unref();
}

async function boot() {
    try {
        serverPort = isDev ? 3100 : await findFreePort();

        if (!isDev) {
            startServer(serverPort);
            await waitForServer(serverPort);
        } else {
            // In development the usual `npm run dev` server is expected.
            await waitForServer(serverPort, 15_000).catch(() => {
                throw new Error("Arranca antes el servidor de desarrollo con: npm run dev");
            });
        }

        createWindow();
        mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
        setupUpdates();
    } catch (err) {
        dialog.showErrorBox(
            "No se pudo iniciar Astro Trader",
            `${err.message}\n\nSi el problema persiste, reinstala la aplicación.`,
        );
        app.quit();
    }
}

// A minimal menu: the app's own UI is the navigation.
Menu.setApplicationMenu(
    Menu.buildFromTemplate([
        {
            label: "Archivo",
            submenu: [{ role: "quit", label: "Salir" }],
        },
        {
            label: "Ver",
            submenu: [
                { role: "reload", label: "Recargar" },
                { role: "resetZoom", label: "Zoom normal" },
                { role: "zoomIn", label: "Acercar" },
                { role: "zoomOut", label: "Alejar" },
                { type: "separator" },
                { role: "togglefullscreen", label: "Pantalla completa" },
            ],
        },
    ]),
);

// Only one instance: a second launch focuses the existing window.
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(boot);
}

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverPort) {
        createWindow();
        mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
    }
});

// Never leave the background server running after the app closes.
app.on("before-quit", () => {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
});
