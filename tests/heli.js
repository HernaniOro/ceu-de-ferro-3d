'use strict';
/* helicopters, flight: hover, climb, descent, speeds each way, turn, landing limits, rotor strikes, autorotation, part losses, mouse-aim law */
const H = require('./harness'), { ok, done } = H, C = H.load({ seed: 11 }), $ = C.$;
const HELIS = $('HELIS'), HFM = $('HFM'), ids = Object.keys(HELIS), kmh = v => (v * 3.6).toFixed(0), f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
let S;
const K = $('ASPD');   // the world is K times what the dials say: heights flown by hand and times spent climbing follow it
const pitch = p => Math.asin(Math.max(-1, Math.min(1, p.f.y))), bank = p => Math.atan2(-p.r.y, p.u.y), hdg = p => Math.atan2(-p.f.z, p.f.x), vh = p => Math.hypot(p.v.x, p.v.z);
const agl = p => p.y - C.hgt(p.x, p.z) - p.def.gh;
/* a flat open place: the middle of the friendly airfield's apron side, far from buildings */
function open() { S = C.sandbox('modern'); const q = C.heliPad(0, 8); return q; }
function mk(id, h, o) { const q = open(), p = C.addHeli(id, 0, q.x, C.hgt(q.x, q.z) + HELIS[id].gh + h, q.z, q.h, false); Object.assign(p.ctl, { vs: 0, free: true, pitch: 0, roll: 0, yaw: 0 }, o); p.inv = 0; return p; }
const hands = (p, o) => Object.assign(p.ctl, { free: !(o.pitch || o.roll), pitch: 0, roll: 0, yaw: 0, vs: 0 }, o);

console.log('hover, hands off, 30 s (after a 3 m/s shove sideways and forward)');
for (const id of ids) {
  const p = mk(id, 60), x0 = p.x, y0 = p.y, z0 = p.z; let lo = 0, hi = 0, far = 0;
  C.run(30, () => { lo = Math.min(lo, p.y - y0); hi = Math.max(hi, p.y - y0); });
  const still = Math.hypot(p.x - x0, p.z - z0);
  p.v.x += 3; p.v.z += 3; const x1 = p.x, z1 = p.z;
  C.run(30, () => { far = Math.max(far, Math.hypot(p.x - x1, p.z - z1)); });
  console.log('  ' + id + ': drift ' + f2(still) + ' m, height ' + f2(lo) + ' to +' + f2(hi) + ' m, collective ' + f2(p.ctl.col) + '; shoved: stops ' + f1(far) + ' m away, speed after 30 s ' + f2(vh(p)) + ' m/s');
  ok(still < 1 && hi - lo < 1.5 && vh(p) < .3 && !p.dead, id + ' holds a hover hands off');
}
console.log('climb, descent and speeds (stick held to the stop, collective keys for the vertical ones)');
const top = {};
for (const id of ids) {
  const d = HELIS[id], r = {};
  let p = mk(id, 300); hands(p, { vs: HFM.vs[0] }); C.run(15 / K); r.up = p.v.y; hands(p, { vs: 99 }); C.run(15 / K); r.max = p.v.y;
  p = mk(id, 600); hands(p, { vs: -HFM.vs[1] }); C.run(15); r.dn = -p.v.y;
  p = mk(id, 300); hands(p, { pitch: -1 }); C.run(90); r.fw = vh(p); r.dz = p.v.y; r.th = pitch(p);
  p = mk(id, 300); hands(p, { roll: 1 }); C.run(40); r.sd = vh(p); r.sdy = wrapd(hdg(p) - 0);
  p = mk(id, 300); hands(p, { pitch: 1 }); C.run(40); r.bk = vh(p);
  top[id] = r;
  console.log('  ' + id + ': climb ' + f1(r.up) + ' m/s asked 8, at full collective ' + f1(r.max) + '; descent ' + f1(r.dn) + '; ahead ' + kmh(r.fw) + ' km/h (table ' + kmh(d.vmax) + ', nose ' + f2(r.th) + ' rad, vy ' + f1(r.dz) + '); sideways ' + kmh(r.sd) + '; rearward ' + kmh(r.bk));
  ok(Math.abs(r.fw - d.vmax) < d.vmax * .06 && r.fw * 3.6 > 245 && r.fw * 3.6 < 305, id + ' top speed is the table\'s, within 250 to 300 km/h');
  ok(r.up > 7 && r.max > 8 && r.max < 16 && r.dn > 6, id + ' climbs and descends vertically');
  ok(r.sd > 15 && r.sd < 40 && r.bk > 15 && r.bk < 45, id + ' flies sideways and rearward');
}
function wrapd(a) { return a - 2 * Math.PI * Math.round(a / (2 * Math.PI)); }
console.log('coordinated turn at 180 km/h, 0.4 rad of bank for 20 s');
for (const id of ['ah64', 'mi8']) {
  const p = mk(id, 400); hands(p, { pitch: -1 }); C.run(60, () => { if (vh(p) > 50) return false; });
  let h0 = hdg(p), turned = 0, slip = 0, y0 = p.y, n = 0;
  C.run(20, () => { const v = vh(p); p.ctl.pitch = v > 50 ? -.12 : -.3; p.ctl.roll = .4; p.ctl.free = false; const h = hdg(p); turned += wrapd(h - h0); h0 = h; if (S.t % 1 < .02) { slip = Math.max(slip, Math.abs(Math.atan2(p.v.x * p.r.x + p.v.z * p.r.z, p.v.x * p.f.x + p.v.z * p.f.z))); } n++; });
  const rate = -turned / 20, want = 9.81 * Math.tan(.4) / vh(p);
  console.log('  ' + id + ': turned ' + f1(-turned * 57.3) + '° right, ' + f2(rate * 57.3) + '°/s (g·tan/V gives ' + f2(want * 57.3) + '), worst sideslip ' + f1(slip * 57.3) + '°, height ' + f1(p.y - y0) + ' m, speed ' + kmh(vh(p)));
  ok(rate > want * .7 && rate < want * 1.3 && slip < .12 && Math.abs(p.y - y0) < 25, id + ' turns coordinated and holds its height');
}
console.log('landing: sink rate at touchdown against what is left');
{
  const rows = [];
  for (const vs of [1, 2, 2.5, 3.5, 5, 7, 8.5, 9.5]) { const p = mk('ah64', .02); p.v.y = -vs; p.ctl.vs = -vs; C.run(.2); rows.push(vs + ' m/s: ' + (p.dead ? 'destroyed' : 'structure ' + Math.round(p.hp / p.def.hp * 100) + '%')); if (vs <= 2.5) ok(!p.dead && p.hp === p.def.hp && p.land, 'touchdown at ' + vs + ' m/s costs nothing'); if (vs > 9) ok(p.dead, 'touchdown at ' + vs + ' m/s is the end'); if (vs > 3 && vs < 9) ok(!p.dead && p.hp < p.def.hp, 'touchdown at ' + vs + ' m/s damages it'); }
  console.log('  ' + rows.join('; '));
  for (const vx of [2, 5, 8, 10]) { const p = mk('ah64', .02); p.v.x = vx * Math.cos(hdg(p)); p.v.z = -vx * Math.sin(hdg(p)); p.v.y = -1; p.ctl.vs = -1; p.ctl.free = false; C.run(.2); console.log('  running on at ' + vx + ' m/s: ' + (p.dead ? 'destroyed' : 'structure ' + Math.round(p.hp / p.def.hp * 100) + '%')); }
  for (const id of ids) {   // the down key alone, from 40 m
    const p = mk(id, 40); let tv = 0; C.run(60, () => { p.ctl.vs = -Math.min(HFM.vs[1], Math.max(HFM.land.aid, agl(p) * HFM.land.k)); if (!p.land) tv = -p.v.y; else return false; });
    console.log('  ' + id + ': held down key from 40 m: touches at ' + f2(tv) + ' m/s after ' + f1(S.t) + ' s, structure ' + Math.round(p.hp / p.def.hp * 100) + '%'); ok(p.land && !p.dead && p.hp === p.def.hp, id + ' lands on the down key alone');
    hands(p, { vs: HFM.vs[0] }); C.run(4); ok(!p.land && agl(p) > 5, id + ' lifts off again (' + f1(agl(p)) + ' m after 4 s)');
  }
}
console.log('rotor and body against the world');
{
  const T = S.T; let p, o;
  /* terrain: the steepest slope of the map, approached low and slowly; and a tip put into flat ground by a bank the stabiliser would not allow */
  let best = null, bs = 0;
  for (let j = 2; j < T.N - 2; j++) for (let i = 2; i < T.N - 2; i++) { const x = T.x0 + i * T.cx, z = T.z0 + j * T.cz; if (x < 300 || x > S.W - 300 || Math.abs(z) > S.HW - 300) continue; const s = (C.hgt(x + 20, z) - C.hgt(x - 20, z)) / 40; if (s > bs && C.near(x, z, 60).length === 0) { bs = s; best = { x, z }; } }
  open(); p = C.addHeli('ah64', 0, best.x - 60, C.hgt(best.x - 60, best.z) + 6, best.z, 0, false); p.inv = 0;
  let why = ''; C.run(30, () => { hands(p, { pitch: -.12, vs: 0 }); if (p.dead) { why = (p.gone ? 'body' : 'rotor') + ' at ' + f1(agl(p)) + ' m over the ground under it'; return false; } });
  console.log('  slope of ' + f2(bs) + ' flown into at 6 m: ' + (why || 'no strike')); ok(p.dead, 'terrain ends a helicopter flown into a slope');
  p = mk('ah64', 1.5); C.spin(p, 1.1, 0, 0, 1); C.axes(p); C.run(.05); ok(p.dead && !p.gone, 'a rotor tip in the ground: destroyed, and it falls');
  open(); o = S.T.houses[3]; p = C.addHeli('uh60', 0, o.x - o.r - 30, o.y + o.h * .5 + 2, o.z, 0, false); p.inv = 0;
  C.run(20, () => { hands(p, { pitch: -.1 }); if (p.dead) return false; });
  console.log('  house: ' + (p.dead ? 'destroyed ' + f1(Math.hypot(p.x - o.x, p.z - o.z) - o.r) + ' m from its circle, house stage ' + S.os[o.id] : 'missed')); ok(p.dead, 'a house ends it');
  open(); o = S.T.objs.find(q => q.k === 'tree' && q.sc > 1.2); p = C.addHeli('ah64', 0, o.x - 40, o.y + o.h * .8, o.z, 0, false); p.inv = 0;
  C.run(20, () => { hands(p, { pitch: -.1 }); if (p.dead) return false; });
  console.log('  tree (crown ' + f1(o.cr) + ' m, ' + f1(o.h) + ' m tall): ' + (p.dead ? 'rotor struck ' + f1(Math.hypot(p.x - o.x, p.z - o.z)) + ' m from the trunk, tree stage ' + S.os[o.id] : 'missed')); ok(p.dead && S.os[o.id] === 2, 'a tree ends it, and the tree comes down');
  p = mk('ah64', 30); const q = C.addHeli('mi28', 1, p.x + 60 * p.f.x, p.y, p.z + 60 * p.f.z, Math.PI, false); q.inv = 0; q.ctl.vs = 0;
  C.run(20, () => { hands(p, { pitch: -.1 }); if (p.dead) return false; }); ok(p.dead && q.dead, 'two helicopters whose discs meet are both lost');
}
console.log('engines out at 300 m and 110 km/h');
function auto(id, well) {
  const p = mk(id, 300); hands(p, { pitch: -1 }); C.run(40, () => { if (vh(p) > 30) return false; });
  for (const n of ['engL', 'engR']) p.parts[p.def.parts.ix[n]].hp = 0; C.refit(p);
  let tv = 0, tvh = 0, rmin = 9, rmax = 0, sink = 0, t0 = S.t; const x0 = p.x, z0 = p.z;
  C.run(120, () => {
    if (agl(p) > 60 * K) { const h = agl(p); p.x = x0; p.z = z0; p.y = C.hgt(x0, z0) + p.def.gh + h; }   // the glide stays over the open apron: what stands kilometres on is not what this measures
    const a = agl(p), c = p.ctl; c.vs = null; c.free = false; c.yaw = 0; c.roll = 0;
    if (well) { const lever = a > 5.5 * K ? .35 : 1; c.raw = Math.sign(lever - c.col) * (Math.abs(lever - c.col) > .02 ? 1 : 0); c.pitch = a > 25 * K ? (vh(p) > 28 ? .02 : -.1) : vh(p) > 5 ? .22 : 0; } else { c.raw = 0; c.pitch = 0; c.free = true; }
    if (a > 30) { sink = -p.v.y; rmin = Math.min(rmin, p.rpm); rmax = Math.max(rmax, p.rpm); }
    if (!p.land && !p.dead) { tv = -p.v.y; tvh = vh(p); } else return false;
  });
  return { p, tv, tvh, sink, rmin, rmax, t: S.t - t0 };
}
for (const id of ids) {
  const a = auto(id, true), b = auto(id, false);
  console.log('  ' + id + ': handled (lever to 0.35, 100 km/h, nose up from ' + f1(25 * K) + ' m until slow, lever up at ' + f1(5.5 * K) + ' m): sink ' + f1(a.sink) + ' m/s, rotor ' + Math.round(a.rmin * 100) + ' to ' + Math.round(a.rmax * 100) + '%, touches at ' + f1(a.tv) + ' m/s down and ' + f1(a.tvh) + ' ahead after ' + f1(a.t) + ' s: ' + (a.p.dead ? 'DESTROYED' : 'structure ' + Math.round(a.p.hp / a.p.def.hp * 100) + '%') + '. Hands off: ' + f1(b.tv) + ' m/s down: ' + (b.p.dead ? 'destroyed' : 'structure ' + Math.round(b.p.hp / b.p.def.hp * 100) + '%'));
  ok(!a.p.dead && a.p.hp > a.p.def.hp * .75, id + ' survives an autorotation flown well, nearly whole'); ok(b.p.dead || b.p.hp < a.p.hp, id + ' hands off fares worse');
}
console.log('what each part\'s loss does (ah64)');
{
  const D = HELIS.ah64.parts, ix = n => D.findIndex(d => d.id === n), kill = (p, n) => { p.parts[ix(n)].hp = 0; C.refit(p); };
  let p = mk('ah64', 100); const by = C.addHeli('mi28', 1, p.x + 3000, p.y, p.z, 0, false);
  C.impact(p, 0, 9999, by, p.x, p.y + p.def.hr, p.z, 0, -1, 0); console.log('  main rotor: ' + (p.dead ? 'destroyed' : 'alive')); ok(p.dead, 'losing the main rotor is the end');
  p = mk('ah64', 100); kill(p, 'tail'); let h0 = hdg(p), tot = 0; C.run(6, () => { tot += wrapd(hdg(p) - h0); h0 = hdg(p); }); const spinH = Math.abs(tot) / 6;
  p = mk('ah64', 300); hands(p, { pitch: -1 }); C.run(60, () => { if (vh(p) > 55) return false; }); kill(p, 'tail'); h0 = hdg(p); tot = 0; C.run(6, () => { hands(p, { pitch: -.15 }); tot += wrapd(hdg(p) - h0); h0 = hdg(p); }); const spinF = Math.abs(tot) / 6;
  console.log('  tail rotor: at the hover it turns ' + f1(spinH * 57.3) + '°/s, at 200 km/h ' + f1(spinF * 57.3) + '°/s'); ok(spinH > .8 && spinF < .25, 'no tail rotor: it spins at the hover and flies on at speed');
  p = mk('ah64', 100); kill(p, 'engL'); hands(p, { vs: 99 }); C.run(12); const one = p.v.y; console.log('  one engine: best climb ' + f1(one) + ' m/s (two: ' + f1(top.ah64.max) + '), crippled ' + p.mod.crip); ok(one > 0 && one < top.ah64.max * .7 && p.mod.crip, 'one engine: it still climbs, slowly');
  p = mk('ah64', 100); kill(p, 'trans'); C.run(3); console.log('  transmission: rotor at ' + Math.round(p.rpm * 100) + '% after 3 s hands off, sinking ' + f1(-p.v.y) + ' m/s'); ok(p.rpm < .95 && p.v.y < -2, 'no transmission: the rotor is not driven');
  p = mk('ah64', 100); kill(p, 'fuel'); kill(p, 'fuelA'); hands(p, { vs: 99 }); C.run(12); console.log('  fuel: thrust ' + f2(p.mod.thrust) + ', best climb ' + f1(p.v.y) + ' m/s, leaking ' + !!p.mod.leak); ok(p.mod.leak && p.v.y < top.ah64.max * .9, 'fuel: leak and less power');
  p = mk('ah64', 100); C.impact(p, 1, 9999, by, p.x + p.def.parts[ix('pilot')].box[0] * p.f.x, p.y + p.def.parts[ix('pilot')].box[1], p.z + p.def.parts[ix('pilot')].box[0] * p.f.z, 0, -1, 0); console.log('  pilot: ' + (p.dead ? 'lost' : 'alive, part ' + p.parts[ix('pilot')].hp)); ok(p.dead, 'pilot: the helicopter is lost');
  p = mk('ah64', 100); kill(p, 'gunner'); p.ctl.aim = { x: -p.r.x, y: 0, z: -p.r.z }; C.run(1); const slow = Math.abs(p.ty); p = mk('ah64', 100); p.ctl.aim = { x: -p.r.x, y: 0, z: -p.r.z }; C.run(1); console.log('  gunner: turret turned ' + f2(slow) + ' rad in 1 s, with him ' + f2(Math.abs(p.ty))); ok(slow < Math.abs(p.ty) * .4, 'gunner: the turret is slow and the gun spreads');
  p = mk('ah64', 100); C.impact(p, 0, 40, by, p.x, p.y, p.z, 1, 0, 0); ok(p.hp < p.def.hp && !p.dead, 'airframe: a hit takes structure (' + Math.round(p.hp) + ' of ' + p.def.hp + ')');
}
console.log('mouse-aim law: a step of the aim, the nose after it');
for (const id of ['ah64', 'mi8']) {
  open(); S.cls = 'heli'; S.model = id; S.pref = true; S.net = false; const p = C.spawnPlayer(); p.inv = 0; S.input.thrUp = true; C.run(8); S.input.thrUp = false; C.run(4);
  const step = (dh, dp) => {
    const h0 = hdg(p), t0 = S.t, a = S.aim; a.h += dh; a.p += dp; let over = 0, settle = 0, pov = 0, pset = 0;
    C.run(10, () => { const e = wrapd(a.h - hdg(p)), ep = a.p - pitch(p); if (dh) { if (e * Math.sign(dh) < 0) over = Math.max(over, Math.abs(e)); if (Math.abs(e) > Math.abs(dh) * .03) settle = S.t - t0; } if (dp) { if (ep * Math.sign(dp) < 0) pov = Math.max(pov, Math.abs(ep)); if (Math.abs(ep) > Math.abs(dp) * .05) pset = S.t - t0; } });
    return { over, settle, pov, pset };
  };
  const y = step(1.0, 0), y2 = step(-.2, 0), pp = step(0, -.2), back = step(0, .2);
  console.log('  ' + id + ': yaw step 57°: settles (3%) in ' + f2(y.settle) + ' s, overshoot ' + f1(y.over / 1 * 100) + '%; step 11°: ' + f2(y2.settle) + ' s, overshoot ' + f1(y2.over / .2 * 100) + '%; pitch step 11° down: within 5% in ' + f2(pp.pset) + ' s, overshoot ' + f1(pp.pov / .2 * 100) + '%; back up: ' + f2(back.pset) + ' s, ' + f1(back.pov / .2 * 100) + '%');
  ok(y.settle < 4 && y.over < .06 && y2.over < .02 && pp.pov < .03, id + ' converges on the aim without hunting');
}
done();
