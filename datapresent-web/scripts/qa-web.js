#!/usr/bin/env node

/**
 * qa-web.js — Interactive QA session with Playwright (PromptBearer web:qa pattern)
 *
 * Launches or connects to a Next.js dev server, opens Playwright in headed mode,
 * and provides an interactive QA environment for manual / exploratory testing.
 *
 * Usage:
 *   node scripts/qa-web.js                          # default: http://localhost:3000
 *   node scripts/qa-web.js --url=http://localhost:3001
 *   node scripts/qa-web.js --headless
 *   npm run web:qa:headless                         # shortcut for headless
 *
 * Requires: @playwright/cli (devDependency)
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const net = require("net");

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_PORT = 3000;
const DEFAULT_URL = `http://localhost:${DEFAULT_PORT}`;
const PLAYWRIGHT_CLI = "npx --no-install playwright-cli";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if a TCP port is accepting connections.
 * Returns true if the port is open.
 */
function isServerRunning(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Poll an HTTP URL until the server responds with a non-5xx status.
 * Returns true once the server is reachable, false on timeout.
 */
async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {
      // Server not ready yet — keep polling
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return false;
}

/**
 * Start the Next.js dev server as a detached, headless process.
 * Windows-compatible via `windowsHide` and `unref()`.
 */
function startDetached(cwd) {
  const child = spawn("npx", ["next", "dev"], {
    cwd,
    stdio: "ignore",
    detached: true,
    windowsHide: true,
    shell: true,
  });

  child.unref();
  return child;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Parse CLI arguments
  const args = process.argv.slice(2);
  const urlArg = args.find((a) => a.startsWith("--url="));
  const targetUrl = urlArg ? urlArg.slice("--url=".length) : DEFAULT_URL;
  const headless = args.includes("--headless");

  const parsedUrl = new URL(targetUrl);
  const port = parseInt(parsedUrl.port, 10) || DEFAULT_PORT;
  const host = parsedUrl.hostname || "localhost";

  console.log(`🔍 QA session targeting: ${targetUrl}\n`);

  // 2. Create timestamped report directory in TEMP
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportDir = path.join(os.tmpdir(), `datapresent-qa-${timestamp}`);
  fs.mkdirSync(reportDir, { recursive: true });
  console.log(`📁 Report directory: ${reportDir}`);

  // 3. Check if the dev server is already running; start it if not
  const running = await isServerRunning(host, port);

  if (!running) {
    console.log("⚡ Dev server not detected. Starting Next.js dev server...");
    startDetached(process.cwd());
    console.log("⏳ Waiting for server to be ready (up to 60s)...");

    const ready = await waitForServer(targetUrl);
    if (!ready) {
      console.error("❌ Dev server failed to start within 60 seconds.");
      process.exit(1);
    }

    console.log("✅ Dev server is ready!\n");
  } else {
    console.log(`✅ Dev server is already running on ${targetUrl}\n`);
  }

  // 4. Set headless mode via env var if requested
  if (headless) {
    process.env.PLAYWRIGHT_MCP_HEADLESS = "true";
  }

  // 5. Open Playwright browser
  const headlessLabel = headless ? "headless" : "headed";
  console.log(`🌐 Opening Playwright browser (${headlessLabel})...`);
  execSync(`${PLAYWRIGHT_CLI} open ${targetUrl} --browser=chrome`, {
    stdio: "inherit",
  });

  // 6. Start video recording
  const videoPath = path.join(reportDir, "session.webm");
  console.log(`📹 Recording video to: ${videoPath}`);
  execSync(`${PLAYWRIGHT_CLI} video-start ${videoPath}`, {
    stdio: "inherit",
  });

  // 7. Resize viewport to 1440×900
  console.log("📐 Resizing viewport to 1440×900...");
  execSync(`${PLAYWRIGHT_CLI} resize 1440 900`, { stdio: "inherit" });

  // 8. Display session information
  console.log("\n── QA Session ──────────────────────────────────────");
  console.log(`  URL:       ${targetUrl}`);
  console.log(`  Headless:  ${headless}`);
  console.log(`  Video:     ${videoPath}`);
  console.log(`  Reports:   ${reportDir}`);
  console.log(`  PID:       ${process.pid}`);
  console.log("────────────────────────────────────────────────────\n");

  // 9. Keep the session alive until Ctrl+C
  process.stdin.resume();
  console.log("🔴 QA session active. Interact with the browser.");
  console.log("   Press Ctrl+C to stop and clean up.\n");

  await new Promise(() => {});
}

main().catch((err) => {
  console.error("❌ QA session failed:", err.message);
  process.exit(1);
});
