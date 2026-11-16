'use strict';
/* world objects online, headless, through the real relay server on its own port: the host owns every object, a guest's rounds reach it as
   ohit, the room follows as obj, a late joiner is given the ruins and the next host keeps them. With SERVER=<a server that does not know
   the messages> the walls stand and nothing is damaged. */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + 5 }), $ = c.$, Net = $('Net'), send = Net.send;
  c.name = name; c.$ = $; c.Net = Net; c.sent = {}; c.on = true; c.errs = 0;
  Net.send = (t, o) => { const k = t === 'ai' ? 'ai' + o.k : t; c.sent[k] = (c.sent[k] || 0) + JSON.stringify(Object.assign({ t }, o)).length; send(t, o); };
  await new Promise((res, rej) => {
    Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(); };
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
  await N.sleep(40); return true;
}
const put = (c, x, z, h) => { const P = c.S.my; P.x = x; P.z = z; P.y = c.hgt(x, z); if (h !== undefined) { P.h = h; c.S.aim.h = h; c.S.aim.p = 0; } P.inv = 0; };
const st = (c, o) => c.S.os[o.id], stages = c => { const l = []; for (const o of c.S.T.objs) if (c.S.os[o.id]) l.push(o.id + ':' + c.S.os[o.id]); return l.join(' '); };

(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const host = await client('Host', 'tank', 'abrams'), g1 = await client('Azul', 'tank', 'leo2'), g2 = await client('Verm', 'tank', 't90');
  const knows = host.Net.wo, T = host.S.T, F = host.footD;
  console.log('   the server ' + (knows ? 'knows' : 'does not know') + ' the world-object messages');
  ok(T.objs.length === g1.S.T.objs.length && T.objs.every((o, i) => { const q = g2.S.T.objs[i]; return q.id === o.id && q.x === o.x && q.z === o.z; }), 'every client built the same ' + T.objs.length + ' objects under the same ids');
  /* a house with level ground along its own x axis, as in world.js */
  const site = T.houses.filter(o => { const ux = o.c, uz = -o.s; return [60, 120, -8, -30].every(d => Math.abs(host.hgt(o.x + ux * (o.hw + d) * Math.sign(d || 1) * Math.sign(d), o.z + uz * (o.hw + d)) - o.y) < 2.5) && !T.objs.some(q => q !== o && q.k !== 'tree' && [20, 50, 80, 110].some(d => F(q, o.x + ux * (o.hw + d), o.z + uz * (o.hw + d)) < 7) || F(q, o.x - ux * (o.hw + 8), o.z - uz * (o.hw + 8)) < 8); }).sort((a, b) => a.hp - b.hp)[0];
  const o = site, ux = o.c, uz = -o.s, face = Math.atan2(uz, -ux), at = d => ({ x: o.x + ux * d, z: o.z + uz * d });
  await run(1);
  const A = at(o.hw + 110), Bk = at(-o.hw - 8), far = at(o.hw + 400);
  put(g1, A.x, A.z, face); put(g2, Bk.x, Bk.z, face); put(host, far.x, far.z + 60, face);
  for (const c of all) c.S.my.hp = c.S.my.max;
  await run(1);

  console.log('-- a shell stopped by a house on the shooter\'s client hurts nobody behind it, on any client --');
  const aim = c => { const P = c.S.my, d = c.$('vnorm')({ x: o.x - P.x, y: o.y + 3 - (P.y + P.def.mh), z: o.z - P.z }); c.S.aim.h = Math.atan2(-d.z, d.x); c.S.aim.p = Math.asin(d.y) + .004; };
  const hp0 = g2.S.my.hp, n0 = g1.S.my.arms[0].n; let shots = 0, hitsSent = 0;
  for (const c of all) c.sent = {};
  await run(26, () => { aim(g1); g1.S.input.fire = true; shots = g1.S.my.arms[0].n - n0; return knows ? st(host, o) < 2 : shots < 6; });
  g1.S.input.fire = false; await run(1.5);
  const ghost = host.Net.ghosts.get(g2.id);
  console.log('   ' + shots + ' rounds of 120 mm from the guest at a house of ' + o.hp.toFixed(0) + ' hp with another player 8 m behind it: that player ' + hp0 + ' -> ' + g2.S.my.hp + ' hp; hit messages sent ' + (g1.sent.hit || 0) + ' B; stage on host / shooter / third: ' + [host, g1, g2].map(c => st(c, o)).join(' / '));
  ok(g2.S.my.hp === hp0 && !g2.S.my.dead && !(g1.sent.hit > 0) && ghost && ghost.hp === hp0, 'the player behind the house lost nothing on its own client or on anyone else\'s, and no hit was ever sent');
  if (knows) {
    ok(st(host, o) === 2 && st(g1, o) === 2 && st(g2, o) === 2, 'the house the guest shot down is a ruin on the host, on the shooter and on the third client');
    ok(shots === Math.ceil(o.hp / (62 * (.5 + .3 * .3))) || shots === Math.ceil(o.hp / (64 * (.5 + .3 * .3))), 'in the rounds the table gives (' + shots + ')');
    const secs = 27.5, b1 = Math.round((g1.sent.ohit || 0) / shots), bh = Math.round((host.sent.obj || 0));
    console.log('   bandwidth: the shooter sent ' + (g1.sent.ohit || 0) + ' B of ohit for ' + shots + ' rounds (' + b1 + ' B a round); the host sent ' + bh + ' B of obj for the two stage changes; beside that the shooter\'s own state is ' + Math.round((g1.sent.gstate || 0) / secs) + ' B/s');
    ok(b1 < 60 && bh < 80, 'a round on a wall costs a few tens of bytes, a stage change a few tens once');
    /* after the ruin, the next round goes over it and reaches the player behind */
    { const P = g1.S.my, s = at(o.hw + 20); g1.shell(P, P.arms[0].d, s.x, o.y + 3.4, s.z, -ux * 1500, 0, -uz * 1500); } await run(1);
    ok(g2.S.my.hp < hp0 || g2.S.my.dead, 'with the house down a round over the rubble reaches the player behind it (' + hp0 + ' -> ' + g2.S.my.hp.toFixed(0) + ')');

    console.log('-- a bomb\'s burst, a tank over trees, a crash: all through the same gate --');
    const tr = T.objs.filter(q => q.k === 'tree' && Math.abs(host.hgt(q.x - 30, q.z) - q.y) < 3 && q.y > T.WL + 6 && q.x > 300 && q.x < host.S.W - 300 && Math.abs(q.z) < host.S.HW - 300 && !T.objs.some(p => p !== q && Math.hypot(p.x - q.x, p.z - q.z) < 25))[0];
    put(g1, tr.x - 30, tr.z, 0); await run(.3); g1.S.input.up = true; await run(6); g1.S.input.up = false;
    ok(st(host, tr) === 2 && st(g1, tr) === 2 && st(g2, tr) === 2 && g1.S.my.x > tr.x, 'a tree the guest\'s tank drove down is down on all three');
    const nb = T.houses.filter(q => q !== o && st(host, q) === 0).sort((a, b) => Math.hypot(a.x - o.x, a.z - o.z) - Math.hypot(b.x - o.x, b.z - o.z))[0];
    g2.explode(nb.x + nb.c * (nb.hw + 2), nb.y + 2, nb.z - nb.s * (nb.hw + 2), 60, 400, g2.S.my, g2.S.my.team); await run(.6);
    ok(st(host, nb) === 2 && st(g1, nb) === 2 && st(g2, nb) === 2, 'a burst of the third client\'s own brings a house down for everyone');
    const before = stages(host);
    host.explode(-500, 0, -500, 10, 10, host.Net.ghosts.get(g1.id), 0); const nb2 = T.houses.filter(q => st(host, q) === 0)[0];
    host.explode(nb2.x, nb2.y + 2, nb2.z, 60, 900, host.Net.ghosts.get(g1.id), 0); g2.explode(nb2.x, nb2.y + 2, nb2.z, 60, 900, g2.Net.ghosts.get(g1.id), 0); await run(.5);
    ok(stages(host) === before && st(g2, nb2) === 0, 'a remote player\'s burst replayed on the host or on a guest damages nothing by itself: only its owner reports it');

    console.log('-- a late joiner is given the ruins, and the next host keeps them --');
    const want = stages(host), late = await client('Tarde', 'tank', 'abrams'); await run(1.5);
    console.log('   not intact on the host: ' + want.split(' ').length + ' objects; the late joiner has ' + (stages(late) ? stages(late).split(' ').length : 0) + ', with ' + late.S.parts.length + ' particles and ' + late.S.debris.length + ' pieces of debris from taking them in; the host sent ' + (host.sent.obj || 0) + ' B of obj in all');
    ok(stages(late) === want && stages(g1) === want && stages(g2) === want && late.S.debris.length === 0, 'the late joiner has the same ruins as everyone, taken in quietly');
    ok(!late.los({ x: A.x, z: A.z }, late.hgt(A.x, A.z) + 3, { x: at(-o.hw - 60).x, z: at(-o.hw - 60).z }, late.hgt(at(-o.hw - 60).x, at(-o.hw - 60).z) + 3) === false, 'and sees over the ruin it never saw fall');
    host.on = false; host.Net.close(); await N.sleep(150); await run(2);
    ok(g1.S.host && stages(g1) === want, 'the host leaves: the next one has every ruin');
    const nb3 = T.houses.filter(q => st(g1, q) === 0)[0]; late.explode(nb3.x, nb3.y + 2, nb3.z, 60, 900, late.S.my, late.S.my.team); await run(.6);
    ok(st(g1, nb3) === 2 && st(g2, nb3) === 2 && st(late, nb3) === 2, 'and goes on owning the objects: a house brought down after the change is down for all');
    const last = await client('Fim', 'tank', 'leo2'); await run(1.5);
    ok(stages(last) === stages(g1), 'someone who joins under the new host is given everything, old and new');
  } else {
    ok(st(host, o) === 0 && st(g1, o) === 0 && st(g2, o) === 0 && host.S.oh[o.id] === Math.fround(o.hp) && g1.S.oh[o.id] === Math.fround(o.hp), 'with a server that does not know the messages the house stands, undamaged, on every client');
    ok(!g1.sent.ohit && !host.sent.obj, 'and neither message is ever sent');
    const tr = T.objs.filter(q => q.k === 'tree' && Math.abs(host.hgt(q.x - 30, q.z) - q.y) < 3 && q.y > T.WL + 6 && q.x > 300 && q.x < host.S.W - 300 && Math.abs(q.z) < host.S.HW - 300)[0];
    put(g1, tr.x - 30, tr.z, 0); await run(.3); g1.S.input.up = true; await run(6); g1.S.input.up = false;
    ok(st(g1, tr) === 0 && g1.S.my.x > tr.x, 'a tank drives through a tree that cannot fall rather than be held by it');
  }
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
