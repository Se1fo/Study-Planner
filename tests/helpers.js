import fs from "fs";
import { createRequire } from "module";
import { expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const seeds = new URL("./seeds/", import.meta.url);

// Shared bits for every spec: a browser wrapper that blocks the service worker (so each test
// always gets the files on disk), a soft check that reports every failing step by name,
// and the seed scripts that fill the planner with sample data.
export function setup(browser, baseURL) {
  const origin = baseURL.replace(/\/$/, "");
  return {
    b: { newContext: (o = {}) => browser.newContext({ serviceWorkers: "block", ...o }) },
    ok: (name, cond) => expect.soft(cond, name).toBeTruthy(),
    SEED: file => fs.readFileSync(new URL(file, seeds), "utf8"),
    get AXE_SRC() { return fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8"); },
    PAGE: origin + "/index.html",
    ORIGIN: origin,
  };
}
