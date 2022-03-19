/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendJSON } from "@gootools/cloudflare-stuff/dist/mjs/workers/sendJSON";
import { tryFetching } from "@gootools/solana-stuff/dist/mjs/tryFetching";
import { config } from "./config";

declare const TOKENS: KVNamespace;

const rpcFetch = tryFetching(config.rpcs);

export const parseTransaction = async (signature: string) => {
  const { result: raw } = await rpcFetch<RawTransaction>({
    method: "getTransaction",
    params: [signature, "jsonParsed"],
  });

  // XXX: meta.[pre|post]TokenBalances.owner[*] might be missing sometimes, see
  // https://phantom-wallet.slack.com/archives/C0363QKRC5B/p1647633283451949
  const missingOwnerPubkeys = Array.from(
    new Set([
      ...raw.meta.preTokenBalances
        .filter((pre) => !pre.owner)
        .map((p) => raw.transaction.message.accountKeys[p.accountIndex].pubkey),
      ...raw.meta.postTokenBalances
        .filter((post) => !post.owner)
        .map((p) => raw.transaction.message.accountKeys[p.accountIndex].pubkey),
    ])
  );
  const { result: accounts } = await rpcFetch<any>({
    method: "getMultipleAccounts",
    params: [missingOwnerPubkeys, { encoding: "jsonParsed" }],
  });
  const ownerOfPubkey: Record<string, string> = {};
  accounts.value.forEach((a, i) => {
    ownerOfPubkey[missingOwnerPubkeys[i]] = a.data.parsed.info.owner;
  });

  // check for token balance changes (SPL/NFT transfer) --------

  const changes: Record<string, Array<string>> = {};

  for (const postTokenBalance of raw.meta.postTokenBalances) {
    const prev = raw.meta.preTokenBalances.find(
      (p) => p.accountIndex === postTokenBalance.accountIndex
    );

    const owner =
      postTokenBalance.owner ??
      ownerOfPubkey[
        raw.transaction.message.accountKeys[postTokenBalance.accountIndex]
          .pubkey
      ];

    const getMint = mintSymbolOrAddress({});

    if (prev) {
      const verb =
        prev.uiTokenAmount.uiAmount > postTokenBalance.uiTokenAmount.uiAmount
          ? "SENT"
          : "RECEIVED";

      const difference =
        Math.abs(
          Number(prev.uiTokenAmount.amount) -
            Number(postTokenBalance.uiTokenAmount.amount)
        ) /
        10 ** postTokenBalance.uiTokenAmount.decimals;

      if (difference > 0) {
        changes[owner] ??= [];
        const mint = await getMint(postTokenBalance.mint);
        if (mint.includes("'") && difference === 1) {
          changes[owner].push(`${verb} ${mint}`);
        } else {
          changes[owner].push(`${verb} ${difference} ${mint}`);
        }
      }
    } else if (postTokenBalance.uiTokenAmount.uiAmount > 0) {
      changes[owner] ??= [];
      const mint = await getMint(postTokenBalance.mint);
      if (
        mint.includes("'") &&
        postTokenBalance.uiTokenAmount.uiAmountString === "1"
      ) {
        changes[owner].push(`RECEIVED ${await getMint(postTokenBalance.mint)}`);
      } else {
        changes[owner].push(
          `RECEIVED ${
            postTokenBalance.uiTokenAmount.uiAmountString
          } ${await getMint(postTokenBalance.mint)}`
        );
      }
    }
  }

  // check if a swap -------------------------------------------

  // if more than 1 token balance changes and interacted only with
  // a known program e.g. Orca DEX Swap v2, assume it is that program
  const ixs = Array.from(
    new Set(
      raw.transaction.message.instructions
        .filter((i) => !i.program)
        .map((i) => i.programId)
    )
  );
  let transactionType:
    | typeof config.dapps[keyof typeof config.dapps][number]
    | undefined;
  if (
    raw.meta.preTokenBalances.length >= 2 &&
    raw.meta.postTokenBalances.length >= 2 &&
    ixs.length === 1 &&
    config.dapps[ixs[0]]
  ) {
    transactionType = config.dapps[ixs[0]];
  }

  // check if a sol transfer -----------------------------------

  raw.meta.postBalances.forEach((postBalance, i) => {
    // TODO: ignore if owner is Token program?
    if (raw.meta.preBalances[i] !== postBalance) {
      const { pubkey } = raw.transaction.message.accountKeys[i];

      let difference =
        Math.abs(Number(postBalance) - Number(raw.meta.preBalances[i])) /
        10 ** 9;

      const verb = postBalance < raw.meta.preBalances[i] ? "SENT" : "RECEIVED";

      if (verb === "SENT" && raw.meta.fee) {
        const fullFee = raw.meta.fee / 10 ** 9;
        difference -= fullFee;
        changes[pubkey] ??= [];
        changes[pubkey].push(`FEE ${fullFee} SOL`);
      }

      if (difference > 0) {
        changes[pubkey] ??= [];
        changes[pubkey].push(`${verb} ${difference} SOL`);
      }
    }
  });

  // check if memo program was used ----------------------------

  try {
    raw.transaction.message.instructions
      .filter(({ program, parsed }) => program === "spl-memo" && parsed)
      .forEach(({ parsed }) => {
        Object.keys(changes).forEach((k) => {
          changes[k].push(`MEMO [${parsed}]`);
        });
      });
  } catch (err) {
    console.error(err);
  }

  return sendJSON({
    signature,
    status: raw.meta.err ? "failed" : "success",
    at: new Date(raw.blockTime * 1000).toISOString(),
    type: transactionType,
    changes,
    raw,
  });
};

const mintSymbolOrAddress =
  (mintCache = {}) =>
  async (mintAddress: string): Promise<string> => {
    // TODO: make cache async friendly
    if (mintCache[mintAddress]) return mintCache[mintAddress];

    let result: any;
    const tokenList: Record<string, any> | null = await TOKENS.get("list", {
      type: "json",
    });

    // if in SPL token registry then return that metadata from cloudflare KV
    if (tokenList?.tokens[mintAddress]?.symbol) {
      result = tokenList.tokens[mintAddress].symbol;
    } else {
      // if not a known SPL token, check if it's an NFT
      try {
        const url = `https://metaplex-api.goo.tools/${mintAddress}`;
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        const metadata: any = await res.json();
        result = `'${metadata.name}'`;
      } catch (err) {
        // not an NFT or known SPL token, return raw mint address
        result = mintAddress;
      }
    }
    mintCache[mintAddress] = result;
    return result;
  };
