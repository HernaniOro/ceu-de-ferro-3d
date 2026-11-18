'use strict';
/* plane loadouts: the tables and their copy in the server, what a loadout does to the plane, each store on its targets, the keys, the rearm, the AI */
const fs = require('fs'), path = require('path'), vm = require('vm'), H = require('./harness'), { ok, done } = H;
const SERVER = process.env.SERVER ? path.resolve(process.env.SERVER) : path.join(H.ROOT, 'server.js');
const c = H.load({ seed: +process.env.SEED || 11 }), $ = c.$, LO = $('LO'), ALLR = $('RACKS'), STORES = $('STORES'), PLANES = $('PLANES'), dt = 1 / 60;
/* the planes' racks; the helicopters' own, in the same table, are tests/arms.js's */
const RACKS = {}; for (const id in ALLR) if (PLANES[id]) RACKS[id] = ALLR[id];
const era = id => PLANES[id].era;
/* a plane of mine in an empty world, level at h m above the ground, flying +x */
function fly(id, lo, x, z, agl, V) {
  const S = c.sandbox(era(id)); S.over = false; S.demo = false; S.me = PLANES[id].side; S.fac = [0, 1];
  c.director = () => {}; c.plan = () => {};   // an empty world stays empty: nobody else's shells and bombs in the counts
  LO.mem = {}; if (lo) LO.mem[id] = lo;
  const p = c.addPlane(id, PLANES[id].side, x, c.hgt(x, z) + agl, z, 0, false);
  p.me = 1; S.my = p; S.cls = 'plane'; S.model = id; p.inv = 0;
  if (V) { p.v.x = V; p.V = V; }
  return p;
}
const flat = { x: 1, y: 0, z: 0 };
const hold = (p, dir, secs, each) => c.run(secs, () => { c.steer(p, dir, 1); p.ctl.thr = 1; return each ? each() : undefined; });
const tank = (S, kind, id, team, x, z) => { const u = c.addVehicle(kind, id, team, x, z, 0); u.ai = null; return u; };

console.log('-- tables --');
{
  const src = fs.readFileSync(SERVER, 'utf8'), has = /const LOADS = /.test(src);
  if (!has) console.log('   this server knows no loadouts: its copy of the tables is not checked');
  else {
    const sb = {}; vm.runInNewContext(src.slice(src.indexOf('const LOADS = '), src.indexOf('const NST')) + ';this.LOADS = LOADS; this.STW = STW;', sb);
    const mine = {}, stw = {};
    for (const id in ALLR) mine[id] = [ALLR[id].max].concat(ALLR[id].g.map(g => g[1]));
    for (const k in STORES) stw[k] = STORES[k].st ? [STORES[k].w, STORES[k].st] : STORES[k].w;
    ok(JSON.stringify(mine) === JSON.stringify(sb.LOADS), 'server.js LOADS is the page\'s RACKS, group by group');
    ok(JSON.stringify(stw) === JSON.stringify(sb.STW), 'server.js STW is the page\'s STORES, in the same order (' + Object.keys(stw).length + ' stores)');
  }
  let bad = [], n = 0, diff = [];
  for (const id in RACKS) {
    const R = RACKS[id], B = PLANES[id];
    for (const g of R.g) for (const k in g[1]) if (!STORES[k]) bad.push(id + ' lists unknown ' + k);
    for (const name in R.sets) { n++; const why = LO.bad(id, R.sets[name]); if (why) bad.push(id + ' ' + name + ': ' + why); }
    const o = LO.ord(LO.base(id)), b = B.ord.filter(Boolean);
    if (o.length !== b.length || o.some((s, i) => ['k', 'name', 'n', 'dmg', 'r'].some(f => s[f] !== b[i][f]))) diff.push(id);
  }
  ok(!bad.length, n + ' named loadouts on ' + Object.keys(RACKS).length + ' planes are all valid' + (bad.length ? ': ' + bad.join('; ') : ''));
  ok(!diff.length, 'the first set of every plane is its ord of before: same stores, counts, damage and radius' + (diff.length ? ' (not: ' + diff + ')' : ''));
  const id = 'a10', L = LO.base(id);
  const cases = { 'not a list': 'x', 'too short': L.slice(1), 'unknown store': [['nuke', 1], L[1], L[2]], 'store of another group': [['aim9', 2], L[1], L[2]], 'too many': [0, ['agm65', 7], 0], 'zero': [0, ['agm65', 0], 0],
    'fraction': [0, ['agm65', 1.5], 0], 'malformed pair': [0, ['agm65'], 0], 'null choice': [null, L[1], L[2]] };
  const pass = Object.keys(cases).filter(k => !LO.bad(id, cases[k]));
  ok(!pass.length && LO.bad('su25', [0, ['s8', 30], 0]) === 'count' && !LO.bad('su25', [0, ['s8', 40], 0]), 'the client refuses ' + Object.keys(cases).length + ' malformed loadouts and a count that is not a whole lot' + (pass.length ? ' (let through: ' + pass + ')' : ''));
  let heavy = null; for (const pid in RACKS) { const R = RACKS[pid], lo = R.g.map(g => { const k = Object.keys(g[1]).sort((a, b) => STORES[b].w * g[1][b] - STORES[a].w * g[1][a])[0]; return [k, g[1][k]]; }); if (LO.bad(pid, lo) === 'weight') heavy = pid; }
  ok(!!heavy, 'filling every group with its heaviest choice goes over the weight some plane lifts (' + heavy + '), and is refused');
}

console.log('-- the default load is the plane of before --');
for (const id in RACKS) {
  const p = fly(id, null, 4000, 0, 800), B = PLANES[id];
  ok(p.def.base === B && Math.abs(p.def.m - B.m) < 1e-6 && p.ord.join() === B.ord.filter(Boolean).map(o => o.n).join(), id + ': default load, mass ' + p.def.m + ' kg as listed');
}

console.log('-- weight: acceleration, climb and turn --');
for (const id of Object.keys(RACKS)) {
  const R = RACKS[id], name = Object.keys(R.sets).sort((a, b) => LO.wt(R.sets[b]) - LO.wt(R.sets[a]))[0], rows = [];
  if (LO.wt(R.sets[name]) < LO.wt(LO.base(id)) + 300) continue;
  for (const [lab, lo, empty] of [['Padrão', LO.base(id)], [name, R.sets[name]], [name + ' sem carga', R.sets[name], 1]]) {
    const V0 = PLANES[id].vmax * .55, m = {};
    let p = fly(id, lo, 3000, 0, 1500, V0); if (empty) p.ord = p.ord.map(() => 0);
    m.kg = Math.round(p.def.m);
    hold(p, flat, 10); m.acc = +(p.V - V0).toFixed(1);
    p = fly(id, lo, 3000, 0, 1500, V0); if (empty) p.ord = p.ord.map(() => 0);
    const y0 = p.y; hold(p, c.vnorm({ x: 1, y: .25, z: 0 }), 20); m.climb = Math.round(p.y - y0);
    p = fly(id, lo, 6000, 0, 2500, PLANES[id].vmax * .6); if (empty) p.ord = p.ord.map(() => 0);
    let turned = 0, h0 = Math.atan2(-p.f.z, p.f.x);
    c.run(12, () => { p.ctl.roll = $('clamp')((1.2 - Math.atan2(-p.r.y, p.u.y)) * 2, -1, 1); p.ctl.pitch = .45; p.ctl.yaw = 0; p.ctl.thr = 1; const h = Math.atan2(-p.f.z, p.f.x); let d = h - h0; d -= Math.PI * 2 * Math.round(d / (Math.PI * 2)); turned += Math.abs(d); h0 = h; });
    m.turn = +(turned * 57.3 / 12).toFixed(1);
    rows.push([lab, m]);
  }
  const [a, b, e] = rows.map(r => r[1]);
  console.log('   ' + id + ': ' + rows.map(r => r[0] + ' ' + r[1].kg + ' kg: +' + r[1].acc + ' m/s em 10 s, +' + r[1].climb + ' m em 20 s, ' + r[1].turn + ' °/s').join(' | '));
  ok(b.kg > a.kg && b.acc < a.acc && b.climb < a.climb && b.turn <= a.turn + .05, id + ' with ' + name + ' (' + (b.kg - a.kg) + ' kg more) accelerates, climbs and turns worse than with the default load');
  ok(e.kg < b.kg && e.acc > b.acc && e.climb > b.climb && e.turn >= b.turn - .05, id + ' recovers when the stores are gone (' + e.kg + ' kg)');
}
module.exports = { c, $, LO, RACKS, STORES, PLANES, fly, hold, tank, flat, dt };
if (require.main === module && fs.existsSync(path.join(__dirname, 'loadout-stores.js'))) require('./loadout-stores.js'); else if (require.main === module) done();
