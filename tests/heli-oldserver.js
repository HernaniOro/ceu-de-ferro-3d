'use strict';
/* the new page against a relay server that does not know helicopters (SERVER=<the old server.js>): nobody flies one, the host fields none,
   and everything else goes on as before */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
(async () => {
  await N.start(); console.log('server: ' + N.SERVER);
  const mk = (cls, model) => new Promise(res => { const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: 3 }), Net = c.$('Net'); Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(c); }; Net.ui.refused = code => res({ refused: code }); Net.connect('modern', cls, cls, model); });
  const h = await mk('tank', 'abrams'), Net = h.$('Net'), S = h.$('S');
  if (Net.hl) {   // with a server that knows them, the director fields its few: never more attack helicopters a side than HDIR says, and a transport's run
    const D = h.$('HDIR'), g = await mk('plane', 'su57'), GN = g.$('Net'), GS = g.$('S'); S.my.inv = GS.my.inv = 1e9; let mx = [0, 0], lifts = 0, seen = 0, err = null, air = 0;
    try { for (let i = 0; i < 60 * 240; i++) { h.step(1 / 60); Net.tick(1 / 60); g.step(1 / 60); GN.tick(1 / 60); for (const t of [0, 1]) mx[t] = Math.max(mx[t], S.planes.filter(p => p.heli && p.def.atk && p.team === t && !p.dead).length); lifts = Math.max(lifts, S.squads.filter(q => q.job === 'air').length + S.planes.filter(p => p.heli && p.def.lift).length); seen = Math.max(seen, GS.planes.filter(p => p.heli && p.net && p.aid).length); air = Math.max(air, S.planes.filter(p => !p.heli && p.ai).length); if (i % 4 === 0) await new Promise(r => setImmediate(r)); } } catch (e) { err = e; console.error(e); }
    ok(!err && mx[0] >= 1 && mx[1] >= 1 && mx[0] <= D.atk[1] && mx[1] <= D.atk[1], 'in 240 s the host\'s director keeps ' + mx.join(' and ') + ' attack helicopters a side with one human on each (table: ' + D.atk[1] + ') beside ' + air + ' planes');
    ok(lifts >= 1 && seen >= 2, 'a transport flew, and the guest saw ' + seen + ' AI helicopters at once');
    Net.close(); GN.close(); N.stop(); return done();
  }
  const g = await mk('plane', 'f22'), GN = g.$('Net'), GS = g.$('S'); S.my.inv = GS.my.inv = 1e9; let helis = 0, err = null;
  try { for (let i = 0; i < 60 * 200; i++) { h.step(1 / 60); Net.tick(1 / 60); g.step(1 / 60); GN.tick(1 / 60); helis += S.planes.filter(p => p.heli).length; if (i % 4 === 0) await new Promise(r => setImmediate(r)); } } catch (e) { err = e; console.error(e); }
  ok(!err && helis === 0 && S.planes.some(p => p.ai) && S.units.length > 3, 'in 200 s the host fields its planes and columns and not one helicopter');
  ok(GS.planes.filter(p => p.net && p.aid).length === S.planes.filter(p => p.aid && !p.gone).length && GS.planes.some(p => p.net && p.aid), 'and its plane rows still reach the guest (' + GS.planes.filter(p => p.net && p.aid).length + ' AI planes)');
  ok(h.swapTo('heli', 'ah64') === 'server' && S.cls === 'tank' && !S.my.dead, 'a helicopter cannot be picked in mid-match: "server", and the tank is kept');
  const r = await mk('heli', 'ah64'); ok(r.refused === 'model', 'and joining in one is refused by the server');
  Net.close(); GN.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
