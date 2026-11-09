// The shared system palette and the status-hue rule (GUIDANCE.md §1). Not a command: check.js, check-board.js and
// verify/verify-templates.js use it.
//
// System colours are the same on every tab and on every board (system, supersystem, repository, issue boards, work board): twelve
// registry slots, --sys-1 … --sys-12 in registry order (colourSlots(): an archived system holds none), and on a system board its three sides --server / --client / --wire, which
// are slots 1 to 3. The status spectra are reserved: green–yellow–red for outcomes (an issue board's options and as-built states)
// and yellow–orange–red for compatibility (the Impact tab). So no system colour falls in them: no green, yellow, orange, amber,
// red or pink. A chromatic colour (HSL saturation of STATUS_MIN_SAT or more) whose hue is outside ALLOWED_HUES is in a status
// spectrum; a near-neutral grey is not.
"use strict";

/* The palette: slot n is index n-1. Light on the light surfaces (#fcfcfd, #f3f5f8), dark on the dark ones (#171c25, #10141b);
   every slot is at least 3:1 against its theme's card surface. Chosen for distance from each other in normal vision and under
   protanopia, deuteranopia and tritanopia (CIEDE2000), and from the accent (#6d47e0 / #a58bff) and the neutrals. */
const PALETTE = {
  names: ["blue", "purple", "teal", "indigo", "orchid", "sky", "harbour", "violet", "lagoon", "cobalt", "iris", "fjord"],
  light: ["#2a78d6", "#653184", "#0d7680", "#1d2660", "#9656aa", "#1a9ec7", "#203d4b", "#7700c7", "#008a81", "#7780f8", "#271ea9", "#09534e"],
  dark: ["#3987e5", "#8a44d8", "#1f8089", "#b4bef5", "#a86fb8", "#31b5f4", "#9ae2f4", "#c790d0", "#11978e", "#245eff", "#8365bd", "#00c7ba"],
};
/* A system board's sides are slots 1 to 3; their -soft fills are tints of the same hues. */
const SIDES = { server: 1, client: 2, wire: 3 };
/* Hues (HSL degrees) a system colour may take: cyan through blue and indigo to purple. Below 175 is green, yellow, orange and
   red; from 295 on is magenta, pink and red. */
const ALLOWED_HUES = [175, 295];
const STATUS_MIN_SAT = 0.15;

function parseColour(v) {
  v = String(v || "").trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) { const h = m[1].length === 3 ? m[1].split("").map(c => c + c).join("") : m[1]; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  m = v.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/);
  if (m) return [m[1], m[2], m[3]].map(Number);
  return null;
}
/* [hue 0-360, saturation 0-1, lightness 0-1] */
function hsl(rgb) {
  const [r, g, b] = rgb.map(x => x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, s, l];
}
/* Is this colour in a status spectrum? Returns null when it is not, or a short reason. */
function inStatusHue(value) {
  const rgb = parseColour(value); if (!rgb) return null;
  const [h, s] = hsl(rgb);
  if (s < STATUS_MIN_SAT) return null;
  if (h >= ALLOWED_HUES[0] && h < ALLOWED_HUES[1]) return null;
  const name = h < 15 || h >= 330 ? "red" : h >= 295 ? "pink / magenta" : h < 45 ? "orange / amber" : h < 70 ? "yellow" : "green";
  return `hue ${Math.round(h)}° (${name})`;
}

/* The system-colour tokens a board declares: every "--sys-N:", "--server:", "--client:", "--wire:" and their "-soft" fills, with
   the value as written. */
const TOKEN = /--(sys-[1-9]\d*|server|client|wire)(-soft)?\s*:\s*(#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\))/g;
function tokens(html) {
  const css = (String(html).match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join("\n"), found = [];
  let m; TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(css))) found.push({ token: "--" + m[1] + (m[2] || ""), base: m[1], soft: !!m[2], value: m[3] });
  return found;
}
/* The check: problems (a system colour in a status spectrum: fails) and warnings (a slot or side that is not the shared palette's
   value, so the system's colour would differ between pages). */
function paletteCheck(html) {
  const problems = [], warnings = [], seen = new Set(), all = tokens(html);
  all.forEach(t => {
    const bad = inStatusHue(t.value);
    if (bad && !seen.has(t.token + t.value)) { seen.add(t.token + t.value); problems.push(`${t.token}: ${t.value} is in a status spectrum, ${bad}; system colours stay out of green, yellow, orange, amber, red and pink (GUIDANCE.md §1)`); }
    if (t.soft) return;
    const slot = /^sys-/.test(t.base) ? +t.base.slice(4) : SIDES[t.base];
    if (!slot || slot > PALETTE.light.length) return;
    const ok = [PALETTE.light[slot - 1], PALETTE.dark[slot - 1]], v = t.value.toLowerCase();
    if (!ok.includes(v) && !seen.has("w" + t.token + v)) { seen.add("w" + t.token + v); warnings.push(`${t.token}: ${t.value} is not slot ${slot}'s colour in the shared palette (${ok.join(" light, ")} dark): the system would take another colour on this board than on the others`); }
  });
  return { tokens: all.length, problems, warnings };
}

/* The plain system (GUIDANCE.md §1): a system named Internal Tooling and every system under it are drawn in the theme's plain ink (--ink: black
   on a light board, the plain ink of a dark one), in any repository. It takes no colour slot and holds no place among the top-level systems, so
   it moves no other system's colour. The name is the rule: the registry records no flag. */
const isPlainName = n => typeof n === "string" && n.trim().toLowerCase() === "internal tooling";

/* The registry's colour slots (GUIDANCE.md §1), one rule for every runtime: lib.js registry() for the boards built from it, and the same rule in
   the supersystem template's sysColour. A system's colour is held by the highest live system on its parent chain, and a child takes that one's;
   an archived system (status "archived") holds none and is drawn neutral (slot 0). A live top-level system keeps the slot of its place among the
   top-level systems in registry order, archived ones counted, so archiving one moves no other system's colour; what an archived system's place
   freed goes to the next system that has none (a thirteenth top-level system on, a live child of an archived one), lowest slot first, and only when
   no slot is left does a system fold into the neutral. A plain system (above) holds neither a place nor a slot and is drawn in the plain ink.
   Returns { slot(slug) (0 when none), holder(slug) (the system whose colour it is, or null), plain(slug) (the Internal Tooling system it is or sits under, or null) }. */
function colourSlots(list, max) {
  const M = max || PALETTE.light.length, systems = (Array.isArray(list) ? list : []).filter(s => s && s.kind !== "repo"), by = slug => systems.find(s => s.slug === slug);
  const live = s => s.status !== "archived";
  const plainOf = s => { if (!s || !live(s)) return null; let c = s, n = 0; while (c && n++ < 64) { if (live(c) && isPlainName(c.name)) return c; c = by(c.parent); } return null; };
  const tops = systems.filter(s => !by(s.parent) && !plainOf(s));
  const holderOf = s => { if (!s || !live(s) || plainOf(s)) return null; let h = s, c = s, n = 0; while (by(c.parent) && n++ < 64) { c = by(c.parent); if (live(c)) h = c; } return h; };
  const holders = [...new Set(systems.map(holderOf).filter(Boolean))], slots = new Map();
  holders.forEach(h => { const i = tops.indexOf(h); if (i >= 0 && i < M) slots.set(h.slug, i + 1); });
  const free = []; for (let n = 1; n <= M; n++) if (![...slots.values()].includes(n)) free.push(n);
  holders.filter(h => !slots.has(h.slug)).forEach(h => { if (free.length) slots.set(h.slug, free.shift()); });
  return { slot: slug => { const h = holderOf(by(slug)); return (h && slots.get(h.slug)) || 0; }, holder: slug => holderOf(by(slug)), plain: slug => plainOf(by(slug)) };
}

module.exports = { colourSlots, isPlainName, PALETTE, SIDES, ALLOWED_HUES, STATUS_MIN_SAT, parseColour, hsl, inStatusHue, tokens, paletteCheck };
