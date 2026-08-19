import { afterEach, describe, expect, it, vi } from "vitest";

// La clé doit exister AVANT l'import des modules (env.ts est parsé au chargement).
vi.stubEnv("GROQ_API_KEY", "gsk-test-key-1234567890");

const { groqChat, groqJson, parseLlmJson } = await import("../ai/groq.js");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
      json: async () => body,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("groqChat", () => {
  it("appelle l'endpoint Groq avec la clé et retourne le texte", async () => {
    mockFetchOnce(200, { choices: [{ message: { content: "  Bonjour  " } }] });
    const fetchMock = vi.mocked(fetch);

    const result = await groqChat("sys", "user prompt", { model: "llama-3.3-70b-versatile" });

    expect(result.text).toBe("Bonjour");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(GROQ_URL);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer gsk-test-key-1234567890");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("llama-3.3-70b-versatile");
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "user prompt" },
    ]);
  });

  it("retry sur HTTP 429 puis réussit", async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "rate limited",
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
        json: async () => ({ choices: [{ message: { content: "ok" } }] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await groqChat("", "prompt");
    expect(result.text).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("groqJson", () => {
  it("parse la réponse JSON de l'API (fences + virgule traînante)", async () => {
    mockFetchOnce(200, {
      choices: [{ message: { content: '```json\n{"score": 80,}\n```' } }],
    });
    const result = await groqJson<{ score: number }>("", "prompt");
    expect(result).toEqual({ score: 80 });
  });
});

describe("parseLlmJson", () => {
  it("lève si aucun objet JSON trouvé", () => {
    expect(() => parseLlmJson("pas de json ici")).toThrow();
  });
});
