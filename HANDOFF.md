# Easy Eats — Project Handoff & Context

> **Purpose of this file:** a complete, self-contained brief so a brand-new chat (with zero
> conversation history — e.g. after moving to a new Claude workspace) can pick this project up
> and continue without repeating past work or mistakes. If you are that new chat: **read this
> whole file first.** It reflects the state as of **2026-07-21**.

---

## 0. TL;DR / current status

- **What this is:** Easy Eats, a single-page web app that helps people with food allergies
  check ingredients (barcode / food search / manual), find safe menu items at 58 restaurant
  chains, and look up nutrition. Auth + data via Firebase.
- **A full front-to-back audit was completed.** All 6 critical and most important findings are
  fixed, committed, and **verified end-to-end in a real browser against live APIs.**
- **The work is on git branch `audit-fixes`, NOT yet merged to `main`.** 3 commits.
- **Two things still need the human (you), not code:**
  1. Verify **Firestore security rules** in the Firebase console (5 min — see §8).
  2. Add a **USDA proxy endpoint** to your Cloudflare Worker (the key is still client-side — see §8).
- **Deployment gotcha:** `scan-engine.js` is a NEW file that must be deployed alongside
  `index.html`. Previously everything was in `index.html`.

---

## 1. Architecture (as it actually is)

**No build step.** Plain static files. `index.html` loads React 18 + Babel Standalone from
CDNs and compiles the JSX **in the browser at runtime**. To run locally:

```bash
cd /Users/jasonwong/Developer/easy_eats_working
python3 -m http.server 8899   # then open http://localhost:8899
```

(Opening `index.html` via `file://` will NOT work — the `fetch()` of the JSON data files needs
an HTTP origin, and Firebase auth needs a real origin.)

### File map

| File | What it is |
|---|---|
| `index.html` | The entire app: styles, Firebase init, React `App()` component (~1,800 lines, one big component with ~55 `useState` hooks), all pages rendered as inline conditional blocks (`pg==="home"`, `pg==="scanner"`, etc.). |
| `scan-engine.js` | **NEW (audit).** Pure allergen-matching logic, extracted from `index.html`. UMD module — works both as a browser `<script>` (`window.EasyEatsEngine`) and via Node `require()` (so it's unit-testable). See §3. |
| `allergens.json` | The allergen knowledge base: `AL` (18 allergens, each with name-variant list), `FP` (false-positive scrub rules), `AMB` (ambiguous-ingredient → caution rules). See §4. |
| `chains.json` | 58 restaurant chains, 501 menu items. Each item lists which allergen IDs it contains. See §4. |
| `test/scan-engine.test.js` | **NEW (audit).** 49-case unit suite for the engine. Run `node --test` from repo root. |
| `test/e2e.mjs` | **NEW (audit).** Headless-Chrome end-to-end smoke test against live APIs. Not part of `node --test`; run manually — see §7. |
| `README.md` | User-facing description (rewritten in the audit to match reality). |
| `cities.json` | **DELETED in the audit.** Held fake-city data for the simulated-restaurant feature that was removed. Do not resurrect. |

### Data / control flow

1. On load, `index.html` fetches `allergens.json` + `chains.json` (with a 24h localStorage
   cache, key `ee_cache_*`). `allergens.json` is handed to `EasyEatsEngine.setData()`.
2. Firebase Auth restores the session. There's a 2-step restore: instant load from a
   `localStorage` cache (`ee_session`) so the UI shows immediately, then `onAuthStateChanged`
   confirms with Firebase and reconciles. A 3s fallback timer prevents a stuck spinner.
3. User profile lives in Firestore at `users/{uid}`:
   `{ name, allergens:[ids], customAllergens:[strings], history:[...], emergencyContact,
   emergencyPhone, createdAt }`. History is capped at the last 50 scans.
4. Scanning calls `EasyEatsEngine.runScan(text, allergenIds, customAllergens, declared)`.
5. History entries store only inputs + verdict (`{id,label,date,ingredients,overall,summary}`)
   and are **re-scanned live** on view (`liveResult`) so old scans stay accurate after the
   user changes their allergen profile.

### External services (all called directly from the browser)

| Service | Used for | Auth |
|---|---|---|
| Firebase Auth + Firestore | Login, profile, history | Config in `index.html` (apiKey is a public identifier — fine to commit; security is Firestore rules, see §8) |
| OpenFoodFacts | Barcode → ingredients | none |
| USDA FoodData Central | Food search + nutrition | **API key hardcoded in `index.html`** ⚠️ (see §8) |
| Nominatim (OpenStreetMap) | Geocode a city/zip → lat/lon | none |
| Overpass (OpenStreetMap) | Find nearby restaurants | none |
| Cloudflare Worker | `/api/nutrition-details` (Edamam-style nutrition), `/api/ocr` (orphaned) | Worker holds its own secrets |

**⚠️ The Cloudflare Worker source is NOT in this repo.** URL:
`https://easy-eats-api.jasonwong38927.workers.dev`. Any worker change must be handed to you as a
snippet to paste into the Cloudflare dashboard — a chat cannot edit it directly.
The `/api/ocr` endpoint is **orphaned** (the photo-OCR UI was removed in the audit).

---

## 2. What the audit found & fixed (the important part)

The app looked polished but had safety bugs invisible on the happy path. All of the below are
**done and committed** on `audit-fixes` unless marked otherwise.

### 🔴 Critical (all fixed)

- **C1 — Scan engine failed OPEN.** If `allergens.json` failed to load, every scan returned
  "No allergens detected" = a green "safe" verdict with no data behind it. **Fixed:** engine now
  returns `overall:"unknown"` when no data is loaded; UI disables scanning and shows a red banner
  ("fail closed"). Never say "safe" without data.
- **C2 — False results from substring matching.** `soy milk`→dairy danger, `corn starch`/
  `rice flour`→wheat, `root beer`→alcohol, `sunflower lecithin`→soy, `butternut squash`→dairy,
  `maltodextrin`→wheat-danger (shadowing the intended caution), and mis-attribution (peanut
  butter blamed on dairy). **Fixed** via engine redesign (§3) + data patch (§4). Locked in by
  the 49-case test suite.
- **C3 — Dining guide asserted safety it had no data for.** 7 of 18 built-in allergens
  (sulfites, corn, lupin, coconut, garlic, onion, alcohol) appear in ZERO menu items, yet items
  were labeled "Safe for You." **Fixed:** chain pages now compute which allergens the menu data
  actually covers and warn about the rest; header changed from "Safe for You" →
  "No Listed Allergens"; custom-only users see "—" instead of a fake "100% safe."
- **C4 — Fabricated restaurant data.** `generateNearby()` invented addresses/distances from a
  string hash whenever real lookup failed (even for typos). **Fixed:** deleted entirely
  (with `cities.json`). Now: real OSM results, or an honest empty state + the all-chains list.
- **C5 — `matchChain` mislabeled independent restaurants as chains.** Loose `includes()`
  matching gave "Panda Garden" → Panda Express's allergen matrix. **Fixed:** strict
  exact/startsWith/whole-alias matching in a reviewed alias table.
- **C6 — Foreign-language barcodes failed open.** OFF `ingredients_text` is in the product's
  market language; a French label scanned all-safe (variants are English). **Fixed:** prefer
  `ingredients_text_en`; if only a non-English list exists, refuse to scan; also cross-check
  `allergens_tags` (language-independent) as a safety net (`declared` arg to `runScan`).

### 🟠 Important (fixed unless noted)

- **I3 — Silent write failures.** `saveProf` early-returned when `auth.currentUser` was null
  (the cached-session window) and swallowed Firestore errors, so edits looked saved but weren't.
  **Fixed:** writes queue during auth restore and flush after; failures raise a toast (`syncError`).
- **I4 — Overpass missed most restaurants.** Query used `node[...]` only; many restaurants are
  mapped as building `way`s. **Fixed:** `nwr[...]` + `out center`. **Verified: this found 239
  chain locations near 02368, 138 of which the old query would have missed.**
- **I5 — XSS in map popups.** OSM tag data was interpolated raw into popup HTML. **Fixed:**
  `escHtml()` on name/address, `encodeURIComponent` on the `locId` used in the inline `onclick`.
- **I6 — Per-render full-history rescans.** `liveResult` re-ran the engine for every history row
  several times per render. **Fixed:** memoized with a per-profile `WeakMap`.
- **I7 — Redundant history schema.** Entries stored full per-ingredient `items[]` that were
  recomputed anyway. **Fixed:** slimmed to inputs + verdict; `liveResult` recomputes on view.
- **I10 — Dead signup duplicate-email pre-check.** `fetchSignInMethodsForEmail` returns `[]`
  under Firebase email-enumeration protection. **Fixed:** removed; duplicates caught at creation.
- **I11 — Accessibility.** Removed `user-scalable=no`/`maximum-scale=1` (blocked pinch-zoom);
  made the avatar a real `<button>` with `aria-label`. (More a11y remains — see §5.)
- **I12 — No disclaimers.** **Fixed:** disclaimers added to results, history-detail, and chain
  pages (inside the share-capture region so they appear in shared images too).
- Also: removed dead OCR/photo code (~50 lines), removed CSS `zoom` on `#root` (broke Leaflet
  click math ≥1440px), added search race guards (`nutReqRef`/`foodReqRef`), removed the QR format
  from the barcode scanner (QR payloads aren't product barcodes), paren-aware split for the
  nutrition-details request.

### Bonus bug found while fixing (also fixed)

- Generic "may contain…" cross-contamination warnings used to NOT downgrade the overall verdict
  (you could see "✅ Looks Safe" above a cross-contamination note). Now they force `caution`.
- FP redesign fixed a latent **false negative**: `"beverage (coconut milk, milk)"` used to pass a
  dairy check because the old FP rule skipped the milk allergen for the whole segment.

### NOT done (see §8 — needs you)

- **I1 — Firestore security rules** could not be verified from the repo (needs console access).
- **I2 — USDA API key** still hardcoded client-side (needs a Worker endpoint you deploy).

---

## 3. The scan engine (`scan-engine.js`) — read before editing matching logic

Signature: `runScan(text, userAllergenIds, customAllergenStrings, declaredAllergenIds)` →
`{ overall: "safe"|"caution"|"danger"|"unknown", items:[{ingredient,status,allergen,reason}], summary }`

Design decisions that matter (don't regress these):

1. **Fails closed.** No data loaded (`AL.length===0`) → returns `overall:"unknown"`, never "safe".
2. **Paren-aware segmentation.** Commas inside `(...)` are protected before splitting on `,`/`;`,
   so `flavor (a, b)` stays one segment. (The nutrition-details fetch in `index.html` mirrors this.)
3. **Reports ALL matching allergens per ingredient** — not first-match-wins. This makes
   attribution independent of the order the user selected their allergens (the old bug: peanut
   butter attributed to whichever of the user's allergens matched first).
4. **FP rules SCRUB their phrase, they don't skip the allergen.** Old behavior: if an FP phrase
   was present, skip that allergen for the whole segment (caused false negatives). New behavior:
   remove just the FP phrase text before checking the protected allergen. So
   `"peanut butter cups (milk chocolate)"` still flags milk — only the literal "peanut butter"
   text is removed for the milk check. FP rules are sorted longest-phrase-first so
   `"buckwheat flour"` is scrubbed before `"buckwheat"`.
5. **`declared` (4th arg)** = allergen IDs declared on the label (from OFF `allergens_tags`).
   Any the user has but the text scan missed are added as danger hits — a safety net for
   incomplete/foreign ingredient text.
6. **Overall verdict** is derived so a generic cross-contamination caution (no specific allergen)
   still downgrades `safe`→`caution`.

**To add/change matching behavior:** edit `scan-engine.js` and/or `allergens.json`, then add a
case to `test/scan-engine.test.js` and run `node --test`. The engine is pure — never put DOM,
React, Firebase, or `fetch` in it.

---

## 4. Data files

### `allergens.json`
```
{
  "AL":  [ { "id","label","icon","v":[ ...name variants, all lowercase... ] }, ... ],  // 18 allergens
  "FP":  [ { "p": "phrase", "s": [allergenIds to protect] }, ... ],                     // false-positive scrubs
  "AMB": [ { "p": "phrase", "w": "warning text", "r": [related allergenIds] }, ... ]    // ambiguous → caution
}
```
- The 18 allergen IDs: `milk, peanuts, treenuts, eggs, wheat, soy, fish, shellfish, sesame,
  mustard, celery, sulfites, corn, lupin, coconut, garlic, onion, alcohol`.
- **FP scrub semantics** (see §3.4): safe to add liberally now. Example FP rules added in the
  audit: `soy milk`/`rice milk`→milk, `peanut butter`→[milk,treenuts], `corn starch`/`rice flour`/
  `buckwheat`→wheat, `root beer`/`bread crumbs`→alcohol, `sunflower lecithin`→soy,
  `butternut squash`→[milk,treenuts], `lactalbumin`→eggs, `corned beef`/`acorn`→corn,
  `crabapple`→shellfish.
- Over-broad bare variants were REMOVED from `AL` and replaced with qualified forms: e.g. wheat no
  longer has bare `starch`/`malt` (they matched corn starch, maltodextrin); it has `wheat starch`,
  `malt syrup`, etc. instead, with `maltodextrin`/`modified starch` handled as AMB *caution*.

### `chains.json`
```
[ { "id","name","icon","type","nutritionUrl", "menu":[ { "name", "a":[allergenIds] } ] }, ... ]
```
- 58 chains, 501 items. Menu data only annotates **11 of 18** allergen IDs (wheat, milk, soy,
  sesame, eggs, fish, peanuts, mustard, celery, shellfish, treenuts). The other 7 are the
  coverage gap the chain page now warns about (C3).
- The `menuCovered` Set in `index.html` is computed at load from this file — if you add allergen
  annotations to menus, the coverage warnings update automatically.

### Firestore `users/{uid}` doc
`{ name, allergens:[ids], customAllergens:[strings], history:[{id,label,date,ingredients,overall,summary}],
   emergencyContact, emergencyPhone, createdAt }` — history capped at 50, newest first.
**This contains health data (allergies) + emergency contacts → that's why rules matter (§8).**

---

## 5. Known limitations / things to be careful about (avoid re-introducing)

- **Substring matching still has inherent limits.** The engine still uses `includes()`, guarded
  by the FP list. It's much safer now but not a real tokenizer. The proper fix (word-boundary
  matching with a compound-term whitelist) was deferred — see §6, roadmap Phase 3. If you touch
  matching, do it behind the test suite.
- **One giant component.** `App()` in `index.html` is ~1,800 lines with ~55 hooks. Editing is
  find-the-block-by-`pg===`. A component split was scoped but not done (Phase 2).
- **In-browser Babel** = a few seconds of first-paint cost on mobile and no build safety net.
  CDN `<script>`s have no SRI hashes (a CDN compromise = full account compromise). Deferred.
- **Deploy `scan-engine.js` with `index.html`.** Easy to forget; the app hard-depends on it now.
- **`.DS_Store` is tracked in git** (was already committed before the audit). Minor; could
  `git rm --cached .DS_Store` and add to `.gitignore`.
- **Accessibility isn't finished:** emoji-only nav items lack `aria-label`s; safety colors are
  the only signal at the 70/40% thresholds; no focus management across page transitions.
- **`node --test test/` fails on this machine's Node 24** with a bare-directory quirk. Use
  `node --test` (auto-discovery) from the repo root instead.

---

## 6. What's next — prioritized roadmap

### Do first (needs you, the human — not code) — see §8 for exact steps
1. **Verify Firestore security rules** (5 min, security-critical).
2. **Add USDA proxy to the Cloudflare Worker** + point the client at it (removes the exposed key).

### Then merge & deploy
3. `git checkout main && git merge audit-fixes`, deploy `index.html` **+ `scan-engine.js`** +
   `allergens.json` + `chains.json` + `README.md`. (`cities.json` is deleted — make sure your
   deploy removes it too.)

### Phase 2 — trust & maintainability (code; safe to hand to a capable model)
4. Introduce a minimal **Vite build** (split `index.html` into `src/` modules; same static
   output). Unlocks SRI, kills in-browser Babel, and lets more code be unit-tested. No behavior
   change intended — verify with the e2e test.
5. Slim/robustify the profile write path further (retry queue is in; consider exponential backoff).
6. Broaden `test/scan-engine.test.js` as you add allergen data.

### Phase 3 — deeper correctness (design work; keep with a strong model)
7. Replace substring matching with **word-boundary tokenization + compound-term whitelist**
   (e.g. "peanut butter", "ice cream") designed against the test suite before rewriting.
8. Accessibility pass (aria-labels, non-color safety signals, focus management).

---

## 7. How to verify your changes

### Unit tests (fast, always run these)
```bash
cd /Users/jasonwong/Developer/easy_eats_working
node --test          # 49 cases; currently 49/49 pass. (NOT `node --test test/` on Node 24.)
```

### Syntax-check the in-HTML JSX without a browser
The JSX inside `index.html` won't be caught by a linter. To parse-check it:
```bash
# needs @babel/parser (npm i -D @babel/parser somewhere), then extract the
# <script type="text/babel"> block and parser.parse(code, {sourceType:"module", plugins:["jsx"]})
```
(There's a one-off script pattern for this; regenerate if needed.)

### End-to-end (real browser, live APIs) — `test/e2e.mjs`
Drives signup → scan → dining → account-delete against the real backend. See the header of
`test/e2e.mjs` for setup. Summary:
```bash
python3 -m http.server 8899 &        # from repo root
npm install puppeteer-core           # in a scratch dir; edit CHROME path in the file if needed
node test/e2e.mjs
```
It creates and then DELETES a throwaway Firebase account. If signup hangs, that's your signal
Firebase/deploy is broken.

### Results from the 2026-07-21 verification run (for reference)
- App boot, signup, Firestore write+verify: **PASS** (0 JS errors besides a benign favicon 404).
- Scan in-UI: `peanut butter`→Peanuts (not dairy), `soy milk`→Safe, caution + disclaimer: **PASS**.
- Nominatim geocode "02368" → Randolph MA: **PASS**.
- Overpass `nwr` query: **239 real locations, 138 only found thanks to the fix**: **PASS**.
- Dining list: real addresses, no fabricated data, no chain mislabels: **PASS**.
- Leaflet map: 239 markers, tiles loaded, popup "View Menu" navigates: **PASS**.
- OpenFoodFacts language guard on real French Nutella: English list preferred, `allergens_tags`
  (milk/nuts/soy) mapped: **PASS**.
- Account deletion flow: **PASS** (all test accounts cleaned up; nothing left in Firebase).

---

## 8. The two human-only tasks (do these on the new workspace)

### Task A — Firestore security rules (5 min, SECURITY-CRITICAL)
Health data + emergency contacts live in `users/{uid}`. If rules are open, it's world-readable.
Firebase console → your project `easy-eats-246e5` → Firestore Database → Rules. Confirm they are:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
If they say `allow read, write: if true;` (the test-mode default), fix immediately.

### Task B — Move the USDA key server-side
The USDA FoodData Central key is hardcoded in `index.html` in 4 places (food search + nutrition
search, page 1 + load-more). Anyone can lift it and exhaust the rate limit.

1. Add to your Cloudflare Worker (`easy-eats-api...workers.dev`) — store the key as a Worker
   secret `USDA_KEY`, then:
```js
if (url.pathname === "/api/food-search") {
  const q = url.searchParams.get("query");
  const page = url.searchParams.get("pageNumber") || "1";
  const r = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&api_key=${USDA_KEY}&pageSize=8&pageNumber=${page}&dataType=Branded`);
  return new Response(r.body, { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}
```
2. In `index.html`, replace the 4 `https://api.nal.usda.gov/fdc/v1/foods/search?...&api_key=...`
   URLs with `` `${WORKER_URL}/api/food-search?query=${encodeURIComponent(q)}&pageNumber=${N}` ``
   (functions `searchFood`, `loadMoreFood`, `searchNutrition`, `loadMoreNut`). Response shape is
   unchanged, so the `.foods` / `.totalHits` parsing stays the same.
3. Rotate the old key in your USDA account afterward (the current one is burned — it's in git history).

---

## 9. Git state & conventions

- **Branch `audit-fixes`** holds all audit work, 3 commits, not merged:
  - `27a2983` Add unit-tested scan engine; fix false positives, attribution, fail-open scanning
  - `123f766` Fail-closed scanning UI, honest dining data, and reliability fixes
  - `b50025b` Update README to match audited app state
  - (plus this handoff commit + the e2e test)
- Merge with: `git checkout main && git merge audit-fixes`.
- Commits in this project are co-authored by the Claude model that made them; keep that if asked
  to commit. Don't commit or push unless the user asks.

---

## 10. Persistent memory (Claude Code on this machine only)

Claude Code keeps local project memory at
`/Users/jasonwong/.claude/projects/-Users-jasonwong-Developer-easy-eats-working/memory/`
(`MEMORY.md` index + `easy-eats-project-context.md`). That's tied to this machine's Claude Code,
independent of any claude.ai workspace change — but a fresh **claude.ai** chat won't see it, which
is exactly why this `HANDOFF.md` exists in the repo. If you're a new chat and this file and the
memory disagree, trust the code first, then this file (dated 2026-07-21), then memory.

---

*End of handoff. If you change the project materially, update this file so the next pickup is clean.*
