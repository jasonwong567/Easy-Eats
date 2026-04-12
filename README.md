# Easy Eats

A web app that helps people with food allergies check ingredients, find safe menu items at restaurants, and keep track of what they've scanned.

---

## What It Does

### Ingredient Scanner

The core feature. You can check food ingredients three ways:

- **Barcode scan** — point your camera at a product barcode and it looks up the ingredients automatically
- **Food name search** — type a food name and it pulls up ingredients from the database
- **Manual entry** — paste or type an ingredient list yourself, with a field to name the item

Once ingredients are submitted, the app checks each one against your allergen profile and returns one of three results per ingredient:

- **Danger** — directly contains one of your allergens
- **Caution** — ingredient is ambiguous and may contain allergen derivatives (e.g. "natural flavors", "spices")
- **Safe** — no allergen match found

The scanner catches hidden allergen names — for example, "casein" and "whey" are both flagged for dairy, "arachis oil" for peanuts, "albumin" for eggs, and so on. It also has false-positive protection so things like "eggplant" don't get flagged as eggs and "coconut milk" doesn't get flagged as dairy.

**Allergens tracked:** Dairy, Peanuts, Tree Nuts, Eggs, Wheat/Gluten, Soy, Fish, Shellfish, Sesame, Mustard, Celery, Sulfites. You can also add your own custom allergens.

After scanning, results can be shared as an image (uses the native share sheet on mobile).

---

### Restaurant Dining Guide

Covers 58 chain restaurants. For each one:

- Shows which menu items are safe for you vs. which contain your allergens
- Links to the restaurant's official nutrition/allergen page
- Has a map that searches for real nearby locations using OpenStreetMap (no API key needed)
- Includes a city search with autocomplete

Chains include: McDonald's, Chick-fil-A, Chipotle, Subway, Taco Bell, Wendy's, Starbucks, Dunkin', Panera, Five Guys, Burger King, Popeyes, Domino's, Pizza Hut, Papa John's, Panda Express, Olive Garden, Applebee's, Chili's, KFC, Sonic, Jack in the Box, In-N-Out, Shake Shack, Whataburger, Arby's, Jersey Mike's, Jimmy John's, Firehouse Subs, Sweetgreen, CAVA, Wingstop, Buffalo Wild Wings, Raising Cane's, Dairy Queen, Cold Stone, Baskin-Robbins, Jamba, Smoothie King, Noodles & Co., Potbelly, Waffle House, IHOP, Denny's, Cracker Barrel, Freddy's, Culver's, Qdoba, El Pollo Loco, Moe's, Zaxby's, Cook Out, Wawa, Kung Fu Tea, Mod Pizza, Blaze Pizza, Tropical Smoothie Cafe, Portillo's

---

### Nutrition Lookup

Search any food and see a full nutrition breakdown (calories, fat, protein, carbs, etc.). Has a button to run a full allergen scan directly from the nutrition page.

---

### Scan History

Every scan is saved. The home screen shows a count of total, safe, and flagged scans — each is clickable to filter the history list. Tapping any past scan shows the full result including the original ingredient list.

---

### Allergen Card

Generates a card with your name, allergens, and an emergency contact. Designed to show restaurant staff or anyone preparing food for you.

---

### Account / Profile

- Email and password login, works across devices (stored in Firebase)
- Forgot password sends a reset email
- Edit your allergen profile at any time — past scans automatically update to reflect your current profile
- Delete account option

---

## Tech

- Single `index.html` file — React 18 and Babel loaded via CDN, no build step
- Firebase Authentication and Firestore for user accounts and data
- OpenStreetMap (Nominatim + Overpass) for map and location search
- html2canvas for image sharing

---

## Disclaimer

Easy Eats is an informational tool. Always verify ingredients directly with manufacturers — allergen data can change. This is not a substitute for medical advice. If you have severe allergies, always carry your medication.
