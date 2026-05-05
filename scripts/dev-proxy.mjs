import { createServer, request as httpRequest } from "node:http";
import { connect } from "node:net";

const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? "3000");
const TARGET_PORT = parseInt(process.env.TARGET_PORT ?? "5000");

const server = createServer((req, res) => {
  const opts = {
    hostname: "127.0.0.1",
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${TARGET_PORT}` },
  };

  const proxy = httpRequest(opts, (upstream) => {
    res.writeHead(upstream.statusCode ?? 200, upstream.headers);
    upstream.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    res.writeHead(503, { "content-type": "text/html" });
    res.end("<h3>Starting up… please wait a moment and refresh.</h3>");
  });

  req.pipe(proxy, { end: true });
});

server.on("upgrade", (req, socket, head) => {
  const upstream = connect(TARGET_PORT, "127.0.0.1", () => {
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    upstream.write(
      `GET ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`
    );
    if (head?.length) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`dev-proxy :${PROXY_PORT} → localhost:${TARGET_PORT}`);
});
