/* Agentation — click an element on the page, leave a note, and the agent picks
   it up through the MCP server on :4747.

   Dev only, on purpose. Agentation is a React component and this site ships no
   framework, so React is pulled from a CDN and mounted only when the page is
   served from localhost. Nothing here reaches gzowo.fun: the guard returns
   before a single byte is fetched. Requires `npx agentation-mcp server`. */

const LOCAL = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"];
if (LOCAL.includes(location.hostname)) {
  const ENDPOINT = "http://localhost:4747";

  // No point loading React if the annotation server is not up.
  fetch(ENDPOINT + "/health", { mode: "cors" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
    .then(async () => {
      const REACT = "https://esm.sh/react@18.3.1";
      const [{ default: React }, { createRoot }, { Agentation }] = await Promise.all([
        import(REACT),
        import("https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1"),
        import("https://esm.sh/agentation@3.0.2?deps=react@18.3.1,react-dom@18.3.1"),
      ]);

      const host = document.createElement("div");
      host.id = "agentation-root";
      document.body.appendChild(host);
      createRoot(host).render(React.createElement(Agentation, { endpoint: ENDPOINT }));
      console.info("[agentation] toolbar mounted — annotations go to " + ENDPOINT);
    })
    .catch(() => {
      console.info("[agentation] server not reachable on " + ENDPOINT + " — run: npx agentation-mcp server");
    });
}
