import http from "http";
import net from "net";

const TARGET_PORT = 5000;
const PROXY_PORT = Number(process.env.PORT ?? 25636);

const server = http.createServer((req, res) => {
  // Health / readiness probe — always respond 200 so the platform port-check passes
  if (req.url === "/__health" || req.url === "/__replco/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  const options = {
    host: "localhost",
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${TARGET_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", () => {
    // Return a loading page while the frontend starts up
    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2"><title>Loading…</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>Starting AideaCreative…</p></body></html>`);
  });

  req.pipe(proxyReq, { end: true });
});

// WebSocket / HMR tunnel support
server.on("upgrade", (req, clientSocket, head) => {
  const targetSocket = net.connect(TARGET_PORT, "localhost", () => {
    const requestLine = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    targetSocket.write(requestLine + headers + "\r\n\r\n");
    if (head && head.length) targetSocket.write(head);
    targetSocket.pipe(clientSocket);
    clientSocket.pipe(targetSocket);
  });
  targetSocket.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => targetSocket.destroy());
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`Canvas proxy ready on :${PROXY_PORT} → localhost:${TARGET_PORT}`);
});
