/*
 * End-to-end smoke test — drives the real app in headless Chrome against the LIVE
 * external APIs (Firebase, Nominatim, Overpass, USDA, OpenFoodFacts).
 *
 * This is NOT part of `node --test` (that runs the pure unit suite in scan-engine.test.js).
 * It creates a throwaway Firebase account, exercises the main flows, and deletes the
 * account through the app's own delete-account flow at the end.
 *
 * PREREQUISITES (none are committed — install ad hoc when you want to run this):
 *   1. A local static server on :8899 from the repo root:
 *        python3 -m http.server 8899
 *   2. puppeteer-core + a real Chrome:
 *        npm install puppeteer-core
 *      Edit CHROME below if your Chrome lives elsewhere.
 *
 * RUN:  node test/e2e.mjs
 *
 * Requires network + working Firebase project (see HANDOFF.md). If Firebase auth is
 * misconfigured, STEP 2 (signup) will hang — that's the canary for a broken deploy.
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:8899/";
const EMAIL = `audit-e2e-${Date.now()}@example.com`;
const PASS = "TestPass123!";
const errors = [];
const log = (...a) => console.log("[e2e]", ...a);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("favicon")) errors.push("CONSOLE: " + m.text()); });

const waitText = (t, ms = 30000) => page.waitForFunction((x) => document.body.innerText.includes(x), { timeout: ms }, t);
const clickBtn = async (t) => {
  const ok = await page.evaluate((x) => {
    const b = [...document.querySelectorAll("button")].find((e) => e.innerText.trim().includes(x));
    if (b) { b.click(); return true; }
    return false;
  }, t);
  if (!ok) throw new Error(`button not found: "${t}"`);
  await new Promise((r) => setTimeout(r, 500));
};
const typeInto = async (ph, v) => {
  for (let i = 0; i < 6; i++) {
    const h = await page.$(`input[placeholder*="${ph}"], textarea[placeholder*="${ph}"]`);
    if (h) { await h.click({ clickCount: 3 }); await h.type(v, { delay: 5 }); return; }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`input not found: "${ph}"`);
};
const bodyHas = (t) => page.evaluate((x) => document.body.innerText.includes(x), t);

try {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await waitText("Welcome back", 45000);
  log("STEP 1 PASS — app compiled & login rendered");

  await clickBtn("Sign Up");
  await typeInto("Your name", "E2E Bot");
  await typeInto("Your email address", EMAIL);
  await typeInto("Choose a password", PASS);
  await clickBtn("Continue →");
  await waitText("Select your allergens", 15000);
  await clickBtn("Dairy / Milk");
  await clickBtn("Peanuts");
  await clickBtn("Create Account (2 allergens)");
  await waitText("Hello, E2E Bot", 30000);
  log("STEP 2 PASS — signup + Firestore write + server verify");

  await clickBtn("Start Scanning");
  await waitText("Ingredient Scanner", 10000);
  await clickBtn("Manual");
  await typeInto("Item name", "E2E Test Item");
  await typeInto("Paste or type ingredient list", "sugar, peanut butter, soy milk, natural flavors");
  await clickBtn("Scan for Allergens");
  await waitText("Contains Allergens", 15000);
  const attribution = await page.evaluate(() =>
    [...document.querySelectorAll("div")].filter((d) => d.innerText.trim().startsWith("peanut butter"))
      .some((r) => r.innerText.includes("Peanuts") && !r.innerText.includes("Dairy")));
  const soyMilkSafe = await page.evaluate(() => {
    const t = document.body.innerText;
    return t.indexOf("Safe (") > -1 && t.indexOf("soy milk") > t.indexOf("Safe (");
  });
  const disclaimer = await bodyHas("Always verify the physical label");
  if (!(attribution && soyMilkSafe && disclaimer)) throw new Error(`scan checks: attribution=${attribution} soyMilkSafe=${soyMilkSafe} disclaimer=${disclaimer}`);
  log("STEP 3 PASS — peanut butter→Peanuts (not dairy), soy milk safe, disclaimer shown");

  await clickBtn("Dining");
  await waitText("Dining Guide", 10000);
  await typeInto("City, address, or zip code", "02368");
  await clickBtn("📍 Search");
  await page.waitForFunction(() => /\d+ locations?/.test(document.body.innerText) || document.body.innerText.includes("Couldn't find"), { timeout: 90000 });
  await new Promise((r) => setTimeout(r, 3500));
  const loc = (await page.evaluate(() => document.body.innerText)).match(/(\d+) locations?/);
  const map = await page.evaluate(() => ({ markers: document.querySelectorAll(".leaflet-marker-icon").length, container: !!document.querySelector(".leaflet-container") }));
  log(`STEP 4 ${loc ? "PASS" : "FAIL"} — dining: ${loc ? loc[1] : "0"} real locations, map markers=${map.markers}`);

  await clickBtn("Profile");
  await waitText("Your Profile", 10000);
  await clickBtn("Delete Account");
  await typeInto("Enter your password to confirm", PASS);
  await clickBtn("Yes, Delete");
  await waitText("Welcome back", 30000);
  log("STEP 5 PASS — account deleted, back at login");
} catch (e) {
  console.log("[e2e] FAILED:", e.message);
  console.log("[e2e] if not cleaned up, temp account is:", EMAIL);
} finally {
  console.log("[e2e] JS errors:", errors.length ? "\n  " + errors.join("\n  ") : "none");
  await browser.close();
}
