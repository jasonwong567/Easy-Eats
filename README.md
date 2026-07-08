# Easy Eats

A web app that helps people with food allergies check ingredients, find safe menu items at restaurants, and keep track of what they've scanned.

---

## What It Does

### Ingredient Scanner

The core feature. You can check food ingredients three ways:

- **Barcode scan** — point your camera at a product barcode and it looks up the ingredients via OpenFoodFacts
- **Food name search** — type a food name and it pulls up ingredients from USDA FoodData Central
- **Manual entry** — paste or type an ingredient list yourself, with a field to name the item

Once ingredients are submitted, the app checks each one against your allergen profile and returns one of three results per ingredient:

- **Danger** — directly contains one of your allergens
- **Caution** — ingredient is ambiguous and may contain allergen derivatives (e.g. "natural flavors", "spices")
- **Safe** — no allergen match found

The scanner catches hidden allergen names — for example, "casein" and "whey" are both flagged for dairy, "arachis oil" for peanuts, "albumin" for eggs, and so on. An ingredient is checked against *all* of your allergens at once, so something like "peanut butter and whey powder" flags both peanuts and dairy instead of stopping at the first match.

It also has a curated false-positive scrub list so obviously safe ingredients don't get flagged — "soy milk" and "peanut butter" don't trip the dairy flag, "corn starch", "rice flour", and "buckwheat" don't trip the wheat flag, and "root beer" or "bread crumbs" don't trip the alcohol flag. That logic lives in `scan-engine.js`; the underlying allergen/variant/false-positive data lives in `allergens.json`.

Two safety rules worth knowing about:

- **Fails closed.** If the allergen database can't load, scanning is disabled and you get an error — the app never tells you something is "safe" without real data behind it.
- **English ingredients only, with a label cross-check.** Barcode lookups scan the English ingredient list from OpenFoodFacts. If a product only has a non-English ingredient list, the app refuses to scan it rather than risk silently passing something unsafe. As an extra safety net, it also cross-checks the product's label-declared allergens (OpenFoodFacts' `allergens_tags`) against your profile.

**Allergens tracked (18 built in):** Dairy/Milk, Peanuts, Tree Nuts, Eggs, Wheat/Gluten, Soy, Fish, Shellfish, Sesame, Mustard, Celery, Sulfites, Corn, Lupin, Coconut, Garlic, Onion/Alliums, Alcohol. You can also add your own custom allergens (e.g. MSG, latex, kiwi).

After scanning, results can be shared as an image (uses the native share sheet on mobile).

---

### Restaurant Dining Guide

Covers 58 chain restaurants. For each one:

- Shows which menu items are safe for you vs. which contain your allergens
- Links to the restaurant's official nutrition/allergen page
- Has a map that searches for real nearby locations using OpenStreetMap (Nominatim for geocoding, Overpass for finding locations — no API key needed, and no simulated/fake results). If no real nearby locations are found, the app says so and shows the full chain list instead.

**Coverage note:** menu allergen data currently only annotates 11 of the 18 built-in allergens (sulfites, corn, lupin, coconut, garlic, onion, and alcohol aren't tagged in menu data yet). The dining guide shows a coverage warning about this, and menu items with no annotated allergens are labeled "No listed allergens" rather than claimed as safe.

Chains include: McDonald's, Chick-fil-A, Chipotle, Subway, Taco Bell, Wendy's, Starbucks, Dunkin', Panera, Five Guys, Burger King, Popeyes, Domino's, Pizza Hut, Papa John's, Panda Express, Olive Garden, Applebee's, Chili's, KFC, Sonic, Jack in the Box, In-N-Out, Shake Shack, Whataburger, Arby's, Jersey Mike's, Jimmy John's, Firehouse Subs, Sweetgreen, CAVA, Wingstop, Buffalo Wild Wings, Raising Cane's, Dairy Queen, Cold Stone, Baskin-Robbins, Jamba, Smoothie King, Noodles & Co., Potbelly, Waffle House, IHOP, Denny's, Cracker Barrel, Freddy's, Culver's, Qdoba, El Pollo Loco, Moe's, Zaxby's, Cook Out, Wawa, Kung Fu Tea, Mod Pizza, Blaze Pizza, Tropical Smoothie Cafe, Portillo's

---

### Nutrition Lookup

Search any food and see a full nutrition breakdown (calories, fat, protein, carbs, etc.). Has a button to run a full allergen scan directly from the nutrition page.

---

### Scan History

Your last 50 scans are saved to Firebase (Firestore). The home screen shows a count of total, safe, and flagged scans — each is clickable to filter the history list. Tapping any past scan shows the full result including the original ingredient list. Past scans are re-evaluated live against your *current* allergen profile, so if you update your allergens, your history updates to match instead of showing stale results.

---

### Allergen Card

Generates a card with your name, allergens (including custom ones), and an emergency contact. Designed to show restaurant staff or anyone preparing food for you.

---

### Account / Profile

- Email and password login, works across devices (stored in Firebase)
- Forgot password sends a reset email
- Edit your allergen profile at any time — past scans automatically update to reflect your current profile
- Delete account option

---

## Tech

- Single `index.html` file — React 18 and Babel loaded via CDN, no build step
- `scan-engine.js` — the pure ingredient-matching engine, unit-tested and separate from the UI
- `allergens.json` — allergen variants, false-positive rules, and ambiguous-ingredient data
- `chains.json` — 58 chains / 501 menu items for the dining guide
- `test/` — Node's built-in test runner; run with `node --test test/`
- Firebase Authentication and Firestore for user accounts and data
- OpenStreetMap (Nominatim + Overpass) for map and location search
- html2canvas for image sharing

---

## Disclaimer

Easy Eats is an assistive tool, not medical advice. Always verify the physical label yourself before eating — ingredients and formulations can change, and databases can be wrong or out of date. The app also can't detect cross-contamination from shared equipment or facilities, since that isn't listed in ingredients. If you have severe allergies, always carry your medication.
