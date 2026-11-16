'use strict';
/* Loads the DOM-free part of the page's inline script (helpers, tables, simulation, Net) into a fresh vm context.
   PAGE=<path> picks another copy of the page (default: the published one). Each load() is an independent game instance. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const PAGE = process.env.PAGE ? path.resolve(process.env.PAGE) : path.join(ROOT, 'Céu de Ferro 3D.html');
const END = '/* ---------- 3D scene';

function source(file) {
  const html = fs.readFileSync(file || PAGE, 'utf8'), a = html.indexOf("<script>\n'use strict';"), b = html.indexOf(END);
  if (a < 0 || b < 0) throw new Error('sim section not found in ' + (file || PAGE));
  return html.slice(a + 8, b);
}
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/* o.seed: deterministic Math.random; o.WebSocket and o.host: for online tests through the real server */
function load(o) {
  o = o || {};
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, WebSocket: o.WebSocket, location: { protocol: 'http:', host: o.host || 'localhost:0' } });
  vm.runInContext(source(o.page) + '\n;globalThis.$ = s => eval(s);', ctx, { filename: 'sim.js' });
  ctx.seed = n => { ctx.$('Math').random = rng(n); };
  if (o.seed) ctx.seed(o.seed);
  ctx.run = (secs, each, dt) => { dt = dt || 1 / 60; for (let n = Math.round(secs / dt); n-- > 0;) { ctx.step(dt); if (each && each(dt) === false) break; } };
  /* an empty battlefield of that era: nothing spawns by itself */
  ctx.sandbox = era => { const S = ctx.newState(era); S.demo = false; S.over = true; S.units = []; S.planes = []; S.men = []; S.squads = []; return S; };
  return ctx;
}
/* every finite number in the entities of S, or the path of the first that is not */
function nan(S) {
  for (const k of ['planes', 'units', 'bullets', 'bombs', 'missiles', 'men']) for (const o of S[k] || []) for (const f of ['x', 'y', 'z', 'hp', 'h'])
    if (f in o && typeof o[f] === 'number' && !Number.isFinite(o[f])) return k + '.' + f;
  return null;
}
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + msg); return c; };
const done = () => { console.log(fails ? fails + ' FAILED' : 'all passed'); process.exitCode = fails ? 1 : 0; };
module.exports = { load, source, PAGE, ROOT, ok, done, nan, rng };
