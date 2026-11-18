'use strict';
/* buildings online, headless, through the real relay server: the host owns every element, a guest's hits and bursts reach it as bhit, the
   room follows as bld (states, what fell included), a late joiner is given every damaged building, the next host keeps them. Prints the
   bytes of levelling a large building and of a late join into a wrecked town. With SERVER=<a server that does not know the messages>
   buildings are entered but never damaged. */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + 5 }), $ = c.$, Net = $('Net'), send = Net.send;
  c.name = name; c.$ = $; c.Net = Net; c.sent = {}; c.on = true;
  Net.send = (t, o) => { c.sent[t] = (c.sent[t] || 0) + JSON.stringify(Object.assign({ t }, o)).length; send(t, o); };
  await new Promise((res, rej) => {
    Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(); };
    Net.ui.refused = code => rej(new Error(name + ' refused: ' + code)); Net.connect('modern', name, cls, model);
  });
  Object.defineProperty(c, 'S', { get: () => $('S') }); c.id = Net.id; c.director = () => {}; all.push(c); return c;
}
async function run(secs) {
  for (let i = 0, n = Math.round(secs / dt); i < n; i++) { for (const c of all) if (c.on) { c.step(dt); c.Net.tick(dt); } if (i % 2 === 0) await new Promise(r => setImmediate(r)); }
  await N.sleep(40);
}
const same = (a, b, o) => { const B = o.B; for (let e = 0; e < B.n; e++) if (a.S.cbs[B.off + e] !== b.S.cbs[B.off + e]) return false; return a.S.os[o.id] === b.S.os[o.id]; };
const bad = c => c.S.T.houses.filter(o => c.S.os[o.id]).length, sig = c => { let h = 0; const b = c.S.cbs; for (let i = 0; i < b.length; i++) if (b[i]) h = (h * 31 + i * 4 + b[i]) >>> 0; return h + ':' + c.S.T.houses.filter(o => c.S.os[o.id] > 1).length; };

(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const host = await client('Host', 'tank', 'abrams'), g1 = await client('Azul', 'inf', 'blueRifle'), g2 = await client('Verm', 'tank', 't90');
  const knows = host.Net.yd, T = host.S.T, Hs = T.houses, W = host.$('bWorld'), CITY = host.$('CITY'), tw = T.towns[0];
  console.log('   the server ' + (knows ? 'knows' : 'does not know') + ' the building messages');
  ok(Hs.length === g1.S.T.houses.length && Hs.every((o, i) => { const q = g2.S.T.houses[i]; return q.id === o.id && q.x === o.x && q.B.n === o.B.n; }), 'every client planned the same ' + Hs.length + ' buildings');
  await run(1);
  const near = Hs.filter(o => Math.hypot(o.x - tw.x, o.z - tw.z) < 330), big = near.filter(o => o.B.t === 'apart').sort((a, b) => b.B.n - a.B.n)[0], o = near.find(o => o.B.t === 'block' && o.B.nl >= 3), B = o.B;
  const wz = (B, L, j, i) => B.oZ + (L * (B.nz + 1) + j) * B.nx + i, mine = c => c.S.my, e0 = wz(B, 1, 0, 1), on = (c, q) => c.S.T.houses[Hs.indexOf(q)];
  g1.bDmg(on(g1, o), e0, 21, mine(g1)); await run(.5);
  if (knows) {
    ok(host.S.cbs[B.off + e0] === 2 && g1.S.cbs[B.off + e0] === 2 && g2.S.cbs[B.off + e0] === 2 && g1.sent.bhit > 0, 'a guest\'s shell on a wall: holed on the host and on both guests (' + g1.sent.bhit + ' B of bhit, ' + host.sent.bld + ' B of bld)');
    g2.bDmg(on(g2, o), wz(B, 0, 0, 0), 30, host.Net.ghosts.get(g1.id) ? g2.Net.ghosts.get(g1.id) : null); await run(.4);
    ok(host.S.cbs[B.off + wz(B, 0, 0, 0)] === 0, 'a remote player\'s hit replayed on another guest damages nothing: only its owner reports it');
    const p = W(o, 2, 2, -2, {}); g2.explode(p.x, p.y, p.z, 40, 260, mine(g2), mine(g2).team); await run(CITY.sup.T + 4);
    ok(host.S.os[o.id] >= 1 && same(host, g1, o) && same(host, g2, o) && host.S.cblog.length > 20, 'a guest\'s burst at its corner: what the host took down and what fell afterwards is the same on all three (' + host.S.cblog.length + ' changes)');
    /* levelling a large building, charge by charge at its ground storey, from the host */
    const b0 = host.sent.bld || 0, n0 = host.S.cblog.length, G = big.B; let shots = 0;
    for (let k = 0; k < 400 && host.S.os[big.id] < 2; k++) { const q = W(big, (k * 7.3) % (G.nx * G.bw), 2 + (k % 3) * G.sh, (k % 2) * G.nz * G.bd, {}); host.explode(q.x, q.y, q.z, 38, 130, null, -1, true, 1); shots++; await run(.7); }
    await run(3);
    console.log('   an apartment block of ' + G.nx + 'x' + G.nz + ' bays and ' + G.nl + ' storeys (' + G.n + ' elements) levelled by ' + shots + ' howitzer bursts: ' + ((host.sent.bld || 0) - b0) + ' B of bld from the host, ' + (host.S.cblog.length - n0) + ' changes');
    ok(host.S.os[big.id] === 2 && g1.S.os[big.id] === 2 && g2.S.os[big.id] === 2 && sig(host) === sig(g1) && sig(host) === sig(g2), 'the large building is down on all three, and every other state agrees');
    /* a town wrecked by bursts, then someone joins */
    const rnd = H.rng(8); for (let k = 0; k < 140; k++) { const q = near[(rnd() * near.length) | 0]; host.explode(q.x + (rnd() - .5) * 14, q.y + 1 + rnd() * q.h * .6, q.z + (rnd() - .5) * 14, 50, 240, null, -1, true, 1); if (k % 10 === 9) await run(.5); }
    await run(CITY.sup.T + 6);
    const b1 = host.sent.bld, late = await client('Tarde', 'tank', 'abrams'); await run(2);
    console.log('   ' + bad(host) + ' of ' + near.length + ' buildings of the town damaged, ' + Hs.filter(q => host.S.os[q.id] > 1).length + ' of them down: the late joiner was sent ' + (host.sent.bld - b1) + ' B of bld; it has ' + late.S.parts.length + ' particles from taking them in');
    if (sig(late) !== sig(host)) { const d = Hs.filter(q => !same(host, late, q)); console.log('   differ: ' + d.length + ' buildings, first ' + d.slice(0, 3).map(q => q.B.t + ' os ' + host.S.os[q.id] + '/' + late.S.os[q.id] + ' ' + Array.from({ length: q.B.n }, (_, e) => host.S.cbs[q.B.off + e] + '' + late.S.cbs[q.B.off + e]).filter(v => v[0] !== v[1]).slice(0, 8).join(',')).join(' | ')); }
    ok(sig(late) === sig(host) && sig(g1) === sig(host) && bad(late) === bad(host) && late.S.debris.length === 0, 'the late joiner has every building as the host has it, taken in quietly');
    host.on = false; host.Net.close(); await N.sleep(150); await run(2);
    const nh = [g1, g2, late].find(c => c.S.host), others = [g1, g2, late].filter(c => c !== nh), want = sig(nh), q = near.find(q => !nh.S.os[q.id] && q.B.t === 'block') || near.find(q => !nh.S.os[q.id]), c2 = others[0];
    ok(!!nh && want === sig(others[0]) && want === sig(others[1]), 'the host leaves: the next one has every building as it was');
    const pp = W(q, 2, 2, -2, {}); c2.explode(pp.x, pp.y, pp.z, 40, 260, mine(c2), mine(c2).team); await run(CITY.sup.T + 4);
    ok(nh.S.os[q.id] >= 1 && sig(nh) !== want && sig(nh) === sig(others[0]) && sig(nh) === sig(others[1]), 'and goes on owning them: a burst after the change is applied and settles the same for all');
    /* a soldier upstairs, as the others see it */
    const s = g1.on ? g1 : null;
  } else {
    ok(host.S.cbs[B.off + e0] === 0 && g1.S.cbs[B.off + e0] === 0 && !g1.sent.bhit && !host.sent.bld, 'with a server that does not know the messages the wall stands on every client, and neither message is sent');
    const p = W(o, 2, 2, -2, {}); host.explode(p.x, p.y, p.z, 40, 260, null, -1, true, 1); await run(4);
    ok(bad(host) === 0 && bad(g1) === 0, 'not even the host\'s own bursts damage a building');
    const P = mine(g1), d = W(o, (B.nx >> 1) * B.bw + B.bw / 2, 0, B.bd / 2, {}); P.x = d.x; P.z = d.z; await run(.5);
    ok(P.cbo && P.cbin, 'a soldier still walks in');
  }
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
