'use strict';
/* AI pilots on the flight model: an AI-only battle per era, and what became of every plane, by type.
     node tests/flight-ai.js      PAGE=<copy>  SECS=240  SEEDS=3  OUT=<file.json>
   flown: planes that took part; shot: brought down by fire; hurt: flew into the ground hit or crippled; clean: flew into the ground
   untouched (the pilot's own fault, the number to watch); stall: share of the flying time spent stalled; spin: seconds in a spin;
   rel: bombs, rockets and missiles let go; gk: ground targets destroyed by that type; ak: aircraft */
const fs = require('fs'), H = require('./harness');
const SECS = +process.env.SECS || 240, SEEDS = +process.env.SEEDS || 3, DT = 1 / 60, out = {};
const row = id => out[id] || (out[id] = { flown: 0, shot: 0, hurt: 0, clean: 0, st: 0, t: 0, spin: 0, rel: 0, gk: 0, ak: 0 });
for (const era of ['ww2', 'modern']) for (let sd = 1; sd <= SEEDS; sd++) {
  const C = H.load({ seed: 40 + sd * 7 + era.length }), S = C.newState(era), seen = new Map(), deadU = new Set(); let err = null;
  try {
    C.run(SECS, () => {
      for (const p of S.planes) {
        if (p.heli || !p.q) continue;
        let m = seen.get(p); if (!m) { seen.set(p, (m = { end: 0 })); row(p.id).flown++; }
        if (m.end) continue;
        if (p.dead) { m.end = 1; const R = row(p.id); if (!p.gone || m.wasDead) R.shot++; else if (m.hurt) R.hurt++; else { R.clean++; if (process.env.WHY) console.log('  clean crash', p.id, p.role, 't', S.t.toFixed(0), 'V', (p.V * 3.6).toFixed(0), 'vy', p.v.y.toFixed(0), 'aoa', (p.aoa / p.def.as).toFixed(2), 'stall', p.stall, 'spn', p.spn, 'pitch', p.ctl.pitch.toFixed(2), 'tgt', p.tgt ? (p.tgt.kind || 'plane') : '-', 'egress', p.egress > 0, 'brk', S.t < p.brk); } continue; }
        const R = row(p.id); R.t += DT; if (p.stall) R.st += DT; if (p.spn > .5) R.spin += DT;
        const left = p.ord.reduce((a, b) => a + b, 0); if (left < m.ord) R.rel += m.ord - left; m.ord = left;
        m.hurt = p.hp < p.def.hp || p.mod.hurt || S.t - p.hitT < 12; m.wasDead = p.dead;
      }
      for (const u of S.units) if (u.dead && !deadU.has(u)) { deadU.add(u); const b = u.lastBy; if (b && b.q && !b.heli && b.id) row(b.id).gk++; }
      for (const [p, m] of seen) if (m.end === 1) { m.end = 2; const b = p.lastBy; if (b && b !== p && b.q && !b.heli && b.id && out[b.id]) out[b.id].ak++; }
      const n = H.nan(S); if (n) { err = 'NaN in ' + n; return false; }
    });
  } catch (e) { err = e.stack.split('\n').slice(0, 3).join(' | '); }
  H.ok(!err, era + ' seed ' + sd + ': ' + SECS + ' s of AI battle' + (err ? '  ' + err : ''));
}
for (const id in out) { const o = out[id]; o.stall = Math.round(1000 * o.st / (o.t || 1)) / 10; o.spin = Math.round(o.spin * 10) / 10; o.mins = Math.round(o.t / 6) / 10; delete o.st; delete o.t;
  console.log(id.padEnd(6), 'flown', o.flown, 'shot', o.shot, 'hurt-crash', o.hurt, 'clean-crash', o.clean, 'stall%', o.stall, 'spin s', o.spin, 'stores released', o.rel, 'ground kills', o.gk, 'air kills', o.ak, 'minutes flown', o.mins); }
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
H.done();
