'use strict';
/* the new page against a relay server that does not know transport (SERVER=<the old server.js>): the game is what it was. No car, LAV or
   sniper is fielded by the host, nobody can pick one, the AI's snapshots still reach a guest, and the seat messages go nowhere */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
(async () => {
  await N.start(); console.log('server: ' + N.SERVER);
  const mk = (cls, model) => new Promise(res => { const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: 3 }), Net = c.$('Net'); Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(c); }; Net.ui.refused = code => { c.refused = code; res(c); }; Net.connect('modern', cls, cls, model); });
  const h = await mk('tank', 'abrams'), Net = h.$('Net'), S = h.$('S');
  if (Net.trn) { console.log('this server knows transport: nothing to check'); Net.close(); N.stop(); return done(); }
  const g = await mk('inf', 'blueRifle'), GS = g.$('S'), GN = g.$('Net'); S.my.inv = GS.my.inv = 1e9;
  for (let i = 0; i < 60 * 150; i++) { h.step(1 / 60); Net.tick(1 / 60); g.step(1 / 60); GN.tick(1 / 60); S.my.inv = GS.my.inv = 1e9; if (i % 4 === 0) await new Promise(r => setImmediate(r)); if (i % 30 === 0) await N.sleep(1); }
  await N.sleep(60);
  const odd = S.units.filter(u => u.kind === 'car' || u.kind === 'lav' || (u.ai && u.ai.park) || u.run).length, snp = S.men.filter(m => m.def.snp).length, mine = S.units.filter(u => u.aid && !u.dead).length, got = GS.units.filter(u => u.net && u.aid).length, miss = S.units.filter(u => u.aid && !u.dead && !GN.ai.get(u.aid)).map(u => u.kind + ':' + u.id + (u.fld ? ':fld' : '') + (u.bye ? ':bye' : '')), men = S.men.filter(m => m.aid && !m.dead).length, gm = GS.men.filter(m => m.net && m.aid && !m.dead).length;
  ok(!odd && !snp, 'in 150 s the host fields no car, no LAV, no parked vehicle, no errand and no sniper');
  ok(mine > 3 && got >= mine - 1 && men > 40 && gm >= men - 6, 'its ' + mine + ' AI vehicles and ' + men + ' soldiers reach the guest as before (' + got + ', ' + gm + ')' + (miss.length ? ' missing ' + miss.join(' ') : ''));
  ok(h.swapTo('trn', 'hemtt') === 'server' && g.swapTo('inf', 'blueSniper') === 'server' && h.swapTo('tank', 'leo2') === '', 'a transport or a sniper cannot be picked in mid-match ("server"); a tank still can');
  const tr = S.units.find(u => u.kind === 'truck' && u.team === 0 && !u.dead), P = GS.my;
  const gt = tr && GN.ai.get(tr.aid);
  if (gt) { P.x = gt.x + 4; P.z = gt.z + 4; GS.input.yawR = true; for (let i = 0; i < 90; i++) { h.step(1 / 60); Net.tick(1 / 60); g.step(1 / 60); GN.tick(1 / 60); if (i === 3) GS.input.yawR = false; if (i % 4 === 0) await new Promise(r => setImmediate(r)); if (i % 30 === 0) await N.sleep(1); } await N.sleep(60); }
  ok(!!gt && !P.in && !tr.occ.some(Boolean), 'a guest\'s E beside an AI truck asks, and with no answer from this server nothing happens');
  const r = await mk('trn', 'hemtt'), r2 = await mk('inf', 'blueSniper'); ok(r.refused === 'model' && r2.refused === 'model', 'and joining as either is refused by the server');
  Net.close(); GN.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
