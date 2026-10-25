// Screenshots a built report in light (1280px) and dark (400px) and reports overflow and console errors.
// node scripts/screenshot.mjs <report dir>  → <dir>/light.jpg, <dir>/dark.jpg
import { chromium } from "playwright-core";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { readdirSync } from "node:fs";

const dir = resolve(process.argv[2] ?? "examples/bleep-timing");
const cache = join(homedir(), ".cache", "ms-playwright");
const chromiumDir = readdirSync(cache).filter((d) => d.startsWith("chromium-")).sort().pop();
const browser = await chromium.launch({
  executablePath: join(cache, chromiumDir, "chrome-linux64", "chrome"),
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
for (const [scheme, width] of [["light", 1280], ["dark", 400]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("file://" + join(dir, "index.html"), { waitUntil: "networkidle" });
  // Scroll through so every ScrollTrigger animation fires before the capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(2500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: join(dir, `${scheme}.jpg`), fullPage: true, type: "jpeg", quality: 70, scale: "css" });
  console.log(scheme, width, "overflow", overflow, "errors", JSON.stringify(errors));
}
await browser.close();
