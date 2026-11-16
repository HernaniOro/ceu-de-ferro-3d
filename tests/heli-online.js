'use strict';
/* helicopters online, headless, through the real relay server: a host and two guests, each a full copy of the page's simulation.
   The host's directors are switched off, so only what the test puts on the map is there */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60, f1 = v => v.toFixed(1);
async function client(name, cls, model) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + 5 }), $ = c.$, Net = $('Net'), send = Net.send;
  c.name = name; c.$ = $; c.Net = Net; c.sent = {}; c.on = true;
  Net.send = (t, o) => { const k = t === 'ai' ? 'ai' + o.k : t; c.sent[k] = (c.sent[k] || 0) + JSON.stringify(Object.assign({ t }, o)).length; send(t, o); };
  await new Promise((res, rej) => {
    Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(); };
    Net.ui.refused = code => rej(new Error(name + ' refused: ' + code)); Net.connect('modern', name, cls, model);
  });
  Object.defineProperty(c, 'S', { get: () => $('S') }); c.id = Net.id; all.push(c); return c;
}
async function run(secs, each) {
  for (let i = 0, n = Math.round(secs / dt); i < n; i++) {
    for (const c of all) if (c.on) { c.step(dt); c.Net.tick(dt); }
    if (each && each() === false) return false;
    if (i % 2 === 0) await new Promise(r => setImmediate(r));
  }
  await N.sleep(30); return true;
}
const hd = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const aimAt = (c, t) => { const P = c.S.my, A = c.S.aim; let d = { x: t.x - P.x, y: t.y - P.y, z: t.z - P.z }; for (let i = 0; i < 4; i++) { const l = Math.hypot(d.x, d.y, d.z), e = c.$('heliEye')(P, { x: d.x / l, y: d.y / l, z: d.z / l }); d = { x: t.x - e.x, y: t.y - e.y, z: t.z - e.z }; } A.h = Math.atan2(-d.z, d.x); A.p = Math.asin(d.y / Math.hypot(d.x, d.y, d.z)); };
const press = async (c, k) => { c.S.input[k] = true; await run(.05); c.S.input[k] = false; await run(.05); };
const score = (c, id) => c.Net.players.get(id);
/* put a client's helicopter in the air at x z, h m up, hovering in the hover hold */
const hover = (c, x, z, h) => { const P = c.S.my; P.x = x; P.z = z; P.y = c.hgt(x, z) + P.def.gh + h; P.land = false; P.v = { x: 0, y: 0, z: 0 }; P.ct = P.ctl.col = .6; P.hov = true; P.inv = 0; c.S.aim.p = 0; };

(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const host = await client('Host', 'heli', 'ah64'); host.director = () => {}; Object.assign(host.$('HDIR'), { atk: [0, 0, 0, 0], lift: [0, 0, 0, 0] });
  const g1 = await client('Verm', 'heli', 'mi28'), g2 = await client('Azul', 'heli', 'uh60');
  for (const g of [g1, g2]) { g.director = () => {}; Object.assign(g.$('HDIR'), { atk: [0, 0, 0, 0], lift: [0, 0, 0, 0] }); }
  ok(host.S.host && !g1.S.host && host.Net.hl && g1.Net.hl, 'three helicopter players in the room, the first is the host, the server knows helicopters');
  await run(2);
  const gh = (c, o) => c.Net.ghosts.get(o.id);
  ok(gh(host, g1) && gh(host, g1).heli && gh(host, g1).id === 'mi28' && gh(g1, host).id === 'ah64' && gh(g1, g2).id === 'uh60' && gh(g2, host).heli, 'everyone sees the others as the helicopters they are');
  ok(hd(host.S.my, g2.S.my) > 40 && host.S.my.land && gh(g1, host).land && !host.S.my.dead && !g2.S.my.dead, 'two of the same side stand on different pads (' + Math.round(hd(host.S.my, g2.S.my)) + ' m apart), landed for everyone');
  const b0 = host.S.base[0], b1 = host.S.base[1], mx = host.S.W / 2;
  hover(host, mx - 300, 600, 80); hover(g1, mx + 300, 600, 80); hover(g2, mx - 500, 900, 60);
  for (const c of all) c.sent = {};
  await run(5);
  const near = (c, o) => d3(gh(c, o), o.S.my);
  ok(near(host, g1) < 3 && near(g1, host) < 3 && near(g2, g1) < 3 && !gh(host, g1).land, 'the ghosts hover where their owners do (' + [near(host, g1), near(g1, host), near(g2, g1)].map(f1).join(', ') + ' m off)');
  const B = c => Object.fromEntries(Object.entries(c.sent).map(([k, v]) => [k, Math.round(v / 5)]));
  console.log('   a helicopter player sends ' + JSON.stringify(B(g1)) + ' bytes/s (hstate at 20 Hz: ' + Math.round(B(g1).hstate / 20) + ' B a message)');

  console.log('-- the AI\'s helicopters ride in the host\'s snapshot --');
  const ai1 = host.heliAir(1, 'mi28', 3000), ai2 = host.heliLiftRun(0); for (const c of all) c.sent = {};
  await run(5);
  const a1 = g1.Net.ai.get(ai1.aid), a2 = g2.Net.ai.get(ai2.aid);
  ok(a1 && a1.heli && a1.net && a1.id === 'mi28' && a1.team === 1 && d3(a1, ai1) < 6, 'an AI attack helicopter is on the guests, ' + f1(a1 ? d3(a1, ai1) : 99) + ' m off');
  ok(a2 && a2.heli && a2.def.lift && a2.cargo && a2.cargo.length === 6 && ai2.cargo, 'and a transport, known to carry its squad');
  const bh = B(host); console.log('   host upstream, bytes/s: ' + JSON.stringify(bh) + '; the 2 AI helicopters ride in ai0, ' + Math.round(bh.ai0 / 10 / 2) + ' B a row at 10 Hz');
  ai2.gone = true; await run(1);

  console.log('-- kills both ways between players, and of the AI\'s --');
  const P0 = host.S.my, P1 = g1.S.my; P1.flares = 0;
  await run(40, () => { aimAt(host, gh(host, g1)); host.S.input.fire = true; return !P1.dead; });
  host.S.input.fire = false; await run(1.5);
  ok(P1.dead && P1.by === host.id, 'the host\'s Apache shoots the guest\'s Mi-28 down with its gun, by relayed hits (' + (600 - P0.ammo) + ' rounds)');
  ok(score(g2, host.id).kills === 1 && score(g2, g1.id).deaths === 1, 'one kill and one death on everyone\'s scoreboard');
  await run(7); ok(!g1.S.my.dead && g1.S.my !== P1 && g1.S.my.land && gh(host, g1) && !gh(host, g1).dead, 'the guest is back in another one on its pad, and seen there');
  hover(g1, mx + 300, 600, 80); hover(host, mx - 300, 600, 80); await run(1);
  await run(40, () => { aimAt(g1, gh(g1, host)); g1.S.input.fire = true; return !P0.dead; });
  g1.S.input.fire = false; await run(1.5);
  ok(P0.dead && P0.by === g1.id && score(g2, g1.id).kills === 1 && score(g2, host.id).deaths === 1, 'and the guest shoots the host down: credited both ways');
  await run(7); hover(host, mx - 300, 600, 80); hover(g1, mx + 300, 600, 80);
  ai1.x = mx - 100; ai1.z = 900; ai1.y = host.hgt(ai1.x, ai1.z) + 90; ai1.v = { x: 0, y: 0, z: 0 }; ai1.flares = 0; ai1.ha.st = 'mask'; ai1.ha.T = 1e9; ai1.ha.bp = { x: ai1.x, z: ai1.z, pop: 90, of: null, tx: 0, tz: 0 }; await run(1);
  await run(40, () => { const t = g2.Net.ai.get(ai1.aid); if (t) { aimAt(host, host.Net.ai.get(ai1.aid) || ai1); } ai1.ha.T = 1e9; ai1.ha.st = 'mask'; ai1.ctl.vs = 0; host.S.input.fire = true; return !ai1.dead; });
  host.S.input.fire = false; await run(1);
  ok(ai1.dead && score(g1, host.id).ai === 1, 'the host\'s kill of an AI helicopter is on the scoreboard');
  const ai3 = host.heliAir(0, 'ah64', 3000); ai3.flares = 0; await run(.5); ai3.x = mx + 100; ai3.z = 300; ai3.y = host.hgt(ai3.x, ai3.z) + 90; ai3.v = { x: 0, y: 0, z: 0 };
  let rel = 0; const TK = host.Net.take; host.Net.take = (o, m, by) => { if (o === ai3) rel++; TK(o, m, by); };
  await run(40, () => { const t = g1.Net.ai.get(ai3.aid); if (t) aimAt(g1, t); ai3.ha.st = 'mask'; ai3.ha.T = 1e9; ai3.ha.bp = { x: mx + 100, z: 300, pop: 90, of: null, tx: 0, tz: 0 }; g1.S.input.fire = !!t; return !ai3.dead; });
  g1.S.input.fire = false; await run(1); host.Net.take = TK;
  ok(ai3.dead && rel > 0 && score(host, g1.id).ai === 1, 'a guest shoots an AI helicopter down through ' + rel + ' hits sent to the host, and is credited');

  console.log('-- a guest\'s transport: a squad in and out, mirrored --');
  const T = g2.S.my, tp = { x: mx - 900, z: 1500 }; T.x = tp.x; T.z = tp.z; T.y = g2.hgt(tp.x, tp.z) + T.def.gh; T.land = true; T.hov = false; T.v = { x: 0, y: 0, z: 0 }; T.ct = .1; await run(1);
  const sq = host.addSquad(0, tp.x + 18, tp.z + 4, 0, 0); sq.men.forEach(m => { m.ai.think = 1e9; }); await run(4);
  ok(g2.S.men.filter(m => m.aid && !m.dead).length === 6, 'the host\'s squad stands beside the guest\'s Black Hawk on the guest\'s screen');
  await press(g2, 'smoke'); await run(1);
  ok(T.cargo && T.cargo.length === 6 && host.S.men.filter(m => !m.dead && !m.gone).length === 0 && host.S.squads.length === 0, 'G: the host takes the squad off the field and the guest has its 6 kits aboard');
  await run(5); ok(gh(host, g2).cargo && gh(g1, g2).cargo && g1.S.men.filter(m => !m.dead && !m.gone).length === 0, 'everyone sees the transport loaded and the soldiers gone');
  g2.S.input.thrUp = true; await run(4); g2.S.input.thrUp = false; g2.S.aim.p = -.2; await run(8); g2.S.aim.p = .25; await run(4); g2.S.aim.p = 0; T.hov = true; await run(5);
  await run(40, () => { g2.S.input.thrDown = true; return !T.land; }); g2.S.input.thrDown = false; await run(2);
  const far = hd(T, tp); await press(g2, 'smoke'); await run(5);
  const hm = host.S.men.filter(m => m.aid && !m.dead), q2 = host.S.squads[0];
  ok(!T.cargo && hm.length === 6 && q2 && q2.ord.k === 'hold' && hd(hm[0], T) < 40 && far > 60 && !T.dead, 'flown ' + Math.round(far) + ' m and landed: G puts the 6 men down beside it on the host, holding there');
  ok(g1.S.men.filter(m => m.aid && !m.dead).length === 6 && !gh(g1, g2).cargo && hm.map(m => m.id).sort().join() === sq.men.map(m => m.id).concat(hm.map(m => m.id)).sort().slice(0, 0).concat(hm.map(m => m.id).sort()).join(), 'and the other guest sees them, and the transport empty');

  console.log('-- mid-match: out of a helicopter and into one --');
  const sw1 = g2.swapTo('tank', 'abrams'); await run(6);
  ok(sw1 === '' && g2.S.my.kind === 'tank' && gh(g1, g2).kind === 'tank' && score(g1, g2.id).cls === 'tank', 'the transport pilot is now an Abrams for everyone');
  const sw2 = g2.swapTo('heli', 'ah64'); await run(6);
  ok(sw2 === '' && g2.S.my.heli && g2.S.my.land && gh(g1, g2).heli && gh(g1, g2).id === 'ah64' && gh(host, g2).land, 'and an Apache on its pad again');
  ok(g2.swapTo('heli', 'mi28') === 'no', 'a helicopter of the other side is not offered');

  console.log('-- host migration with helicopters in the air --');
  const m1 = host.heliAir(1, 'mi28', 2500), m2 = host.heliLiftRun(0); await run(12);
  const was = [m1, m2].map(p => ({ aid: p.aid, y: p.y, st: p.ha.st, cargo: !!p.cargo })), up = !m2.land && !m1.land;
  host.on = false; host.Net.close(); await N.sleep(150); await run(3);
  const n1 = g1.Net.ai.get(m1.aid), n2 = g1.Net.ai.get(m2.aid);
  ok(g1.S.host && !g2.S.host && up, 'the host left with an AI attack helicopter and a loaded transport airborne; the earliest guest is the new host');
  ok(n1 && !n1.net && n1.ai && !n1.dead && n2 && !n2.net && n2.cargo && n2.cargo.length === 6, 'it adopted both, the transport still with its squad');
  let low = 1e9; await run(25, () => { for (const p of [n1, n2]) if (!p.dead && !p.land) low = Math.min(low, p.y - g1.hgt(p.x, p.z)); });
  ok(!n1.dead && !n2.dead && n1.ha && n2.ha && low > 3, 'both fly on under their new brains (never lower than ' + f1(low) + ' m)');
  const o1 = g2.Net.ai.get(m1.aid), o2 = g2.Net.ai.get(m2.aid); ok(o1 && o2 && d3(o1, n1) < 8 && d3(o2, n2) < 8 && o2.cargo, 'and the other guest follows them from the new host');
  let out = false; await run(300, () => { if (!n2.cargo && !out) out = true; return !(out || n2.dead); }); await run(4);
  ok(out && !n2.dead && g1.S.men.filter(m => m.aid && !m.dead).length >= 12 && g2.S.men.filter(m => m.aid && !m.dead).length >= 12, 'the adopted transport lands and lets its squad off, and the guest sees it (' + g2.S.men.filter(m => m.aid && !m.dead).length + ' soldiers)');
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
