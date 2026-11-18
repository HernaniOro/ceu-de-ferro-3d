'use strict';
/* playing the general online, headless, through the real relay server (PAGE=<page>, SERVER=<server>, PORT_T=<port>): the host (tank, side 0), two
   infantry guests of side 0 (g1 takes the chair, p2 is a pilot) and one of side 1 (g2). The chair reaches the host, the four chips and orders
   cross the relay as commands and come back answered, the general's mark shows on his own pilots' cue and never on the other side's, two
   orders sent at once arrive in order with no rate refusal; a second room whose host is the old one (it answers a tactical order off) says off.
   The page's own DOM part (the view, the mouse, the keys) is looked at in a browser. About 60 s */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model, keep, era) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + 5, eco: true }), $ = c.$, Net = $('Net');
  c.name = name; c.$ = $; c.Net = Net; c.on = true;
  await new Promise((res, rej) => {
    Net.ui.welcome = () => { c.newState(era || 'modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(); };
    Net.ui.refused = code => rej(new Error(name + ' refused: ' + code)); Net.connect(era || 'modern', name, cls, model);
  });
  Object.defineProperty(c, 'S', { get: () => $('S') }); c.id = Net.id; if (!keep) { c.director = () => {}; c.plan = () => {}; } all.push(c); return c;
}
async function run(secs, each) {
  for (let i = 0, n = Math.round(secs / dt); i < n; i++) {
    for (const c of all) if (c.on) { if (c.S.cd) c.S.cd = {}; c.step(dt); c.Net.tick(dt); }
    if (each && each() === false) return false;
    if (i % 2 === 0) await new Promise(r => setImmediate(r));
  }
  await N.sleep(40); return true;
}
/* the relay measures the gap between two orders on the wall clock (250 ms) and the page's queue on the game clock (260 ms): these two agree only while the game runs at its own pace */
async function real(secs) { for (let i = 0, n = Math.round(secs / dt); i < n; i++) { for (const c of all) if (c.on) { if (c.S.cd) c.S.cd = {}; c.step(dt); c.Net.tick(dt); } await N.sleep(1000 * dt); } }
/* a command from a client, run until its answer comes (or wait s pass), then the relay's gap */
async function send(c, cmd, wait) {
  let r = null; c.genDo(cmd, x => { r = x; });
  for (let i = 0; i < (wait || 3) * 10 && !r; i++) await run(.1);
  await N.sleep(300);
  return r || { ok: false, why: 'none' };
}
const hasMark = cue => Array.isArray(cue) && (() => { for (let i = 1; i + 2 < cue.length; i += 3) if (cue[i + 2] === 6) return true; return false; })();
(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const host = await client('Host', 'tank', 'abrams', true), g1 = await client('Azul', 'inf', 'blueRifle'), p2 = await client('Piloto', 'inf', 'blueRifle'), g2 = await client('Verm', 'inf', 'redRifle');
  ok(g1.Net.gen && g1.Net.gc2 && host.Net.gc2, 'the server takes the general\'s commands (welcome gen: 1, gc: 2)');
  await run(5);

  console.log('-- the chair and the chips --');
  g1.genClaim(1); await run(1.5);
  const G = host.S.gctl;
  ok(!!G && G[0].seat === 'me' && g1.Net.gn[0] === g1.id && G[1].seat === 'ai', 'the claim reaches the host: seat me for side 0, side 1 stays the AI');
  ok(G[0].atk === 'me' && G[0].eco === 'ai' && G[0].def === 'ai' && G[0].sup === 'ai', 'the default assist: the AI keeps the economy, the defence and the support; the attack is his');
  let r = await send(g1, { c: 'ctl', k2: 'atk', k: 'ai' });
  ok(r.ok && host.S.gctl[0].atk === 'ai', 'ctl atk ai: the AI also decides the attacks again (' + r.why + ')');
  r = await send(g1, { c: 'ctl', k2: 'atk', k: 'me' });
  ok(r.ok && host.S.gctl[0].atk === 'me', 'ctl atk me: the attack is his again (' + r.why + ')');
  r = await send(g2, { c: 'move', x: 1000, z: 0, ids: [1] });
  ok(!r.ok && r.why === 'ctl', 'the other side\'s guest is told ctl, not served (' + r.why + ')');
  r = await send(p2, { c: 'move', x: 1000, z: 0, ids: [1] });
  ok(!r.ok && r.why === 'ctl', 'a pilot of the same side without the chair is told ctl too (' + r.why + ')');

  console.log('-- an assault, and a squad moved --');
  const S = host.S, C = S.cmd[0], own = () => S.squads.filter(q => q.team === 0 && q.live >= 3 && !q.net && !q.state && !q.op);
  for (const op of C.ops.filter(o => o.k === 'atk' && !o.over)) host.opEnd(C, op);
  let made = null, why = [], pi0 = -1;
  for (const p of host.cqTargets(0).slice(0, 4)) {
    const pi = S.cq.p.indexOf(p), ids = own().filter(q => q.ri === p.ri).slice(0, 3).map(q => q.id);
    r = await send(g1, { c: 'atk', pi, H: 60, ids }); why.push(r.why);
    if (r.ok) { made = C.ops.find(o => o.id === r.id); pi0 = pi; break; }
  }
  ok(!!made && made.k === 'atk' && made.by === 'me' && !made.over, 'atk on a conquest point: the guest\'s answer is ok and the host holds a live assault op ordered by me' + (made ? '' : ' (refused: ' + why + ')'));
  let seen = false; await run(3.5, () => { if (made && g1.genVM(0, false).ops.some(o => o.k === 'atk' && o.id === made.id)) { seen = true; return false; } });
  ok(seen, 'g1\'s view of the operations lists it (gen every 2 s)');
  const q = own()[0], L = q && q.men.find(m => !m.dead);
  r = L ? await send(g1, { c: 'move', x: L.x + 40, z: L.z, ids: [q.id] }) : { ok: false, why: 'no squad' };
  ok(r.ok && q.op && q.op.k === 'usr' && q.op.o === 'move', 'move: the host\'s squad is in a manual (usr) operation' + (r.ok ? '' : ' (' + r.why + ')'));
  r = await send(g1, { c: 'free', ids: [q.id] });
  ok(r.ok && !q.op, 'free gives the squad back to the AI');

  console.log('-- the mark, for the pilots of one side --');
  let leak = false, p2cue = false;
  r = await send(g1, { c: 'mark', x: L.x + 300, z: L.z });
  ok(r.ok, 'mark is accepted (' + r.why + ')');
  await run(4, () => { if (hasMark(g2.S.cue && g2.S.cue[0]) || hasMark(g2.S.cue && g2.S.cue[1])) leak = true; if (hasMark(p2.S.cue && p2.S.cue[0])) p2cue = true; });
  ok(p2cue, 'a pilot of the side sees the mark (a kind 6 entry in its cue)');
  ok(!leak, 'the other side never sees it');

  console.log('-- two orders at once --');
  const got = [], t0 = Date.now();
  g1.genDo({ c: 'doc', k: 'aggressive' }, x => got.push(['a', x.why, Date.now() - t0])); g1.genDo({ c: 'doc', k: 'cautious' }, x => got.push(['b', x.why, Date.now() - t0]));
  await real(1.5);
  ok(got.length === 2 && got[0][0] === 'a' && got[1][0] === 'b' && got.every(x => x[1] === ''), 'both answered ok and in the order sent, none refused as rate (' + JSON.stringify(got) + ')');
  ok(C.dk === 'cautious', 'the second order was the last one applied: the host\'s doctrine is cautious');

  console.log('-- a room whose host is the old one --');
  for (const c of all) c.on = false;
  const h2 = await client('Host2', 'tank', 'tiger', true, 'ww2'), g3 = await client('General', 'inf', 'schutze', false, 'ww2');
  const Net2 = h2.Net;
  Net2.rx.gcmd = m => { if (!h2.S || !h2.S.net || !h2.S.host) return; Net2.send('gres', { to: m.from, n: m.n, ok: m.d === 'eco', why: m.d === 'eco' ? '' : 'off', id: 0 }); };   // the net plan's host: only the economy's orders
  g3.genClaim(1); await run(1.5);
  r = await send(g3, { c: 'move', x: 1000, z: 0, ids: [1] });
  ok(!r.ok && r.why === 'off', 'a tactical order to an old host comes back off (' + r.why + ')');
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
