// ──────────────────────────────────────────────
// DataPresent Extension — Background Service Worker
// ──────────────────────────────────────────────

import type { ExtensionMessage, MessageResponse } from "../types/messages.js";

// ─── Context menu IDs ───

const MENU_SEND_TO_DATAPRESENT = "datapresent-send";
const MENU_CAPTURE_SELECTION = "datapresent-capture-selection";

// ─── Install handler ───

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[DataPresent] Extension installed (reason: ${details.reason})`);

  // Remove any stale menu items first
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.warn("[DataPresent] Failed to clear context menus:", chrome.runtime.lastError);
    }

    // Create top-level menu
    chrome.contextMenus.create(
      {
        id: MENU_SEND_TO_DATAPRESENT,
        title: "Send to DataPresent",
        contexts: ["page", "selection", "link"],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.warn("[DataPresent] Failed to create context menu:", chrome.runtime.lastError);
        }
      },
    );

    // Create selection-specific submenu item
    chrome.contextMenus.create(
      {
        id: MENU_CAPTURE_SELECTION,
        title: "Capture selection",
        contexts: ["selection"],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.warn("[DataPresent] Failed to create context menu:", chrome.runtime.lastError);
        }
      },
    );
  });
});

// ─── Context menu click handler ───

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) {
    console.warn("[DataPresent] Context menu clicked but no tab available");
    return;
  }

  switch (info.menuItemId) {
    case MENU_SEND_TO_DATAPRESENT:
      console.log("[DataPresent] Send to DataPresent triggered", {
        tabId: tab.id,
        selectionText: info.selectionText,
      });

      if (info.selectionText) {
        // Forward captured selection to popup or web app
        chrome.tabs.sendMessage(tab.id, {
          name: "CAPTURE_SELECTION",
        } satisfies ExtensionMessage);
      }
      break;

    case MENU_CAPTURE_SELECTION:
      console.log("[DataPresent] Capture selection triggered", {
        tabId: tab.id,
      });

      chrome.tabs.sendMessage(tab.id, {
        name: "CAPTURE_SELECTION",
      } satisfies ExtensionMessage);
      break;

    default:
      console.warn("[DataPresent] Unknown context menu item:", info.menuItemId);
  }
});

// ─── Message handler (popup ↔ background ↔ content) ───

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse: MessageResponse) => {
    console.log("[DataPresent] Background received message:", message.name, sender);

    switch (message.name) {
      case "GET_CONNECTION_STATUS": {
        // Placeholder: check connection to localhost:3000/api
        checkApiConnection()
          .then((status) => {
            sendResponse({
              name: "CONNECTION_STATUS_RESULT",
              data: status,
            });
          })
          .catch((err) => {
            sendResponse({
              name: "CONNECTION_STATUS_RESULT",
              data: { connected: false, error: String(err) },
            });
          });
        return true; // Keep channel open for async response
      }

      case "CAPTURE_RESULT": {
        console.log("[DataPresent] Capture result received:", message.data);
        // Placeholder: forward captured data to web app
        break;
      }

      default:
        console.warn("[DataPresent] Unhandled message in background:", message.name);
    }
  },
);

// ─── API connection check ───

async function checkApiConnection(): Promise<{
  connected: boolean;
  apiVersion?: string;
  error?: string;
}> {
  try {
    const response = await fetch("http://localhost:3000/api", {
      method: "GET",
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}` };
    }

    const body = await response.json().catch(() => ({}));
    return { connected: true, apiVersion: body?.version ?? "unknown" };
  } catch (err) {
    return { connected: false, error: String(err) };
  }
}
