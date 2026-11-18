'use strict';
const { load } = require('./harness');
for (const era of ['ww2', 'modern']) {
  const t0 = Date.now(), C = load({ seed: 3 }), $ = C.$; C.newState(era); const S = $('S'), T = S.T, H = T.houses;
  const by = {}; let el = 0; for (const o of H) { by[o.B.t] = (by[o.B.t] || 0) + 1; el += o.B.n; }
  console.log(era, 'buildings', H.length, JSON.stringify(by), 'elements', T.bn, 'burgs', T.burgs.map(b => b.k[0] + ':' + H.filter(o => Math.hypot(o.x - b.x, o.z - b.z) < b.ru + 40).length).join(' '), 'nid', T.nid, 'objs', T.objs.length, 'ms', Date.now() - t0, 'men', S.men.length);
  C.run(5); console.log('  ran 5 s, men', S.men.length, 'inside', S.men.filter(m => m.cbo && m.cbin).length, 'up', S.men.filter(m => m.cbl > 0).length);
}
