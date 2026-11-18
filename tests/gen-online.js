'use strict';
/* the general's view online, headless, through the real relay server (PAGE=<page>, SERVER=<server>, PORT_T=<port>): a full battle, the host
   and a guest of side 0, a guest of side 1. What the guest's commander view says is the host's: posture, roads, operations, the squads'
   tags, the log, the match clock, and nothing of the other side. About 90 s */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model, keep) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + 5, eco: true }), $ = c.$, Net = $('Net'), send = Net.send;
  c.name = name; c.$ = $; c.Net = Net; c.max = {}; c.on = true; c.gens = [];
  Net.send = (t, o) => { const n = JSON.stringify(Object.assign({ t }, o)).length; c.max[t] = Math.max(c.max[t] || 0, n); send(t, o); };
  await new Promise((res, rej) => {
    Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(); };
    Net.ui.refused = code => rej(new Error(name + ' refused: ' + code)); Net.connect('modern', name, cls, model);
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
(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const host = await client('Host', 'tank', 'abrams', true), g1 = await client('Azul', 'inf', 'blueRifle'), g2 = await client('Verm', 'inf', 'redRifle');
  /* every gen g1 receives against the host's view of that tick (the host's tick that sent it runs just before the message is read) */
  let cmp = 0, bad = [], cues = new Set();
  const rx = g1.Net.rx.gen, pending = [];
  const hv = host.Net.send; host.Net.send = (t, o) => { if (t === 'gen' && o.s === 0) { const V = host.genVM(0, false); pending.push({ post: V.post.k, road: V.road ? V.road.length : -1, ops: V.ops.map(p => p.k).join() }); } hv(t, o); };
  g1.Net.rx.gen = m => { rx(m); const h = pending.shift(); cmp++; if (h) { const v = m.v, o = (v.ops || []).map(p => p.k).join(); if (!(v.post && v.post.k === h.post && (v.road ? v.road.length : -1) === h.road && o === h.ops)) bad.push(JSON.stringify([h, v.post && v.post.k, o])); } };
  const rc = g2.Net.rx.cmd; g2.Net.rx.cmd = m => { if (Array.isArray(m.c)) cues.add(JSON.stringify(m.c[0])); rc(m); };

  console.log('-- 60 s of a full battle --');
  let seen = 0; await run(60, () => { const V = g1.genVM(0, false); if (V.u.some(e => e.sqd && e.tag)) seen++; });
  const hV = host.genVM(0, false), gV = g1.genVM(0, false);
  ok(cmp >= 20 && bad.length === 0, 'the posture, the number of roads and the kinds of operations of each gen g1 read are the host\'s at that tick (' + cmp + ' compared' + (bad.length ? ', first miss ' + bad[0] : '') + ')');
  ok(gV.cmd === true && gV.cue === null, 'g1\'s view says there is a commander (cmd true, no cue)');
  ok(gV.post.k === hV.post.k && gV.road && hV.road && gV.road.length === hV.road.length, 'its posture is the host\'s: ' + gV.post.k);
  ok(seen > 0 && gV.u.some(e => e.sqd && e.tag), 'its map has squads with their job tags (' + gV.u.filter(e => e.sqd && e.tag).length + ' of ' + gV.u.filter(e => e.sqd).length + ' groups, seen on ' + seen + ' frames)');
  const L0 = g1.S.glog ? g1.S.glog.l[0] : [], H0 = host.S.glog.l[0].map(e => e.s), L1 = g1.S.glog ? g1.S.glog.l[1] : [];
  ok(L0.length > 0 && L0.every(e => H0.includes(e.s)) && L1.length === 0, 'g1\'s log is a part of the host\'s side 0 log (' + L0.length + ' of ' + H0.length + ') and the other side\'s is empty');
  const last = L0[L0.length - 1], hl = host.S.glog.l[0].filter(e => e.s === last.s).pop();
  ok(!!last && !!hl && Math.abs((last.t + g1.S.t0) - (hl.t + (host.S.t0 || 0))) < 1, 'the last entry\'s match time agrees to within a second (' + (last.t + g1.S.t0).toFixed(1) + ' against ' + (hl.t + (host.S.t0 || 0)).toFixed(1) + ')');
  ok([...cues].every(c => c === '[0]') && g2.S.cue && g2.S.cue[0].length === 1 && g2.S.cue[0][0] === 0, 'the other side never saw side 0\'s cue (' + [...cues].join(' ') + ')');
  ok(host.max.gen < 8192 && host.max.gen > 0, 'the largest gen the host sent: ' + host.max.gen + ' B');
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
