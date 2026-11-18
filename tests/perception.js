'use strict';
/* perception: field of view, detection time, scanning, sharing and aim of the AI (VIEW, PERC, HEAR, SHARE, SCAN, AIM). Clocks are moved by hand (S.t) where only the
   meter is looked at, and the simulation is run where an AI has to turn or shoot. */
const H = require('./harness'), { ok, done } = H, C = H.load(), $ = C.$;
console.log('page: ' + H.PAGE);
if (!$('typeof VIEW !== "undefined"')) { console.log('no VIEW table: a page before perception'); process.exit(0); }
let S, B, side;
const fresh = era => { C.seed(7); S = C.sandbox(era || 'modern'); B = S.base[0]; side = S.E.sides; return S; };
const man = (team, x, z, h, st) => { const m = C.addMan(team ? 'redRifle' : 'blueRifle', team, B.x + x, B.z + z, h || 0); m.ai = $('manBrain')(0); m.ai.gx = m.x; m.ai.gz = m.z; if (st) { m.st = st; } return m; };
/* seconds until a knows t (the clock stepped by dt), or Infinity */
function tk(a, t, max, dt, each) { dt = dt || .25; const t0 = S.t; for (; S.t - t0 < (max || 30);) { S.t += dt; if (each) each(); if ($('notice')(a, t)) return S.t - t0; } return Infinity; }
const f1 = v => (Number.isFinite(v) ? v.toFixed(1) : 'never');
const rows = [];

fresh(); console.log('-- a soldier: where it looks, and how far --');
{
  const T = (x, z, st, mv) => { fresh(); const a = man(1, 0, 0, 0), t = man(0, x, z, 0, st); t.ai = null; if (mv) t.v = { x: 0, y: 0, z: 5 }; return tk(a, t, 40); };
  const r100 = T(100, 0), r300 = T(300, 0), r550 = T(550, 0), side90 = T(0, -300), rear = T(-300, 0), prone = T(300, 0, 2), crouch = T(300, 0, 1), move = T(300, 0, 0, true);
  rows.push(['soldier front 100 m', r100], ['soldier front 300 m', r300], ['soldier front 550 m', r550], ['soldier side 300 m', side90], ['soldier behind 300 m', rear], ['soldier front 300 m prone', prone], ['soldier front 300 m crouched', crouch], ['soldier front 300 m moving', move]);
  ok(r100 < r300 && r300 < r550, 'closer is noticed sooner: ' + f1(r100) + ' < ' + f1(r300) + ' < ' + f1(r550) + ' s');
  ok(r300 > .8 && r300 < 12, 'at 300 m it takes seconds, not a frame: ' + f1(r300) + ' s');
  ok(side90 > r300 * 1.5, 'to the side it takes longer: ' + f1(side90) + ' s against ' + f1(r300));
  ok(rear === Infinity, 'a still one behind it in the open is not noticed in 40 s');
  ok(prone > r300 * 1.5 && crouch > r300, 'prone ' + f1(prone) + ' s, crouched ' + f1(crouch) + ', standing ' + f1(r300));
  ok(move < r300, 'moving it is noticed sooner: ' + f1(move) + ' s');
  fresh(); const a = man(1, 0, 0, 0), t = man(0, -300, 0, 0); t.ai = null; const f = tk(a, t, 20, .25, () => { t.shotT = S.t; });
  ok(f < 3, 'a shot from behind is heard and the shooter known in ' + f1(f) + ' s');
  fresh(); const a2 = man(1, 0, 0, 0), t2 = man(0, -10, 0, 0); t2.ai = null; t2.v = { x: 0, y: 0, z: 4 };
  ok(tk(a2, t2, 6) < 3, 'one running 10 m behind is heard');
}
console.log('-- smoke and walls --');
{
  fresh(); const a = man(1, 0, 0, 0), t = man(0, 120, 0, 0); t.ai = null;
  for (let x = 20; x <= 100; x += 20) S.smokes.push({ x: B.x + x, y: C.hgt(B.x + x, B.z), z: B.z, t0: S.t - 2 });
  ok(tk(a, t, 10) === Infinity, 'smoke between them: not made out');
}
console.log('-- vehicles --');
{
  const tt = (era, mk, ax, ay) => { fresh(era); const a = mk(); a.f = { x: Math.cos(ay), y: 0, z: -Math.sin(ay) }; const t = C.addVehicle('tank', side[0].tanks[0], 0, B.x + ax[0], B.z + ax[1], 0); return [a, t]; };
  const tank = () => C.addUnit('tank', 1, B.x, B.z, side[1].tanks[0], true);
  let [a, t] = tt('modern', tank, [900, 0], 0); const onAxis = tk(a, t, 30);
  [a, t] = tt('modern', tank, [900 * Math.cos(.8), 900 * -Math.sin(.8)], 0); const off = tk(a, t, 30);
  [a, t] = tt('modern', tank, [-700, 0], 0); const back = tk(a, t, 30);
  rows.push(['tank on its axis, 900 m', onAxis], ['tank 46 deg off its turret, 900 m', off], ['tank behind it, 700 m', back]);
  ok(onAxis < 8 && off > onAxis, 'the gunner sights on the axis (' + f1(onAxis) + ' s); off it only the commander does (' + f1(off) + ' s)');
  ok(back < Infinity && back > 1, 'the commander finds one behind, slowly: ' + f1(back) + ' s');
  fresh('modern'); const aa = C.addUnit('aa', 1, B.x, B.z, side[1].aa, true); aa.f = { x: 1, y: 0, z: 0 }; const pl = C.addPlane(side[0].fighter, 0, B.x - 5000, C.hgt(B.x, B.z) + 1500, B.z, 0, false); pl.v = { x: 200, y: 0, z: 0 };
  const rad = tk(aa, pl, 15);
  fresh('ww2'); const ag = C.addUnit('aa', 1, B.x, B.z, side[1].aa, true); ag.f = { x: 1, y: 0, z: 0 }; const pl2 = C.addPlane(side[0].fighter, 0, B.x - 3500, C.hgt(B.x, B.z) + 1200, B.z, 0, false); pl2.v = { x: 200, y: 0, z: 0 };
  const flakBack = tk(ag, pl2, 30); const pl3 = C.addPlane(side[0].fighter, 0, B.x + 3500, C.hgt(B.x, B.z) + 1200, B.z, 0, false); pl3.v = { x: 200, y: 0, z: 0 }; const flakFront = tk(ag, pl3, 30);
  rows.push(['SAM radar, plane behind at 5 km', rad], ['flak eyes, plane behind at 3.5 km', flakBack], ['flak eyes, plane ahead at 3.5 km', flakFront]);
  ok(rad < 4, 'a radar takes an aircraft all round, behind it too: ' + f1(rad) + ' s');
  ok(flakBack > flakFront * 1.3, 'flak eyes find one ahead (' + f1(flakFront) + ' s) before one behind (' + f1(flakBack) + ' s)');
  fresh('modern'); const p = C.addPlane(side[1].fighter, 1, B.x, C.hgt(B.x, B.z) + 1500, B.z, 0, true); const g = C.hgt(B.x, B.z);
  const tg = C.addVehicle('tank', side[0].tanks[0], 0, B.x + 1800, B.z, 0), tb = C.addVehicle('tank', side[0].tanks[0], 0, B.x - 1800, B.z, 0), tu = C.addVehicle('tank', side[0].tanks[0], 0, B.x + 150, B.z, 0);
  const pf = tk(p, tg, 30), pr = tk(p, tb, 30), pu = tk(p, tu, 30);
  rows.push(['pilot, tank ahead 1800 m', pf], ['pilot, tank behind 1800 m', pr], ['pilot, tank below', pu]);
  ok(pf < Infinity && pr > pf, 'a pilot sees ahead (' + f1(pf) + ' s) before behind (' + f1(pr) + ' s)');
}
console.log('-- scanning --');
{
  fresh(); const u = C.addUnit('tank', 1, B.x, B.z, side[1].tanks[0], true); u.h = 0; let lo = 9, hi = -9; const e = S.base[0];
  C.run(30, () => { const y = Math.atan2(-u.f.z, u.f.x), r = $('wrap')(y - Math.atan2(-(e.z - u.z), e.x - u.x)); lo = Math.min(lo, r); hi = Math.max(hi, r); });
  ok(hi - lo > 1.5 && Math.abs(lo + hi) < 1.2, 'a tank with nothing to shoot at sweeps its turret ' + lo.toFixed(2) + ' to ' + hi.toFixed(2) + ' rad around the enemy');
  fresh(); const m = man(1, 0, 0, 0); let a0 = 9, a1 = -9; C.run(30, () => { const y = Math.atan2(-m.f.z, m.f.x); a0 = Math.min(a0, y); a1 = Math.max(a1, y); });
  ok(a1 - a0 > 1.5, 'a soldier at rest turns to look round: ' + a0.toFixed(2) + ' to ' + a1.toFixed(2) + ' rad');
  fresh(); const u2 = C.addUnit('tank', 1, B.x, B.z, side[1].tanks[0], true); u2.ai.tgt = null; $("boom")(B.x + 300, B.z + 300, 0, 6); C.run(2.5);
  const y = Math.atan2(-u2.f.z, u2.f.x), want = Math.atan2(-300, 300);
  ok(Math.abs($('wrap')(y - want)) < .9, 'a burst heard 420 m off turns the turret toward it (' + y.toFixed(2) + ' rad, burst at ' + want.toFixed(2) + ')');
}
console.log('-- sharing --');
{
  fresh(); const q = C.addSquad(1, B.x, B.z, 0, 0, [0, 0, 0]); const [a, b] = q.men; const far = man(1, 0, 500, 0), q2 = C.addSquad(1, B.x, B.z + 560, 0, 0, [0]), c = q2.men[0];
  for (const m of [a, b, far, c]) { m.ai.tgt = null; m.ctl.mx = m.ctl.mz = 0; }
  a.x = B.x; a.z = B.z; a.f = { x: 1, y: 0, z: 0 }; b.x = B.x - 8; b.z = B.z; b.f = { x: -1, y: 0, z: 0 }; c.x = B.x; c.z = B.z + 400; c.f = { x: -1, y: 0, z: 0 };
  const t = man(0, 150, 0, 0); t.ai = null; t.v = { x: 0, y: 0, z: 3 };
  let ta = null, tb = null, tc = null; const n = $('notice');
  for (let i = 0; i < 160 && (ta === null || tb === null || tc === null); i++) { S.t += .1; if (n(a, t) && ta === null) ta = S.t; if (ta !== null && n(b, t) && tb === null) tb = S.t; if (ta !== null && n(c, t) && tc === null) tc = S.t; }
  ok(ta !== null && tb !== null && tb - ta < 1.2 && b.pm.get(t).told, 'the squad mate with its back turned is told ' + (tb - ta).toFixed(1) + ' s after (table sq ' + $('SHARE').sq + ')');
  ok(tc !== null && tc - ta >= $('SHARE').side - .2 && tc - ta < $('SHARE').side + 1, 'a soldier of another squad is told ' + (tc - ta).toFixed(1) + ' s after (table side ' + $('SHARE').side + ')');
}
console.log('-- the side\'s map --');
{
  fresh(); const a = man(1, 0, 0, 0), t = man(0, 100, 0, 0); t.ai = null; t.v = { x: 0, y: 0, z: 3 }; let kn = null, seen = null;
  C.run(20, () => { if (kn === null && a.pm && a.pm.get(t) && a.pm.get(t).kn) kn = S.t; if (seen === null && S.t - t.seenT < 1) seen = S.t; return seen === null; });
  ok(kn !== null && seen !== null && seen - kn >= $('SHARE').report - .1, 'the soldier knew it at ' + f1(kn) + ' s, the side\'s map had it at ' + f1(seen) + ' s (report ' + $('SHARE').report + ' s)');
  ok(Math.abs(t.sx - t.x) <= $('SHARE').err + 1 && Math.abs(t.sz - t.z) <= $('SHARE').err + 1, 'and to within ' + $('SHARE').err + ' m');
}
console.log('-- aim --');
{
  fresh(); const a = C.addUnit('tank', 1, B.x, B.z, side[1].tanks[0], true), t = C.addVehicle('tank', side[0].tanks[0], 0, B.x + 800, B.z, Math.PI); a.skill = .775; a.f = { x: 1, y: 0, z: 0 };
  const e = $('meter')(a, t); e.kn = true; e.kt = S.t; const eoff = (a.f = { x: 0, y: 0, z: 1 }, $('aimErr')(a, t, 800)); a.f = { x: 1, y: 0, z: 0 }; const e0 = $('aimErr')(a, t, 800); S.t += 1.2; const e1 = $('aimErr')(a, t, 800); S.t += 6; const e2 = $('aimErr')(a, t, 800);
  ok(eoff >= e0 && e0 > e1 && e1 > e2 && e2 === 0, 'a tank not yet on a target just made out is off by ' + eoff.toFixed(4) + ', on it ' + e0.toFixed(4) + ' rad, ' + e1.toFixed(4) + ' after 1.2 s, ' + e2.toFixed(4) + ' once settled and still');
  t.v = { x: 0, y: 0, z: 10 }; const ex = $('aimErr')(a, t, 800); ok(ex > 0, 'crossing at 10 m/s adds ' + ex.toFixed(4) + ' rad');
  a.v = { x: 6, y: 0, z: 0 }; ok($('aimErr')(a, t, 800) > ex, 'a moving shooter adds more');
  a.skill = .95; const hi = $('aimErr')(a, t, 800); a.skill = .6; ok($('aimErr')(a, t, 800) > hi, 'skill matters: .6 is worse than .95');
  fresh(); const m = man(1, 0, 0, 0), s = man(0, 40, 0, 0); s.ai = null; m.skill = .775; const em = $('meter')(m, s); em.kn = true; em.kt = S.t - 9; em.on = S.t - 9;
  ok($('aimErr')(m, s, 40) === 0, 'a soldier settled on a still target 40 m away adds nothing');
  const mm = man(1, 0, 20, 0), ts = man(0, 40, 20, 0); ts.ai = null; mm.skill = .775; const en = $('meter')(mm, ts); en.kn = true; en.kt = S.t; en.on = S.t; en.told = true; const et = $('aimErr')(mm, ts, 40); en.told = false; const eo = $('aimErr')(mm, ts, 40);
  ok(et > eo, 'one told of a target aims worse than one that saw it: ' + et.toFixed(4) + ' against ' + eo.toFixed(4));
}
console.log('-- no table the player sees changed; a player or a drone is never held back --');
{
  fresh(); const P = man(0, 0, 0, 0); P.ai = null; const t = man(1, 5, 0, 0);
  ok($('notice')(P, t) === true && $('aware')(P, t, 3) === true, 'a soldier with no AI (the player) knows at once');
}
console.log('\n' + 'what                                     seconds to know'); for (const r of rows) console.log(r[0].padEnd(42) + f1(r[1]));
done();
