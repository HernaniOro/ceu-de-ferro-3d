'use strict';
/* probe-see: how fast and how well an AI shoots at a target it has a clear line to, front and back. Per class and side of the observer (front: the
   target lies where the side looks, toward -x for team 1, back: behind it) and target mode (still, or crossing), over TRIALS seeded runs on the flat ground of base 0:
   t1 = seconds from the start (clear line, in range) to the first round fired by it (a gun round, a shell or a missile); hit = share of those runs
   in which the target lost hp within W s of that round (man .8 s, tank 1.5 s, aircraft 6 s: the first volley); no shot = none in SECS.
   Run it against a page with PAGE=<file> to compare before and after. */
const H = require('./harness'), N = +process.env.TRIALS || 16, SECS = +process.env.SECS || 25, C = H.load();
console.log('page: ' + H.PAGE);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN), med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const ROW = { man: { D: 150, W: .8, id: 'redRifle', tid: 'blueRifle' }, tank: { D: 500, W: 1.5 }, aa: { D: 2000, W: 6 }, plane: { D: 2000, W: 6 } };
function trial(seed, cls, back, move) {
  C.seed(seed); const S = C.sandbox('modern'), $ = C.$, B = S.base[0], g = C.hgt(B.x, B.z), side = S.E.sides, R = ROW[cls], sgn = back ? 1 : -1;   // team 1 looks toward -x
  let ob, tg; const air = cls === 'aa' || cls === 'plane';
  if (cls === 'man') { ob = C.addMan(R.id, 1, B.x, B.z, Math.PI); ob.ai = $('manBrain')(0); ob.ai.gx = ob.x; ob.ai.gz = ob.z; tg = C.addMan(R.tid, 0, B.x + sgn * R.D, B.z, 0); tg.ai = null; }
  else if (cls === 'tank') { ob = C.addUnit('tank', 1, B.x, B.z, side[1].tanks[0], true); ob.h = Math.PI; tg = C.addVehicle('tank', side[0].tanks[0], 0, B.x + sgn * R.D, B.z, 0); }
  else if (cls === 'aa') { ob = C.addUnit('aa', 1, B.x, B.z, side[1].aa, true); ob.h = Math.PI; }
  else { ob = C.addPlane(side[1].fighter, 1, B.x, g + 900, B.z, Math.PI, true, 'fighter'); }
  if (air) tg = C.addPlane(side[0].fighter, 0, B.x + sgn * R.D, g + 900, B.z, 0, false);
  tg.hp = tg.max = 1e6; if (tg.ctl && tg.ctl.drive !== undefined) tg.ctl.drive = 0;
  if (cls === 'tank' && move) tg.ctl.drive = 1;
  const x0 = tg.x, seen = new Set(); let t1 = null, hit = null;
  const cx = sgn * R.D;
  C.run(SECS, () => {
    if (air) { const a = S.t * 120; tg.x = B.x + cx; tg.z = B.z - 600 + (move ? a : 0); tg.y = g + 900; tg.v = { x: 0, y: 0, z: move ? 120 : 0 }; tg.hp = 1e6; tg.dead = false; }
    else if (move && cls === 'man') { tg.x = x0; tg.z = B.z + S.t * 2.6; tg.v = { x: 0, y: 0, z: 2.6 }; }
    for (const k of ['bullets', 'missiles', 'shells', 'bombs']) for (const b of S[k]) {
      if (b.by !== ob || seen.has(b)) continue;
      seen.add(b); if (t1 === null) t1 = S.t;
    }
    if (t1 !== null && hit === null && S.t >= t1 + R.W) hit = tg.hp < 1e6 - .01;
    if (hit !== null) return false;
  });
  return { t1, hit };
}
const out = [];
for (const cls of ['man', 'tank', 'aa', 'plane']) for (const back of [false, true]) for (const move of (cls === 'aa' || cls === 'plane' ? [true] : [false, true])) {
  const T = [], Hh = []; let miss = 0;
  for (let i = 1; i <= N; i++) { const r = trial(i * 7919 + cls.length * 31 + (back ? 5 : 0) + (move ? 3 : 0), cls, back, move); if (r.t1 === null) miss++; else { T.push(r.t1); Hh.push(r.hit ? 1 : 0); } }
  out.push([cls, back ? 'back' : 'front', move ? 'cross' : 'still', med(T).toFixed(1), mean(T).toFixed(1), T.length ? Math.round(100 * mean(Hh)) + '%' : '-', miss + '/' + N]);
}
console.log('class  side   target   t1 median  t1 mean  first-shot hit  no shot');
for (const r of out) console.log(r[0].padEnd(7) + r[1].padEnd(7) + r[2].padEnd(9) + r[3].padStart(9) + r[4].padStart(9) + r[5].padStart(14) + r[6].padStart(10));
