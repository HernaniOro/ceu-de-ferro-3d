'use strict';
/* The squad's drills and the soldier's own layer (INC, WND): a soldier down and fetched by a mate, the holders of a point in its
   buildings with a reserve, an assault in contact by bounds, one fire team at a time */
const H = require('./harness'), ok = H.ok, C = H.load({ seed: 77 }), $ = C.$;
const park = S => { const P = S.my; if (!P) return; P.inv = 9; P.dead = false; P.y = 3000; if (P.v) P.v.y = 0; P.hp = P.def.hp; S.lives = 9; };

console.log('-- down, fetched and treated --');
{ const S = C.sandbox('ww2'), r = S.T.routes[0], p = $('routeAt')(r, r.len / 2), W = $('WND'), p0 = W.p; W.p = 1;
  const q = C.addSquad(0, p.x, p.z, 0, r.len / 2); C.setOrd(q, { k: 'hold', ri: 0, s: r.len / 2, x: p.x, z: p.z, R: 8 }); C.run(3);
  const m = q.men[2]; C.damageMan(m, m.hp + 3, null, false, { k: 0, pt: 0 }); W.p = p0;
  const down = !m.dead && m.down > S.t; let by = null, tS = -1;
  C.run(60, () => { if (!by && m.resc) by = m.resc; if (tS < 0 && !m.down) tS = S.t; return !!m.down; });
  ok(down && !m.dead && !m.down && Math.abs(m.hp - m.max * W.hp) < .5 && !!by && by !== m && (S.saves || 0) === 1, 'a hit that would have killed him put him down; ' + (by ? by.def.role : 'nobody') + ' fetched and treated him, up at ' + (tS - 3).toFixed(0) + ' s with ' + m.hp.toFixed(1) + ' hp (WND.hp ' + W.hp + ')');
  const m2 = q.men[3]; W.p = 1; C.damageMan(m2, m2.hp + 3, null, false, { k: 0, pt: 1 }); W.p = p0;
  ok(m2.dead, 'a hit in the head kills outright'); }

console.log('-- the holders of a point --');
for (const era of ['ww2', 'modern']) { const S = C.newState(era, $('ERAS')[era].sides[0].fighter, { cls: 'plane' }), P = S.cq.p.find(p => p.tw && p.hold === 0);
  for (const q of S.squads.slice()) for (const m of q.men) m.gone = true; S.squads.length = 0; S.men.length = 0; S.units = S.units.filter(u => u.fixed); C.plan = () => {}; C.director = () => {};
  const q = C.addSquad(0, P.x + 20, P.z, P.ri, P.s); q.job = 'held'; C.setOrd(q, { k: 'hold', ri: P.ri, s: P.s, x: P.x, z: P.z, tw: P, R: 0 });
  C.run(90, () => park(S));
  const n = q.men.filter(m => !m.dead), inB = n.filter(m => m.cbin || m.fc).length, res = (q.pts || []).filter(p => p.res).length, spots = new Set(n.map(m => Math.round(m.x / 2) + ',' + Math.round(m.z / 2))).size;
  ok(q.at && res === $('INC').def.res && inB >= n.length - 2 && spots === n.length, era + ': at ' + P.name + ' ' + inB + ' of ' + n.length + ' are in a building or a work, ' + res + ' kept as the reserve, each on his own spot'); }

console.log('-- an assault in contact goes by bounds --');
{ const S = C.sandbox('ww2'), r = S.T.routes[0], s0 = r.len / 2, a = $('routeAt')(r, s0), b = $('routeAt')(r, s0 + 260), K = $('INF').ww2[S.fac[1]][0];
  const e = C.addMan(K, 1, b.x, b.z, 0); e.ai = null; e.inv = 1e9;
  const q = C.addSquad(0, a.x, a.z, 0, s0); C.setOrd(q, { k: 'assault', ri: 0, s: s0 + 260, x: b.x, z: b.z, R: 12 });
  let both = 0, n = 0, maxN = 0;
  C.run(80, () => { if (!q.bd) return; maxN = Math.max(maxN, q.bd.n); n++; const mv = t => q.men.filter(m => !m.dead && (m.ai.i & 1) === t && Math.hypot(m.v.x, m.v.z) > 1.5).length; if (mv(q.bd.t ^ 1) > 1) both++; });
  ok(maxN >= 3 && both < n * .15, 'bounds: ' + maxN + ' of them in 80 s, the covering team still in ' + (100 - 100 * both / (n || 1)).toFixed(0) + '% of the time'); }
console.log('-- a drone over them --');
{ const S = C.sandbox('modern'), r = S.T.routes[0], p = $('routeAt')(r, r.len / 2);
  const q = C.addSquad(0, p.x, p.z, 0, r.len / 2); C.setOrd(q, { k: 'hold', ri: 0, s: r.len / 2, x: p.x, z: p.z, R: 6 }); C.run(20);
  const gap = () => { const l = q.men.filter(m => !m.dead); let s = 0, n = 0; for (const a of l) for (const b of l) if (a !== b) { s += Math.hypot(a.x - b.x, a.z - b.z); n++; } return s / (n || 1); }, g0 = gap();
  const d = C.addDrone('fpv', 1, p.x, C.hgt(p.x, p.z) + 35, p.z, 0, null, null); d.inv = 1e9; let hid = 0, shot = 0;
  C.run(8, () => { d.x = p.x; d.z = p.z; d.y = C.hgt(p.x, p.z) + 35; d.v = { x: 0, y: 0, z: 0 }; d.dead = false; });
  for (const m of q.men) if (!m.dead) { if (m.ai.dhide) hid++; if (m.ai.dsh) shot++; } const g1 = gap();
  d.gone = true; d.dead = true; C.run(8); const back = q.men.filter(m => !m.dead && m.ai.dhide).length;
  ok(hid >= 1 && hid + shot === q.live && g1 > g0 + 2 && back === 0, 'with an FPV over the squad ' + hid + ' of ' + q.live + ' took cover or spread out and went down (' + g0.toFixed(0) + ' m apart on average, then ' + g1.toFixed(0) + ' m), ' + shot + ' stood to shoot; with it gone all went back to the order'); }
H.done();
