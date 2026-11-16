'use strict';
/* AI-only battles, the same seed on two pages (BASE=<the page before transport>, default the published one; PAGE the one under test):
   who killed what, how many soldiers get into the fight and how soon, and what the LAVs did. SECS a battle, default 600 */
const H = require('./harness'), path = require('path'), SECS = +process.env.SECS || 600, BASE = process.env.BASE ? path.resolve(process.env.BASE) : path.join(H.ROOT, 'Céu de Ferro 3D.html');
const kind = o => (o.man ? (o.def.snp ? 'sniper' : 'inf') : o.kind ? o.kind : o.role === 'cas' ? 'cas' : 'fighter');
function battle(page, era) {
  const C = H.load({ page, seed: 99 + era.length }), S = C.newState(era), K = {}, tally = (by, o) => { const k = (by ? kind(by) : '-') + ' > ' + kind(o); K[k] = (K[k] || 0) + 1; };
  C.ruin = (R => (u, dmg, by) => { const was = u.dead; R(u, dmg, by); if (!was && u.dead) tally(by, u); })(C.ruin);
  C.lose = (L => (p, dmg, by) => { const was = p.dead; L(p, dmg, by); if (!was && p.dead) tally(by, p); })(C.lose);
  C.killMan = (M => (m, by) => { if (!m.dead) tally(by, m); M(m, by); })(C.killMan);
  const inF = new Set(), rode = new Set(); let t = 0, acc = 0, n = 0, t10 = null, err = null, sum = 0, lavMax = 0, runs = 0;
  try {
    C.run(SECS, () => {
      if ((acc += 1 / 30) < 1) return; acc = 0; t++;
      const live = S.men.filter(m => !m.dead); let now = 0;
      for (const m of live) if (live.some(o => o.team !== m.team && Math.abs(o.x - m.x) < 400 && Math.hypot(o.x - m.x, o.z - m.z) < 400) || S.units.some(o => !o.dead && o.team !== m.team && Math.hypot(o.x - m.x, o.z - m.z) < 400)) { now++; inF.add(m); }
      sum += now; n++; if (t10 === null && inF.size >= 10) t10 = t;
      lavMax = Math.max(lavMax, S.units.filter(u => u.kind === 'lav').length); runs = Math.max(runs, S.units.filter(u => u.run).length);
      const bad = H.nan(S); if (bad) throw new Error('NaN in ' + bad);
    }, 1 / 30);
  } catch (e) { err = e.message; }
  const tot = Object.values(K).reduce((a, b) => a + b, 0), by = k => Object.entries(K).filter(([p]) => p.startsWith(k + ' >')).reduce((a, [, v]) => a + v, 0), of = k => Object.entries(K).filter(([p]) => p.endsWith('> ' + k)).reduce((a, [, v]) => a + v, 0);
  return { K, tot, err, inF: inF.size, avg: sum / (n || 1), t10, lavMax, runs, by, of };
}
for (const era of ['ww2', 'modern']) {
  const a = battle(BASE, era), b = battle(H.PAGE, era), row = r => Object.entries(r.K).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + ' ' + v).join(', ');
  console.log(era + ', ' + SECS + ' s, AI only');
  for (const [nm, r] of [['before', a], ['after ', b]])
    console.log('  ' + nm + ': kills ' + r.tot + '; soldiers who got within 400 m of an enemy ' + r.inF + ', the first 10 by ' + (r.t10 === null ? 'never' : r.t10 + ' s') + ', on average ' + r.avg.toFixed(1) + ' in contact at a time; infantry made ' + (r.by('inf') + r.by('sniper')) + ' kills and took ' + (r.of('inf') + r.of('sniper')) + ' deaths' + (r.lavMax ? '; LAVs up to ' + r.lavMax + ' on the map, ' + r.by('lav') + ' kills (' + (100 * r.by('lav') / (r.tot || 1)).toFixed(0) + '%), ' + r.of('lav') + ' lost' : '') + (r.runs ? '; errands at once ' + r.runs : '') + (r.by('sniper') ? '; snipers ' + r.by('sniper') + ' kills' : '') + '\n    ' + row(r));
  H.ok(!a.err && !b.err, era + ': both battles ran to the end' + (a.err || b.err ? ' ' + (a.err || b.err) : ''));
}
H.done();
