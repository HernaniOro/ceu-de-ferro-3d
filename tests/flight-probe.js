'use strict';
/* Flight numbers per aircraft, flown by a pilot that lives here and not in the page, so two copies of the page are measured alike:
     node tests/flight-probe.js                 # the published page
     PAGE=<copy> OUT=<file.json> node tests/flight-probe.js
     ONLY=spit,f22 picks types. Speeds in km/h, rates in deg/s, climb in m/s, heights in m (airspeed scale, before ASPD). */
const fs = require('fs'), H = require('./harness');
const c = H.load({ seed: 7 }), $ = c.$, PLANES = $('PLANES'), DT = 1 / 60, D = 180 / Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), r1 = x => Math.round(x * 10) / 10, kmh = v => Math.round(v * 3.6);
let S, p;

function spawn(id, V, agl) {
  S = c.sandbox(PLANES[id].era); S.over = false; S.fac = [0, 1]; c.director = () => {}; c.plan = () => {};
  let x = S.W / 2, z = 0, lo = 1e9;   // over the lowest ground of the map, to fly near sea level, where the published figures are given
  for (let i = .1; i < .95; i += .05) for (let j = -.8; j < .85; j += .1) { const h = c.hgt(S.W * i, S.HW * j); if (h < lo) { lo = h; x = S.W * i; z = S.HW * j; } }
  p = c.addPlane(id, PLANES[id].side, x, lo + (agl || 500), z, 0, false); p.inv = 0;
  setV(V); return p;
}
function setV(V) { const l = Math.hypot(p.v.x, p.v.y, p.v.z) || 1; p.v.x *= V / l; p.v.y *= V / l; p.v.z *= V / l; p.V = V; }
const bank = () => Math.atan2(-p.r.y, p.u.y), gamma = () => Math.asin(clamp(p.v.y / (p.V || 1), -1, 1));
function tick() { const x = p.x, z = p.z; S.t += DT; c.stepPlane(p, DT); p.x = x; p.z = z; }   // held over one spot: the map is small and the ground under it is not flat
/* wings level, flight path held at gT (rad) */
function level(gT) { const C = p.ctl; C.roll = clamp(-bank() * 2.5 - p.w.x * .4, -1, 1); C.pitch = clamp((gT - gamma()) * 6 - p.w.z * 1.2, -1, 1); C.yaw = 0; }
/* a hard level turn to the left: pull to just under the stall and the g limit, bank for no climb */
function pull() {
  const d = p.def, C = p.ctl, n = Math.max(1.02, p.g), bT = clamp(Math.acos(1 / n) + p.v.y * .05 + (p.y - p.y0) * .004, .3, 1.5);
  C.pitch = Math.min(clamp((d.as * .95 - p.aoa) / (d.as * .12), 0, 1), clamp((d.gmax - p.g) * 1.5, 0, 1));
  C.roll = clamp((bT - bank()) * 3 - p.w.x * .5, -1, 1); C.yaw = 0;
}
const hdg = () => Math.atan2(-p.v.z, p.v.x);
function settle(V, secs, thr) { p.ctl.thr = thr === undefined ? 1 : thr; for (let t = 0; t < (secs || 3); t += DT) { level(0); tick(); setV(V); } p.y0 = p.y; }
const dead = () => p.dead || !Number.isFinite(p.V);

function topSpeed(id) { spawn(id, PLANES[id].vmax * .85, 600); p.ctl.thr = 1; for (let t = 0; t < 120; t += DT) { level(0); tick(); } return p.V; }
function dryTop(id) { spawn(id, PLANES[id].vmax * .7, 600); for (let t = 0; t < 120; t += DT) { level(0); p.ctl.thr = .9; tick(); } return p.V; }
function stallSpeed(id) {
  const vs = PLANES[id].vs || 40; spawn(id, vs * 1.6); settle(vs * 1.6, 3, 0); p.ctl.thr = 0; let min = p.V;
  for (let t = 0; t < 60 && !dead(); t += DT) { level(0); tick(); if (p.stall || p.v.y < -4) break; min = p.V * Math.sqrt(Math.exp(-p.y / 9000)); }   // as the dial of a real aircraft would read it
  return min;
}
/* climb: a flight path angle held until the speed settles, for a range of angles; the best steady rate and the speed it is flown at */
function climb(id) {
  const d = PLANES[id]; let best = 0, at = 0;
  for (let g = .04; g < 1.25; g += g < .3 ? .02 : .08) {
    spawn(id, d.vmax * .55, 300); p.ctl.thr = 1; let sum = 0, n = 0, v0 = 0;
    for (let t = 0; t < 60 && !dead(); t += DT) { level(g); tick(); p.y = p.y0 || (p.y0 = p.y); if (t > 50) { sum += p.v.y; n++; if (!v0) v0 = p.V; } }
    if (n && !dead() && !p.stall && p.V - v0 > -2 && sum / n > best) { best = sum / n; at = p.V; }
  }
  return { rate: best, at };
}
function accel(id) {
  const d = PLANES[id], a = d.vmax * .5, b = d.vmax * .9; spawn(id, a, 600); settle(a, 3); let t = 0;
  for (; t < 180 && p.V < b; t += DT) { level(0); tick(); } return t;
}
/* instantaneous: the best half-second of heading rate in the first seconds of the pull; g with it */
function turnInst(id, V) {
  spawn(id, V); settle(V, 3); let best = 0, g = 0; const win = [];
  for (let t = 0; t < 6 && !dead(); t += DT) { pull(); const h0 = hdg(); tick(); let dh = hdg() - h0; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI; win.push(Math.abs(dh)); if (win.length > 30) win.shift(); if (win.length === 30) { const r = win.reduce((a, b) => a + b, 0) / .5; if (r > best) { best = r; g = p.g; } } }
  return { rate: best * D, g };
}
/* sustained: the same turn held until the speed stops changing; then where it sits */
function turnSust(id) {
  const d = PLANES[id]; spawn(id, d.vmax * .6); settle(d.vmax * .6, 3); let h = 0, n = 0, v = 0, lost = p.y;
  for (let t = 0; t < 70 && !dead(); t += DT) { pull(); const h0 = hdg(); tick(); let dh = hdg() - h0; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI; if (t > 60) { h += Math.abs(dh); v += p.V; n++; } }
  return { rate: h / (n * DT) * D, V: v / n, g: p.g, dy: p.y - lost };
}
/* the best turn that holds its speed: for a range of speeds, the pull is eased until the speed stays; the fastest heading rate of them */
function turnBest(id) {
  const d = PLANES[id]; let best = { rate: 0 };
  for (let k = .3; k < .97; k += .05) {
    const Vt = d.vmax * k; spawn(id, Vt); settle(Vt, 3); let h = 0, n = 0, cap = .3;
    for (let t = 0; t < 40 && !dead(); t += DT) { pull(); cap = clamp(cap + (p.V - Vt) * .02 * DT * 8, 0, 1); p.ctl.pitch = Math.min(p.ctl.pitch, clamp(cap + (p.V - Vt) * .06, 0, 1)); const h0 = hdg(); tick(); let dh = hdg() - h0; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI; if (t > 30) { h += Math.abs(dh); n++; } }
    const rate = h / (n * DT) * D; if (!dead() && Math.abs(p.V - Vt) < Vt * .03 && rate > best.rate) best = { rate, V: p.V, g: p.g };
  }
  return best;
}
/* bleed: from 0.9 vmax in the hardest level turn, the speed after 5 and 10 s and the time down to the corner speed (vs sqrt gmax) */
function bleed(id) {
  const d = PLANES[id], V0 = d.vmax * .9, vc = (d.vs || 40) * Math.sqrt(d.gmax); spawn(id, V0); settle(V0, 3); let v5 = 0, v10 = 0, tc = null;
  for (let t = 0; t < 40 && !dead(); t += DT) { pull(); tick(); if (!v5 && t >= 5) v5 = p.V; if (!v10 && t >= 10) v10 = p.V; if (tc === null && p.V <= vc) tc = t; }
  return { V0, v5, v10, vc, tc };
}
/* roll: stick hard over from level; the peak rate and the time to 90 degrees */
function roll(id, V) {
  spawn(id, V); settle(V, 2); let pk = 0, t90 = null;
  for (let t = 0; t < 4 && !dead(); t += DT) { p.ctl.roll = 1; p.ctl.pitch = 0; p.ctl.yaw = 0; tick(); setV(V); pk = Math.max(pk, Math.abs(p.w.x)); if (t90 === null && Math.abs(bank()) > Math.PI / 2) t90 = t; }
  return { rate: pk * D, t90 };
}
function dive(id) {
  const d = PLANES[id]; spawn(id, d.vmax * .75, 3500); settle(d.vmax * .75, 2); let v10 = 0;
  for (let t = 0; t < 10 && !dead(); t += DT) { level(-.52); tick(); } v10 = p.V; return v10;
}
/* zoom: from 0.9 vmax into a 45 degree climb at full power, height gained until 1.3 times the stall speed */
function zoom(id) {
  const d = PLANES[id]; spawn(id, d.vmax * .9, 800); settle(d.vmax * .9, 2); const y0 = p.y; let t = 0;
  for (; t < 120 && !dead() && p.V > (d.vs || 40) * 1.3; t += DT) { level(.785); tick(); }
  return { h: p.y - y0, t };
}
/* full stick held from slow level flight: does it depart, how far does the nose and the bank go, and does letting go recover it */
function depart(id, rud) {
  const d = PLANES[id], V = (d.vs || 40) * 1.25; spawn(id, V, 2000); settle(V, 3); const y0 = p.y; let st = 0, bk = 0, ok = null;
  for (let t = 0; t < 6 && !dead(); t += DT) { p.ctl.pitch = 1; p.ctl.roll = 0; p.ctl.yaw = rud || 0; p.ctl.thr = 1; tick(); if (p.stall) st += DT; bk = Math.max(bk, Math.abs(bank())); }
  let low = p.y;   // hands off for a second and a half, then level out: the height it cost
  for (let t = 0; t < 20 && !dead(); t += DT) { if (t < 1.5) { p.ctl.pitch = 0; p.ctl.roll = 0; p.ctl.yaw = 0; } else level(0); tick(); low = Math.min(low, p.y); if (ok === null && !p.stall && !(p.spn > .1) && t > .3) ok = t; }
  return { stalled: st, bank: bk * D, rec: ok, lost: y0 - low };
}

const out = {}, ids = (process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(PLANES));
for (const id of ids) {
  const d = PLANES[id], o = out[id] = { name: d.name };
  o.top = kmh(topSpeed(id)); if (d.Tab) o.topDry = kmh(dryTop(id));
  o.stall = kmh(stallSpeed(id)); o.vs = kmh(d.vs);
  const cl = climb(id); o.climb = r1(cl.rate); o.climbAt = kmh(cl.at);
  o.accel = r1(accel(id));
  o.inst = [.4, .55, .7, .9].map(k => { const t = turnInst(id, d.vmax * k); return [kmh(d.vmax * k), r1(t.rate), r1(t.g)]; });
  const s = turnSust(id); o.sust = r1(s.rate); o.sustV = kmh(s.V); o.sustG = r1(s.g); o.sustDy = Math.round(s.dy);
  const tb = turnBest(id); o.best = r1(tb.rate); o.bestV = kmh(tb.V || 0); o.bestG = r1(tb.g || 0);
  const b = bleed(id); o.bleed = { from: kmh(b.V0), v5: kmh(b.v5), v10: kmh(b.v10), corner: kmh(b.vc), t: b.tc === null ? null : r1(b.tc) };
  o.roll = [.35, .5, .7, .9, 1.15].map(k => { const t = roll(id, d.vmax * k); return [kmh(d.vmax * k), Math.round(t.rate), t.t90 === null ? null : r1(t.t90)]; });
  o.dive10 = kmh(dive(id)); const z = zoom(id); o.zoom = Math.round(z.h);
  o.depart = [0, 1].map(rud => { const dp = depart(id, rud); return { stalled: r1(dp.stalled), bank: Math.round(dp.bank), rec: dp.rec === null ? null : r1(dp.rec), lost: Math.round(dp.lost) }; });
  console.log(id.padEnd(6), 'top', o.top, o.topDry ? '(dry ' + o.topDry + ')' : '', 'stall', o.stall, 'climb', o.climb, '@' + o.climbAt, 'accel', o.accel + 's',
    '| inst', o.inst.map(a => a[0] + ':' + a[1] + '/' + a[2] + 'g').join(' '), '| stick-held', o.sust, '@' + o.sustV, o.sustG + 'g', 'best-sust', o.best, '@' + o.bestV, o.bestG + 'g',
    '| bleed', o.bleed.from + '>' + o.bleed.v5 + '>' + o.bleed.v10, 'corner', o.bleed.corner, 't', o.bleed.t,
    '| roll', o.roll.map(a => a[0] + ':' + a[1] + (a[2] ? '(' + a[2] + 's)' : '')).join(' '), '| dive10', o.dive10, 'zoom', o.zoom,
    '| depart stick', JSON.stringify(o.depart[0]), 'stick+rudder', JSON.stringify(o.depart[1]));
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
