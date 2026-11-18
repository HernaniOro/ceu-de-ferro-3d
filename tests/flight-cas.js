'use strict';
/* An AI attack plane alone against four parked tanks, no guns firing back: does it still find them, line up, let go and fly on?
     node tests/flight-cas.js    PAGE=<copy>  SECS=200
   Per type: stores released, tanks destroyed, and whether the plane was still flying at the end */
const H = require('./harness'), SECS = +process.env.SECS || 200;
for (const id of ['stuka', 'p47', 'a10', 'su25']) {
  const c = H.load({ seed: 21 }), $ = c.$, d = $('PLANES')[id], S = c.sandbox(d.era); S.over = false; S.fac = [0, 1]; c.director = () => {}; c.plan = () => {};
  const foe = 1 - d.side, tk = S.E.sides[foe].tanks[0], x0 = S.W * (d.side ? .45 : .55), us = [];
  for (let i = 0; i < 4; i++) { const u = c.addVehicle('tank', tk, foe, x0 + i * 60, (i - 1.5) * 80, 0); u.ai = null; us.push(u); }
  const p = c.addPlane(id, d.side, x0 + (d.side ? 5000 : -5000), c.hgt(x0, 0) + 900, 0, d.side ? Math.PI : 0, true, 'cas'), n0 = p.ord.reduce((a, b) => a + b, 0);
  let rel = 0, last = n0, low = 1e9, st = 0;
  c.run(SECS, () => { const n = p.ord.reduce((a, b) => a + b, 0); if (n < last) rel += last - n; last = n; if (!p.dead) { low = Math.min(low, p.y - c.hgt(p.x, p.z)); if (p.stall) st += 1 / 60; } });
  H.ok(!p.dead && rel > 0, id + ': released ' + rel + ' of ' + n0 + ' (' + p.def.ord.filter(Boolean).map(o => o.name).join(', ') + '), tanks destroyed ' + us.filter(u => u.dead).length + ' of 4, lowest ' + Math.round(low) + ' m, stalled ' + st.toFixed(1) + ' s, ' + (p.dead ? 'CRASHED' : 'flying'));
}
H.done();
