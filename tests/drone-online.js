'use strict';
/* drones online, headless, through the real relay server: a host soldier on the red side and a guest drone operator on the blue one.
   The guest flies an FPV: the host sees it, shoots it down with his rifle, and the guest's copy falls. A second FPV is flown into the
   host's parked AI truck: the owner detonates, the host loses the truck. An AI drone of the host is seen by the guest.
   With SERVER=<an older server.js> the operator kit is refused and nothing else is checked. */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + name.charCodeAt(0) }), $ = c.$, Net = $('Net');
  c.name = name; c.$ = $; c.Net = Net; c.on = true;
  await new Promise((res, rej) => { Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(); }; Net.ui.refused = code => rej(new Error(code)); Net.connect('modern', name, cls, model); });
  Object.defineProperty(c, 'S', { get: () => $('S') }); c.id = Net.id; c.plan = () => {}; c.director = () => {}; c.droneBrain = () => {}; all.push(c); return c;
}
async function run(secs, each) {
  for (let i = 0, n = Math.round(secs / dt); i < n; i++) {
    for (const c of all) if (c.on) { c.step(dt); c.Net.tick(dt); }
    if (each && each() === false) return false;
    if (i % 2 === 0) await new Promise(r => setImmediate(r));
    if (i % 20 === 0) await N.sleep(1);
  }
  await N.sleep(30); return true;
}
const put = (c, x, z, h) => { const P = c.S.my; P.x = x; P.z = z; P.y = c.$('manY')(x, z); if (h !== undefined) { P.h = h; c.S.aim.h = h; } };
const press = async (c, k) => { c.S.input[k] = true; await run(.05); c.S.input[k] = false; await run(.25); };
const look = (c, from, t, ty) => { const dx = t.x - from.x, dy = ty - from.y, dz = t.z - from.z; c.S.aim.h = Math.atan2(-dz, dx); c.S.aim.p = Math.asin(dy / Math.hypot(dx, dy, dz)); };

(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const h = await client('Hugo', 'inf', 'redRifle');
  let a;
  try { a = await client('Ana', 'inf', 'blueDrone'); } catch (e) { ok(e.message === 'model' && !h.Net.dr, 'an older server refuses the operator kit and says nothing of drones (welcome.dr): the rest of the game is as it was'); h.Net.close(); await N.stop(); return done(); }
  const B = h.S.base[0], X = B.x + 200, Z = B.z + 350;
  ok(h.Net.dr && a.Net.dr && h.S.host, 'welcome says dr; Hugo hosts');
  await run(.5); put(h, X + 150, Z, Math.PI); put(a, X, Z, 0); h.S.my.inv = a.S.my.inv = 1e9; await run(1);
  await press(a, 'mlock'); const o = a.S.dr; a.S.input.thrUp = true; await run(1.6); a.S.input.thrUp = false; a.S.input.up = true;
  await run(8, () => { look(a, o, { x: X + 110, z: Z }, o.y); return o.x < X + 100; }); a.S.input.up = false; await run(1);
  const g = (h.S.drones || []).find(q => q.net);
  console.log('   Ana\'s FPV at ' + [o.x, o.y, o.z].map(v => v.toFixed(0)) + '; Hugo\'s copy at ' + (g ? [g.x, g.y, g.z].map(v => v.toFixed(0)) : 'none'));
  ok(!!g && g.k === 'fpv' && g.team === 0 && Math.hypot(g.x - o.x, g.y - o.y, g.z - o.z) < 4, 'Hugo sees the drone Ana flies, where she flies it');
  const P = h.S.my; P.arms[0].mag = 30; P.arms[0].d = Object.assign({}, P.arms[0].d, { sp: 0 }); h.S.input.fire = true;
  await run(8, () => { const q = h.$('manEye')(P), t = Math.hypot(g.x - q.x, g.y - q.y, g.z - q.z) / P.arms[0].d.spd; look(h, q, g, g.y + .5 * 9.81 * t * t); P.arms[0].mag = 30; return !o.dead && !o.gone; }); h.S.input.fire = false; await run(1.5);
  ok((o.dead || o.gone) && o.end === 'shot' && !a.S.dr, 'Hugo\'s rifle brings it down: the hit went to its owner (dhit), and Ana is out of the goggles');
  ok(!(h.S.drones || []).some(q => q.net && !q.gone), 'and Hugo\'s copy is gone');
  const tr = h.$('addUnit')('truck', 1, X + 260, Z + 40, null, true); tr.ai = null; await run(1.5);
  const tg = [...a.Net.ai.values()].find(u => u.kind === 'truck' && Math.hypot(u.x - tr.x, u.z - tr.z) < 8);
  ok(!!tg, 'Ana sees the host\'s parked truck');
  a.S.my.dT = 0; await press(a, 'mlock'); const o2 = a.S.dr; ok(!!o2 && o2 !== o, 'Ana launches a second FPV');
  h.S.input = {}; a.S.input.thrUp = true; await run(1.5); a.S.input.thrUp = false; a.S.input.up = true;
  await run(40, () => { if (a.S.dr) look(a, o2, tg, tg.y + 1.5); return !!a.S.dr || a.S.bombs.length > 0; }); a.S.input.up = false; await run(2);
  console.log('   second FPV ended ' + o2.end + '; the truck on the host: ' + (tr.dead ? 'destroyed' : 'hp ' + tr.hp.toFixed(0) + ' of ' + tr.max));
  ok(o2.end === 'boom' && (tr.dead || tr.hp < tr.max), 'flown into the truck it detonates on Ana\'s side and the host\'s truck takes the damage');
  const ai = h.$('addDrone')('rec', 1, X + 100, h.hgt(X + 100, Z) + 60, Z, 0, null, { job: 'rec', x: X + 100, z: Z, T: 1e9 }); await run(1.5);
  const ag = (a.S.drones || []).find(q => q.net && q.k === 'rec');
  ok(!!ag && ag.team === 1 && Math.hypot(ag.x - ai.x, ag.z - ai.z) < 30, 'an AI drone of the host is on the guest\'s screen (dai)');
  h.$('droneEnd')(ai, 'shot', null); await run(1); ok(!(a.S.drones || []).some(q => q.net && q.k === 'rec' && !q.gone), 'and goes when the host loses it');
  for (const c of all) c.Net.close(); await N.stop(); done();
})().catch(e => { console.error(e); process.exit(1); });
