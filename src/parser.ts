import { sendJSON } from "./lib/net";

export const parseTransaction = (signature: string) => {
  return sendJSON({ signature });
};
