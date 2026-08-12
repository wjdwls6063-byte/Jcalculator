import { bootstrap } from "../../api-client.js";

await bootstrap("horizontal");
const { a: createRootModule, n: HorizontalApp, o: React, r: jsxRuntime } = await import("./globals-api.js");
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root 요소를 찾지 못했습니다.");
createRootModule().createRoot(rootElement).render(
  jsxRuntime().jsx(React().StrictMode, { children: jsxRuntime().jsx(HorizontalApp, {}) }),
);
