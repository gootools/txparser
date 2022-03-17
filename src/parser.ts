import { sendJSON } from "@gootools/cloudflare-stuff";
import { tryFetching } from "./lib/net";
import type { RawTransaction } from "./types";

declare const TOKENS: KVNamespace;

const mintCache = {};

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

  const accounts = await tryFetching<any>({
    method: "getMultipleAccounts",
    params: [missingOwners, { encoding: "jsonParsed" }],
  });

  accounts.value.forEach((a, i) => {
    owners[missingOwners[i]] = a.data.parsed.info.owner;
  });

  for (const po of raw.meta.postTokenBalances) {
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
        changes[owner].push(
          `${verb} ${difference} ${await mintSymbolOrAddress(po.mint)}`
        );
      }
    } else if (po.uiTokenAmount.uiAmount > 0) {
      changes[owner] ??= [];
      changes[owner].push(
        `RECEIVED ${
          po.uiTokenAmount.uiAmountString
        } ${await mintSymbolOrAddress(po.mint)}`
      );
    }
  }

  raw.meta.postBalances.forEach((po, i) => {
    // TODO: ignore if owner is Token program?
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

const mintSymbolOrAddress = async (mintAddress: string) => {
  // TODO: make cache async friendly
  if (mintCache[mintAddress]) return mintCache[mintAddress];

  let result: any;
  const tokenList: Record<string, any> | null = await TOKENS.get("list", {
    type: "json",
  });
  if (tokenList?.tokens[mintAddress]?.symbol) {
    result = tokenList.tokens[mintAddress].symbol;
  } else {
    try {
      const url = `https://metaplex-api.goo.tools/${mintAddress}`;
      console.log({ url });
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const metadata: any = await res.json();
      console.log({ metadata });
      result = metadata.name;
    } catch (err) {
      console.error(err);
      result = mintAddress;
    }
  }

  mintCache[mintAddress] = result;
  return result;
};
