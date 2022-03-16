export const tryFetching = async <K>(payload): Promise<K> => {
  const weightings = {
    // "https://hidden-fragrant-sound.solana-mainnet.quiknode.pro/452fef69b9380554003a55cda8b393bdd23653c8/": 5,
    "https://solana--mainnet.datahub.figment.io/apikey/2bc32aa843d879a0bf1fa63a07efc887/": 10,
    "https://ssc-dao.genesysgo.net": 100,
    "https://api.mainnet-beta.solana.com": 2,
    "https://free.rpcpool.com": 1,
  };

  let endpoints = Object.entries(weightings).reduce(
    (acc: Array<string>, [url, weight]) => {
      for (let i = 0; i < weight; i++) {
        acc.push(url);
      }
      return acc;
    },
    []
  );

  let json;
  let url: string | undefined;
  while (!json && endpoints.length > 0) {
    try {
      url = endpoints.splice(
        Math.floor(Math.random() * endpoints.length),
        1
      )[0];

      endpoints = endpoints.filter((u) => u !== url);

      const data = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          ...payload,
        }),
      });
      json = await data.json();
      console.log(`success ${url}`);
    } catch (err) {
      console.error(`failed ${url}`);
    }
  }

  if (!json?.result)
    throw new Error(`invalid json: ${JSON.stringify({ payload, json })}`);

  return json.result;
};
