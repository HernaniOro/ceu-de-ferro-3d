'use strict';
/* The mouse-aim law (instruct) as a step response: the aim jumps and stays, and the nose has to arrive without hunting.
     node tests/flight-aim.js            PAGE=<copy> OUT=<file.json>   ONLY=spit,f22
   Per type, speed and step: t2 the time until the nose is within 2 degrees of the aim, over the overshoot past it in degrees, set the last
   time the error was above 2 degrees, and, over the last 6 s of 24, jit the RMS of the roll rate in deg/s, wig the peak-to-peak of the bank
   in degrees and rev how often the roll stick changed sign. still: the same three with the aim left straight ahead for 20 s. */
const fs = require('fs'), H = require('./harness');
const c = H.load({ seed: 7 }), $ = c.$, PLANES = $('PLANES'), DT = 1 / 60, D = 180 / Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), r1 = x => Math.round(x * 10) / 10, dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const STEPS = { 'esq 30': [.524, 0], 'dir 90': [-1.571, 0], 'cima 20': [0, .349], 'baixo 15': [0, -.262], 'dir 170': [-2.967, 0] };

function run(id, kV, yaw, pit, secs) {
  const d = PLANES[id], S = c.sandbox(d.era); S.over = false; S.fac = [0, 1]; c.director = () => {}; c.plan = () => {};
  const x = S.W / 2, p = c.addPlane(id, d.side, x, c.hgt(x, 0) + 2500, 0, 0, false), V = d.vmax * kV; p.inv = 0;
  p.v.x = V; p.V = V;
  const fwd = { x: 1, y: 0, z: 0 };
  for (let t = 0; t < 3; t += DT) { c.instruct(p, fwd, DT); p.ctl.thr = 1; S.t += DT; c.stepPlane(p, DT); p.x = x; p.z = 0; }
  const cp = Math.cos(pit), aim = { x: Math.cos(yaw) * cp, y: Math.sin(pit), z: -Math.sin(yaw) * cp };
  let t2 = null, set = 0, over = 0, best = 9, sq = 0, n = 0, bmin = 9, bmax = -9, rev = 0, last = 0, stall = 0;
  for (let t = 0; t < secs && !p.dead; t += DT) {
    c.instruct(p, aim, DT); p.ctl.thr = 1; S.t += DT; c.stepPlane(p, DT); p.x = x; p.z = 0;
    const off = Math.acos(clamp(dot(aim, p.f), -1, 1)) * D;
    if (off > 2) set = t; else if (t2 === null) t2 = t;
    if (off < best) best = off; else if (best < 2) over = Math.max(over, off);
    if (p.stall) stall += DT;
    if (t > secs - 6) {
      const b = Math.atan2(-p.r.y, p.u.y) * D, s = Math.abs(p.ctl.roll) > .02 ? Math.sign(p.ctl.roll) : 0;
      sq += p.w.x * p.w.x; n++; bmin = Math.min(bmin, b); bmax = Math.max(bmax, b); if (s && last && s !== last) rev++; if (s) last = s;
    }
  }
  return { t2: t2 === null ? null : r1(t2), over: r1(over), set: r1(set), jit: r1(Math.sqrt(sq / n) * D), wig: r1(bmax - bmin), rev, stall: r1(stall), dead: p.dead ? 1 : 0 };
}
const out = {}, ids = process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(PLANES); let worst = { over: 0, jit: 0, wig: 0, rev: 0, set: 0 };
for (const id of ids) {
  out[id] = {};
  for (const kV of [.45, .7, .95]) {
    const row = out[id][kV] = { still: run(id, kV, 0, 0, 20) };
    for (const k in STEPS) row[k] = run(id, kV, STEPS[k][0], STEPS[k][1], 24);
    for (const k in row) { const r = row[k]; for (const m in worst) if (!(k === 'dir 170' && m === 'set') && r[m] > worst[m]) worst[m] = r[m]; }
    console.log(id.padEnd(6), String(Math.round(PLANES[id].vmax * kV * 3.6)).padStart(5), 'km/h |', Object.keys(row).map(k => { const r = row[k]; return k + ' t2 ' + r.t2 + ' over ' + r.over + ' set ' + r.set + ' jit ' + r.jit + ' wig ' + r.wig + ' rev ' + r.rev + (r.stall ? ' STALL ' + r.stall : '') + (r.dead ? ' DEAD' : ''); }).join(' | '));
  }
}
console.log('worst', JSON.stringify(worst));
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify({ worst, out }, null, 1));
