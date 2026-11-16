'use strict';
/* the new page against an older relay server (SERVER=<the old server.js>): the online game must be what that server allows. One that
   does not know infantry: no squads, no soldiers. One that knows infantry but not supply bases: no base is ever started, by the AI or by a
   player, ground players still enter on the road by the middle, and the columns keep coming from 2600 m behind it */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
(async () => {
  await N.start();
  const mk = (cls, model) => new Promise(res => { const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: 3 }), Net = c.$('Net'); Net.ui.welcome = () => { c.newState('ww2', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(c); }; Net.ui.refused = code => res({ refused: code }); Net.connect('ww2', cls, cls, model); });
  const h = await mk('tank', 'tiger'), Net = h.$('Net'), S = h.$('S');
  if (Net.sb) { console.log('this server knows supply bases: nothing to check'); N.stop(); return done(); }
  if (Net.inf) {
    const r = S.T.routes[0], hd = h.$('hdist'), far = []; S.my.inv = 1e9;
    ok(hd(S.my, h.$('routeAt')(r, r.len / 2 + 1000)) < 130, 'with no supply bases the tank still enters on road 0 about 1000 m from its middle (' + Math.round(hd(S.my, h.$('routeAt')(r, r.len / 2))) + ' m)');
    const g = await mk('inf', 'rifleman'), GS = g.$('S'), GN = g.$('Net'); g.director = () => {};
    for (let i = 0; i < 60 * 150; i++) { h.step(1 / 60); Net.tick(1 / 60); g.step(1 / 60); GN.tick(1 / 60); if (i === 60 * 60) for (const u of S.units) if (u.ai && !u.fixed && u.team === 0) { u.dead = u.gone = true; } if (i > 60 * 61) for (const u of S.units) if (u.ai && !u.fixed && u.team === 0 && !u.fld && !u.seen0) { u.seen0 = 1; far.push(Math.round((u.s - r.len / 2))); } if (i % 4 === 0) await new Promise(r => setImmediate(r)); }
    const men = S.men.filter(m => m.aid && !m.dead).length, got = GS.men.filter(m => m.net && m.aid && !m.dead).length;
    ok(S.sup.length === 0 && h.startSite(0, S.my.x + 80, S.my.z + 80, 0) === null && h.aiSite(0) === null, 'no base is started: not by the planner in 150 s, not by a request');
    ok(men > 64 && got >= men - 3, 'the field squads are there, and all ' + men + ' AI soldiers reach the guest through this server, ' + h.$('AIROWS') + ' rows a message (' + got + ')');
    ok(far.length > 0 && far.every(s => Math.abs(s - h.$('DIR').back) < 200), 'a column sent after the first enters ' + h.$('DIR').back + ' m behind the middle, as before (' + far.join(', ') + ')');
    Net.close(); GN.close(); N.stop(); return done();
  }
  for (let i = 0; i < 60 * 120; i++) { h.step(1 / 60); Net.tick(1 / 60); if (i % 4 === 0) await new Promise(r => setImmediate(r)); }
  ok(S.units.length > 3 && S.men.length === 0 && !S.units.some(u => u.cargo), 'the director fields its columns and no squads (' + S.units.length + ' vehicles, 0 soldiers)');
  ok(h.swapTo('inf', 'schutze') === 'server', 'a soldier cannot be picked in mid-match: "server"');
  const r = await mk('inf', 'schutze'); ok(r.refused === 'model', 'and joining as one is refused by the server');
  Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
