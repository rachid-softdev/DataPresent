// ──────────────────────────────────────────────
// DataPresent Extension — Message Types
// ──────────────────────────────────────────────

/**
 * All messages the extension passes between
 * popup, background service worker, and content scripts.
 */

// ─── Message names (discriminated union) ───

export type MessageName =
  // Popup → Content script
  | "CAPTURE_SELECTION"
  | "CAPTURE_TABLE"
  | "CAPTURE_PAGE"
  // Popup → Background
  | "GET_CONNECTION_STATUS"
  // Background → Content script
  | "HIGHLIGHT_ELEMENTS"
  | "CLEAR_HIGHLIGHTS"
  // Content script → Popup / Background
  | "CAPTURE_RESULT"
  | "CONNECTION_STATUS_RESULT";

// ─── Individual message payloads ───

export interface CaptureSelectionMessage {
  name: "CAPTURE_SELECTION";
  data?: undefined;
}

export interface CaptureTableMessage {
  name: "CAPTURE_TABLE";
  data?: { selector?: string };
}

export interface CapturePageMessage {
  name: "CAPTURE_PAGE";
  data?: { includeHtml?: boolean };
}

export interface GetConnectionStatusMessage {
  name: "GET_CONNECTION_STATUS";
  data?: undefined;
}

export interface HighlightElementsMessage {
  name: "HIGHLIGHT_ELEMENTS";
  data: { selectors: string[] };
}

export interface ClearHighlightsMessage {
  name: "CLEAR_HIGHLIGHTS";
  data?: undefined;
}

export interface CaptureResultMessage {
  name: "CAPTURE_RESULT";
  data: {
    success: boolean;
    type: "selection" | "table" | "page";
    content: string;
    metadata?: {
      url: string;
      title: string;
      timestamp: number;
    };
  };
}

export interface ConnectionStatusResultMessage {
  name: "CONNECTION_STATUS_RESULT";
  data: {
    connected: boolean;
    apiVersion?: string;
    error?: string;
  };
}

// ─── Union type for all messages ───

export type ExtensionMessage =
  | CaptureSelectionMessage
  | CaptureTableMessage
  | CapturePageMessage
  | GetConnectionStatusMessage
  | HighlightElementsMessage
  | ClearHighlightsMessage
  | CaptureResultMessage
  | ConnectionStatusResultMessage;

// ─── Helper: response callback type ───

export type MessageResponse<T = unknown> = (response: T) => void;
