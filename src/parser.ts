/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendJSON } from "@gootools/cloudflare-stuff/dist/mjs/workers/sendJSON";
import { tryFetching } from "@gootools/solana-stuff/dist/mjs/tryFetching";
import dapps from "./dapps.json";

declare const TOKENS: KVNamespace;

const rpcFetch = tryFetching({
  "https://solana-mainnet.phantom.tech/96e7934d918f104366b5742d7613": 100,
  // "https://hidden-fragrant-sound.solana-mainnet.quiknode.pro/452fef69b9380554003a55cda8b393bdd23653c8/": 100,
  // "https://solana--mainnet.datahub.figment.io/apikey/2bc32aa843d879a0bf1fa63a07efc887/": 4,
  // "https://ssc-dao.genesysgo.net": 100,
  // "https://api.mainnet-beta.solana.com": 2,
  // "https://free.rpcpool.com": 1,
});

export const parseTransaction = async (signature: string) => {
  const { result: raw } = await rpcFetch<RawTransaction>({
    method: "getTransaction",
    params: [signature, "jsonParsed"],
  });

  const changes: Record<string, Array<string>> = {};

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

  for (const po of raw.meta.postTokenBalances) {
    const prev = raw.meta.preTokenBalances.find(
      (p) => p.accountIndex === po.accountIndex
    );

    const owner =
      po.owner ??
      ownerOfPubkey[
        raw.transaction.message.accountKeys[po.accountIndex].pubkey
      ];

    const getMint = mintSymbolOrAddress({});

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
        const mint = await getMint(po.mint);
        if (mint.includes("'") && difference === 1) {
          changes[owner].push(`${verb} ${mint}`);
        } else {
          changes[owner].push(`${verb} ${difference} ${mint}`);
        }
      }
    } else if (po.uiTokenAmount.uiAmount > 0) {
      changes[owner] ??= [];
      const mint = await getMint(po.mint);
      if (mint.includes("'") && po.uiTokenAmount.uiAmountString === "1") {
        changes[owner].push(`RECEIVED ${await getMint(po.mint)}`);
      } else {
        changes[owner].push(
          `RECEIVED ${po.uiTokenAmount.uiAmountString} ${await getMint(
            po.mint
          )}`
        );
      }
    }
  }

  const ixs = Array.from(
    new Set(
      raw.transaction.message.instructions
        .filter((i) => !i.program)
        .map((i) => i.programId)
    )
  );

  let transactionType: typeof dapps[keyof typeof dapps][number] | undefined;
  if (
    raw.meta.preTokenBalances.length >= 2 &&
    raw.meta.postTokenBalances.length >= 2 &&
    ixs.length === 1 &&
    dapps[ixs[0]]
  ) {
    transactionType = dapps[ixs[0]];
  }

  raw.meta.postBalances.forEach((po, i) => {
    // TODO: ignore if owner is Token program?
    if (raw.meta.preBalances[i] !== po) {
      const { pubkey } = raw.transaction.message.accountKeys[i];

      let difference =
        Math.abs(Number(po) - Number(raw.meta.preBalances[i])) / 10 ** 9;

      const verb = po < raw.meta.preBalances[i] ? "SENT" : "RECEIVED";

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

  try {
    raw.transaction.message.instructions
      .filter((i) => i.program === "spl-memo" && i.parsed)
      .forEach(({ parsed }: any) => {
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
    if (tokenList?.tokens[mintAddress]?.symbol) {
      result = tokenList.tokens[mintAddress].symbol;
    } else {
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
        // console.error(err);
        result = mintAddress;
      }
    }
    mintCache[mintAddress] = result;
    return result;
  };
