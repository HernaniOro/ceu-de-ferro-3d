'use strict';
/* The dense woods: where they stand and what they keep clear, that the forest nodes the cover rule reads are the ones with trees on them,
   trunks and crowns against rounds, hulls, bursts and aircraft inside a wood, the rides, and long drives across wooded country by class
   with how often each is stuck. DRIVE=<s> sets the length of the drives (300) */
const H = require('./harness'), C = H.load({ seed: 41 }), $ = C.$, ok = H.ok, DRIVE = +process.env.DRIVE || 300;
const WOODS = $('WOODS'), OBJS = $('OBJS'), OBJD = $('OBJD'), BLD = $('BLD'), TANKS = $('TANKS'), GAI = $('GAI'), SPAWN = $('SPAWN'), COVER = $('COVER');
const DT = .017;
let S, T;
const fresh = era => { S = C.sandbox(era || 'ww2'); T = S.T; return S; };
const run = (secs, each, dt) => C.run(secs, each, dt || DT);
const st = o => S.os[o.id], hd = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), kind = (x, z) => $('kindAt')(x, z);
const trees = () => T.objs.filter(o => o.k === 'tree'), fresh2 = () => { for (const o of T.objs) { S.os[o.id] = 0; S.oh[o.id] = o.hp; } };
/* the middle of the densest stretch of wood: a node whose eight neighbours are wood too, on level ground */
function heart(n) {
  const N = T.N, out = [];
  for (let j = 2; j < N - 1; j++) for (let i = 2; i < N - 1; i++) {
    let all = true; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (T.kind[(j + b) * (N + 1) + i + a] !== 1) all = false;
    const x = T.x0 + i * T.cx, z = T.z0 + j * T.cz;
    if (all && Math.abs(C.hgt(x + 120, z) - C.hgt(x - 120, z)) < 14 && Math.abs(C.hgt(x, z + 120) - C.hgt(x, z - 120)) < 14) out.push({ x, z, n: T.wn[j * (N + 1) + i] });
  }
  return out.sort((a, b) => b.n - a.n)[n || 0];
}

console.log('-- where the woods are --');
for (const era of ['ww2', 'modern']) {
  fresh(era);
  const tr = trees(), nw = tr.filter(o => o.id >= 30300), N1 = T.N + 1, wood = [], B = WOODS.belt;
  let nodes = 0, bare = 0, sum = 0, off = 0, belt = 0, rd = 1e9, bd = 1e9, td = 1e9, ride = 0;
  for (let k = 0; k < T.kind.length; k++) if (T.kind[k] === 1) { nodes++; sum += T.wn[k]; if (T.wn[k] < 4) bare++; }
  for (const o of nw) {
    const k = kind(o.x, o.z), r = C.routeDist(T, o.x, o.z); rd = Math.min(rd, r); bd = Math.min(bd, hd(o, T.bases[0]), hd(o, T.bases[1])); td = Math.min(td, hd(o, T.towns[0]), hd(o, T.towns[1]));
    if (k === 1) { wood.push(o); if ($('onRide')(o.x, o.z)) ride++; } else { belt++; if (k === 8) off++; }
  }
  const area = nodes * T.cx * T.cz, C2 = H.load({ seed: 77 }), T2 = C2.sandbox(era).T;
  console.log('   ' + era + ': ' + tr.length + ' trees (' + nw.length + ' new: ' + wood.length + ' in ' + nodes + ' wood nodes, ' + (area / 1e6).toFixed(1) + ' km2, ' + Math.round(area / wood.length) + ' m2 a tree; ' + belt + ' in belts); nearest to a road ' + rd.toFixed(0) + ' m, to an airfield ' + bd.toFixed(0) + ' m, to a town centre ' + td.toFixed(0) + ' m; ids up to ' + (T.fid - 1) + ', then ' + $('FORT').slots + ' for works, T.nid ' + T.nid);
  ok(nw.length > 15000 && nw.length <= WOODS.max && T.nid + $('NDYN') < 65536, era + ': ' + nw.length + ' new trees, every id under the 65536 the server lets through');
  ok(rd >= B.off[0] - 2.5 && bd > 1500 && td > 470 && !off && !nw.some(o => T.houses.some(h => C.footD(h, o.x, o.z) < 3)), era + ': the roads (and where a supply base may stand beside them), the airfields and the towns are clear');
  ok(bare <= nodes * .12 && wood.length === sum && !ride, era + ': the wood nodes are the ones with trees (' + bare + ' of ' + nodes + ' with fewer than 4, at the edges), and no tree stands on a ride');
  ok(T2.fid === T.fid && T2.nid === T.nid && T2.objs.length === T.objs.length && T2.objs.every((o, i) => o.id === T.objs[i].id && o.x === T.objs[i].x && o.z === T.objs[i].z && o.sc === T.objs[i].sc) && T2.kind.every((v, i) => v === T.kind[i]), era + ': another client builds the same woods under the same ids');
  /* cover: in a wood yes, in open woodland no */
  const cv = { c: 0, p: 0 }, w0 = heart(), op = (() => { for (let k = 0; k < T.kind.length; k++) if (T.kind[k] === WOODS.open) { const x = T.x0 + k % N1 * T.cx, z = T.z0 + ((k / N1) | 0) * T.cz; if (x > 500 && x < S.W - 500 && Math.abs(z) < S.HW - 500 && !C.near(x, z, 8).length) return { x, z }; } })();
  C.coverAt(w0.x, w0.z, cv); const inW = cv.c; C.coverAt(op.x, op.z, cv);
  ok(inW === COVER.wood[0] && cv.c === 0, era + ': a soldier is hidden in a dense wood and not in open woodland');
  /* what the game needs beside the roads still fits */
  const S2 = C.newState(era); let sites = 0, spawnOk = true;
  for (const t of [0, 1]) if (C.aiSite(t)) sites++;
  for (const t of [0, 1]) for (const ri of [0, 1]) for (const cl of ['tank', 'aa', 'art', 'inf']) for (const off2 of SPAWN.off) for (const sg of [1, -1]) { const q = C.routeAt(S2.T.routes[ri], $('endS')(t, ri, SPAWN[cl])), x = q.x - q.dz * off2 * sg, z = q.z + q.dx * off2 * sg; if (C.near(x, z, 12).some(o => o.id >= 30300 && C.footD(o, x, z) < 8)) spawnOk = false; }
  const w = ['wood'].map(j => [0, 1].map(t => $('post')(t, j, 0)));
  ok(sites === 2 && spawnOk && w[0][0] && w[0][1], era + ': both sides still find a place for a supply base and a wood for their picket, and nothing new stands where ground players enter');
  S = C.sandbox(era); T = S.T;
}

console.log('-- inside a dense wood: rounds, a tank, a truck, a soldier, a burst, an aircraft --');
for (const era of ['ww2', 'modern']) {
  fresh(era);
  const w = heart(), y = C.hgt(w.x, w.z);
  let through = 0, hitTree = 0;
  for (let i = 0; i < 40; i++) { const z = w.z - 60 + i * 3; S.bullets = [{ x: w.x - 150, y: C.hgt(w.x - 150, z) + 2.5, z, vx: 800, vy: 0, vz: 0, life: .6, team: 0, dmg: 9, ap: 0, by: null }]; const b = S.bullets[0]; let end = null; run(.6, () => { if (b.gone && !end) end = { x: b.x }; return !b.gone; }); if (b.x > w.x + 150) through++; else if (C.near(b.x, b.z, 3).some(o => o.k === 'tree')) hitTree++; }
  console.log('   ' + era + ': 40 rounds fired level across 300 m of wood: ' + hitTree + ' stopped by a trunk, ' + through + ' through, the rest in the ground');
  ok(hitTree >= 8, era + ': trunks stop rounds in a wood');
  const tank = Object.keys(TANKS).find(id => TANKS[id].era === era), u = C.addVehicle('tank', tank, 0, w.x - 140, w.z, 0); u.ctl.drive = 1; let vs = 0, n = 0;
  run(45, () => { if (u.x > w.x - 100) { vs += u.sp; n++; } return u.x < w.x + 120; });
  const down = trees().filter(o => st(o) === 2), top = u.def.spd, mean = vs / n;
  console.log('   ' + era + ' ' + u.def.name + ': 220 m through the wood at ' + mean.toFixed(1) + ' m/s of ' + top.toFixed(1) + ', ' + down.length + ' trees driven down');
  ok(u.x >= w.x + 120 && down.length >= 5 && mean < top * .97 && mean > top * .45 && down.every(o => Math.abs(o.z - w.z) < 16), era + ': a tank pushes through, felling what its hull reaches and losing speed');
  ok(down.every(o => !C.ray(o.x - 5, o.y + 2, o.z, o.x + 5, o.y + 2, o.z, 0) || $('RAY').o !== o), era + ': a round passes where a felled tree stood');
  S.units = []; fresh2();
  let held = 0; const tries = 6;
  for (let i = 0; i < tries; i++) { S.units = []; const t = C.addVehicle('truck', null, 0, w.x - 140, w.z - 50 + i * 20, 0); t.ctl.drive = 1; run(30, () => t.x < w.x + 120); if (t.x < w.x + 120) held++; }
  S.units = []; const m = C.addMan($('INF')[era][0][0], 0, w.x - 140, w.z + 3, 0), A = $('manBrain')(0);
  run(150, () => { const W = C.wayTo(A, m.x, m.z, w.x + 140, w.z + 3, 1, false), dx = W.x - m.x, dz = W.z - m.z, d = Math.hypot(dx, dz) || 1; m.ctl.mx = dx / d; m.ctl.mz = dz / d; if (C.jammed(A, m, true)) { const k = m.ctl.mx; m.ctl.mx = -m.ctl.mz * A.fs; m.ctl.mz = k * A.fs; } return m.x < w.x + 138; });
  console.log('   ' + era + ': a truck driven straight in from ' + tries + ' places is stopped by a trunk ' + held + ' times; a soldier walks 280 m through in ' + (m.x >= w.x + 138 ? 'time' : 'part: ' + (m.x - w.x + 140).toFixed(0) + ' m'));
  ok(held >= 1 && m.x >= w.x + 138, era + ': a truck is stopped by trunks where a soldier walks between them');
  S.men = []; fresh2();
  const R = 40, near = trees().filter(o => hd(o, w) < R * 1.6);
  C.explode(w.x, y + 1, w.z, R, 240, null, 0);
  const inR = near.filter(o => hd(o, w) < R * .55), out = near.filter(o => hd(o, w) > R + 2), fell = inR.filter(o => st(o) === 2).length;
  console.log('   ' + era + ': a 240-point burst of ' + R + ' m: ' + fell + ' of ' + inR.length + ' trees within ' + (R * .55).toFixed(0) + ' m down, ' + out.filter(o => st(o) > 0).length + ' of ' + out.length + ' beyond its radius touched');
  ok(inR.length >= 3 && fell === inR.length && out.every(o => st(o) === 0), era + ': a burst fells the trees inside its radius and none outside');
  fresh2();
  const id = era === 'ww2' ? 'bf109' : 'f22', tr = trees().filter(o => o.id >= 30300 && hd(o, w) < 60).sort((a, b) => b.sc - a.sc)[0], p = C.addPlane(id, 0, tr.x - 160, tr.y + tr.h * .6, tr.z, 0, false); p.ai = false;
  run(3, () => !p.gone);
  ok(p.gone && p.dead && trees().some(o => st(o) === 2), era + ': an aircraft flown into the wood at half the height of its trees is destroyed, and takes a tree with it');
  S.planes = [];
}

console.log('-- rides: a truck along one --');
for (const era of ['ww2', 'modern']) {
  fresh(era);
  const R = WOODS.ride, c = Math.cos(R.a), s = Math.sin(R.a); let best = null;
  /* a stretch of the first family of rides with wood on both sides: the line u = k gap + w, followed along v */
  for (let k = -40; k < 60 && !best; k++) for (let v = -20000; v < 20000; v += 40) {
    const u = k * R.gap[0] + R.w, at = d => ({ x: u * c - (v + d) * s, z: u * s + (v + d) * c }), a = at(0), b = at(260);
    if (a.x < 300 || a.x > S.W - 300 || Math.abs(a.z) > S.HW - 300 || b.x < 300 || b.x > S.W - 300 || Math.abs(b.z) > S.HW - 300) continue;
    let woods = 0, slope = 0; for (let d = 0; d <= 260; d += 20) { const q = at(d), l = { x: q.x + c * 25, z: q.z + s * 25 }, r = { x: q.x - c * 25, z: q.z - s * 25 }; if (kind(l.x, l.z) === 1 && kind(r.x, r.z) === 1) woods++; slope = Math.max(slope, Math.abs(C.hgt(q.x, q.z) - C.hgt(at(d + 20).x, at(d + 20).z)) / 20); }
    if (woods >= 12 && slope < .2 && C.hgt(a.x, a.z) > T.WL + 3) { best = { a, b, h: Math.atan2(-(b.z - a.z), b.x - a.x) }; break; }
  }
  if (!best) { ok(false, era + ': no ride through a wood found'); continue; }
  const t = C.addVehicle('truck', null, 0, best.a.x, best.a.z, best.h); t.ctl.drive = 1; let side = 0;
  run(40, () => { const e = $('wrap')(best.h - t.h); t.ctl.turn = Math.max(-1, Math.min(1, e * 2)); return hd(t, best.b) > 12; });
  for (const o of C.near((best.a.x + best.b.x) / 2, (best.a.z + best.b.z) / 2, 150)) if (o.k === 'tree') side++;
  console.log('   ' + era + ': a truck drives ' + hd(t, best.a).toFixed(0) + ' m of a 260 m ride, with ' + side + ' trees within 150 m of its middle');
  ok(hd(t, best.b) <= 12 && side > 30, era + ': a truck gets through a wood along a ride');
}

console.log('-- long drives across wooded country, by class (' + DRIVE + ' s each) --');
for (const era of ['ww2', 'modern']) {
  fresh(era);
  const N = T.N, pts = [], rnd = H.rng(era.length * 13);
  for (let k = 0; k < T.kind.length; k++) if (T.kind[k] === 1) { const x = T.x0 + k % (N + 1) * T.cx, z = T.z0 + ((k / (N + 1)) | 0) * T.cz; if (x > 400 && x < S.W - 400 && Math.abs(z) < S.HW - 400) pts.push({ x, z }); }
  const tank = Object.keys(TANKS).find(id => TANKS[id].era === era), aa = S.E.sides[0].aa, kit = $('INF')[era][0][0];
  for (const cl of ['tank', 'aa', 'truck', 'inf']) {
    S.units = []; S.men = []; fresh2();
    const all = [];
    for (let i = 0; i < 6; i++) {
      const a = pts[(rnd() * pts.length) | 0], o = cl === 'inf' ? C.addMan(kit, 0, a.x, a.z, 0) : C.addVehicle(cl, cl === 'tank' ? tank : cl === 'aa' ? aa : null, 0, a.x, a.z, 0);
      const c = C.clearOf(a.x, a.z, cl === 'inf' ? 1 : 6, {}); o.x = c.x; o.z = c.z; o.inv = 1e9;
      all.push({ o, A: cl === 'inf' ? $('manBrain')(i) : $('brain')(i), g: null, jx: o.x, jz: o.z, jt: S.t, goals: 0, stuck: 0, wet: 0, far: 0 });
    }
    const next = e => { for (let n = 0; n < 40; n++) { const g = pts[(rnd() * pts.length) | 0], d = hd(g, e.o); if (d > 250 && d < 1400) { e.g = C.clearOf(g.x, g.z, 6, {}); e.gt = S.t; return; } } e.g = pts[(rnd() * pts.length) | 0]; e.gt = S.t; };
    for (const e of all) next(e);
    run(DRIVE, () => {
      for (const e of all) {
        const o = e.o, d = hd(o, e.g);
        if (d < (cl === 'inf' ? 4 : 12) || S.t - e.gt > 240) { if (d < 12) e.goals++; next(e); }
        if (cl === 'inf') { const W = C.wayTo(e.A, o.x, o.z, e.g.x, e.g.z, 1, false), dx = W.x - o.x, dz = W.z - o.z, l = Math.hypot(dx, dz) || 1; o.ctl.mx = dx / l; o.ctl.mz = dz / l; o.ctl.run = true; if (C.jammed(e.A, o, true)) { const k = o.ctl.mx; o.ctl.mx = -o.ctl.mz * e.A.fs; o.ctl.mz = k * e.A.fs; } }
        else { o.ai = e.A; C.driveTo(o, e.g.x, e.g.z); o.ai = null; }
        if (S.t - e.jt > 15) { if (Math.hypot(o.x - e.jx, o.z - e.jz) < 4) { const ahead = C.hgt(o.x + (e.g.x - o.x) / d * 8, o.z + (e.g.z - o.z) / d * 8); if (ahead < T.WL + .6 || ahead - C.hgt(o.x, o.z) > 5) { e.wet++; next(e); } else { e.stuck++; if (process.env.DBG) console.log('      stuck', cl, S.t.toFixed(0), o.x.toFixed(0), o.z.toFixed(0), 'goal', d.toFixed(0), 'near', C.near(o.x, o.z, 8).map(q => q.k + ':' + C.footD(q, o.x, o.z).toFixed(1)).join(' '), 'sp', o.sp, 'ctl', JSON.stringify(o.ctl.drive !== undefined ? [o.ctl.drive, o.ctl.turn] : [o.ctl.mx, o.ctl.mz])); } } e.far += Math.hypot(o.x - e.jx, o.z - e.jz); e.jx = o.x; e.jz = o.z; e.jt = S.t; }
      }
    });
    const sum = k => all.reduce((a, e) => a + e[k], 0), down = trees().filter(o => st(o) === 2).length;
    console.log('   ' + era + ' ' + cl.padEnd(5) + ': 6 of them, ' + sum('goals') + ' goals reached, ' + Math.round(sum('far') / 6) + ' m each (net, per 15 s), stuck for 15 s ' + sum('stuck') + ' times (' + sum('wet') + ' more held by water or a slope), ' + down + ' trees driven down');
    ok(sum('far') / 6 > (cl === 'inf' ? 3 : 5) * DRIVE * .6 && sum('stuck') <= (cl === 'tank' || cl === 'inf' ? 1 : 4) && !H.nan(S), era + ' ' + cl + ': it crosses wooded country and is not left stuck');
  }
}

console.log('-- a wood shot to pieces hides nobody --');
{
  fresh('ww2');
  const w = heart(), k = $('nodeAt')(T, w.x, w.z), m = C.addMan('rifleman', 0, w.x, w.z, 0), vis0 = (run(.7), $('visR')(m));
  const mine = trees().filter(o => o.id >= 30300 && $('nodeAt')(T, o.x, o.z) === k); let n = 0;
  for (const o of mine) { if (n++ > mine.length * (WOODS.gone + .1)) break; C.hitObj(o, 999, null); }
  m.cvT = 0; run(.7);
  console.log('   a soldier in a node of ' + mine.length + ' trees is seen at ' + vis0.toFixed(0) + ' m; with ' + (n - 1) + ' of them down, at ' + $('visR')(m).toFixed(0) + ' m');
  ok(vis0 < $('MAN').see * .6 && $('visR')(m) === $('MAN').see, 'once most of a node\'s trees are down the soldier there is seen as in the open');
}
H.done();
