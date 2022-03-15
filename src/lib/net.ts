export const sendJSON = (payload) => {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json",
    },
  });
};
