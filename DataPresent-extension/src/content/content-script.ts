// ──────────────────────────────────────────────
// DataPresent Extension — Content Script
// ──────────────────────────────────────────────

import type { ExtensionMessage, MessageResponse } from "../types/messages.js";

// ─── Listen for messages from popup / background ───

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse: MessageResponse) => {
    console.log("[DataPresent] Content script received:", message.name);

    switch (message.name) {
      case "CAPTURE_SELECTION":
        return handleCaptureSelection(sendResponse);

      case "CAPTURE_TABLE":
        return handleCaptureTable(message.data?.selector, sendResponse);

      case "CAPTURE_PAGE":
        return handleCapturePage(message.data?.includeHtml, sendResponse);

      case "HIGHLIGHT_ELEMENTS":
        return handleHighlightElements(message.data.selectors, sendResponse);

      case "CLEAR_HIGHLIGHTS":
        return handleClearHighlights(sendResponse);

      default:
        console.warn("[DataPresent] Unknown message in content script:", message.name);
        sendResponse(undefined);
    }
  },
);

// ─── Handlers ───

function handleCaptureSelection(sendResponse: MessageResponse): boolean {
  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? "";

  if (!text) {
    sendResponse({
      name: "CAPTURE_RESULT",
      data: {
        success: false,
        type: "selection",
        content: "",
        metadata: getPageMetadata(),
      },
    });
    return false;
  }

  // Highlight selected text briefly
  highlightRange(selection!.getRangeAt(0));

  sendResponse({
    name: "CAPTURE_RESULT",
    data: {
      success: true,
      type: "selection",
      content: text,
      metadata: getPageMetadata(),
    },
  });
  return false;
}

function handleCaptureTable(_selector: string | undefined, sendResponse: MessageResponse): boolean {
  // Placeholder: find and capture table data
  const table = document.querySelector("table");
  if (!table) {
    sendResponse({
      name: "CAPTURE_RESULT",
      data: {
        success: false,
        type: "table",
        content: "",
        metadata: getPageMetadata(),
      },
    });
    return false;
  }

  // Placeholder: extract table as CSV-like text
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells)
      .map((cell) => cell.textContent?.trim() ?? "")
      .join("\t"),
  );
  const content = rows.join("\n");

  sendResponse({
    name: "CAPTURE_RESULT",
    data: {
      success: true,
      type: "table",
      content,
      metadata: getPageMetadata(),
    },
  });
  return false;
}

function handleCapturePage(
  _includeHtml: boolean | undefined,
  sendResponse: MessageResponse,
): boolean {
  // Placeholder: extract main content from page
  const mainContent =
    document.querySelector("main")?.textContent ??
    document.querySelector("article")?.textContent ??
    document.body.textContent ??
    "";

  const trimmed = mainContent.trim().substring(0, 10_000);

  sendResponse({
    name: "CAPTURE_RESULT",
    data: {
      success: true,
      type: "page",
      content: trimmed,
      metadata: getPageMetadata(),
    },
  });
  return false;
}

// ─── Highlight / Clear ───

function handleHighlightElements(selectors: string[], sendResponse: MessageResponse): boolean {
  clearHighlightsInternal();

  for (const selector of selectors) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    elements.forEach((el) => {
      el.style.outline = "2px solid #0071e3";
      el.style.outlineOffset = "2px";
      el.dataset.datapresentHighlighted = "true";
    });
  }

  sendResponse({ success: true });
  return false;
}

function handleClearHighlights(sendResponse: MessageResponse): boolean {
  clearHighlightsInternal();
  sendResponse({ success: true });
  return false;
}

function clearHighlightsInternal(): void {
  document.querySelectorAll("[data-datapresent-highlighted]").forEach((el) => {
    const element = el as HTMLElement;
    element.style.outline = "";
    element.style.outlineOffset = "";
    delete element.dataset.datapresentHighlighted;
  });
}

// ─── Selection highlight (brief visual feedback) ───

function highlightRange(range: Range): void {
  // Apply a temporary CSS class to the selected range
  const span = document.createElement("span");
  span.style.background = "#0071e3";
  span.style.color = "#ffffff";
  span.style.borderRadius = "2px";

  try {
    range.surroundContents(span);
    setTimeout(() => {
      // Restore original content
      const parent = span.parentNode;
      if (parent) {
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        parent.normalize();
      }
    }, 1200);
  } catch {
    // surroundContents may fail on non-text ranges — ignore
  }
}

// ─── Metadata helper ───

function getPageMetadata() {
  return {
    url: window.location.href,
    title: document.title,
    timestamp: Date.now(),
  };
}
