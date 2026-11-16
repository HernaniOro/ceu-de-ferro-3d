'use strict';
/* second half of loadout.js: every store on its targets, the keys, the rearm, the AI */
const { c, $, LO, RACKS, STORES, PLANES, fly, hold, tank, flat } = require('./loadout'), { ok, done, nan } = require('./harness');
const S = () => $('S'), GR = 9.81, hd = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const slotOf = (p, key) => p.def.ord.findIndex(o => o.key === key);
/* level run over a target dx m ahead: the store is let go when its fall puts it on the target, as the AI does. Returns where it burst */
function bombRun(id, lo, key, kind, model, o) {
  o = o || {};
  const agl = o.agl || 420, V = o.V || PLANES[id].vmax * .6, x0 = 3000, p = fly(id, lo, x0, 0, agl, V), off = o.off || 0, t = tank(S(), kind, model, 1 - p.team, x0 + 2600, 0), i = slotOf(p, key);
  let hit = null, out = false; const blast = c.explode; p.y = t.y + agl;
  c.explode = function (x, y, z) { if (!hit) hit = { x, y, z }; return blast.apply(this, arguments); };
  c.run(30, () => {
    c.steer(p, c.toward(p, t.x, t.z + off, t.y + agl), 1); p.ctl.thr = .8;
    const vh = Math.hypot(p.v.x, p.v.z), h = p.y - 1.5 - t.y, vy = p.v.y - 2, tf = (vy + Math.sqrt(vy * vy + 2 * GR * h)) / GR;   // a bomb leaves 1.5 m under the plane, 2 m/s down
    if (!out && t.x - p.x - vh * tf < vh / 120) { out = c.release(p, i); if (o.all) for (let n = o.all; --n > 0;) { p.ocool[i] = 0; c.release(p, i); } }
    return !(out && !S().bombs.length);
  });
  c.explode = blast;
  return { p, t, hit, miss: hit ? hd(hit, t) : NaN, out };
}

console.log('-- free-fall bombs --');
for (const [id, set, key, model] of [['f22', 'Bombardeio', 'mk83', 't90'], ['a10', 'Bombardeio', 'mk82', 't72'], ['su57', 'Bombardeio', 'fab250', 'abrams'], ['su25', 'Bombardeio', 'fab500', 'leo2']]) {
  if (!RACKS[id] || !RACKS[id].sets[set] || !STORES[key]) continue;
  const r = bombRun(id, RACKS[id].sets[set], key, 'tank', model);
  ok(r.out && r.miss < 15 && r.t.dead && r.t.lastBy === r.p, id + ' ' + set + ': ' + STORES[key].name + ' from a level run at 420 m lands ' + r.miss.toFixed(1) + ' m from the tank and destroys it, credited to the plane');
}
{
  const id = 'a10', lo = RACKS[id].sets.Bombardeio, st = STORES.mk82, rows = [];
  for (const off of [20, 35, 60]) {
    const r = bombRun(id, lo, 'mk82', 'tank', 't72', { off }), tr = bombRun(id, lo, 'mk82', 'aa', 'pantsir', { off });
    rows.push(off + ' m: T-72 ' + (r.t.dead ? 'destroyed' : Math.round(r.t.hp) + '/' + r.t.def.hp) + ', Pantsir ' + (tr.t.dead ? 'destroyed' : Math.round(tr.t.hp) + '/' + tr.t.def.hp));
  }
  console.log('   Mk 82 (' + st.dmg + ' at the centre, ' + st.r + ' m) bursting beside a vehicle: ' + rows.join(' | '));
  const far = bombRun(id, lo, 'mk82', 'aa', 'pantsir', { off: 70 });
  ok(!far.t.dead && far.t.hp === far.t.def.hp, 'and ' + far.miss.toFixed(0) + ' m away, beyond its radius, it does nothing');
}

console.log('-- keys --');
{
  const p = fly('su25', RACKS.su25.sets.Bombardeio, 3000, 0, 800), names = () => p.def.ord.map(o => o.name).join(', '), I = S().input, n0 = names(), c0 = p.ord.slice();
  ok(p.def.ord.length === 3 && p.def.ord[1].k === 'aam', 'Su-25 Bombardeio has three stores (' + n0 + '): B and V the first two, and the missile is on V');
  I.ordA = true; c.run(.05); I.ordA = false; c.run(.5);
  ok(p.ord[0] === c0[0] - 1 && p.ord[1] === c0[1] && p.ord[2] === c0[2], 'B lets go one of the first');
  I.smoke = true; c.run(.4); I.smoke = false; c.run(.05);
  const n1 = names(); ok(n1 !== n0 && p.def.ord[1].key === 'fab250' && p.ord[1] === c0[2], 'G turns the list once per press, however long it is held: now ' + n1);
  c.run(.5); I.ordB = true; c.run(.05); I.ordB = false;
  ok(p.ord[1] === c0[2] - 1, 'and V lets go the store that came into it');
  for (let n = 0; n < 2; n++) { I.smoke = true; c.run(.05); I.smoke = false; c.run(.05); }
  ok(names() === n0 && p.ord.join() === [c0[0] - 1, c0[1], c0[2] - 1].join(), 'two more presses and the list is back where it began, counts with their stores');
  const q = fly('f22', null, 3000, 0, 800), nq = q.def.ord.map(o => o.name).join(); S().input.smoke = true; c.run(.05);
  ok(q.def.ord.map(o => o.name).join() === nq, 'with two stores G does nothing');
}

console.log('-- rearm --');
{
  const id = 'a10', R = RACKS[id], S0 = c.sandbox('modern'), b = S0.base[0];
  let p = fly(id, R.sets.Bombardeio, b.x + 200, b.z, 300, 120), full = p.ord.slice(), m0 = p.def.m;
  p.ord = p.ord.map(() => 0); p.ammo = 10; const mE = p.def.m;
  hold(p, flat, 4);
  ok(p.ord.join() === full.join() && p.ammo === p.def.gun.ammo && Math.abs(p.def.m - m0) < 1e-6 && mE < m0, 'low over its airfield the plane gets back the load it chose (' + p.def.ord.map((o, i) => p.ord[i] + '× ' + o.name).join(', ') + '), and its weight with it: ' + Math.round(mE) + ' → ' + Math.round(p.def.m) + ' kg');
  p = fly(id, R.sets.Bombardeio, b.x + 200, b.z, 300, 120); const d0 = p.def;
  LO.mem[id] = R.sets['Padrão']; hold(p, flat, 1);
  const mid = p.def === d0 && S().rearm > 0;
  hold(p, flat, 3);
  ok(mid && p.def !== d0 && p.def.ord[0].key === 'agm65' && p.ord.join() === '6,2', 'another loadout chosen in flight is hung there too, after the time a rearm takes: ' + p.def.ord.map((o, i) => p.ord[i] + '× ' + o.name).join(', '));
  p = fly(id, R.sets.Bombardeio, b.x + 9000, b.z, 300, 120); LO.mem[id] = R.sets['Padrão']; hold(p, flat, 4);
  ok(p.def.ord[0].key === 'mk82', 'and nowhere else');
  LO.mem[id] = [0, ['agm65', 9], 0]; p = fly(id, undefined, 3000, 0, 500); LO.mem[id] = [0, ['agm65', 9], 0];
  const q = c.addPlane(id, 0, 3000, 900, 0, 0, false);
  ok(q.def.ord[0].n === 6 && LO.key(q.def.lo) === LO.key(LO.base(id)), 'a stored loadout that is not valid any more gives the default load');
}
if (require('fs').existsSync(require('path').join(__dirname, 'loadout-more.js'))) require('./loadout-more.js'); else done();
