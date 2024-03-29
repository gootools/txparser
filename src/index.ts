import { sendJSON } from "@gootools/cloudflare-stuff/dist/mjs/workers/sendJSON";
import { worker } from "@gootools/cloudflare-stuff/dist/mjs/workers/worker";
import { parseTransaction } from "./parser";

// match /tx/SIGNATURE requests
worker.get(/^\/tx\/([^/]+)$/, (_, match) => parseTransaction(match[1]));

// ignore favicon
worker.get("/favicon.ico", () => new Response());

// default response
worker.get("/", () => sendJSON({ ping: "pong" }));

addEventListener("fetch", (event) => {
  event.respondWith(worker.handleRequest(event));
});
