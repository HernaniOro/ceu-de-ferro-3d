'use strict';
/* plane loadouts through the real relay server: what each client flies and what the others see of it, a kill by a free-fall bomb, the
   loadout through a switch of plane, a loss and a rearm, and the server's answer to loadouts it cannot accept. With SERVER=<a server that
   knows no loadouts> the page flies the default load whatever was chosen, and its releases still pass */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60, GR = 9.81;
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
    for (const c of all) if (c.on) { c.step(dt); c.Net.tick(dt); }
    if (each && each() === false) return false;
    if (i % 2 === 0) await new Promise(r => setImmediate(r));
  }
  await N.sleep(30); return true;
}
const names = p => p.def.ord.map((o, i) => (p.net ? '' : p.ord[i] + '× ') + o.name).join(', '), keyOf = (c, p) => c.LO.key(p.def.lo);
/* keeps a plane level and out of trouble while the test looks at something else */
const cruise = c => { const P = c.S.my; if (P && !P.dead && !P.kind) { P.inv = 1e9; c.steer(P, c.toward(P, P.x + P.f.x * 900, P.z + P.f.z * 900, c.hgt(P.x, P.z) + 900), 1); P.ctl.thr = .7; if (Math.abs(P.z) > 4000 || P.x < 2500 || P.x > c.S.W - 2500) { P.x = c.S.W / 2; P.z = 0; } } };

(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const R = H.load().$('RACKS'), bomb = R.a10.sets.Bombardeio, custom = [['fab500', 2], ['s8', 40], ['r73', 2]];
  const A = await client('Azul', 'plane', 'a10', { a10: bomb, f22: R.f22.sets.Bombardeio }), T = await client('Tanque', 'tank', 't90'), B = await client('Verm', 'plane', 'su25', { su25: custom });
  const lo = A.Net.lo, gh = (c, o) => c.Net.ghosts.get(o.id);
  await run(1.5, () => { cruise(A); cruise(B); });
  if (!lo) {
    console.log('-- a server that knows no loadouts --');
    ok(A.S.my.def.ord[0].key === 'agm65' && B.S.my.def.ord[0].key === 'kh25', 'whatever was chosen, each plane flies its default load: ' + names(A.S.my) + ' | ' + names(B.S.my));
    const g = gh(B, A), n = B.S.missiles.length; A.S.my.ocool[0] = 0; A.release(A.S.my, 0); await run(.3, () => { cruise(A); cruise(B); });
    ok(B.S.missiles.length > n && B.S.missiles[B.S.missiles.length - 1].o.name === 'AGM-65', 'and a release reaches the others as before, under slot 0');
    for (const c of all) c.Net.close(); N.stop(); return done();
  }
  console.log('-- what each one flies is what the others see --');
  ok(A.S.my.def.ord[0].key === 'mk82' && A.S.my.ord[0] === 12, 'the host takes off with the bombing loadout it chose: ' + names(A.S.my));
  ok(keyOf(B, B.S.my) === JSON.stringify(custom), 'the guest with a loadout of its own making: ' + names(B.S.my));
  ok(gh(A, B) && keyOf(A, gh(A, B)) === JSON.stringify(custom) && gh(T, B) && keyOf(T, gh(T, B)) === JSON.stringify(custom), 'the host and the other guest see the guest\'s plane with that loadout');
  ok(gh(B, A) && keyOf(B, gh(B, A)) === JSON.stringify(bomb) && A.Net.players.get(B.id).lo.length === 3, 'and the guest sees the host\'s bombs: ' + names(gh(B, A)));

  console.log('-- a free-fall bomb on a player\'s tank --');
  const P = A.S.my, t = T.S.my; T.S.my.inv = 0; P.inv = 1e9;
  P.x = t.x - 2500; P.z = t.z; P.y = t.y + 420; P.q = A.$('yawQ')(0); P.v = { x: 120, y: 0, z: 0 }; P.w = { x: 0, y: 0, z: 0 }; A.axes(P);
  let out = false, seen = null;
  await run(40, () => {
    cruise(B); t.inv = 0; if (!P.dead) { A.steer(P, A.toward(P, t.x, t.z, t.y + 420), 1); P.ctl.thr = .8; }
    const vh = Math.hypot(P.v.x, P.v.z), h = P.y - 1.5 - t.y, vy = P.v.y - 2, tf = (vy + Math.sqrt(vy * vy + 2 * GR * h)) / GR, d = Math.hypot(t.x - P.x, t.z - P.z);
    if (!out && d - vh * tf < vh / 120) { out = A.release(P, 0); P.ocool[0] = 0; A.release(P, 0); }
    const b = B.S.bombs.find(b => b.by === gh(B, A)); if (b) seen = b.o.name;
    return !(out && !A.S.bombs.length && t.dead);
  });
  await run(1, () => { cruise(A); cruise(B); });
  ok(out && t.dead && t.by === A.id, 'the T-90 of a player is destroyed by Mk 82s let go from a level run, and it knows who did it');
  ok(B.Net.players.get(A.id).kills === 1 && B.Net.players.get(T.id).deaths === 1, 'one kill for the plane and one death for the tank on every scoreboard');
  ok(seen === 'Mk 82', 'the other guest saw ' + seen + ' fall from the host\'s plane');
  ok(P.ord[0] === 10 && Math.round(P.def.m) === 15924 - 2 * 227, 'and the plane is two bombs lighter: ' + Math.round(P.def.m) + ' kg');

  console.log('-- another plane in mid-match, a loss, a rearm --');
  ok(A.swapTo('plane', 'f22') === '', 'the host abandons the A-10 for an F-22');
  await run(6, () => { cruise(A); cruise(B); });
  ok(A.S.my.id === 'f22' && A.S.my.def.ord[0].key === 'mk83' && gh(B, A) && gh(B, A).id === 'f22' && gh(B, A).def.ord[0].key === 'mk83', 'and takes off with the loadout kept for that plane, which the guest sees too: ' + names(A.S.my));
  const P2 = A.S.my; P2.inv = 0; A.lose(P2, 1e4, null); await run(40, () => { cruise(A); cruise(B); return A.S.my === P2; }); await run(1.5, () => { cruise(A); cruise(B); });
  ok(A.S.my !== P2 && !A.S.my.dead && A.S.my.def.ord[0].key === 'mk83' && A.S.my.ord[0] === 2 && gh(B, A).def.ord[0].key === 'mk83', 'shot down, the next F-22 has the same loadout, full, here and on the guest');
  const P3 = A.S.my, b = A.S.base[P3.team], g3 = gh(B, A); A.LO.mem.f22 = R.f22.sets['Padrão'];
  await run(4, () => { cruise(B); P3.inv = 1e9; P3.x = b.x; P3.z = b.z; P3.y = A.hgt(b.x, b.z) + 300; P3.v = { x: 150, y: 0, z: 0 }; });
  await run(.5, () => { cruise(A); cruise(B); });
  ok(P3.def.ord[0].key === 'gbu39' && gh(B, A) === g3 && !g3.dead && g3.def.ord[0].key === 'gbu39' && keyOf(B, g3) === JSON.stringify(R.f22.sets['Padrão']), 'another loadout taken over the airfield reaches the guest, on the same plane');
  const n0 = B.S.missiles.length; P3.ocool[1] = 0; A.release(P3, 1); await run(.3, () => { cruise(A); cruise(B); });
  ok(B.S.missiles.length === n0 + 1 && B.S.missiles[n0].o.name === 'AIM-120' && B.S.missiles[n0].by === g3, 'and what it then fires is what the guest sees leave it');

  console.log('-- the host\'s AI --');
  const ai = A.addPlane('a10', 0, A.S.W / 2, 1200, 600, 0, true, 'cas'); A.LO.refit(ai, R.a10.sets.Mista); ai.inv = 1e9;
  await run(1.2, () => { cruise(A); cruise(B); });
  const ag = B.Net.ai.get(ai.aid), was = ag && ag.def.ord.map(o => o.key).join(); let fell = null;
  ai.ocool[0] = 0; A.release(ai, 0); await run(.4, () => { cruise(A); cruise(B); const b = B.S.bombs.find(b => b.by === ag); if (b) fell = b.o.name; });
  ok(ag && fell === 'CBU-87', 'an AI plane of the host with a loadout the guest could not know (' + was + ' there) lets go a ' + fell + ' on the guest too');
  console.log('-- what the server refuses --');
  const raw = async (model, l) => { const c = await N.raw(); c.send({ t: 'join', room: 'modern', name: 'x', cls: 'plane', model, lo: l }); const w = await c.wait('welcome', 800); return { c, me: w && w.players.find(p => p.id === w.id) }; };
  const bad = { 'too many': [0, ['agm65', 9], 0], 'unknown store': [['nuke', 1], 0, 0], 'store of another plane': [['fab500', 2], 0, 0], 'wrong shape': [['agm65', 2]], 'not a list': 'mk82', 'over the weight': [['mk82', 6], ['agm65', 6], ['aim9', 2]] };
  const let_ = [];
  for (const k in bad) { const r = await raw('a10', bad[k]); if (!r.me || r.me.lo !== null) let_.push(k); r.c.close(); }
  ok(!let_.length, 'join with a loadout that is ' + Object.keys(bad).join(', ') + ': the player is in, with the plane\'s own load' + (let_.length ? ' (let through: ' + let_ + ')' : ''));
  const good = await raw('a10', bomb); ok(good.me && JSON.stringify(good.me.lo) === JSON.stringify(bomb), 'a valid one is kept as sent');
  good.c.send({ t: 'load', lo: [0, ['agm65', 9], 0] }); await N.sleep(150);
  ok(A.Net.players.get(good.me.id).lo === null, 'load with a loadout out of bounds puts the player back on the default, for everyone');
  good.c.send({ t: 'swap', cls: 'plane', model: 'f22', lo: bomb }); await N.sleep(150);
  ok(A.Net.players.get(good.me.id).model === 'f22' && A.Net.players.get(good.me.id).lo === null, 'swap with the loadout of another plane: the plane changes, the loadout is the default');
  good.c.close();
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
