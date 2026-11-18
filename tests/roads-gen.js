'use strict';
/* Roads plan, step 1.3: the dev tool that bakes the bends of the class 1 and 2 roads (RN.way). It is not part of the page. It loads the
   page, takes today's map (genTerrain with map version 1) for the two main roads, builds a cost grid and routes every edge of RN.edges
   with an A* over it (Galin-style: the cost of a step is its length times the slope, mountain and a seeded noise, with penalties for water,
   the airfields, a parallel road and the towns). Class 1 is routed first, then class 2. The result is printed as the RN.way tables to paste
   into the page, with a check of the free nodes, and drawn in .work/roads/map-<era>.svg.
   Env: PAGE (another copy of the page), ERA (one era), OUT (folder of the svg files, default .work/roads). No random number is used: the
   same page gives the same tables. */
const fs = require('fs'), path = require('path');
const H = require('./harness');
const OUT = process.env.OUT || path.join(H.ROOT, '.work', 'roads');
const CELL = 100, MARGIN = 300;
const C = H.load({ seed: 1 }), $ = C.$;
const RN = $('RN'), ERAS = $('ERAS'), fbm = $('fbm'), sstep = $('sstep');
let flagged = 0;

/* a min-heap of cell indices by key (ties by index, so the search is the same everywhere) */
class Heap {
  constructor() { this.k = []; this.v = []; }
  less(a, b) { return this.k[a] < this.k[b] || (this.k[a] === this.k[b] && this.v[a] < this.v[b]); }
  swap(a, b) { [this.k[a], this.k[b]] = [this.k[b], this.k[a]]; [this.v[a], this.v[b]] = [this.v[b], this.v[a]]; }
  push(k, v) { this.k.push(k); this.v.push(v); let i = this.k.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!this.less(i, p)) break; this.swap(i, p); i = p; } }
  pop() {
    const v = this.v[0], n = this.k.length - 1; this.swap(0, n); this.k.pop(); this.v.pop();
    let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < n && this.less(l, m)) m = l; if (r < n && this.less(r, m)) m = r; if (m === i) break; this.swap(i, m); i = m; }
    return v;
  }
  get size() { return this.k.length; }
}
const segD = (ax, az, bx, bz, x, z) => { const ex = bx - ax, ez = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1))); return Math.hypot(x - ax - ex * t, z - az - ez * t); };
const polyD = (r, x, z) => { let b = 1e9; for (let i = 1; i < r.length; i++) b = Math.min(b, segD(r[i - 1].x, r[i - 1].z, r[i].x, r[i].z, x, z)); return b; };
/* the projection of a point on a route, as railT does it */
function proj(r, x, z) {
  let b = { d: 1e9, s: 0 };
  for (let i = 1; i < r.length; i++) { const a = r[i - 1], ex = r[i].x - a.x, ez = r[i].z - a.z, L = Math.hypot(ex, ez) || 1, t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / (L * L))), d = Math.hypot(x - a.x - ex * t, z - a.z - ez * t); if (d < b.d) b = { d, s: a.s + L * t }; }
  return b;
}
function at(r, s) { let i = 1; while (i < r.length - 1 && r[i].s < s) i++; const a = r[i - 1], b = r[i], L = b.s - a.s || 1, t = (s - a.s) / L; return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }; }
/* Douglas-Peucker on a list of {x, z}: tolerance tol, and no gap longer than maxGap between the points kept */
function simplify(p, tol, maxGap) {
  const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
  const rec = (a, b) => {
    if (b <= a + 1) return;
    let m = -1, md = -1;
    for (let i = a + 1; i < b; i++) { const d = segD(p[a].x, p[a].z, p[b].x, p[b].z, p[i].x, p[i].z); if (d > md) { md = d; m = i; } }
    if (md > tol) { keep[m] = 1; rec(a, m); rec(m, b); }
    else if (Math.hypot(p[b].x - p[a].x, p[b].z - p[a].z) > maxGap) { m = (a + b) >> 1; keep[m] = 1; rec(a, m); rec(m, b); }
  };
  rec(0, p.length - 1);
  return p.filter((q, i) => keep[i]);
}

function era(id) {
  const E = ERAS[id], W = E.W, HW = E.HW, sd = id === 'ww2' ? 11 : 29, WL = 52, M = 3200;
  const T = $('genTerrain')(id, 1), R = T.routes, P = (a, b) => ({ x: a * W, z: b * HW });
  const riverX = z => .5 * W + .07 * W * Math.sin(z / (HW * .33) + 1);
  /* the nodes of this era */
  const nodes = {}, ids = Object.keys(RN.nodes).filter(k => id === 'modern' || (k !== 'AS' && k !== 'AN'));
  for (const k of ids) {
    const d = RN.nodes[k];
    if (d[0] === 'b') nodes[k] = { x: T.bases[d[1]].x, z: T.bases[d[1]].z };
    else if (d[0] === 't') nodes[k] = { x: T.towns[d[1]].x, z: T.towns[d[1]].z };
    else if (d[0] === 'ax') { const q = P(d[2], d[3]), s = proj(R[d[1]], q.x, q.z).s, p = at(R[d[1]], s); nodes[k] = { x: p.x, z: p.z, ri: d[1], s }; }
    else { const o = (RN.nodeEra[id] || {})[k] || [d[1], d[2]]; nodes[k] = P(o[0], o[1]); }
    nodes[k].id = k; nodes[k].free = d[0] === 'f';
  }
  /* the cost grid: 100 m over the map less 300 m on every side; raw height is today's formula without the road and town flattening, with the
     mountains kept away from the two main roads only */
  const nx = Math.floor((W - 2 * MARGIN) / CELL) + 1, nz = Math.floor((2 * HW - 2 * MARGIN) / CELL) + 1, n = nx * nz;
  const X = i => MARGIN + i * CELL, Z = j => -HW + MARGIN + j * CELL;
  const rawH = (x, z) => {
    const o = { x, z }, n1 = fbm(x / 6000, z / 6000, sd), n2 = fbm(x / 1900 + 7, z / 1900 + 3, sd), n3 = fbm(x / 420, z / 420, sd + 5);
    const bd = Math.min(Math.hypot(x - T.bases[0].x, z - T.bases[0].z), Math.hypot(x - T.bases[1].x, z - T.bases[1].z)), rd = Math.min(polyD(R[0], x, z), polyD(R[1], x, z));
    const mount = sstep(.47, .74, n1) * sstep(350, 1900, rd) * sstep(1500, 3200, bd), smooth = 26 + 85 * n2;
    let h = smooth + 26 * n3 + mount * (200 + 560 * n2 + 130 * n3);
    const out = Math.max(0, -x, x - W, Math.abs(z) - HW) / M; h += out * out * 420;
    const rv = Math.abs(x - riverX(z)); if (rv < 280) h = WL - 10 + (h - (WL - 10)) * sstep(80, 280, rv);
    h = 72 + (h - 72) * sstep(800, 1700, bd);
    return { h, mount, bd };
  };
  const hh = new Float32Array(n), mt = new Float32Array(n), air = new Float32Array(n), noise = new Float32Array(n), wat = new Uint8Array(n);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, x = X(i), z = Z(j), r = rawH(x, z);
    hh[k] = r.h; mt[k] = r.mount; air[k] = r.bd; noise[k] = 1 + .35 * (fbm(x / 700, z / 700, sd + 13) - .5); wat[k] = r.h < WL + 2 ? 1 : 0;
  }
  const cellOf = (x, z) => Math.min(nz - 1, Math.max(0, Math.round((z - Z(0)) / CELL))) * nx + Math.min(nx - 1, Math.max(0, Math.round((x - X(0)) / CELL)));
  const towns = T.burgs.map(b => ({ x: b.x, z: b.z, r: b.ru + 60 }));
  const edges = RN.edges[id], routed = [];   // routed: { a, b, pts, mark }
  /* the two main roads count as routed roads for the parallel penalty */
  const markOf = pts => { const m = new Uint8Array(n); for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (polyD(pts, X(i), Z(j)) < 250) m[j * nx + i] = 1; return m; };
  const roads = R.map((r, ri) => ({ ends: [], axis: ri, pts: r, mark: markOf(r) }));
  const way = [], paths = [];
  const order = edges.map((e, i) => i).sort((a, b) => edges[a][0] - edges[b][0] || a - b);
  for (const ei of order) {
    const [cls, A, B] = edges[ei], a = nodes[A], b = nodes[B];
    /* per-cell multiplier for this edge: the parallel-road penalty and the town discs */
    const mul = new Float32Array(n).fill(1);
    for (const rd of roads) {
      const shared = rd.axis !== undefined ? [a, b].filter(q => q.ri === rd.axis).map(q => q) : rd.ends.filter(q => q === a || q === b);
      for (let k = 0; k < n; k++) {
        if (!rd.mark[k]) continue;
        const x = X(k % nx), z = Z((k / nx) | 0);
        if (shared.some(q => Math.hypot(x - q.x, z - q.z) < 400)) continue;
        mul[k] *= 3;
      }
    }
    for (const t of towns) {
      if (Math.hypot(t.x - a.x, t.z - a.z) < t.r + 100 || Math.hypot(t.x - b.x, t.z - b.z) < t.r + 100) continue;
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (Math.hypot(X(i) - t.x, Z(j) - t.z) < t.r) mul[j * nx + i] *= 4;
    }
    const forb = k => air[k] < 1300 && Math.hypot(X(k % nx) - a.x, Z((k / nx) | 0) - a.z) > 200 && Math.hypot(X(k % nx) - b.x, Z((k / nx) | 0) - b.z) > 200;
    const s0 = cellOf(a.x, a.z), g0 = cellOf(b.x, b.z), gx = g0 % nx, gz = (g0 / nx) | 0;
    const g = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1), done = new Uint8Array(n), heap = new Heap();
    const hf = k => { const dx = Math.abs(k % nx - gx), dz = Math.abs(((k / nx) | 0) - gz); return .8 * CELL * (Math.max(dx, dz) + .4142 * Math.min(dx, dz)); };
    g[s0] = 0; heap.push(hf(s0), s0);
    while (heap.size) {
      const k = heap.pop(); if (done[k]) continue; done[k] = 1; if (k === g0) break;
      const ki = k % nx, kj = (k / nx) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ki + di, j = kj + dj; if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
        const q = j * nx + i; if (done[q] || (forb(q) && q !== g0)) continue;
        const d = CELL * (di && dj ? Math.SQRT2 : 1), sl = Math.abs(hh[q] - hh[k]) / d;
        const c = Math.round(d * (1 + 6 * sl * sl + 3 * mt[q]) * noise[q] * mul[q]) + (wat[q] ? 40 : 0);
        if (g[k] + c < g[q]) { g[q] = g[k] + c; from[q] = k; heap.push(g[q] + hf(q), q); }
      }
    }
    if (!done[g0]) throw new Error('no path for edge ' + ei + ' ' + A + '-' + B);
    const pts = []; for (let k = g0; k >= 0; k = from[k]) pts.push({ x: X(k % nx), z: Z((k / nx) | 0) }); pts.reverse();
    pts[0] = { x: a.x, z: a.z }; pts[pts.length - 1] = { x: b.x, z: b.z };
    const dp = simplify(pts, 25, 450), mid = dp.slice(1, -1);
    way.push([ei].concat(...mid.map(p => [Math.round(p.x), Math.round(p.z)])));
    const full = [a, ...mid.map(p => ({ x: Math.round(p.x), z: Math.round(p.z) })), b];
    paths.push({ ei, cls, A, B, pts: full });
    // the road as it will be drawn, for the parallel penalty of the next edges
    const line = full.map((p, i) => Object.assign({}, p, { s: 0 })), pl = []; for (let i = 0; i < line.length; i++) pl.push({ x: line[i].x, z: line[i].z });
    roads.push({ ends: [a, b], pts: pl, mark: markOf(pl) });
  }
  way.sort((p, q) => p[0] - q[0]);
  /* the check of the free nodes */
  console.log('\n' + id + ': ' + ids.length + ' nodes, ' + edges.length + ' edges to route');
  const ground = (x, z) => rawH(x, z).h;
  for (const k of ids) {
    const q = nodes[k]; if (!q.free) continue;
    const h = ground(q.x, q.z), sl = Math.hypot(ground(q.x + 50, q.z) - ground(q.x - 50, q.z), ground(q.x, q.z + 50) - ground(q.x, q.z - 50)) / 100;
    let dw = 1e9; for (let r = 0; r <= 3000 && dw === 1e9; r += 50) for (let a = 0; a < 24; a++) if (ground(q.x + r * Math.cos(a / 24 * 2 * Math.PI), q.z + r * Math.sin(a / 24 * 2 * Math.PI)) < WL + 2) { dw = r; break; }
    let near = 1e9, nn = ''; for (const o of ids) if (o !== k) { const d = Math.hypot(q.x - nodes[o].x, q.z - nodes[o].z); if (d < near) { near = d; nn = o; } }
    const bad = [h < WL + 2 ? 'in water' : '', near < 900 ? 'near ' + nn : '', sl > .25 ? 'steep' : ''].filter(Boolean).join(', ');
    console.log('  node ' + k.padEnd(4) + ' (' + Math.round(q.x) + ', ' + Math.round(q.z) + ') h-WL ' + (h - WL).toFixed(1) + ', water ' + (dw === 1e9 ? '> 3000' : dw) + ' m, slope ' + sl.toFixed(3) + ', nearest node ' + nn + ' ' + Math.round(near) + ' m' + (bad ? '   FLAG: ' + bad : ''));
    if (bad) flagged++;
    if (bad) {
      /* the best place within .03 of the map (the table's tolerance) that is not flagged */
      const d0 = [0, ...((RN.nodeEra[id] || {})[k] || RN.nodes[k].slice(1))], best = [];
      const TOL = +process.env.TOL || .03;
      for (let da = -TOL; da <= TOL + .0001; da += .005) for (let db = -TOL; db <= TOL + .0001; db += .005) {
        const x = (d0[1] + da) * W, z = (d0[2] + db) * HW, g = ground(x, z), s2 = Math.hypot(ground(x + 50, z) - ground(x - 50, z), ground(x, z + 50) - ground(x, z - 50)) / 100;
        if (g < WL + 2 || g > WL + 160 || s2 > .25 || ids.some(o => o !== k && Math.hypot(x - nodes[o].x, z - nodes[o].z) < 900)) continue;
        best.push({ a: +(d0[1] + da).toFixed(3), b: +(d0[2] + db).toFixed(3), s2: +s2.toFixed(3), h: +(g - WL).toFixed(0) });
      }
      best.sort((p, q) => TOL > .03 ? Math.hypot(p.a - d0[1], p.b - d0[2]) - Math.hypot(q.a - d0[1], q.b - d0[2]) : p.s2 - q.s2);
      console.log('    suggestion: ' + (best.length ? JSON.stringify(best.slice(0, 3)) : 'none within ' + TOL));
    }
  }
  let len1 = 0, len2 = 0; for (const p of paths) { let l = 0; for (let i = 1; i < p.pts.length; i++) l += Math.hypot(p.pts[i].x - p.pts[i - 1].x, p.pts[i].z - p.pts[i - 1].z); if (p.cls === 1) len1 += l; else len2 += l; }
  console.log('  straight-line length of the baked edges (before the curves): class 1 ' + (len1 / 1000).toFixed(1) + ' km, class 2 ' + (len2 / 1000).toFixed(1) + ' km');
  console.log('RN.way.' + id + ' = ' + JSON.stringify(way) + ';');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'way-' + id + '.json'), JSON.stringify(way));
  /* the svg: the kind raster, the river, the roads by class, the nodes */
  const sc = .1, vw = Math.round((W + 2 * M) * sc), vh = Math.round((2 * HW + 2 * M) * sc), col = { 0: '#c9d4a4', 1: '#8fae6b', 2: '#d6c77a', 3: '#d6c77a', 4: '#d6c77a', 8: '#b9b9b9', 9: '#999' };
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + vw + ' ' + vh + '" width="' + vw + '" height="' + vh + '">';
  svg += '<rect width="100%" height="100%" fill="#7fa6c8"/>';
  const sx = x => ((x + M) * sc).toFixed(1), sz = z => ((z + HW + M) * sc).toFixed(1);
  for (let j = 0; j < T.N; j++) for (let i = 0; i < T.N; i++) {
    const k = j * (T.N + 1) + i, x = T.x0 + i * T.cx, z = T.z0 + j * T.cz; if (T.h[k] <= WL) continue;
    svg += '<rect x="' + sx(x) + '" y="' + sz(z) + '" width="' + (T.cx * sc + .5).toFixed(1) + '" height="' + (T.cz * sc + .5).toFixed(1) + '" fill="' + (col[T.kind[k]] || '#c9d4a4') + '"/>';
  }
  let rv = ''; for (let z = -HW - M; z <= HW + M; z += 100) rv += (rv ? 'L' : 'M') + sx(riverX(z)) + ',' + sz(z); svg += '<path d="' + rv + '" fill="none" stroke="#3b6fa0" stroke-width="2" stroke-dasharray="6 4"/>';
  const poly = (pts, stroke, w, dash) => '<polyline fill="none" stroke="' + stroke + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' points="' + pts.map(p => sx(p.x) + ',' + sz(p.z)).join(' ') + '"/>';
  for (const r of R) svg += poly(r, '#3a2a1a', 3.2);
  for (const p of paths) svg += poly(p.pts, p.cls === 1 ? '#7a3b1a' : '#b0651e', p.cls === 1 ? 2.2 : 1.4, p.cls === 2 ? '5 3' : '');
  for (const k of ids) { const q = nodes[k]; svg += '<circle cx="' + sx(q.x) + '" cy="' + sz(q.z) + '" r="' + (q.free ? 5 : 4) + '" fill="' + (q.free ? '#fff' : '#222') + '" stroke="#000"/><text x="' + (+sx(q.x) + 7) + '" y="' + (+sz(q.z) - 5) + '" font-size="12" font-family="sans-serif">' + k + '</text>'; }
  svg += '</svg>';
  fs.writeFileSync(path.join(OUT, 'map-' + id + '.svg'), svg);
  return { nodes, paths };
}
const t0 = Date.now();
for (const id of process.env.ERA ? [process.env.ERA] : ['ww2', 'modern']) era(id);
console.log('\n' + (flagged ? flagged + ' node(s) flagged' : 'no flagged node') + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
