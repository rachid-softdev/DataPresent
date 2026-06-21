// ──────────────────────────────────────────────
// DataPresent Extension — Popup Script
// ──────────────────────────────────────────────

import type { ExtensionMessage, ConnectionStatusResultMessage } from "../types/messages.js";

// ─── DOM refs ───

const btnCapture = document.getElementById("btn-capture") as HTMLButtonElement | null;
const btnReports = document.getElementById("btn-view-reports") as HTMLButtonElement | null;
const linkOpenApp = document.getElementById("link-open-app") as HTMLAnchorElement | null;
const statusDot = document.getElementById("status-dot") as HTMLSpanElement | null;
const statusText = document.getElementById("status-text") as HTMLSpanElement | null;
const feedbackEl = document.getElementById("feedback") as HTMLDivElement | null;

// ─── Constants ───

const WEB_APP_ORIGIN = "http://localhost:3000";

// ─── Initialization ───

document.addEventListener("DOMContentLoaded", () => {
  checkConnectionStatus();

  btnCapture?.addEventListener("click", onQuickCapture);
  btnReports?.addEventListener("click", onViewReports);
  linkOpenApp?.addEventListener("click", onOpenApp);
});

// ─── Connection status ───

function checkConnectionStatus(): void {
  setStatus("checking", "Checking...");

  chrome.runtime.sendMessage<ExtensionMessage>(
    { name: "GET_CONNECTION_STATUS" },
    (response: ConnectionStatusResultMessage) => {
      if (chrome.runtime.lastError) {
        setStatus("disconnected", "Offline");
        console.warn("[DataPresent] Status check failed:", chrome.runtime.lastError);
        return;
      }

      if (response?.data?.connected) {
        setStatus("connected", "Connected");
      } else {
        setStatus("disconnected", response?.data?.error ?? "Offline");
      }
    },
  );
}

function setStatus(state: "connected" | "disconnected" | "checking", text: string): void {
  if (statusDot) {
    statusDot.className = "status-dot";
    if (state === "connected") statusDot.classList.add("connected");
    if (state === "disconnected") statusDot.classList.add("disconnected");
  }
  if (statusText) {
    statusText.textContent = text;
  }
}

// ─── Quick Capture ───

function onQuickCapture(): void {
  showFeedback("Capturing...");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) {
      showFeedback("No active tab found");
      return;
    }

    chrome.tabs.sendMessage<ExtensionMessage>(tab.id, { name: "CAPTURE_SELECTION" }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script may not be injected yet on some pages
        showFeedback("Cannot capture on this page");
        console.warn("[DataPresent] Capture error:", chrome.runtime.lastError);
        return;
      }

      if (response?.data?.success) {
        showFeedback("Captured!");
      } else {
        showFeedback("No content selected");
      }
    });
  });
}

// ─── View Reports / Open App ───

function onViewReports(): void {
  chrome.tabs.create({ url: `${WEB_APP_ORIGIN}/reports` });
}

function onOpenApp(e: Event): void {
  e.preventDefault();
  chrome.tabs.create({ url: WEB_APP_ORIGIN });
}

// ─── Feedback helper ───

function showFeedback(msg: string): void {
  if (feedbackEl) {
    feedbackEl.textContent = msg;
  }
}
