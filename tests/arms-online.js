'use strict';
/* helicopter loadouts through the real relay server: what a guest flies and the host sees of it, a release of a store by its name, a
   guided bomb as a missile on the other side, a loadout the server refuses. With SERVER=<a server that knows no helicopter loadouts> the
   helicopter flies its first set whatever was chosen, and its releases still pass under slot 0 and 1 */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model, mem) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + 5 }), $ = c.$, Net = $('Net');
  c.name = name; c.$ = $; c.Net = Net; c.LO = $('LO'); c.on = true; Object.assign(c.LO.mem, mem);
  await new Promise((res, rej) => {
    Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: false, host: Net.host === Net.id }); res(); };
    Net.ui.refused = code => rej(new Error(name + ' refused: ' + code)); Net.connect('modern', name, cls, model);
  });
  Object.defineProperty(c, 'S', { get: () => $('S') }); c.id = Net.id; c.director = () => {}; all.push(c); return c;
}
async function run(secs, each) {
  for (let i = 0, n = Math.round(secs / dt); i < n; i++) {
    for (const c of all) if (c.on) { if (c.S.cd) c.S.cd = {}; c.step(dt); c.Net.tick(dt); }
    if (each && each() === false) return false;
    if (i % 2 === 0) await new Promise(r => setImmediate(r));
  }
  await N.sleep(30); return true;
}
const names = p => p.def.ord.map(o => o.name).join(', '), keyOf = (c, p) => c.LO.key(p.def.lo), gh = (c, o) => c.Net.ghosts.get(o.id);
const cruise = c => { const P = c.S.my; if (P && !P.dead && !P.kind && !P.heli) { P.inv = 1e9; c.steer(P, c.toward(P, P.x + P.f.x * 900, P.z + P.f.z * 900, c.hgt(P.x, P.z) + 900), 1); P.ctl.thr = .7; } };

(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const R = H.load().$('RACKS');
  const A = await client('Azul', 'plane', 'a10', { a10: R.a10.sets['Ataque ao solo'] }), G = await client('Heli', 'heli', 'ah64', { ah64: R.ah64.sets.Escolta }), M = await client('Mil', 'heli', 'mi8', { mi8: [['s8', 40], ['s8', 40], ['s8', 20]] });
  await run(1.5, () => cruise(A));
  const P = G.S.my, g = gh(A, G);
  if (!G.Net.hlo) {
    console.log('-- a server that knows no helicopter loadouts --');
    ok(keyOf(G, P) === G.LO.key(R.ah64.sets['Padrão']) && g && keyOf(A, g) === keyOf(G, P), 'whatever was chosen, the helicopter flies its first set here and on the host: ' + names(P));
    const n = A.S.bombs.length; P.ocool[0] = 0; G.release(P, 0); await run(.3, () => cruise(A));
    ok(A.S.bombs.length > n, 'and a release reaches the others as before, under slot 0');
    for (const c of all) c.Net.close(); N.stop(); return done();
  }
  console.log('-- what each flies and the others see --');
  ok(keyOf(G, P) === G.LO.key(R.ah64.sets.Escolta) && g && g.heli && keyOf(A, g) === keyOf(G, P), 'the guest\'s Apache flies Escolta, and the host\'s copy of it carries the same: ' + (g ? names(g) : 'no ghost'));
  const m = M.S.my, gm = gh(A, M);
  ok(keyOf(M, m) === M.LO.key(R.mi8.sets['Padrão']) || (gm && keyOf(A, gm) === A.LO.key(R.mi8.sets['Padrão'])), 'a kept loadout that is not valid (a store in the wrong group) is the first set, here and for the others: ' + (gm ? names(gm) : 'no ghost'));
  console.log('-- releases --');
  P.y += 150; P.land = false; P.ct = P.ctl.col = .6; P.inv = 1e9;
  const i = P.def.ord.findIndex(o => o.k === 'agm'), n0 = A.S.missiles.length; P.ocool[i] = 0; G.release(P, i);
  await run(.4, () => cruise(A));
  const am = A.S.missiles.slice(n0).find(x => x.by === g);
  ok(am && am.o.name === 'AGM-114L Longbow', 'the Longbow let go by the guest flies on the host too, named by its store (' + (am ? am.o.name : 'none') + ')');
  const pa = A.S.my, ib = pa.def.ord.findIndex(o => o.gd), ga = gh(G, A), n1 = G.S.missiles.length; pa.ocool[ib] = 0; A.release(pa, ib);
  await run(.4, () => cruise(A));
  const bm = G.S.missiles.slice(n1).find(x => x.by === ga);
  ok(bm && bm.bomb && bm.o.name === 'GBU-12' && !G.S.bombs.some(b => b.by === ga), 'the host\'s GBU-12 is a guided bomb of the missile model on the guest\'s side as well');
  console.log('-- another loadout at the pad --');
  P.y = G.hgt(P.x, P.z) + P.def.gh; P.v = { x: 0, y: 0, z: 0 }; P.land = true; G.LO.mem.ah64 = R.ah64.sets.Anticarro;
  await run(4.5, () => cruise(A));
  ok(keyOf(G, P) === G.LO.key(R.ah64.sets.Anticarro) && keyOf(A, gh(A, G)) === keyOf(G, P), 'landed by its base it takes the loadout chosen meanwhile, and the host hears of it: ' + names(gh(A, G)));
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
