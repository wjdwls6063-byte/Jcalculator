import { bootstrap } from "../../api-client.js";

await bootstrap("vertical");
const { a: createRootModule, i: verticalDefaults, o: React, r: jsxRuntime, t: AxisApp } = await import("./globals-api.js");
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root 요소를 찾지 못했습니다.");
createRootModule().createRoot(rootElement).render(
  jsxRuntime().jsx(React().StrictMode, {
    children: jsxRuntime().jsx(AxisApp, { initialInputs: verticalDefaults }),
  }),
);
