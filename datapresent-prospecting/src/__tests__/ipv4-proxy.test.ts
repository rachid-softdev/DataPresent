import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { connect, createServer as createNetServer } from "node:net";
import { describe, expect, it } from "vitest";
import { startIpv4Proxy } from "../ipv4-proxy.js";

describe("startIpv4Proxy", () => {
  it("forwarde une requête HTTP directe vers un serveur local", async () => {
    const target = createHttpServer((req, res) => {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
    });
    await new Promise<void>((r) => target.listen(0, "127.0.0.1", r));
    const address = target.address();
    const targetPort = typeof address === "object" && address ? address.port : 0;

    const proxy = await startIpv4Proxy();
    try {
      const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = httpRequest(
          {
            host: "127.0.0.1",
            port: proxy.port,
            path: "/",
            method: "GET",
            headers: { host: `127.0.0.1:${targetPort}` },
          },
          (response) => {
            let body = "";
            response.on("data", (c) => (body += c));
            response.on("end", () => resolve({ status: response.statusCode ?? 0, body }));
          },
        );
        req.on("error", reject);
        req.end();
      });
      expect(res.status).toBe(200);
      expect(res.body).toBe("ok");
    } finally {
      await proxy.close();
      await new Promise<void>((r) => target.close(() => r()));
    }
  });

  it("établit un tunnel CONNECT et relaie les données", async () => {
    // Serveur TCP "cible" (simule un hôte HTTPS).
    const target = createNetServer((socket) => {
      socket.write("hello");
      socket.end();
    });
    await new Promise<void>((r) => target.listen(0, "127.0.0.1", r));
    const address = target.address();
    const targetPort = typeof address === "object" && address ? address.port : 0;

    const proxy = await startIpv4Proxy();
    try {
      const socket = connect({ host: "127.0.0.1", port: proxy.port, family: 4 });
      const data = await new Promise<string>((resolve, reject) => {
        let buffer = "";
        socket.once("error", reject);
        socket.write(
          `CONNECT 127.0.0.1:${targetPort} HTTP/1.1\r\nHost: 127.0.0.1:${targetPort}\r\n\r\n`,
        );
        socket.on("data", (chunk) => {
          buffer += chunk.toString();
          if (buffer.includes("200 Connection Established")) {
            // Le relai du serveur cible peut arriver dans le même chunk.
            const hello = buffer.replace(/^HTTP\/1\.1 200 Connection Established\r\n\r\n/, "");
            if (hello) {
              socket.removeAllListeners("data");
              resolve(hello);
            }
          }
        });
        setTimeout(() => reject(new Error("timeout")), 5000);
      });
      expect(data).toBe("hello");
      socket.destroy();
    } finally {
      await proxy.close();
      await new Promise<void>((r) => target.close(() => r()));
    }
  });
});
