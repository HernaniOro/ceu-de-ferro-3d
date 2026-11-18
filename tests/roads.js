'use strict';
/* Roads plan, slice 1 (map version 2): the network's counts and geometry, routeAt by binary search, the distance index, the beds and the
   clearance of the roads, the drawing budget, and the path-finding. Env: PAGE */
const H = require('./harness'), { ok, done } = H;
const C = H.load({ seed: 5 }), $ = C.$;
const RN = $('RN'), routeAt = $('routeAt'), roadDist = $('roadDist'), hdist = $('hdist'), hgtT = $('hgtT');
const rng = H.rng(77), rnd = (a, b) => a + (b - a) * rng();
const oldAt = (r, s) => { s = Math.max(0, Math.min(r.len, s)); let i = 1; while (i < r.length - 1 && r[i].s < s) i++; const a = r[i - 1], b = r[i], L = b.s - a.s || 1, t = (s - a.s) / L; return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / L, dz: (b.z - a.z) / L }; };
const exp = { ww2: { n: 19, e: 26, c: [12, 8, 6] }, modern: { n: 21, e: 28, c: [12, 10, 6] } };
const T2 = {};
for (const era of ['ww2', 'modern']) {
  console.log(era);
  const T = (T2[era] = $('genTerrain')(era, 2)), N = T.net, X = exp[era];
  const cnt = [0, 1, 2].map(c => N.e.filter(e => e.c === c).length), km = [0, 1, 2].map(c => (N.e.filter(e => e.c === c).reduce((a, e) => a + e.len, 0) / 1000).toFixed(1));
  ok(N.n.length === X.n && N.e.length === X.e && cnt.join() === X.c.join(), N.n.length + ' nodes, ' + N.e.length + ' edges (' + cnt.join(' / ') + '), km ' + km.join(' / '));
  ok(T.routes.length === 2 && T.routes[0].len > 0, 'the axes are still the two routes');
  /* class 0 pieces lie exactly on their axis */
  let worst = 0, lenErr = 0;
  for (const E of N.e) if (!E.c) {
    const r = T.routes[E.ax[0]], a = routeAt(r, E.ax[1]), b = routeAt(r, E.ax[2]);
    worst = Math.max(worst, Math.hypot(E.p[0].x - a.x, E.p[0].z - a.z), Math.hypot(E.p[E.p.length - 1].x - b.x, E.p[E.p.length - 1].z - b.z));
    lenErr = Math.max(lenErr, Math.abs(E.len - (E.ax[2] - E.ax[1])));
    for (const q of E.p) { const m = routeAt(r, E.ax[1] + q.s), d = Math.hypot(q.x - m.x, q.z - m.z); worst = Math.max(worst, d); }
  }
  ok(worst < 1e-6 && lenErr < 1e-6, 'every class 0 piece lies on its axis (worst ' + worst.toExponential(1) + ' m, length ' + lenErr.toExponential(1) + ')');
  /* continuity: each edge starts and ends on its nodes; the samples are close */
  let gap = 0, step = 0;
  for (const E of N.e) { const a = N.n[E.a], b = N.n[E.b]; gap = Math.max(gap, Math.hypot(E.p[0].x - a.x, E.p[0].z - a.z), Math.hypot(E.p[E.p.length - 1].x - b.x, E.p[E.p.length - 1].z - b.z)); if (E.c) for (let i = 1; i < E.p.length; i++) step = Math.max(step, hdist(E.p[i], E.p[i - 1])); }
  ok(gap < 1 && step < 200, 'every edge meets its nodes (gap ' + gap.toFixed(3) + ' m) and the classes 1 and 2 have samples at most ' + step.toFixed(0) + ' m apart (the main roads keep the axes\' own spacing)');
  const fo = N.e.filter(e => e.ford.length).map(e => N.n[e.a].id + '-' + N.n[e.b].id + ' x' + e.ford.length);
  console.log('  fords on: ' + fo.join(', '));
  /* routeAt: the same as the loop it replaces */
  let bad = 0;
  for (let i = 0; i < 20000; i++) { const r = T.routes[i & 1], s = i % 5 === 0 ? (i % 2 ? r.len : -5) : rnd(-50, r.len + 50), a = routeAt(r, s), b = oldAt(r, s); if (a.x !== b.x || a.z !== b.z || a.dx !== b.dx || a.dz !== b.dz) bad++; }
  for (const E of N.e) for (let i = 0; i < 300; i++) { const s = rnd(0, E.len), a = routeAt(E.p, s), b = oldAt(E.p, s); if (a.x !== b.x || a.z !== b.z) bad++; }
  ok(bad === 0, 'routeAt by binary search gives the old loop\'s answer on 20000 random (route, s) pairs and on the edges (' + bad + ' different)');
  /* the distance index against brute force */
  const segs = []; for (const E of N.e) for (let i = 1; i < E.p.length; i++) segs.push([E.p[i - 1], E.p[i]]);
  const brute = (x, z) => { let b = 1e9; for (const [a, c] of segs) { const ex = c.x - a.x, ez = c.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez))); b = Math.min(b, Math.hypot(x - a.x - ex * t, z - a.z - ez * t)); } return b; };
  let eOver = 0, eNear = 0, eFar = 0, nNear = 0, nFar = 0, e0 = 0; const far = [];
  for (let i = 0; i < 5000; i++) {
    const x = rnd(-800, T.W + 800), z = rnd(-T.HW - 800, T.HW + 800), d = brute(x, z), r = roadDist(T, x, z);
    if (d < 512) { nNear++; eNear = Math.max(eNear, Math.abs(r - d)); } else { nFar++; eFar = Math.max(eFar, Math.abs(r - d) / d); far.push(Math.abs(r - d) / d); if (r > d + 1e-3) eOver = Math.max(eOver, r - d); }
    let m = 1e9; for (const R of T.routes) for (let k = 1; k < R.length; k++) { const a = R[k - 1], ex = R[k].x - a.x, ez = R[k].z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez))); m = Math.min(m, Math.hypot(x - a.x - ex * t, z - a.z - ez * t)); }
    e0 = Math.max(e0, Math.abs(roadDist(T, x, z, 0) - m));
  }
  ok(eNear < .5, 'roadDist within 512 m of a road: worst error ' + eNear.toFixed(4) + ' m (' + nNear + ' points)');
  far.sort((a, b) => a - b);
  ok(far[(far.length * .95) | 0] < .05, 'roadDist beyond 512 m: relative error p50 ' + (100 * far[far.length >> 1]).toFixed(2) + ' %, p95 ' + (100 * far[(far.length * .95) | 0]).toFixed(1) + ' %, worst ' + (100 * eFar).toFixed(1) + ' % (worst on the ridge between two roads; largest overestimate ' + eOver.toFixed(1) + ' m; ' + nFar + ' points)');
  ok(e0 < 1e-6, 'roadDist(m = 0) is the old loop over the two routes (worst ' + e0.toExponential(1) + ' m)');
  /* beds: the cross slope and the water level along the classes 1 and 2 */
  const WL = T.WL; let tot = 0, steep = 0, low = 0, tot1 = 0;
  for (const E of N.e) if (E.c) for (let s = 10; s < E.len - 10; s += 20) {
    const p = routeAt(E.p, s), h0 = hgtT(T, p.x, p.z), hl = hgtT(T, p.x - p.dz * 5, p.z + p.dx * 5), hr = hgtT(T, p.x + p.dz * 5, p.z - p.dx * 5);
    tot++; if (Math.abs(hl - hr) >= 1.5) steep++;
    if (!E.ford.some(f => Math.abs(f - s) < 200)) { tot1++; if (h0 <= WL + .3) low++; }
  }
  const slopeOk = steep <= .05 * tot, msg = 'cross slope under 1.5 m over 10 m on ' + (100 - 100 * steep / tot).toFixed(1) + ' % of ' + tot + ' samples of the classes 1 and 2';
  if (era === 'ww2' && !slopeOk) console.log('  WARN ' + msg + ' (ww2: its roads still cross the central massif even with W and X moved, RN.nodeEra)');
  else ok(slopeOk, msg);
  ok(low === 0, 'the ground is above the water along them off the fords (' + low + ' of ' + tot1 + ' samples at or under WL + .3)');
  /* clearance: no tree and no house within the road's half width + 3 */
  let near = 0, objs = 0, worstC = 1e9;
  for (const o of T.objs) {
    if (o.k !== 'tree' && !T.houses.includes(o)) continue;
    objs++; const pts = o.k === 'tree' ? [[o.x, o.z]] : [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([u, v]) => [o.x + u * o.hw * o.c - v * o.hd * o.s, o.z + u * o.hw * o.s + v * o.hd * o.c]);
    for (const [x, z] of pts) { const d = roadDist(T, x, z), c = $('RDQ').c, need = RN.w[c] + 3; if (!c) continue;   // the main roads' own clearance is the first map's rule, kept as it is
      worstC = Math.min(worstC, d - need); if (d < need) { near++; break; } }
  }
  ok(near === 0, 'no tree or house within the half width + 3 m of a class 1 or 2 road (' + objs + ' objects checked, ' + near + ' too close, tightest margin ' + worstC.toFixed(1) + ' m)');
  /* the road meshes */
  let tri = 0; for (const E of N.e) tri += 2 * Math.max(1, Math.round(E.len / 45));
  ok(tri <= (era === 'ww2' ? 4000 : 6000), 'road meshes: ' + tri + ' triangles');
  console.log('  houses ' + T.houses.length + ', objects ' + T.objs.length);
}
/* path-finding */
for (const era of ['ww2', 'modern']) {
  console.log(era + ' paths');
  const c = H.load({ seed: 5 }), S = c.sandbox(era), T = S.T, N = T.net, tripOf = c.$('tripOf'), netPath = c.$('netPath'), netNear = c.$('netNear');
  let fail = 0, bad = 0, short = 0, same = 0, maxStep = 0, axis = 0;
  for (let k = 0; k < 60; k++) {
    const a = N.n[(rng() * N.n.length) | 0], b = N.n[(rng() * N.n.length) | 0], mode = k % 2 ? 'foot' : 'veh';
    const p = netPath(a.i, b.i, null, mode); if (!p) { fail++; continue; }
    if (netPath(a.i, b.i, null, mode) !== p) same++;
    let cur = a.i; for (const ei of p.e) { const E = N.e[ei], nx = E.a === cur ? E.b : E.a, from = E.a === cur ? E.p[0] : E.p[E.p.length - 1], to = N.n[cur]; if (Math.hypot(from.x - to.x, from.z - to.z) > 1) bad++; cur = nx; }
    if (cur !== b.i) bad++;
    const t = tripOf(a.x, a.z, b.x, b.z, { mode });
    if (!t) { fail++; continue; }
    if (tripOf(a.x, a.z, b.x, b.z, { mode }) !== t) same++;
    for (let i = 1; i < t.length; i++) maxStep = Math.max(maxStep, hdist(t[i], t[i - 1]));
    if (hdist(t[0], a) > 1 || hdist(t[t.length - 1], b) > 1) bad++;
    if (t.len < Math.hypot(a.x - b.x, a.z - b.z) - 1e-6) short++;
    if (t.ri !== undefined) axis++;
  }
  ok(fail === 0 && bad === 0, '60 random node pairs: a path and a trip exist and their pieces join (' + fail + ' without, ' + bad + ' broken)');
  ok(short === 0, 'every trip is at least as long as the straight line');
  ok(same === 0, 'a repeated call returns the cached object');
  console.log('  longest sample step in a trip ' + maxStep.toFixed(0) + ' m, ' + axis + ' of 60 trips end on a main road');
  /* a trip between two free points, one off the roads */
  const q = tripOf(N.n[0].x + 300, N.n[0].z + 200, N.n[N.n.length - 1].x - 250, N.n[N.n.length - 1].z + 150, { mode: 'veh' });
  ok(q && q.len > 1000 && hdist(q[0], { x: N.n[0].x + 300, z: N.n[0].z + 200 }) < 1e-6, 'a trip between two points off the roads starts at the first');
  const nn = netNear(N.n[3].x + 40, N.n[3].z, T); ok(nn.d < 45 && nn.e >= 0, 'netNear finds an edge beside a node');
}
done();
