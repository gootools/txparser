import type { RawTransaction } from "./types";
import { sendJSON, tryFetching } from "./lib/net";

export const parseTransaction = async (signature: string) => {
  const raw = await tryFetching<RawTransaction>({
    method: "getTransaction",
    params: [signature, "jsonParsed"],
  });
  const changes = {};

  const missingOwners = Array.from(
    new Set([
      ...raw.meta.preTokenBalances
        .filter((pre) => !pre.owner)
        .map((p) => raw.transaction.message.accountKeys[p.accountIndex].pubkey),
      ...raw.meta.postTokenBalances
        .filter((post) => !post.owner)
        .map((p) => raw.transaction.message.accountKeys[p.accountIndex].pubkey),
    ])
  );

  const owners = {};

  const accounts = await tryFetching<{
    data: {
      owner: string;
    };
  }>({
    method: "getMultipleAccounts",
    params: [missingOwners, { encoding: "jsonParsed" }],
  });

  accounts.value.forEach((a, i) => {
    owners[missingOwners[i]] = a.data.parsed.info.owner;
  });

  raw.meta.postTokenBalances.forEach((po) => {
    const prev = raw.meta.preTokenBalances.find(
      (p) => p.accountIndex === po.accountIndex
    );

    const owner =
      po.owner ??
      owners[raw.transaction.message.accountKeys[po.accountIndex].pubkey];

    if (prev) {
      const verb =
        prev.uiTokenAmount.uiAmount > po.uiTokenAmount.uiAmount
          ? "SENT"
          : "RECEIVED";

      const difference =
        Math.abs(
          Number(prev.uiTokenAmount.amount) - Number(po.uiTokenAmount.amount)
        ) /
        10 ** po.uiTokenAmount.decimals;

      if (difference > 0) {
        changes[owner] ??= [];
        changes[owner].push(`${verb} ${difference} ${po.mint}`);
      }
    } else if (po.uiTokenAmount.uiAmount > 0) {
      changes[owner] ??= [];
      changes[owner].push(
        `RECEIVED ${po.uiTokenAmount.uiAmountString} ${po.mint}`
      );
    }
  });

  raw.meta.postBalances.forEach((po, i) => {
    // ignore if owner is Token program
    if (raw.meta.preBalances[i] !== po) {
      const { pubkey } = raw.transaction.message.accountKeys[i];

      const difference =
        Math.abs(Number(po) - Number(raw.meta.preBalances[i])) / 10 ** 9;

      const verb = po < raw.meta.preBalances[i] ? "SENT" : "RECEIVED";

      changes[pubkey] ??= [];
      changes[pubkey].push(`${verb} ${difference} SOL`);
    }
  });

  return sendJSON({
    signature,
    status: raw.meta.err ? "failed" : "success",
    at: new Date(raw.blockTime * 1000).toISOString(),
    changes,
    raw,
  });
};
