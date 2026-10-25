// Builds one report: node build.mjs <report dir>
// The dir holds app.jsx and data.json (with a "title"); the page is written to <dir>/index.html.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const dir = resolve(process.argv[2] ?? join(here, "examples", "bleep-timing"));
const rb = join(here, "vendor", "react-bits");

// React Bits ships ES modules; each is wrapped in an IIFE that pulls its imports off the UMD globals.
const PRELUDES = {
  SplitText: [
    "const { useEffect, useLayoutEffect, useRef, useState } = React;",
    "const GSAPSplitText = window.SplitText;",
    "const useGSAP = window.useGSAP;",
  ].join("\n"),
  Waves: "const { useEffect, useRef } = React;",
  SpotlightCard: "const { useEffect, useRef } = React;",
};
// SplitText is renamed so it doesn't shadow GSAP's SplitText global.
const EXPORTS = { SplitText: "RBSplitText", Waves: "Waves", SpotlightCard: "SpotlightCard" };

function wrap(name, file) {
  const body = readFileSync(file, "utf8")
    .replace(/^'use client';\s*/m, "")
    .replace(/^import[^;]*;\s*$/gm, "")
    .replace(/^export default \w+;\s*$/m, "");
  return `const ${EXPORTS[name]} = (() => {\n${PRELUDES[name]}\n${body}\nreturn ${name};\n})();\n`;
}

const components = [
  wrap("SplitText", join(rb, "SplitText", "SplitText.jsx")),
  wrap("Waves", join(rb, "Waves.jsx")),
  wrap("SpotlightCard", join(rb, "SpotlightCard.jsx")),
].join("\n");

const app = readFileSync(join(dir, "app.jsx"), "utf8").replace(/<SplitText\b/g, "<RBSplitText");

const js = execFileSync(
  "npx",
  ["-y", "esbuild@0.24.2", "--loader=jsx", "--jsx-factory=React.createElement", "--jsx-fragment=React.Fragment", "--target=es2020", "--minify"],
  { input: `${components}\n${app}`, encoding: "utf8", maxBuffer: 1 << 26 }
);

const css = ["Waves.css", "SpotlightCard.css"].map((f) => readFileSync(join(rb, f), "utf8")).join("\n");
const data = readFileSync(join(dir, "data.json"), "utf8");
const title = JSON.parse(data).title ?? "Benchmark Report";

const html = readFileSync(join(here, "template.html"), "utf8")
  .replace("__TITLE__", () => title)
  .replace("/*__COMPONENT_CSS__*/", () => css)
  .replace("/*__DATA__*/", () => data)
  .replace("/*__APP__*/", () => js.replace(/<\/script/gi, "<\\/script"));

writeFileSync(join(dir, "index.html"), html);
console.log(`wrote ${join(dir, "index.html")} (${(html.length / 1024).toFixed(1)} KB)`);
