/*
 * Easy Eats scan engine — pure allergen-matching logic, no DOM/React/Firebase.
 * Loaded as a plain <script> in the browser (window.EasyEatsEngine) and
 * require()-able in Node so the test suite can exercise it directly.
 *
 * Matching model:
 *  - Ingredient text is split into segments on commas/semicolons (commas inside
 *    parentheses are protected so "flavor (a, b)" stays one segment).
 *  - Each segment is checked against every selected allergen's variant list
 *    with substring matching. ALL matching allergens are reported per segment
 *    (no first-match-wins), so attribution never depends on profile order.
 *  - False-positive (FP) rules scrub their phrase out of the segment before a
 *    protected allergen is checked, instead of skipping the allergen for the
 *    whole segment. This means "peanut butter cups (milk chocolate)" still
 *    flags milk: only the literal "peanut butter" text is removed for the
 *    milk check, not the milk match itself.
 *  - If no data is loaded, the scan returns overall "unknown" — never "safe".
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EasyEatsEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  let AL = [], FP = [], AMB = [];

  function setData(data) {
    AL = (data && data.AL) || [];
    FP = (data && data.FP) || [];
    AMB = (data && data.AMB) || [];
  }

  function hasData() {
    return AL.length > 0;
  }

  // text: raw ingredient text
  // ua: array of built-in allergen ids from the user's profile
  // customAllergens: array of user-entered custom allergen strings
  // declared: optional array of allergen ids declared on the product label
  //           (e.g. mapped from OpenFoodFacts allergens_tags) — a safety net
  //           that catches allergens even when the text match misses them
  function runScan(text, ua, customAllergens, declared) {
    if (!hasData()) {
      return { overall: "unknown", items: [], summary: "Allergen data isn't loaded — this can't be scanned safely." };
    }
    const userAllergens = ua || [];
    const lower = String(text || "").toLowerCase();
    const raw = lower
      .replace(/\([^)]*\)/g, function (m) { return m.replace(/,/g, "§"); })
      .split(/[,;]/)
      .map(function (s) { return s.replace(/§/g, ",").trim(); })
      .filter(function (s) { return s.length > 1; });
    const items = [];
    const dSet = new Set();
    const cSet = new Set();
    const custom = (customAllergens || []).map(function (c) { return c.toLowerCase().trim(); }).filter(Boolean);

    raw.forEach(function (ing) {
      const c = ing.replace(/^\d+%?\s*(or less of:?\s*)?/i, "").replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
      if (!c) return;

      // FP rules whose phrase appears in this segment, longest phrase first so
      // "buckwheat flour" is scrubbed before "buckwheat" can leave "flour" behind.
      const fpHits = FP.filter(function (r) { return c.includes(r.p); })
        .sort(function (a, b) { return b.p.length - a.p.length; });

      const hits = []; // { label, reason }

      // Custom allergens: raw substring match (no FP data exists for them).
      custom.forEach(function (cv) {
        if (c.includes(cv)) {
          hits.push({ label: cv, reason: 'Contains "' + cv + '" — custom allergen' });
          dSet.add("custom:" + cv);
        }
      });

      // Built-in allergens: every match is reported, not just the first.
      userAllergens.forEach(function (aid) {
        const a = AL.find(function (x) { return x.id === aid; });
        if (!a) return;
        let cc = c;
        fpHits.forEach(function (r) {
          if ((r.s || []).includes(aid)) cc = cc.split(r.p).join(" ");
        });
        const v = a.v.find(function (vv) { return cc.includes(vv); });
        if (v) {
          hits.push({
            label: a.label,
            reason: v === c ? "Direct " + a.label.toLowerCase() + " allergen" : 'Contains "' + v + '" — ' + a.label.toLowerCase() + " derivative",
          });
          dSet.add(aid);
        }
      });

      if (hits.length) {
        items.push({
          ingredient: c,
          status: "danger",
          allergen: hits.map(function (h) { return h.label; }).join(", "),
          reason: hits.map(function (h) { return h.reason; }).join(" · "),
        });
        return;
      }

      // Ambiguous ingredients → caution.
      let matched = false;
      for (const amb of AMB) {
        if (c.includes(amb.p)) {
          const rel = amb.r.filter(function (a) { return userAllergens.includes(a); });
          if (rel.length > 0 || amb.r.length === 0) {
            items.push({
              ingredient: c,
              status: "caution",
              allergen: rel.map(function (a) { return (AL.find(function (x) { return x.id === a; }) || {}).label; }).filter(Boolean).join(", ") || "Cross-contamination",
              reason: amb.w,
            });
            rel.forEach(function (a) { cSet.add(a); });
            matched = true;
            break;
          }
        }
      }
      if (!matched) items.push({ ingredient: c, status: "safe", allergen: null, reason: "No allergens recognized" });
    });

    // Label-declared allergens (safety net): flag any the text match missed.
    (declared || []).forEach(function (aid) {
      if (!userAllergens.includes(aid) || dSet.has(aid)) return;
      const a = AL.find(function (x) { return x.id === aid; });
      if (!a) return;
      dSet.add(aid);
      items.push({
        ingredient: "label allergen declaration",
        status: "danger",
        allergen: a.label,
        reason: "Declared as an allergen on the product label",
      });
    });

    let overall = "safe", summary = "";
    const dangerLabels = Array.from(dSet).map(function (id) {
      return id.indexOf("custom:") === 0 ? id.slice(7) : (AL.find(function (a) { return a.id === id; }) || {}).label;
    }).filter(Boolean);
    // overall is derived from the items themselves so a generic
    // cross-contamination caution (no specific allergen) still downgrades the verdict
    const anyCaution = cSet.size > 0 || items.some(function (i) { return i.status === "caution"; });
    if (dSet.size > 0) { overall = "danger"; summary = "Contains " + dangerLabels.join(", ") + " allergens."; }
    else if (anyCaution) { overall = "caution"; summary = "Some ingredients may contain hidden allergen derivatives."; }
    else summary = "No allergens detected for your profile.";
    return { overall: overall, items: items, summary: summary };
  }

  return { setData: setData, hasData: hasData, runScan: runScan };
});
