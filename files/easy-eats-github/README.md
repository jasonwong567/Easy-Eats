# 🍽 Easy Eats — Allergen Safety Assistant

A full-featured food allergen safety web application that helps users identify allergens in food products, find safe restaurant options, and manage their dietary restrictions.

**[Live Demo →](https://YOUR_USERNAME.github.io/easy-eats/)**

![Easy Eats Screenshot](https://img.shields.io/badge/React-18-blue?logo=react) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

### 🔐 Multi-User Authentication
- Account creation with username/password
- Persistent login sessions via localStorage
- Profile management with editable allergen preferences
- Account deletion with confirmation

### 🔬 Ingredient Scanner
- Paste ingredient lists from any food package for instant analysis
- Detects **200+ allergen variants** including hidden derivatives (e.g., "casein" → dairy, "lecithin" → soy)
- **False-positive protection** — won't flag "coconut cream" as dairy or "eggplant" as eggs
- **Ambiguous ingredient detection** — flags items like "natural flavors" or "spices" that may contain allergens
- Color-coded results: 🔴 Danger / 🟡 Caution / 🟢 Safe
- **19 pre-loaded products** for quick scanning (Cheetos, Oreos, Lay's, etc.)

### 📷 Photo Upload
- Upload ingredient label photos for reference while typing ingredients

### 📍 Restaurant Dining Guide
- **56 chain restaurants** with real menu items and allergen data
- **OpenStreetMap integration** — searches for real restaurant locations near any US address using free APIs (Nominatim + Overpass)
- Falls back to simulated locations when API is unavailable
- Menu items split into "Safe for You" vs "Contains Your Allergens"
- **50+ preset cities** with autocomplete dropdown

### ✨ Smart Alternatives
- When a product is flagged, suggests **category-matched safe alternatives**
- Scan Oreos → suggests other safe cookies, not random items
- Clickable alternatives with full navigation stack (back button returns to previous scan)

### 📋 Share Results
- Copy scan results to clipboard in formatted text

### 🚨 Emergency Allergen Card
- Shareable card showing your name, allergens, and emergency contact
- Designed to show restaurant staff or anyone preparing your food

### 📊 Dashboard & History
- Personal dashboard with scan statistics
- Full scan history with clickable detail views
- Persistent data across sessions

---

## Tech Stack

- **React 18** — UI framework (loaded via CDN, no build step required)
- **Babel Standalone** — JSX transpilation in-browser
- **OpenStreetMap / Nominatim** — Free geocoding API (no key required)
- **Overpass API** — Free restaurant location data (no key required)
- **localStorage** — Client-side data persistence
- **GitHub Pages** — Static hosting

---

## Allergens Tracked

| Allergen | Hidden Names Detected |
|----------|----------------------|
| 🥛 Dairy / Milk | casein, whey, lactose, ghee, lactalbumin, buttermilk, milkfat... |
| 🥜 Peanuts | arachis oil, groundnut, mandelonas, peanut protein... |
| 🌰 Tree Nuts | praline, marzipan, nougat, gianduja, amaretto, nutella... |
| 🥚 Eggs | albumin, lysozyme, ovalbumin, ovomucin, livetin, meringue... |
| 🌾 Wheat / Gluten | semolina, spelt, kamut, seitan, malt extract, triticale... |
| 🫘 Soy | edamame, tempeh, shoyu, tamari, textured vegetable protein... |
| 🐟 Fish | surimi, fish sauce, worcestershire, caesar dressing... |
| 🦐 Shellfish | calamari, escargot, crustacean, mollusk, shrimp paste... |
| 🫓 Sesame | tahini, halvah, gingelly oil, benne seeds... |
| 🟡 Mustard | dijon, mustard flour, mustard oil... |
| 🥬 Celery | celeriac, celery salt, celery seed... |
| 🍷 Sulfites | sulfur dioxide, sodium metabisulfite... |

---

## Restaurant Chains Included

McDonald's, Burger King, Wendy's, Chick-fil-A, KFC, Popeyes, Taco Bell, Chipotle, Subway, Starbucks, Dunkin', Panera Bread, Five Guys, Domino's, Pizza Hut, Papa John's, Panda Express, Olive Garden, Applebee's, Chili's, Sonic, Jack in the Box, In-N-Out, Shake Shack, Whataburger, Arby's, Jersey Mike's, Jimmy John's, Firehouse Subs, Sweetgreen, CAVA, Wingstop, Buffalo Wild Wings, Raising Cane's, Dairy Queen, Cold Stone Creamery, Baskin-Robbins, Jamba, Smoothie King, Noodles & Company, Potbelly, Waffle House, IHOP, Denny's, Cracker Barrel, Freddy's, Culver's, Qdoba, El Pollo Loco, Moe's Southwest Grill, Zaxby's, Cook Out, Wawa, Kung Fu Tea, Mod Pizza, Blaze Pizza, Tropical Smoothie, Portillo's

---

## Setup & Deployment

### Option 1: GitHub Pages (Recommended)

1. **Fork or clone this repo**
   ```bash
   git clone https://github.com/YOUR_USERNAME/easy-eats.git
   cd easy-eats
   ```

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **Enable GitHub Pages**
   - Go to repo **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / **(root)**
   - Click **Save**

4. Your app is live at `https://YOUR_USERNAME.github.io/easy-eats/`

### Option 2: Local Development

Simply open `index.html` in a browser. Note: OpenStreetMap API calls require the page to be served over HTTP(S), so for local testing use:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then visit `http://localhost:8000`

---

## Project Structure

```
easy-eats/
├── index.html          # Complete application (React + data + UI)
├── README.md           # This file
└── LICENSE             # MIT License
```

The application is a single-page app contained in `index.html` for maximum deployment simplicity. The code is organized into clearly commented sections:

- **Allergen Database** — 12 allergen types with 200+ variant names
- **False Positive Rules** — prevents incorrect flagging
- **Ambiguous Ingredient Detection** — catches uncertain items
- **Product Database** — 19 real products with ingredients
- **Restaurant Chain Data** — 56 chains with full menus
- **Analysis Engine** — intelligent ingredient scanning
- **OpenStreetMap Integration** — real location search
- **Multi-User Auth System** — signup/login/logout
- **UI Components** — React components for each page

---

## How the Scanner Works

1. **Ingredient Parsing** — splits raw ingredient text by commas/semicolons, preserving parenthetical groups
2. **False Positive Check** — applies exclusion rules (e.g., "coconut milk" skips dairy check)
3. **Direct Allergen Match** — checks each ingredient against 200+ known allergen variant names
4. **Ambiguous Detection** — flags ingredients like "natural flavors" or "modified starch" that may contain allergens
5. **Results Compilation** — categorizes each ingredient as safe/caution/danger with explanations

---

## APIs Used

| API | Purpose | Cost | Auth Required |
|-----|---------|------|---------------|
| [Nominatim](https://nominatim.org/) | Geocoding (city → coordinates) | Free | No |
| [Overpass](https://overpass-api.de/) | Restaurant location data | Free | No |

Both APIs are part of the OpenStreetMap ecosystem and require no API keys or accounts.

---

## Built With

This project was built using [Claude](https://claude.ai) as an AI development assistant.

---

## Disclaimer

Easy Eats is an informational tool only. Always verify ingredients directly with food manufacturers. Allergen data in restaurant menus may change without notice. This application is not a substitute for medical advice. Always carry emergency medication (e.g., EpiPen) if you have severe allergies.

---

## License

MIT License — see [LICENSE](LICENSE) for details.
