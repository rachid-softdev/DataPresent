import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

// Paths relative to this test file's location (datapresent-extension/e2e/)
const EXTENSION_SRC = join(__dirname, "..", "src");

test.describe("Extension DataPresent — Structure du manifest", () => {
  test("manifest.json existe et est un JSON valide", () => {
    const manifestPath = join(EXTENSION_SRC, "manifest.json");
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest).toBeDefined();
    expect(manifest).toHaveProperty("manifest_version");
    expect(manifest).toHaveProperty("name");
    expect(manifest).toHaveProperty("version");
  });

  test("manifest.json a les champs obligatoires pour MV3", () => {
    const manifestPath = join(EXTENSION_SRC, "manifest.json");
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.manifest_version).toBe(3);
    expect(typeof manifest.name).toBe("string");
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(typeof manifest.version).toBe("string");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("manifest.json définit les permissions requises", () => {
    const manifestPath = join(EXTENSION_SRC, "manifest.json");
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(Array.isArray(manifest.permissions)).toBe(true);
    expect(manifest.permissions.length).toBeGreaterThan(0);

    // Core permissions for a capture extension
    expect(manifest.permissions).toContain("storage");
    expect(manifest.permissions).toContain("activeTab");
  });

  test("manifest.json a un background service worker déclaré", () => {
    const manifestPath = join(EXTENSION_SRC, "manifest.json");
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest).toHaveProperty("background");
    expect(manifest.background).toHaveProperty("service_worker");
    expect(typeof manifest.background.service_worker).toBe("string");
    expect(manifest.background.service_worker).toMatch(/service-worker/);
  });

  test("manifest.json a une action popup définie", () => {
    const manifestPath = join(EXTENSION_SRC, "manifest.json");
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest).toHaveProperty("action");
    expect(manifest.action).toHaveProperty("default_popup");
    expect(manifest.action.default_popup).toMatch(/popup\.html/);
  });

  test("manifest.json a un content script déclaré", () => {
    const manifestPath = join(EXTENSION_SRC, "manifest.json");
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(Array.isArray(manifest.content_scripts)).toBe(true);
    expect(manifest.content_scripts.length).toBeGreaterThan(0);

    const contentScript = manifest.content_scripts[0];
    expect(contentScript).toHaveProperty("matches");
    expect(contentScript).toHaveProperty("js");
  });
});

test.describe("Extension DataPresent — Service Worker", () => {
  test("service-worker.ts existe", () => {
    const swPath = join(EXTENSION_SRC, "background", "service-worker.ts");
    const content = readFileSync(swPath, "utf-8");

    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
  });

  test("service-worker.ts contient des écouteurs d'événements chrome", () => {
    const swPath = join(EXTENSION_SRC, "background", "service-worker.ts");
    const content = readFileSync(swPath, "utf-8");

    // Should have chrome.runtime listeners
    expect(content).toContain("chrome.runtime.onInstalled");
    expect(content).toContain("chrome.runtime.onMessage");

    // Should have context menu setup
    expect(content).toContain("chrome.contextMenus");
  });

  test("service-worker.ts importe les types de messages", () => {
    const swPath = join(EXTENSION_SRC, "background", "service-worker.ts");
    const content = readFileSync(swPath, "utf-8");

    expect(content).toContain("ExtensionMessage");
    expect(content).toContain("MessageResponse");
  });
});

test.describe("Extension DataPresent — Popup UI", () => {
  test("popup.html existe et contient les éléments requis", () => {
    const popupPath = join(EXTENSION_SRC, "popup", "popup.html");
    const content = readFileSync(popupPath, "utf-8");

    expect(content).toContain("DataPresent");
    expect(content).toContain("btn-capture");
    expect(content).toContain("btn-view-reports");
  });

  test("popup.html a une structure de base complète", () => {
    const popupPath = join(EXTENSION_SRC, "popup", "popup.html");
    const content = readFileSync(popupPath, "utf-8");

    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("<html");
    expect(content).toContain("<head>");
    expect(content).toContain("</head>");
    expect(content).toContain("<body>");
    expect(content).toContain("</body>");
    expect(content).toContain("</html>");
  });

  test("popup.html a un affichage de statut de connexion", () => {
    const popupPath = join(EXTENSION_SRC, "popup", "popup.html");
    const content = readFileSync(popupPath, "utf-8");

    expect(content).toContain("connection-status");
    expect(content).toContain("status-dot");
    expect(content).toContain("status-text");
  });

  test("popup.html charge le script popup.js", () => {
    const popupPath = join(EXTENSION_SRC, "popup", "popup.html");
    const content = readFileSync(popupPath, "utf-8");

    expect(content).toContain('<script src="popup.js"></script>');
  });

  test("popup.ts existe et initialise les écouteurs DOM", () => {
    const popupTsPath = join(EXTENSION_SRC, "popup", "popup.ts");
    const content = readFileSync(popupTsPath, "utf-8");

    expect(content).toContain("btn-capture");
    expect(content).toContain("btn-view-reports");
    expect(content).toContain("DOMContentLoaded");
    expect(content).toContain("chrome.runtime.sendMessage");
  });
});

test.describe("Extension DataPresent — Content Script", () => {
  test("content-script.ts existe et contient des écouteurs de messages", () => {
    const csPath = join(EXTENSION_SRC, "content", "content-script.ts");
    const content = readFileSync(csPath, "utf-8");

    expect(content).toContain("chrome.runtime.onMessage");
    expect(content).toContain("CAPTURE_SELECTION");
    expect(content).toContain("CAPTURE_TABLE");
    expect(content).toContain("CAPTURE_PAGE");
  });

  test("content-script.ts a des handlers pour chaque type de message", () => {
    const csPath = join(EXTENSION_SRC, "content", "content-script.ts");
    const content = readFileSync(csPath, "utf-8");

    expect(content).toContain("handleCaptureSelection");
    expect(content).toContain("handleCaptureTable");
    expect(content).toContain("handleCapturePage");
    expect(content).toContain("handleHighlightElements");
    expect(content).toContain("handleClearHighlights");
  });

  test("content-script.ts a des helpers de métadonnées", () => {
    const csPath = join(EXTENSION_SRC, "content", "content-script.ts");
    const content = readFileSync(csPath, "utf-8");

    expect(content).toContain("getPageMetadata");
    expect(content).toContain("window.location.href");
    expect(content).toContain("document.title");
  });
});

test.describe("Extension DataPresent — Système de typage des messages", () => {
  test("messages.ts exporte les types de messages", () => {
    const msgPath = join(EXTENSION_SRC, "types", "messages.ts");
    const content = readFileSync(msgPath, "utf-8");

    expect(content).toContain("ExtensionMessage");
    expect(content).toContain("MessageResponse");
    expect(content).toContain("MessageName");
  });

  test("messages.ts définit tous les noms de messages", () => {
    const msgPath = join(EXTENSION_SRC, "types", "messages.ts");
    const content = readFileSync(msgPath, "utf-8");

    const messageNames = [
      "CAPTURE_SELECTION",
      "CAPTURE_TABLE",
      "CAPTURE_PAGE",
      "GET_CONNECTION_STATUS",
      "HIGHLIGHT_ELEMENTS",
      "CLEAR_HIGHLIGHTS",
      "CAPTURE_RESULT",
      "CONNECTION_STATUS_RESULT",
    ];

    for (const name of messageNames) {
      expect(content).toContain(name);
    }
  });

  test("messages.ts définit des interfaces pour chaque type de message", () => {
    const msgPath = join(EXTENSION_SRC, "types", "messages.ts");
    const content = readFileSync(msgPath, "utf-8");

    const interfaces = [
      "CaptureSelectionMessage",
      "CaptureTableMessage",
      "CapturePageMessage",
      "GetConnectionStatusMessage",
      "CaptureResultMessage",
      "ConnectionStatusResultMessage",
    ];

    for (const iface of interfaces) {
      expect(content).toContain(iface);
    }
  });
});
