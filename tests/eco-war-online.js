'use strict';
/* The economy at war, online, through the real relay server on its own port (PAGE=<page>, SERVER=<server>, PORT_T=<port>): what side 0 finds of
   side 1's sites reaches side 0's players only (ecs.kn), never the other side; a strike, a scout and a guard order made on the host show on
   the side's clients (the general's view layer, the log, the squads' tags, the fixed AA); a site destroyed shows dead in the memory and the log;
   the next host keeps the known sites and the scouting memory through the sealed backup. About 1 minute */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model, keep) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + 5, eco: true }), $ = c.$, Net = $('Net');
  c.name = name; c.$ = $; c.Net = Net; c.on = true; c.got = [];
  const f = Net.rx.ecs; Net.rx.ecs = m => { c.got.push([m.s, m.kn ? m.kn.length : 0]); f(m); };
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
const live = c => c.S.eco.l.filter(e => !e.dead);

(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const host = await client('Host', 'tank', 'abrams', true), g1 = await client('Azul', 'inf', 'blueRifle'), g2 = await client('Verm', 'inf', 'redRifle');
  const ECO = host.$('ECO'), E = host.S.eco, pow = E.l.find(e => e.team === 1 && e.k === 'pow'), fab0 = E.l.find(e => e.team === 0 && e.k === 'fab'), pow0 = E.l.find(e => e.team === 0 && e.k === 'pow');
  await run(2);

  console.log('-- a site found by the host\'s tank reaches side 0 only --');
  const P = host.S.my; P.inv = 1e9; const sees = host.$('sees');
  let placed = false;
  for (let r = 300; r <= 360 && !placed; r += 20) for (let a = 0; a < 6.3 && !placed; a += .4) {
    P.x = pow.x + Math.cos(a) * r; P.z = pow.z + Math.sin(a) * r; P.y = host.hgt(P.x, P.z) + 1;
    if (sees(P, pow)) placed = true;
  }
  ok(placed, 'the host\'s tank stands in the open 300 m from side 1\'s usina');
  await run(4);
  const kn0 = host.S.eco.d[0].kn[pow.id], kg = g1.S.eco.d[0].kn[pow.id];
  ok(!!kn0 && !kn0.dead, 'the host\'s memory of side 0 has it');
  ok(!!kg && kg.k === 'pow' && !kg.dead && Math.hypot(kg.x - pow.x, kg.z - pow.z) < 2, 'side 0\'s guest has it too (ecs.kn)');
  const fg = g1.ecoView(0).foe.find(f => f.id === pow.id);
  ok(!!fg && fg.age < 6 && g1.genVM(0, false).eco.sites.some(s => s.t === 1 && s.k === 'pow'), 'its ecoView and the general\'s view layer show it (age ' + (fg && fg.age) + ')');
  ok(g1.S.glog && g1.S.glog.l[0].some(e => e.s.startsWith('Localizada usina inimiga')), 'its log says "Localizada usina inimiga"');
  ok(g2.S.eco.d[0].kn && Object.keys(g2.S.eco.d[0].kn).length === 0 && g2.S.eco.d[1].kn[pow.id] === undefined && g2.got.every(([s]) => s === 1) && g1.got.some(([s, n]) => s === 0 && n > 0), 'side 1\'s guest never got an ecs of side 0 nor its known sites');
  ok(!g2.S.glog || g2.S.glog.l[0].length === 0, 'and none of the log lines of side 0');
  const rp = g1.S.eco.l.find(e => e.id === pow.id);
  ok(!!rp && g1.$('spotted')(rp), 'on the guest the site is also spotted by its own eyes (the host\'s tank, a ghost there): the map mark shows');

  console.log('-- strike, scout and guards ordered on the host --');
  const n0 = (host.S.cmd && host.S.cmd[0] ? host.S.cmd[0].fm.length : 0);
  ok(host.ecoCmd(0, { c: 'strike', id: pow.id }, 'ai').ok, 'the host orders a strike on the seen usina');
  ok(host.ecoCmd(0, { c: 'scout', x: host.S.W * .8, z: 600 }, 'ai').ok, 'and a scout into the enemy half');
  const E1 = host.S.eco.d[0]; E1.res.aaf = ['hq']; E1.res.squad = ['hq', 'hq']; host.S.eco.open = false;
  for (const u of host.S.units) if (u.fixed && u.kind === 'aa' && u.team === 0 && Math.hypot(u.x - fab0.x, u.z - fab0.z) < ECO.gd.r * 2) u.dead = true;
  host.ecoCmd(0, { c: 'def', id: fab0.id, inf: 0, aa: 1 }, 'ai'); host.ecoCmd(0, { c: 'def', id: pow0.id, inf: 1, aa: 0 }, 'ai');
  host.$('IAI').cap = 999;   // the field's manpower cap would hold every reinforcement back in a full modern battle
  let egd = false; await run(60, () => { egd = egd || [...(g1.S.gsq && g1.S.gsq[0] ? g1.S.gsq[0].values() : [])].some(q => q.job === 'egd'); return !(egd && g1.S.eco.d[0].sc); });
  const aa = host.S.units.find(u => !u.dead && u.fixed && u.es === fab0);
  ok(g1.S.eco.d[0].tg === pow.id && g1.ecoView(0).tg === pow.id, 'the priority target reaches the guest (ecs.tg)');
  ok(!!g1.S.eco.d[0].sc && g1.ecoView(0).sc && g1.ecoView(0).sc.x > host.S.W * .7, 'and the scout point (ecs.sc)');
  ok(host.S.cmd[0].fm.length > n0 && g1.genVM(0, false).fm.length >= 1, 'the fire mission shows on its general\'s map (gen.fm: ' + (g1.S.gcm && g1.S.gcm[0] ? g1.S.gcm[0].v.fm.length : '-') + ' of ' + host.S.cmd[0].fm.length + ')');
  ok(!!aa && g1.S.units.some(u => !u.dead && u.kind === 'aa' && u.team === 0 && u.fixed && Math.hypot(u.x - aa.x, u.z - aa.z) < 15), 'the fixed AA the host put by the fabrica stands on the guest too');
  ok(host.S.eco.l.find(e => e.id === fab0.id).gd.aa === 1 && g1.S.eco.l.find(e => e.id === fab0.id).gd.aa === 1 && g1.S.eco.l.find(e => e.id === pow0.id).gd.inf === 1, 'the guard settings reach the guest (ecs.gd)');
  ok(g1.S.glog.l[0].some(e => e.s.startsWith('Antiaérea fixa instalada')) && g1.S.glog.l[0].some(e => e.s.startsWith('Alvo prioritário')), 'its log has the AA and the strike lines');
  ok(egd && host.S.squads.some(q => q.job === 'egd' && q.team === 0 && q.ord.es === pow0), 'the guard squad the host raised for the usina is in the orders the guest gets (gen.q, job egd)');
  ok(g2.S.eco.d[0].tg === null && (!g2.S.gcm || !g2.S.gcm[0]) && g2.S.eco.l.find(e => e.id === pow0.id).gd.inf === 0, 'side 1\'s guest got none of it');

  console.log('-- the site goes down --');
  host.hitObj(pow.o, 1e5, null); await run(3);
  ok(pow.dead && g1.S.eco.d[0].kn[pow.id].dead && g1.ecoView(0).foe.find(f => f.id === pow.id).dead, 'destroyed: dead in the guest\'s memory');
  ok(g1.S.glog.l[0].some(e => e.s.startsWith('Usina inimiga destruída')) && g1.S.eco.l.find(e => e.id === pow.id).dead, 'its log says so; the site is dead on the guest');

  console.log('-- the next host keeps what side 0 knew --');
  await run(6);
  const note = Object.keys(host.S.eco.d[0].kn).sort().join(), lk0 = host.S.eco.d[0].lk.filter(v => typeof v === 'number').length;
  host.on = false; host.Net.close(); await N.sleep(150); await run(2);
  const eco = g1.S.eco;
  ok(g1.S.host && eco.sim, 'the next host is side 0\'s guest and simulates');
  ok(Object.keys(eco.d[0].kn).sort().join() === note && eco.d[0].kn[pow.id] && eco.d[0].kn[pow.id].dead, 'it keeps side 0\'s known sites (' + note.split(',').length + ') and the dead one still dead');
  ok(eco.d[0].lk.filter(v => typeof v === 'number').length >= lk0 && lk0 >= 1 && eco.d[0].lk.length === ECO.ai.look.length, 'and the scouting memory (' + lk0 + ' point looked at)');
  ok(eco.d[0].tg === pow.id || eco.d[0].tg === null, 'and the priority target');
  await run(10);
  ok(g2.got.filter(([s]) => s === 1).length > 0 && g2.got.every(([s]) => s === 1), 'side 1\'s guest still gets only its own ecs after the change of host');
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
