import fetch from "isomorphic-fetch";

const tests = {
  "725aj4pZrzEPqoaDbY1JXvcLrT3c4thFAPAj67dD1kdZZ2c24eudvZ9mwTp4b5nTTvnuF4oy5LKCbFFyQCLhASA":
    {
      name: "phantom swap",
      changes: {
        "2qiomPg9yNuRBb1kuMAiiBNzDj3RUVAV2TBGtZ4dLR1c": [
          "RECEIVED 0.150007 USDC",
          "SENT 1 MNGO",
          "FEE 0.000005 SOL",
        ],
        // "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1": [
        //   "RECEIVED 1 MNGO",
        //   "SENT 0.150007 USDC",
        // ],
      },
    },
  "4wRhWRB9aXr27uWxCv2zJE7rvuwCUdpQ1XYSpTQXxDcXhzFkZ5HcpNV6GgepJFbhAjXoF27iYkH24ijVdhut6qbY":
    {
      name: "NFT transfer",
      changes: {
        "83DBn6ptfyVS7Xv15HakEM3EuMCyt316b1423EJ6gf5Z": [
          "RECEIVED 'Daemon #815'",
        ],
        "2qiomPg9yNuRBb1kuMAiiBNzDj3RUVAV2TBGtZ4dLR1c": [
          "SENT 'Daemon #815'",
          "FEE 0.000005 SOL",
          "SENT 0.00203928 SOL",
        ],
        // "4UtgA3iEi1DofLo5oE2FZHvqdZTjZ8noAXpd8Z6GAT5D": [
        //   "RECEIVED 0.00203928 SOL",
        // ],
      },
    },
  "1SyNVsJVJxbKPX3KAtaMKnyGM8XWvFph111uB2rFcaynbZG9A2zp1qP9yqR4QEjetBzSFem87HZBP4KvDy1DGVx":
    {
      name: "SOL transfer + Memo",
      changes: {
        FLARQdNnEz8qzGD5oS67eZbSmY94dqx5RheRXJmHjsaX: [
          "FEE 0.000005 SOL",
          "SENT 0.000375 SOL",
          "MEMO [Week#24 2022-03-14 minter rewards @0.000375 sol/kat]",
        ],
        "6ygk428uaLYS75LxoTbikJSx8yXJ9BQzjeWQUu8ehymR": [
          "RECEIVED 0.000375 SOL",
          "MEMO [Week#24 2022-03-14 minter rewards @0.000375 sol/kat]",
        ],
      },
    },
};

describe("transactions", () => {
  Object.entries(tests).forEach(([sig, { name, changes }]) => {
    test(name, async () => {
      console.time(name);
      const req = await fetch(
        `https://txparser.gootools.workers.dev/tx/${sig}`
      );
      console.timeEnd(name);
      const res = await req.json();
      expect(res.changes).toMatchObject(changes);
    });
  });
});
