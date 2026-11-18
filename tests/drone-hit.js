'use strict';
/* Drones in contact: a drone flown at a soldier, a vehicle, a house, a building, a tree, sandbags or the ground goes off (a warhead) or is lost (none)
   at the point it touches, whatever its speed and the frame's length: the step sweeps its path. Every case is flown TRIALS times with a little
   scatter, at a low speed and at the top speed of the type, in a 1/60 s step and in a 1/12 s one (a hitch), and prints how often it went through.
   PAGE=<page> tests another copy (the page before the fix prints the pass-through it had). TRIALS=<n> (8) */
const H = require('./harness'), C = H.load({ seed: 31 }), $ = C.$, ok = H.ok, TRIALS = +process.env.TRIALS || 8;
const DRONES = $('DRONES'), FORT = $('FORT'), ASPD = $('ASPD'), HP = H.rng(77);
let S, T, B0, P;
const sc = a => (HP() - .5) * 2 * a;
const fresh = () => { S = C.sandbox('modern'); T = S.T; B0 = S.base[0]; S.over = false; S.demo = false; S.waveTimer = S.planT = 1e9; S.base[0].hp = 1e9; S.base[1].hp = 1e9; S.input = {}; S.aim = { h: 0, p: 0, d: { x: 1, y: 0, z: 0 } }; S.mouse = true; S.my = null; C.run(.05); S.units = []; S.men = []; S.squads = []; S.planes = []; return S; };   // the armies the first step puts out are cleared: only what a case adds is there
/* level open ground with nothing within 90 m (x toward +X) */
function flat(n) {
  let k = 0;
  for (let z = -S.HW + 600; z < S.HW - 600; z += 97) for (let x = 900; x < S.W - 900; x += 131) {
    const h = C.hgt(x, z); let lv = h > T.WL + 6 && C.routeDist(T, x, z) > 120;
    for (const [a, b] of [[-90, 0], [260, 0], [0, 60], [0, -60], [100, 0], [-60, 0], [30, 0], [-30, 0]]) if (Math.abs(C.hgt(x + a, z + b) - h) > Math.hypot(a, b) * .012 + .15) lv = false;
    if (lv && !C.near(x, z, 170).length && k++ === (n || 0)) return { x, z, y: h };
  }
  throw new Error('no flat ground');
}
/* the nearest big building with a solid segment (kd 1) in a wall facing out on the z axis, and a line into it: from 90 m out to its face */
function wallLine() {
  const o = T.houses.filter(q => q.B && q.B.t === 'block' && q.B.nl >= 3).sort((p, q) => Math.hypot(p.x - T.towns[0].x, p.z - T.towns[0].z) - Math.hypot(q.x - T.towns[0].x, q.z - T.towns[0].z)).find(q => {
    const B = q.B; for (let L = 0; L < B.nl; L++) for (const j of [0, B.nz]) for (let i = 0; i < B.nx; i++) if (B.kd[B.oZ + (L * (B.nz + 1) + j) * B.nx + i] === 1) return true; return false;
  }), B = o.B;
  for (let L = 0; L < B.nl; L++) for (const j of [0, B.nz]) for (let i = 0; i < B.nx; i++) if (B.kd[B.oZ + (L * (B.nz + 1) + j) * B.nx + i] === 1) {
    const W = (lx, ly, lz) => $('bWorld')(o, lx, ly, lz, {}), z0 = j * B.bd, sg = j ? 1 : -1, y = (L + .5) * B.sh, lx = (i + .5) * B.bw;
    return { o, B, a: W(lx, y, z0 + sg * 90), b: W(lx, y, z0), back: W(lx, y - (L ? 0 : 0), z0 - sg * 3.2) };
  }
}
let HOBJ = 0, BDMG = 0; { const h0 = C.hitObj, b0 = C.bDmg; C.hitObj = (...x) => { HOBJ += x[1]; return h0(...x); }; C.bDmg = (...x) => { BDMG += x[2]; return b0(...x); }; }
const nrm = (a, b) => { const x = b.x - a.x, y = b.y - a.y, z = b.z - a.z, L = Math.hypot(x, y, z); return { x: x / L, y: y / L, z: z / L, L }; };
/* one flight: kind k from a to b at sp (m/s), steps of dt s; the velocity is held, so the contact is all the test looks at. Returns the drone and the path length it flew */
function fly(k, a, b, sp, dt, safe) {
  const d = nrm(a, b);
  P = C.addMan('blueDrone', 0, a.x - d.x * 60, a.z - d.z * 60, 0); P.ai = null; P.me = 1; S.my = P; S.me = 0; P.inv = 1e9;
  const o = C.addDrone(k, 0, a.x, a.y, a.z, 0, P, null); o.t0 = S.t - 10; o.safe = !!safe; o.link = o.lq = 1;
  let tr = 0;
  const hold = () => { o.v = { x: d.x * sp, y: d.y * sp, z: d.z * sp }; o.link = o.lq = 1; tr = (o.x - a.x) * d.x + (o.y - a.y) * d.y + (o.z - a.z) * d.z; return !o.gone && tr < d.L + 40; };
  hold();
  if (k === 'owa') o.armed = true;
  if (k === 'owa') o.nav = { st: 'dive', x: b.x, z: b.z, tgt: null, pt: { x: b.x, y: b.y, z: b.z }, T: 0, look: 0 };
  C.run(30, () => hold(), dt);
  const tr1 = tr; C.run(2.5, null, 1 / 60);   // the round a warhead lobs, the burst, the fall of what it broke
  return { o, tr: tr1, L: d.L };
}
/* the table: name -> { build(): {a, b, Lc: path to the surface, dmg(): was it hurt, extra?}, k } */
const sp = (k, top) => (top ? DRONES[k].vmax : 6);
const stats = {};
function trials(name, build, k, opts) {
  opts = opts || {};
  const res = [];
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return [{ pass: 0, hit: 0, hurt: 0, n: 1 }];
  for (const top of [0, 1]) for (const dt of [1 / 60, 1 / 12]) {
    let pass = 0, hit = 0, hurt = 0, n = 0, endBad = 0;
    for (let i = 0; i < TRIALS; i++) {
      fresh(); const c = build(i), r = fly(k, c.a, c.b, sp(k, top), dt, opts.safe);
      const stopped = r.o.gone && r.tr <= c.Lc + (c.slack || 3.5), good = r.o.gone && (opts.safe || !DRONES[k].wh || r.o.end === 'boom') ;
      if (process.env.DBG) console.log('     ', name, top, dt, 'gone', r.o.gone, r.o.end, 'tr', r.tr.toFixed(1), 'Lc', c.Lc, 'dead', r.o.dead, 'armed', r.o.armed, 'y', r.o.y.toFixed(1), 'a.y', c.a.y.toFixed(1), 'cut', r.o.cut, 'link', r.o.link.toFixed(2));
      n++; if (!r.o.gone || r.tr > c.Lc + (c.slack || 3.5)) pass++; if (stopped) hit++; if (stopped && c.dmg()) hurt++; if (stopped && !good) endBad++;
    }
    res.push({ top, dt, pass, hit, hurt, n, endBad });
    stats[name + (top ? ' top ' : ' low ') + (dt < .05 ? '1/60' : '1/12')] = pass / n;
  }
  console.log('   ' + name.padEnd(34) + res.map(r => (r.top ? 'top' : 'low') + (r.dt < .05 ? ' 1/60' : ' 1/12') + ': through ' + r.pass + '/' + r.n + ', hurt ' + r.hurt + (r.endBad ? ', wrong end ' + r.endBad : '')).join(' | '));
  return res;
}
const allClear = (res, what) => ok(res.every(r => r.pass === 0), what + ': never goes through (' + res.map(r => r.pass).join(' ') + ' of ' + res[0].n + ' per speed and step)');
const allHurt = (res, what) => ok(res.every(r => r.hurt === r.n), what + ': hurts or destroys it every time (' + res.map(r => r.hurt).join(' ') + ')');

const R = {};
console.log('-- the FPV (a warhead) at: --');
let F;
R.sol = trials('standing soldier', () => { fresh(); F = flat(); const m = C.addMan('rifleman', 1, F.x + 150 + sc(1), F.z + sc(.3), 0); m.ai = null; return { a: { x: F.x, y: m.y + 1.1, z: F.z }, b: { x: m.x, y: m.y + 1.1, z: m.z }, Lc: 150, dmg: () => m.dead, m }; }, 'fpv');
R.tf = trials('tank, front (t72)', () => { fresh(); F = flat(); const u = C.addVehicle('tank', 't72', 1, F.x + 150, F.z, Math.PI); u.ai = null; const hp0 = u.hp, z = sc(1.2); return { a: { x: F.x, y: u.y + 1.7, z: F.z + z }, b: { x: u.x, y: u.y + 1.7, z: u.z + z }, Lc: 150 - 3, slack: 4, dmg: () => u.hp < hp0 || u.dead, u, hp0 }; }, 'fpv');
R.tr = trials('tank, roof (dive from behind)', () => { fresh(); F = flat(); const u = C.addVehicle('tank', 't72', 1, F.x + 150, F.z, Math.PI); u.ai = null; const hp0 = u.hp, z = sc(.8); return { a: { x: u.x + 30, y: u.y + 62, z: F.z + z }, b: { x: u.x, y: u.y + 2.6, z: u.z + z }, Lc: 66, slack: 4, dmg: () => u.dead || u.hp < hp0 * .7 }; }, 'fpv');   // the plate struck depends on a hand's breadth: a turret's rear can bleed a shaped charge off
R.tre = trials('tank, rear (t72)', () => { fresh(); F = flat(); const u = C.addVehicle('tank', 't72', 1, F.x + 150, F.z, 0); u.ai = null; const hp0 = u.hp, z = sc(1.2); return { a: { x: F.x, y: u.y + 1.7, z: F.z + z }, b: { x: u.x, y: u.y + 1.7, z: u.z + z }, Lc: 150 - 3, slack: 4, dmg: () => u.dead || u.hp < hp0 * .6 }; }, 'fpv');
R.trk = trials('truck, side', () => { fresh(); F = flat(); const u = C.addVehicle('truck', null, 1, F.x + 150, F.z + sc(.5), Math.PI / 2); u.ai = null; const hp0 = u.hp; return { a: { x: F.x, y: u.y + 1.6, z: u.z }, b: { x: u.x, y: u.y + 1.6, z: u.z }, Lc: 150 - 1.2, slack: 4, dmg: () => u.dead || u.hp < hp0 }; }, 'fpv');
R.gnd = trials('the ground (30 deg dive)', () => { fresh(); F = flat(); const c = Math.cos(.52), s = Math.sin(.52); return { a: { x: F.x, y: F.y + 60, z: F.z }, b: { x: F.x + 60 * c / s, y: F.y, z: F.z }, Lc: 60 / s + 2, slack: 4, dmg: () => true }; }, 'fpv');
R.tree = trials('a tree', () => {
  fresh(); F = flat(); const o = { x: F.x + 150, z: F.z + sc(.6) }, id = T.objs.find(q => q.k === 'tree');
  const t = T.objs.filter(q => q.k === 'tree').find(q => { const y = q.y; return Math.abs(y - C.hgt(q.x - 100, q.z)) < 3 && !T.objs.some(w => w !== q && Math.hypot(w.x - q.x, w.z - q.z) < 30 && w.k !== 'tree') && !T.objs.some(w => w !== q && w.k === 'tree' && Math.hypot(w.x - q.x, w.z - q.z) < 12); });
  const hp0 = S.oh[t.id], by = t.y + 3;
  return { a: { x: t.x - 120, y: by, z: t.z }, b: { x: t.x, y: by, z: t.z }, Lc: 120 - 0.5, slack: 5, dmg: () => S.oh[t.id] < hp0 || S.os[t.id] > 0 };
}, 'fpv');
R.hang = trials('hangar wall (box building)', () => {
  fresh(); const h = T.objs.find(q => q.k === 'hangar'), ux = h.c, uz = -h.s, a = { x: h.x + ux * (h.hw + 120), z: h.z + uz * (h.hw + 120) }, y = h.y + 2; HOBJ = 0;
  return { a: { x: a.x, y, z: a.z }, b: { x: h.x, y, z: h.z }, Lc: 120, slack: 4, dmg: () => HOBJ > 0 };
}, 'fpv');
R.bld = trials('big building, solid wall', () => {
  fresh(); const w = wallLine(); BDMG = 0;
  return { a: w.a, b: w.b, Lc: 90, slack: 4, dmg: () => BDMG > 0 };
}, 'fpv');
R.bag = trials('sandbag wall', () => {
  fresh(); F = flat(); const f = C.fortAdd(T.fid + FORT.pre, 2, 1, F.x + 150, F.z, Math.PI, 1), o = f.o, y = F.y + .55, hp0 = S.oh[o.id];
  return { a: { x: F.x, y, z: F.z }, b: { x: F.x + 150, y, z: F.z }, Lc: 150 - o.hd, slack: 4, dmg: () => S.oh[o.id] < hp0 || S.os[o.id] > 0 };
}, 'fpv');
console.log('-- a drone with no warhead (bomber, recon) or its safety on, at a soldier and at a tank: lost, nothing explodes --');
R.sb = trials('bomber into a soldier', () => { fresh(); F = flat(); const m = C.addMan('rifleman', 1, F.x + 150, F.z, 0); m.ai = null; return { a: { x: F.x, y: m.y + 1.1, z: F.z }, b: { x: m.x, y: m.y + 1.1, z: m.z }, Lc: 150, dmg: () => !m.dead }; }, 'bmb');
R.sr = trials('recon into a tank', () => { fresh(); F = flat(); const u = C.addVehicle('tank', 't72', 1, F.x + 150, F.z, Math.PI); u.ai = null; return { a: { x: F.x, y: u.y + 1.7, z: F.z }, b: { x: u.x, y: u.y + 1.7, z: u.z }, Lc: 147, slack: 4, dmg: () => true }; }, 'rec');
R.ss = trials('FPV, safety on, into a soldier', () => { fresh(); F = flat(); const m = C.addMan('rifleman', 1, F.x + 150, F.z, 0); m.ai = null; return { a: { x: F.x, y: m.y + 1.1, z: F.z }, b: { x: m.x, y: m.y + 1.1, z: m.z }, Lc: 150, dmg: () => !m.dead }; }, 'fpv', { safe: 1 });

console.log('-- long-range drone (the delta) at a tank and a house --');
R.ot = trials('delta into a tank, front', () => { fresh(); F = flat(); const u = C.addVehicle('tank', 't72', 1, F.x + 400, F.z, Math.PI); u.ai = null; const hp0 = u.hp; return { a: { x: F.x, y: u.y + 45, z: F.z }, b: { x: u.x, y: u.y + 3, z: u.z }, Lc: 396, slack: 6, dmg: () => u.hp < hp0 || u.dead }; }, 'owa');

console.log('-- the consequences --');
{
  /* a wall shields who stands behind it: a soldier 2 m behind a building wall is unharmed by an FPV that hits the wall */
  fresh(); const w = wallLine(), a = w.a, b = w.b, m = C.addMan('rifleman', 1, w.back.x, w.back.z, 0); m.ai = null; const hp0 = m.hp;
  const r = fly('fpv', a, b, 36, 1 / 60);
  console.log('   FPV into a solid wall: ended ' + r.o.end + ' at ' + r.tr.toFixed(1) + ' of ' + r.L + ' m; soldier 3 m behind it hp ' + hp0 + ' -> ' + m.hp.toFixed(0));
  ok(r.o.gone && r.o.end === 'boom' && r.tr < 94 && m.hp > hp0 * .5, 'a wall: it goes off at the wall, and the wall shields who stands behind');
  /* the roof of a tank is struck, the front is spared: the face decides */
  fresh(); F = flat(); const u1 = C.addVehicle('tank', 't72', 1, F.x + 150, F.z, Math.PI), u2 = C.addVehicle('tank', 't72', 1, F.x + 150, F.z + 60, Math.PI);
  u1.ai = u2.ai = null; const h1 = u1.hp;
  fly('fpv', { x: F.x, y: u1.y + 1.7, z: F.z }, { x: u1.x, y: u1.y + 1.7, z: u1.z }, 36, 1 / 60); const front = h1 - u1.hp;
  const h2 = u2.hp; fly('fpv', { x: u2.x + 30, y: u2.y + 62, z: F.z + 60 }, { x: u2.x, y: u2.y + 2.6, z: u2.z }, 36, 1 / 60); const roof = h2 - Math.max(0, u2.hp);
  console.log('   t72 hp lost: front ' + front.toFixed(0) + ' of ' + h1 + ', roof ' + roof.toFixed(0) + (u2.dead ? ' (destroyed)' : ''));
  ok(front > 0 && front < h1 * .5 && !u1.dead && (u2.dead || roof > front * 1.5), 'the front is hurt but not penetrated, the roof is far worse');
  /* a soldier hit is killed and one near him is wounded */
  fresh(); F = flat(); const m1 = C.addMan('rifleman', 1, F.x + 150, F.z, 0), m2 = C.addMan('rifleman', 1, F.x + 152.5, F.z + 1.5, 0), m3 = C.addMan('rifleman', 1, F.x + 175, F.z, 0); m1.ai = m2.ai = m3.ai = null;
  fly('fpv', { x: F.x, y: m1.y + 1.1, z: F.z }, { x: m1.x, y: m1.y + 1.1, z: m1.z }, 36, 1 / 60);
  console.log('   soldier struck dead ' + m1.dead + ', one 3 m off hp ' + m2.hp.toFixed(0) + '/' + m2.max + ', one 25 m off hp ' + m3.hp.toFixed(0) + '/' + m3.max);
  ok(m1.dead && (m2.dead || m2.hp < m2.max) && !m3.dead, 'the soldier is killed, the one beside him hurt, the far one spared');
}

console.log('-- verdicts --');
allClear(R.sol, 'a standing soldier'); allHurt(R.sol, 'a standing soldier');
allClear(R.tf, 'a tank from the front'); allHurt(R.tf, 'a tank from the front');
allClear(R.tr, 'a tank from above'); allHurt(R.tr, 'a tank from above');
allClear(R.tre, 'a tank from behind'); allClear(R.trk, 'a truck'); allHurt(R.trk, 'a truck');
allClear(R.gnd, 'the ground'); allClear(R.tree, 'a tree'); allClear(R.hang, 'a hangar wall'); allHurt(R.hang, 'a hangar wall');
allClear(R.bld, 'a building wall'); allClear(R.bag, 'sandbags'); allHurt(R.bag, 'sandbags');
allClear(R.sb, 'a bomber (no warhead)'); allClear(R.sr, 'a recon drone (no warhead)'); allClear(R.ss, 'an FPV with its safety on');
allClear(R.ot, 'the delta');
H.done();
