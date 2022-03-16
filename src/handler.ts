import { sendJSON } from "@gootools/cloudflare-stuff";
import { parseTransaction } from "./parser";

export async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === "/favicon.ico") return new Response();
  else if (pathname.match(/^\/tx\/([^/]+)$/)) {
    const match = pathname.match(/^\/tx\/([^/]+)$/);
    return parseTransaction(match![1]);
  } else if (pathname === "/") return sendJSON({ ping: "pong" });

  return new Response(`request method: ${request.method}`);
}
