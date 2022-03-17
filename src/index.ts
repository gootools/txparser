// import { handleRequest } from "./handler";
import { sendJSON } from "@gootools/cloudflare-stuff/dist/mjs/workers/sendJSON";
import { worker } from "@gootools/cloudflare-stuff/dist/mjs/workers/worker";
import { parseTransaction } from "./parser";

worker.get("/favicon.ico", () => new Response());

worker.get(/^\/tx\/([^/]+)$/, (_, match) => parseTransaction(match[1]));

worker.get("/", () => sendJSON({ ping: "pong" }));

addEventListener("fetch", (event) => {
  event.respondWith(worker.handleRequest(event));
});
