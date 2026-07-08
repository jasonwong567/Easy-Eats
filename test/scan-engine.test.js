"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const engine = require("../scan-engine.js");
const realData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "allergens.json"), "utf8")
);

engine.setData(realData);

// [text, userAllergenIds, expectedOverall]
const overallCases = [
  ["soy milk", ["milk"], "safe"],
  ["soy milk", ["soy"], "danger"],
  ["rice milk", ["milk"], "safe"],
  ["peanut butter", ["milk"], "safe"],
  ["peanut butter", ["treenuts"], "safe"],
  ["peanut butter", ["peanuts"], "danger"],
  ["corn starch", ["wheat"], "safe"],
  ["potato starch", ["wheat"], "safe"],
  ["corn starch", ["corn"], "danger"],
  ["rice flour", ["wheat"], "safe"],
  ["flour", ["wheat"], "danger"],
  ["wheat flour", ["wheat"], "danger"],
  ["maltodextrin", ["wheat"], "caution"],
  ["maltodextrin", ["corn"], "danger"],
  ["bread crumbs", ["alcohol"], "safe"],
  ["bread crumbs", ["wheat"], "danger"],
  ["brandy", ["wheat"], "safe"],
  ["brandy", ["alcohol"], "danger"],
  ["root beer", ["alcohol"], "safe"],
  ["beer", ["alcohol"], "danger"],
  ["sunflower lecithin", ["soy"], "safe"],
  ["soy lecithin", ["soy"], "danger"],
  ["lecithin", ["soy"], "danger"],
  ["butternut squash", ["milk"], "safe"],
  ["butternut squash", ["treenuts"], "safe"],
  ["butternut", ["treenuts"], "danger"],
  ["creamy sauce", ["milk"], "safe"],
  ["heavy cream", ["milk"], "danger"],
  ["lactalbumin", ["eggs"], "safe"],
  ["lactalbumin", ["milk"], "danger"],
  ["buckwheat flour", ["wheat"], "safe"],
  ["buckwheat groats", ["wheat"], "safe"],
  ["corned beef", ["corn"], "safe"],
  ["acorn squash", ["corn"], "safe"],
  ["popcorn", ["corn"], "danger"],
  ["crabapple juice", ["shellfish"], "safe"],
  ["crab meat", ["shellfish"], "danger"],
  ["eggplant", ["eggs"], "safe"],
  ["egg whites", ["eggs"], "danger"],
  [
    "beverage (coconut milk, milk)",
    ["milk"],
    "danger",
    "regression: parenthesized comma merging must not let an FP phrase mask a real dairy term in the same segment",
  ],
  ["natural flavors", ["milk"], "caution"],
  [
    "may contain traces of peanuts",
    ["fish"],
    "caution",
    "generic cross-contamination must downgrade the overall verdict even with no matching user allergen",
  ],
];

overallCases.forEach(function (c, i) {
  const text = c[0], userAllergens = c[1], expected = c[2], note = c[3];
  const label = (i + 1) + ". runScan(" + JSON.stringify(text) + ", " + JSON.stringify(userAllergens) + ") -> " + expected + (note ? " (" + note + ")" : "");
  test(label, function () {
    const result = engine.runScan(text, userAllergens, []);
    assert.strictEqual(result.overall, expected);
  });
});

test("43. custom allergen: msg flags danger and attributes to the custom allergen", function () {
  const result = engine.runScan("monosodium glutamate (msg)", [], ["msg"]);
  assert.strictEqual(result.overall, "danger");
  assert.strictEqual(result.items[0].allergen, "msg");
});

test("44a. label-declared safety net flags danger and mentions the product label", function () {
  const result = engine.runScan("sugar, cocoa", ["milk"], [], ["milk"]);
  assert.strictEqual(result.overall, "danger");
  assert.ok(
    result.items.some(function (item) { return item.reason && item.reason.indexOf("product label") !== -1; }),
    "expected an item whose reason mentions the product label"
  );
});

test("44b. label-declared allergen the user doesn't have is ignored", function () {
  const result = engine.runScan("sugar, cocoa", ["fish"], [], ["milk"]);
  assert.strictEqual(result.overall, "safe");
});

test("45. attribution is order-independent", function () {
  const a = engine.runScan("peanut butter", ["milk", "peanuts"], []);
  const b = engine.runScan("peanut butter", ["peanuts", "milk"], []);
  assert.strictEqual(a.items[0].allergen, "Peanuts");
  assert.strictEqual(b.items[0].allergen, "Peanuts");
});

test("46. multi-allergen segment reports all matching allergens on a single item", function () {
  const result = engine.runScan("milk chocolate (soy lecithin)", ["milk", "soy"], []);
  assert.strictEqual(result.items.length, 1);
  assert.ok(result.items[0].allergen.indexOf("Dairy") !== -1, "expected allergen string to contain Dairy");
  assert.ok(result.items[0].allergen.indexOf("Soy") !== -1, "expected allergen string to contain Soy");
});

test("48. empty text returns safe with zero items", function () {
  const result = engine.runScan("", ["milk"], []);
  assert.strictEqual(result.overall, "safe");
  assert.strictEqual(result.items.length, 0);
});

// 47. Fail-closed: must run last (or re-setData afterwards) since setData mutates
// shared module state used by every other test in this file.
test("47. fail-closed: no data loaded never reports safe", function () {
  engine.setData({});
  const result = engine.runScan("peanuts", ["peanuts"], []);
  assert.strictEqual(result.overall, "unknown");
  // Restore real data in case more tests are appended below this one later.
  engine.setData(realData);
});
