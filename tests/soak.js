'use strict';
/* General smoke: a solo run per era and per playable model class (SECS seconds each, default 600) with scripted hands on the controls,
   then an AI-only battle per era with a tally of who killed what. Fails on any exception, NaN, or a wave that never resolves. */
const H = require('./harness'), SECS = +process.env.SECS || 600, C = H.load({ seed: 4242 }), $ = C.$;
const DEFS = $('DEFS'), ERAS = $('ERAS'), KITS = $('typeof KITS !== "undefined" ? KITS : null');
const kills = {}, tally = (by, o) => { const a = by ? kindName(by) : '-', b = kindName(o), k = a + ' > ' + b; kills[k] = (kills[k] || 0) + 1; };
const kindName = o => (o.man ? 'inf' : o.kind ? o.kind : o.heli ? (o.def.lift ? 'lift' : 'heli') : o.role === 'cas' ? 'cas' : 'fighter');
const KU = C.killUnit, DN = C.downed, KM = C.killMan;
let last = null;
C.ruin = (R => (u, dmg, by) => { const was = u.dead; R(u, dmg, by); if (!was && u.dead && watch) tally(by, u); })(C.ruin);
C.lose = (L => (p, dmg, by) => { const was = p.dead; L(p, dmg, by); if (!was && p.dead && watch) tally(by, p); })(C.lose);
if (KM) C.killMan = (m, by) => { if (!m.dead && watch) tally(by, m); KM(m, by); };
let watch = false;
/* LOADS=1: instead of the above, every plane that has loadouts, once with each of its named ones */
const LO = $('typeof LO !== "undefined" ? LO : null'), RACKS = LO && $('RACKS');

function solo(era, cls, model, set, mouse) {
  C.seed(era.length * 131 + model.length * 7 + cls.length);
  if (LO) { LO.mem = {}; if (set) LO.mem[model] = RACKS[model].sets[set]; }
  const S = C.newState(era, model, { cls, mouse: mouse !== false }), I = S.input, hd = $('headTo');
  let waves = 0, deaths = 0, err = null, t0 = Date.now(), steps = 0, maxMen = 0;
  try {
    C.run(SECS, () => {
      const P = S.my; steps++;
      if (S.over) return false;
      S.lives = 9; waves = S.wave;
      if (S.men) maxMen = Math.max(maxMen, S.men.length);
      if (!P || P.dead) { deaths += P && P.dead && !P.counted ? (P.counted = 1) : 0; return; }
      const t = S.t, foe = (P.kind || P.man ? [...S.units, ...(S.men || [])] : S.planes).filter(o => o.team !== P.team && !o.dead).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
      const tx = foe ? foe.x : S.W / 2, tz = foe ? foe.z : 0;
      if (S.aim) { S.aim.h = hd(P.x, P.z, tx, tz) + Math.sin(t * .7) * .02; S.aim.p = P.kind || P.man ? .01 : foe ? Math.max(-.5, Math.min(.5, (foe.y - P.y) / (Math.hypot(tx - P.x, tz - P.z) || 1))) : .05; if (!P.kind && !P.man && P.y - C.hgt(P.x, P.z) < 350) S.aim.p = .3; }
      I.up = t % 20 < 12; I.fire = t % 3 < 1.5; I.ordA = t % 7 < .1; I.ordB = t % 11 < .1; I.smoke = t % 45 < .1; I.flare = t % 9 < .1; I.left = t % 13 < 1; I.fix = t % 60 > 55;
      if (P.heli) { const a = P.y - C.hgt(P.x, P.z), g = [...S.units, ...(S.men || [])].filter(o => o.team !== P.team && !o.dead).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0]; I.thrUp = a < 25; I.thrDown = a > 70 || t % 97 > 90; I.up = !g || Math.hypot(g.x - P.x, g.z - P.z) > 1500; I.left = false; I.brake = t % 41 < .05; I.smoke = t % 19 < .05; if (S.aim && g) { S.aim.h = hd(P.x, P.z, g.x, g.z); S.aim.p = Math.max(-.3, Math.min(.1, (g.y - P.y) / (Math.hypot(g.x - P.x, g.z - P.z) || 1))); } else if (S.aim) S.aim.p = 0; }
      if (P.man) { I.thrUp = t % 10 < 3; I.thrDown = t % 17 < .05; I.flare = t % 23 < .05; I.yawL = t % 29 < .05; I.reload = t % 31 < .05; I.ordA = t % 8 < 2; I.ordB = false; }
      const n = H.nan(S); if (n) { err = 'NaN in ' + n + ' at t=' + t.toFixed(1); return false; }
    });
  } catch (e) { err = e.stack.split('\n').slice(0, 3).join(' | '); }
  const ms = (Date.now() - t0) / steps;
  H.ok(!err, (era + ' ' + cls + ' ' + model + (set ? ' ' + set : '') + (mouse === false ? ' classic' : '')).padEnd(set ? 44 : 26) + ' t=' + S.t.toFixed(0) + ' s, wave ' + waves + ', deaths ' + deaths + ', score ' + S.score + (maxMen ? ', soldiers max ' + maxMen : '') + ', ' + ms.toFixed(3) + ' ms/step' + (err ? '  ' + err : ''));

}
function battle(era) {
  C.seed(99 + era.length);
  const S = C.newState(era); let err = null, steps = 0, maxMen = 0, t0 = Date.now();
  for (const k in kills) delete kills[k];
  watch = true;
  try { C.run(SECS, () => { steps++; if (S.men) maxMen = Math.max(maxMen, S.men.filter(m => !m.dead).length); const n = H.nan(S); if (n) { err = 'NaN in ' + n; return false; } }); } catch (e) { err = e.stack.split('\n').slice(0, 3).join(' | '); }
  watch = false;
  const tot = Object.values(kills).reduce((a, b) => a + b, 0), by = Object.entries(kills).filter(([k]) => k.startsWith('inf >')).reduce((a, [, v]) => a + v, 0), of = Object.entries(kills).filter(([k]) => k.endsWith('> inf')).reduce((a, [, v]) => a + v, 0);
  H.ok(!err, era + ' AI-only battle, ' + SECS + ' s, ' + ((Date.now() - t0) / steps).toFixed(3) + ' ms/step, kills ' + tot + (maxMen ? ', soldiers alive max ' + maxMen + ', infantry made ' + by + ' kills (' + (100 * by / (tot || 1)).toFixed(0) + '%) and took ' + of + ' deaths (' + (100 * of / (tot || 1)).toFixed(0) + '%)' : '') + (err ? '  ' + err : ''));
  console.log('    ' + Object.entries(kills).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
}
if (process.env.LOADS) { if (LO) for (const id in RACKS) for (const set in RACKS[id].sets) solo(DEFS.plane[id].era, 'plane', id, set); else console.log('this page has no loadouts'); }
else for (const era in ERAS) {
  const sd = ERAS[era].sides[0]; if (process.env.ERA && process.env.ERA !== era) continue;
  for (const [cls, model] of [['plane', sd.fighter], ['plane', sd.cas], ['tank', sd.tanks[0]], ['aa', sd.aa], ['art', sd.art]]) solo(era, cls, model);
  if (KITS) for (const id in KITS) if (KITS[id].era === era && KITS[id].side === 0) solo(era, 'inf', id);
  if (sd.heli) for (const id of [sd.heli, sd.lift]) for (const mouse of [true, false]) solo(era, 'heli', id, '', mouse);
  battle(era);
}
H.done();
