'use strict';
/* helicopter loadouts and guided bombs: the tables, weight, each kind of store from the two keys, the list key, manual guidance, the rearm,
   the AI's set; a guided bomb's seeker against smoke, a bank away and a release out of reach */
const H = require('./harness'), { ok, done } = H, C = H.load({ seed: 31 }), $ = C.$;
const HELIS = $('HELIS'), RACKS = $('RACKS'), STORES = $('STORES'), LO = $('LO'), MSL = $('MSL'), PLANES = $('PLANES'), f1 = v => v.toFixed(1);
let S;
const hdg = p => Math.atan2(-p.f.z, p.f.x), hd = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function player(id, lo, h, mouse) {
  S = C.sandbox('modern'); S.fac = [HELIS[id].side, 1 - HELIS[id].side]; S.cls = 'heli'; S.model = id; S.pref = mouse !== false; LO.mem = {}; if (lo) LO.mem[id] = lo;
  const p = C.spawnPlayer(); p.inv = 0; if (h) { p.y += h; p.land = false; p.ct = p.ctl.col = .6; }
  return p;
}
const ahead = (p, d, off, h) => { const a = hdg(p) + (off || 0), x = p.x + Math.cos(a) * d, z = p.z - Math.sin(a) * d; return { x, z, y: C.hgt(x, z) + (h || 0) }; };
function aimAt(p, t) {
  const A = S.aim, ty = t.kind ? t.y + 2 : t.y; let d = { x: t.x - p.x, y: ty - p.y, z: t.z - p.z };
  for (let i = 0; i < 4; i++) { const l = Math.hypot(d.x, d.y, d.z), e = $('heliEye')(p, { x: d.x / l, y: d.y / l, z: d.z / l }); d = { x: t.x - e.x, y: ty - e.y, z: t.z - e.z }; }
  A.h = Math.atan2(-d.z, d.x); A.p = Math.asin(d.y / Math.hypot(d.x, d.y, d.z));
}
const tap = k => { S.input[k] = true; C.run(.05); S.input[k] = false; C.run(.05); };

console.log('-- tables --');
{
  const bad = [], diff = [], none = [];
  for (const id in HELIS) {
    const R = RACKS[id]; if (!R) { bad.push(id + ' has no rack'); continue; }
    for (const n in R.sets) { const why = LO.bad(id, R.sets[n]); if (why) bad.push(id + ' ' + n + ': ' + why); if (LO.ord(R.sets[n], 1).length > (HELIS[id].lift ? 2 : 9)) bad.push(id + ' ' + n + ': a transport has no key for a third store'); }
    const o = LO.ord(LO.base(id), 1), b = HELIS[id].ord.filter(Boolean);
    if (o.length !== b.length || o.some((s, i) => ['k', 'name', 'n', 'dmg', 'r'].some(f => s[f] !== b[i][f]))) diff.push(id);
  }
  for (const k in STORES) { const s = STORES[k]; if ((s.gd || s.k === 'agm' || s.k === 'aam') && !MSL.T[s.name]) none.push(s.name); }
  ok(!bad.length, 'every named helicopter loadout is valid' + (bad.length ? ': ' + bad.join('; ') : ''));
  ok(!diff.length, 'the first set of each is the helicopter\'s own ord' + (diff.length ? ' (not: ' + diff + ')' : ''));
  ok(!none.length, 'every guided store has its row in MSL.T' + (none.length ? ' (not: ' + none + ')' : ''));
}

console.log('-- weight --');
{
  const climb = lo => { const p = player('ah64', lo, 80); const y0 = p.y; C.run(6, () => { S.input.thrUp = true; }); S.input.thrUp = false; return { m: p.def.m, dy: p.y - y0, col: p.ctl.col }; };
  const hover = lo => { const p = player('ah64', lo, 80); C.run(6); return { m: p.def.m, col: p.ct }; };
  const a = hover(RACKS.ah64.sets['Padrão']), b = hover([['hydra19', 38], ['hydra19', 38], ['atas', 4], ['ammo30', 1]]), c0 = hover([0, 0, 0, 0]);
  console.log('   AH-64 hovering: empty ' + c0.m + ' kg collective ' + c0.col.toFixed(3) + ' | default ' + a.m + ' kg ' + a.col.toFixed(3) + ' | heavy ' + b.m + ' kg ' + b.col.toFixed(3));
  ok(a.m === HELIS.ah64.m && c0.m < a.m && b.m > a.m && c0.col < a.col && a.col < b.col, 'the default set weighs what the table says, and more weight takes more collective to hover');
  const p = player('ah64', null, 80); C.run(.2); const m0 = p.def.m; S.input.ordA = true; C.run(2); S.input.ordA = false;
  ok(p.def.m < m0, 'it gets lighter as the rockets go (' + m0 + ' → ' + p.def.m + ' kg)');
}

console.log('-- the two keys, by kind of store --');
{
  let p = player('ah64', RACKS.ah64.sets.Escolta, 120); const names = () => p.def.ord.map(o => o.name).join(', ');
  ok(p.def.ord.length === 3 && p.def.ord[0].k === 'rocket' && p.def.ord[1].k === 'agm' && p.def.ord[2].k === 'aam', 'Escolta: rockets on B, the anti-tank missile on V, the Stinger behind them (' + names() + ')');
  let t = C.addVehicle('tank', 't72', 1 - p.team, ahead(p, 2500).x, ahead(p, 2500).z, 0); t.ai = null;
  C.run(1, () => { aimAt(p, t); }); const lock = S.lockGnd === t && S.lockW && S.lockW.name === 'AGM-114L Longbow';
  S.input.ordB = true; C.run(.1, () => { aimAt(p, t); }); S.input.ordB = false; const m = S.missiles[0];
  ok(lock && m && m.target === t && m.K.k === 'img', 'V launches the Longbow at the tank in the sight');
  $('addSmoke')(t.x, t.y, t.z, 40, 20); C.run(25, () => { aimAt(p, t); return S.missiles.length > 0; });
  ok(t.dead, 'and its radar seeker goes through the smoke put up over the tank');
  tap('smoke'); ok(p.def.ord[0].k === 'agm' && p.def.ord[1].k === 'aam', 'G turns the list: now ' + names());
  const q = C.addPlane('su25', 1 - p.team, ahead(p, 1800).x, p.y + 150, ahead(p, 1800).z, hdg(p), true, 'cas'); q.think = 1e9; q.flares = 0;
  C.run(.6, () => { aimAt(p, q); q.think = 1e9; C.steer(q, { x: q.f.x, y: 0, z: q.f.z }, 1); });
  const la = S.lockAir === q; S.input.ordB = true; C.run(.1, () => { aimAt(p, q); }); S.input.ordB = false; const am = S.missiles.find(x => !x.gnd);
  ok(la && am && am.target === q && am.K.k === 'ir', 'V now launches the Stinger at the aircraft its seeker holds');
  C.run(9, () => { q.think = 1e9; q.flares = 0; C.steer(q, { x: q.f.x, y: 0, z: q.f.z }, 1); return !q.dead && S.missiles.length > 0; });
  ok(q.dead || q.hp < q.def.hp, 'and it reaches it (' + (q.dead ? 'shot down' : 'structure ' + Math.round(q.hp) + '/' + q.def.hp) + ')');

  p = player('ah64', RACKS.ah64.sets.Anticarro, 120);
  ok(p.def.ord.length === 1 && p.ord[0] === 16, 'Anticarro: sixteen Hellfire in one slot, on B');
  t = C.addVehicle('tank', 't72', 1 - p.team, ahead(p, 2200).x, ahead(p, 2200).z, 0); t.ai = null;
  tap('mlock'); C.run(.5, () => { aimAt(p, t); });
  S.input.ordA = true; C.run(.1, () => { aimAt(p, t); }); S.input.ordA = false; const hm = S.missiles[0];
  ok(p.mgd && !S.lockGnd && hm && hm.target === p.las, 'L: by hand, B sends it to the point under the aim');
  C.run(25, () => { aimAt(p, t); return S.missiles.length > 0; });
  ok(t.dead, 'and with the aim held on the tank it is hit');
  ok(!!p.las && !!S.aim, 'the laser point follows the aim with this loadout too');
  t = C.addVehicle('truck', null, 1 - p.team, ahead(p, 900).x, ahead(p, 900).z, 0); t.ai = null; C.run(.3, () => { aimAt(p, t); }); tap('glock');
  ok(p.gl === t, 'Y locks the gun on the truck under the aim');

  p = player('uh60', RACKS.uh60.sets.Armado, 120);
  ok(p.def.ord.length === 2 && p.def.ord[0].n === 38 && p.def.ord[1].name === 'AGM-114 Hellfire' && p.ammo === HELIS.uh60.gun.ammo, 'UH-60 Armado: 38 rockets and 8 Hellfire');
  p = player('mi8', RACKS.mi8.sets['Só as portas'], 120);
  ok(p.def.ord.length === 0 && p.ammo === HELIS.mi8.gun.ammo + STORES.ammo762.add, 'Mi-8 Só as portas: no stores, ' + p.ammo + ' rounds for the door guns');
  S.input.ordA = S.input.ordB = true; C.run(.3); S.input.ordA = S.input.ordB = false; tap('smoke');
  ok(!H.nan(S) && !S.missiles.length && !S.bombs.length, 'B, V and G with nothing hung do nothing');
}

console.log('-- rearm and the AI --');
{
  const p = player('mi28', null, 0); C.run(.5);
  ok(p.land && LO.key(p.def.lo) === LO.key(RACKS.mi28.sets['Padrão']), 'the Mi-28 starts on its pad with the default set');
  LO.mem.mi28 = RACKS.mi28.sets.Escolta; C.run(4);
  ok(LO.key(p.def.lo) === LO.key(RACKS.mi28.sets.Escolta) && p.def.ord.some(o => o.name === 'Igla-V') && p.ord.every((n, i) => n === p.def.ord[i].n), 'a loadout chosen meanwhile is hung where it rearms, landed by its base: ' + p.def.ord.map(o => o.n + '× ' + o.name).join(', '));
  LO.mem = { ah64: RACKS.ah64.sets.Anticarro }; const a = $('heliGround')('ah64', 0, 2, true);
  ok(LO.key(a.def.lo) === LO.key(RACKS.ah64.sets['Padrão']) && a.def.ord[0].k === 'rocket' && a.def.ord[1].k === 'agm', 'an AI helicopter takes the default set, whatever the player keeps for that model');
}

console.log('-- guided bombs: seekers --');
{
  /* a level run at 420 m over T, the bomb let go where a free fall would land it dx short; after: what the plane does once it is gone */
  const drop = (id, key, o) => {
    S = C.sandbox('modern'); S.over = false; S.me = PLANES[id].side; S.fac = [0, 1]; C.director = () => {}; C.plan = () => {};
    LO.mem = {}; LO.mem[id] = RACKS[id].g.map(g => (g[1][key] ? [key, g[1][key]] : 0)).map((c, i, l) => (c && l.findIndex(x => x) === i ? c : 0));
    const T = { x: o.at ? 9500 : 5600, z: 0 }; T.y = C.hgt(T.x, T.z);
    const p = C.addPlane(id, PLANES[id].side, 3000, T.y + 420, 0, 0, false); p.me = 1; S.my = p; S.cls = 'plane'; S.model = id; p.inv = 0; p.v.x = PLANES[id].vmax * .6; p.V = p.v.x;
    const u = C.addVehicle('tank', PLANES[id].side ? 'abrams' : 't72', 1 - p.team, T.x, T.z + (o.dz || 0), 0); u.ai = null;
    let out = false, hit = null, reach = 0, far = 0; const blast = C.explode, i = p.def.ord.findIndex(s => s.key === key);
    C.explode = function (x, y, z) { if (!hit) hit = { x, y, z }; return blast.apply(this, arguments); };
    C.run(60, () => {
      C.steer(p, !out ? C.toward(p, T.x, T.z, T.y + 420) : o.bank ? C.vnorm({ x: p.f.x * .2 - p.f.z, y: .5, z: p.f.z * .2 + p.f.x }) : C.vnorm({ x: p.f.x, y: 0, z: p.f.z }), 1); p.ctl.thr = .8;
      const vh = Math.hypot(p.v.x, p.v.z), h = p.y - 1.5 - T.y, vy = p.v.y - 2, tf = (vy + Math.sqrt(vy * vy + 2 * 9.81 * h)) / 9.81;
      if (!out && (o.at ? T.x - p.x < o.at : T.x - p.x - vh * tf < (o.dx || 0))) { reach = LO.reach(p, p.def.ord[i]); far = hd(p, u); out = C.release(p, i); if (o.smoke) $('addSmoke')(u.x, u.y, u.z, 45, 25); }
      return !(out && !S.missiles.length && !S.bombs.length);
    });
    C.explode = blast;
    return { u, miss: hit ? hd(hit, u) : NaN, reach, far };
  };
  const row = (id, key) => { const a = drop(id, key, { dx: 150, dz: 120 }), b = drop(id, key, { dx: 150, dz: 120, smoke: 1 }); console.log('   ' + STORES[key].name + ' (' + MSL.SK[MSL.T[STORES[key].name].sk].k + '): clear ' + f1(a.miss) + ' m' + (a.u.dead ? ', destroyed' : '') + ' | smoke over the tank at release ' + f1(b.miss) + ' m' + (b.u.dead ? ', destroyed' : '')); return [a, b]; };
  const las = row('a10', 'gbu12'), gps = row('f22', 'gbu32'), tv = row('su25', 'kab500kr'), lk = row('su25', 'kab500');
  ok(las[0].u.dead && lk[0].u.dead && gps[0].u.dead && tv[0].u.dead, 'in clear air each kind reaches a tank 150 m beyond and 120 m beside the free-fall point');
  ok(las[1].miss > 60 && lk[1].miss > 60 && tv[1].miss > 60, 'smoke over the target cuts the laser and blinds the camera: the bomb falls where it was going');
  ok(gps[1].u.dead && gps[1].miss < 8, 'and does nothing to the satellite bomb');
  const bank = drop('a10', 'gbu12', { dx: 150, dz: 120, bank: 1 });
  ok(bank.miss > 40, 'the plane banking hard away takes its laser off the target (' + f1(bank.miss) + ' m)');
  const far = drop('a10', 'gbu12', { at: 5200 });
  ok(far.far > far.reach && far.miss > 300, 'no motor: let go ' + Math.round(far.far) + ' m out at 420 m, beyond the ' + Math.round(far.reach) + ' m the sight gives it, it falls ' + Math.round(far.miss) + ' m short');
  const near = drop('a10', 'gbu12', { at: 1900 });
  ok(near.far < near.reach && near.u.dead, 'and from ' + Math.round(near.far) + ' m, inside its ' + Math.round(near.reach) + ' m, it arrives');
}
done();
