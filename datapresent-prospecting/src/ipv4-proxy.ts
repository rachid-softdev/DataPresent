import type { Server } from "node:http";
import { createServer, request as httpRequest } from "node:http";
import { connect } from "node:net";

export interface Ipv4Proxy {
  port: number;
  close(): Promise<void>;
}

/**
 * Mini-proxy HTTP local qui force toutes les connexions sortantes en IPv4
 * (family: 4). Utilisé quand l'IPv6 de l'opérateur est flaggée par Google
 * (page "trafic exceptionnel" / sorry) alors que l'IPv4 ne l'est pas.
 *
 * Chrome s'y connecte via --proxy-server=http://127.0.0.1:<port> :
 * - HTTPS : tunnel CONNECT (relai TCP brut en IPv4)
 * - HTTP  : requêtes forwardées via http.request (family 4)
 */
export function startIpv4Proxy(port = 0): Promise<Ipv4Proxy> {
  const server: Server = createServer((req, res) => {
    // Requête HTTP directe (non-CONNECT) : forward en IPv4.
    const host = req.headers.host;
    if (!host) {
      res.writeHead(400).end();
      return;
    }
    const [hostname, portStr] = host.split(":");
    const targetPort = portStr ? Number(portStr) : 80;
    const upstream = httpRequest(
      {
        host: hostname,
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
        family: 4,
      },
      (upRes) => {
        res.writeHead(upRes.statusCode ?? 502, upRes.headers);
        upRes.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502).end();
    });
    req.pipe(upstream);
  });

  // Tunnel CONNECT (HTTPS) : relai TCP brut vers l'hôte cible en IPv4.
  server.on("connect", (req, clientSocket, head) => {
    const [hostname, portStr] = (req.url ?? "").split(":");
    const targetPort = portStr ? Number(portStr) : 443;
    const remote = connect({ host: hostname, port: targetPort, family: 4 });
    remote.on("connect", () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head && head.length > 0) remote.write(head);
      clientSocket.pipe(remote);
      remote.pipe(clientSocket);
    });
    remote.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => remote.destroy());
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        port: typeof address === "object" && address ? address.port : 0,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
