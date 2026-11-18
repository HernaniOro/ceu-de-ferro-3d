'use strict';
/* Probe, not a pass/fail suite: how the field infantry moves and fights in a normal solo conquest match (the player parked high up).
   Per era: metres a soldier on foot moves per minute (by job), the share of man-minutes under 10 m, how many stand inside a building,
   the share of the seconds under fire a soldier spends in the open, the orders the squads are under, the commander's assaults (their
   phases; how far apart in time the squads that were at their start points step off at H-hour, and arrive at the objective), soldiers
   down and saved, ambushes (how many of the men fire within 1 s of the spring), and the points that change hands.
   SECS (default 360), SEED (default 31), ERA=<era> runs only one */
const H = require('./harness'), SECS = +process.env.SECS || 360, SEED = +process.env.SEED || 31;
const park = S => { const P = S.my; if (!P) return; P.inv = 9; P.dead = false; P.y = 3000; if (P.v) P.v.y = 0; P.hp = P.def.hp; S.lives = 9; };
for (const era of process.env.ERA ? [process.env.ERA] : ['ww2', 'modern']) {
  const C = H.load({ seed: SEED }), $ = C.$, S = C.newState(era, $('ERAS')[era].sides[0].fighter, { cls: 'plane' });
  const last = new Map(), mins = [], byJob = {}, ordK = {}, setK = {}, flips = [], ops = new Map(), ambs = new Map();
  let inB = 0, inTown = 0, men = 0, fire = 0, open = 0;
  const so = C.setOrd; C.setOrd = (q, O) => { if (!q.net) setK[O.k] = (setK[O.k] || 0) + 1; return so(q, O); };
  const cf = C.cqFlip; C.cqFlip = (p, was) => { flips.push(Math.round(S.t) + 's ' + p.L + (was < 0 ? '' : was) + '>' + (p.hold < 0 ? 'n' : p.hold)); return cf(p, was); };
  let acc = 0, minute = new Map();
  C.run(SECS, dt => {
    park(S);
    for (const C2 of S.cmd || []) for (const a of C2.amb) if (a && a.sprung && !ambs.has(a)) ambs.set(a, { T: a.sprung, men: a.sq.flatMap(q => q.men.filter(m => !m.dead && !m.down)).map(m => [m, m.shotT || -1]), first: new Map() });
    for (const [a, o] of ambs) if (S.t - o.T < 12) for (const [m, s0] of o.men) if (!o.first.has(m) && (m.shotT || -1) > s0) o.first.set(m, m.shotT - o.T);
    if ((acc += dt) < 1) return; acc = 0;
    for (const m of S.men) {
      if (m.dead || m.in || !m.ai || m.net) continue;
      if (m.sup > S.t || S.t - (m.hitT || -99) < 2) { fire++; if (!m.cbin && !m.fc && !m.down && C.cover(m).p < .3) open++; }
      const p = last.get(m); last.set(m, { x: m.x, z: m.z });
      if (p) { const d = Math.hypot(m.x - p.x, m.z - p.z); if (d < 30) { const w = minute.get(m) || { d: 0, n: 0, job: m.sq ? m.sq.job : '-' }; w.d += d; w.n++; minute.set(m, w); } }
    }
    if (Math.round(S.t) % 10 === 0) {
      for (const m of S.men) if (!m.dead && !m.in && m.ai) { men++; if (m.cbin) inB++; if (S.T.burgs && S.T.burgs.some(b => b.k !== 'hamlet' && Math.hypot(b.x - m.x, b.z - m.z) < b.ru)) inTown++; }
      for (const q of S.squads) if (q.live > 0 && !q.net) { const k = (q.ord ? q.ord.k : '-') + (q.at ? '@' : q.halt ? '!' : '') + (q.bd ? 'B' : q.pat ? 'P' : q.rc ? 'R' : ''); ordK[k] = (ordK[k] || 0) + 1; }
    }
    if (Math.round(S.t) % 60 === 0) { for (const [m, w] of minute) if (w.n >= 50) { const v = w.d * 60 / w.n; mins.push(v); (byJob[w.job] || (byJob[w.job] = [])).push(v); } minute = new Map(); }
    for (const C2 of S.cmd || []) for (const op of C2.ops) if (op.k === 'atk') {
      let o = ops.get(op); if (!o) ops.set(op, (o = { t: C2.t, T0: Math.round(S.t), st: [], go: null, off: new Map(), arr: new Map(), O: op.O }));
      if (o.last !== op.st) { o.last = op.st; o.st.push(op.st + '@' + Math.round(S.t)); if (op.st === 'go') o.go = new Map(op.sq.filter(q => !q.late).map(q => { const L = q.men.find(m => !m.dead); return [q, L ? { x: L.x, z: L.z } : null]; })); }
      for (const q of op.sq) { const L = q.men.find(m => !m.dead); if (!L) continue;
        if (!o.arr.has(q) && Math.hypot(L.x - op.O.x, L.z - op.O.z) < 150) o.arr.set(q, Math.round(S.t));
        const p = o.go && o.go.get(q); if (p && !o.off.has(q) && Math.hypot(L.x - p.x, L.z - p.z) > 30) o.off.set(q, Math.round(S.t)); }
    }
  });
  const med = a => a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : 0, mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, spread = a => a.length ? Math.max(...a) - Math.min(...a) : 0;
  console.log('== ' + era + ' ' + SECS + ' s seed ' + SEED + ' ==');
  console.log('  m/min per man: mean ' + mean(mins).toFixed(1) + ', median ' + med(mins).toFixed(1) + ', under 10 m/min ' + (100 * mins.filter(v => v < 10).length / (mins.length || 1)).toFixed(0) + '% of ' + mins.length + ' man-minutes');
  console.log('  by job: ' + Object.keys(byJob).sort().map(k => k + ' ' + mean(byJob[k]).toFixed(0) + '/' + byJob[k].length).join(', '));
  console.log('  inside a building: ' + (100 * inB / (men || 1)).toFixed(1) + '% of men samples; in a town/village: ' + (100 * inTown / (men || 1)).toFixed(1) + '%; of those in town inside: ' + (100 * inB / (inTown || 1)).toFixed(0) + '%');
  console.log('  under fire in the open: ' + (100 * open / (fire || 1)).toFixed(0) + '% of ' + fire + ' man-seconds under fire');
  console.log('  down ' + (S.downs || 0) + ', saved ' + (S.saves || 0) + ' (' + (S.downs ? (100 * (S.saves || 0) / S.downs).toFixed(0) : '-') + '%); still down at the end ' + S.men.filter(m => m.down && !m.dead).length);
  console.log('  squad orders (@ at post, ! halted, B bounding, P patrol, R reserve in), samples: ' + Object.keys(ordK).sort((a, b) => ordK[b] - ordK[a]).map(k => k + ' ' + ordK[k]).join(', '));
  console.log('  setOrd calls: ' + Object.keys(setK).map(k => k + ' ' + setK[k]).join(', '));
  for (const [op, o] of ops) { const f = [...o.off.values()], a = [...o.arr.values()];
    console.log('  op side ' + o.t + ' on ' + (o.O.tw ? o.O.tw.L : 'line') + ' from ' + o.T0 + 's: ' + o.st.join(' ') + '; squads ' + op.sq.length + (op.a2 ? ', 2 axes' : '') + '; stepped off ' + f.length + '/' + (o.go ? o.go.size : 0) + (f.length ? ' at ' + f.join(',') + ' (spread ' + spread(f) + ' s)' : '') + '; reached it ' + a.length + (a.length ? ' at ' + a.join(',') + ' (spread ' + spread(a) + ' s)' : '')); }
  for (const [a, o] of ambs) { const v = [...o.first.values()]; console.log('  ambush sprung at ' + Math.round(o.T) + 's: ' + o.men.length + ' men, fired within 1 s ' + v.filter(x => x <= 1).length + ', within 12 s ' + v.length + (v.length ? ' (first shots ' + v.map(x => x.toFixed(1)).join(' ') + ')' : '')); }
  { const D = S.squads.filter(q => !q.net && (q.job === 'rec' || q.job === 'lp') && q.live > 0), rd = D.map(q => { const L = q.men.find(m => !m.dead); return L ? Math.round($('routeDist')(S.T, L.x, L.z)) + ($('kindAt')(L.x, L.z) === 1 ? 'w' : L.cbin ? 'b' : '') + ':' + q.ord.k : '-'; });
    console.log('  dispersed teams (m off a road, w in a wood, b in a building): ' + (rd.join(' ') || 'none')); }
  console.log('  works dug by the holders of points: ' + S.forts.filter(f => f.pw).map(f => ['', 'trench', 'bags'][f.k] + ' ' + Math.round(f.prog * 100) + '%' + (f.in && (f.in[0] || f.in[1]) ? ' manned' : '')).join(', ') + '; all works by the sides after the start ' + S.forts.filter(f => !f.pre).length);
  console.log('  points changed hands: ' + (flips.join(' ') || 'none') + '; held now ' + S.cq.p.map(p => p.L + (p.hold < 0 ? 'n' : p.hold)).join(' '));
}
