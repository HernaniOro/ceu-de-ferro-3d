'use strict';
/* the new page against a server that does not know trenches and sandbags (SERVER=<the older server.js>): nobody builds, what is dug before
   the match is still there on everyone, and its damage still goes through obj and ohit */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + 5 }), $ = c.$, Net = $('Net');
  await new Promise((res, rej) => { Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(); }; Net.ui.refused = code => rej(new Error(code)); Net.connect('modern', name, cls, model); });
  c.Net = Net; Object.defineProperty(c, 'S', { get: () => $('S') }); c.id = Net.id; all.push(c); return c;
}
async function run(secs) { for (let i = 0, n = Math.round(secs / dt); i < n; i++) { for (const c of all) { c.step(dt); c.Net.tick(dt); } if (i % 2 === 0) await new Promise(r => setImmediate(r)); } await N.sleep(40); }
const until = async (f, ms) => { for (let t = Date.now(); !f() && Date.now() - t < (ms || 4000);) { await run(.1); await N.sleep(25); } return f(); };
const tap = async (c, k) => { c.S.input[k] = true; await run(.06); c.S.input[k] = false; await run(.06); };
(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const host = await client('Host', 'inf', 'blueRifle'), g = await client('Verm', 'inf', 'redRifle'); await run(30);
  const pre = host.S.forts.filter(f => f.pre), dyn = c => c.S.forts.filter(f => !f.pre).length;
  ok(!host.Net.ft && !g.Net.ft && host.Net.wo, 'this server says nothing of trenches and sandbags (no fcap): ' + [host.Net.ft, g.Net.ft, host.Net.wo]);
  ok(pre.length > 60 && g.S.forts.length === host.S.forts.length && g.S.forts.every((f, i) => f.id === host.S.forts[i].id && f.x === host.S.forts[i].x), 'what is dug before the match is there on both, the same (' + pre.length + ')');
  ok(!dyn(host) && !dyn(g), 'after 30 s of battle the host\'s AI has dug nothing');
  for (const c of [host, g]) { c.S.my.inv = 1e9; await tap(c, 'build'); await tap(c, 'build'); }
  const why = [host.S.fm && host.S.fm.why, g.S.fm && g.S.fm.why]; await tap(host, 'fire'); await tap(g, 'fire'); await run(1);
  ok(why.join() === 'server,server' && !dyn(host) && !dyn(g) && !host.fortStart(1, 0, host.S.my.x + 8, host.S.my.z, 0), 'the outline says the server must be restarted, on host and guest, and a click starts nothing');
  const f = pre.find(q => q.k === 1), fg = g.S.forts.find(q => q.id === f.id); g.hitObj(fg.o, 100, g.S.my); await until(() => g.S.os[f.id] === 1); const mid = host.S.os[f.id] + '' + g.S.os[f.id]; g.hitObj(fg.o, 100, g.S.my); await until(() => !g.S.forts.some(q => q.id === f.id));
  ok(mid === '11' && !host.S.forts.includes(f) && !g.S.forts.some(q => q.id === f.id), 'a pre-dug trench shelled by the guest is damaged and then gone on both');
  const late = await client('Tard', 'inf', 'blueSaw'); await until(() => !late.S.forts.some(q => q.id === f.id));
  ok(!late.S.forts.some(q => q.id === f.id) && late.S.forts.length === host.S.forts.length, 'and for a late joiner too');
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
