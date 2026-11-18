'use strict';
/* Roads plan, step 1.1: the map version gate. A room's version is its first player's, told in welcome (mv); a page of another version is
   refused with code map, except that a page that can play map 1 (mv1: 1) is let into a map 1 room. A server that says no mv means map 1
   for everybody, and a page builds the terrain of Net.mv. */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
(async () => {
  await N.start();
  const join = async (room, mv, mv1) => { const c = await N.raw(), m = { t: 'join', room, name: 'p', cls: 'tank', model: room === 'ww2' ? 'tiger' : 'abrams' }; if (mv !== undefined) m.mv = mv; if (mv1) m.mv1 = 1; c.send(m); c.w = await c.wait('welcome'); c.err = await c.wait('error', 150); return c; };
  const a = await join('ww2', 2, 1);
  ok(a.w && a.w.mv === 2, 'the first page, map 2, opens the room: welcome mv 2');
  const b = await join('ww2', 1, 1);
  ok(!b.w && b.err && b.err.code === 'map', 'a page of map 1 (mv 1) is refused by a map 2 room');
  const b2 = await join('ww2', 3);
  ok(!b2.w && b2.err && b2.err.code === 'map', 'a page of map 3 is refused with code map');
  const b3 = await join('ww2');
  ok(!b3.w && b3.err && b3.err.code === 'map', 'a page that says no version (an older page) is refused by a map 2 room');
  const b4 = await join('ww2', 2, 1);
  ok(b4.w && b4.w.mv === 2, 'and one of map 2 is let in');
  for (const c of [a, b, b2, b3, b4]) c.close();
  await N.sleep(150);
  const o = await join('modern');   // an older page: no mv at all, opens a map 1 room
  ok(o.w && o.w.mv === 1, 'an older page opens a room: welcome mv 1');
  const p = await join('modern', 2, 1);
  ok(p.w && p.w.mv === 1, 'a map 2 page (mv1: 1) is let into a map 1 room, and welcome says mv 1');
  const q = await join('modern', 2);
  ok(!q.w && q.err && q.err.code === 'map', 'a map 2 page that cannot play map 1 is refused by a map 1 room');
  o.close(); p.close(); q.close();
  await N.sleep(150);
  const r = await join('modern', 2, 1);
  ok(r.w && r.w.mv === 2, 'a room that emptied forgets its version: the next first page sets it again (2)');
  r.close(); await N.sleep(150);
  /* a page: Net.mv from welcome, and the terrain it builds */
  const pg = await new Promise(res => { const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: 3 }), Net = c.$('Net'); Net.ui.welcome = () => { c.newState('ww2', 'tiger', { net: true, cls: 'tank', mouse: true, host: Net.host === Net.id }); res(c); }; Net.ui.refused = code => res({ refused: code }); Net.connect('ww2', 'p', 'tank', 'tiger'); });
  ok(!pg.refused && pg.$('Net').mv === 2 && pg.$('S').mv === 2 && !!pg.$('S').T.net, 'a page joining a fresh room builds map 2 (Net.mv ' + (pg.$('Net') || {}).mv + ')');
  const g = await new Promise(res => { const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: 3 }), Net = c.$('Net'); Net.ui.welcome = () => { c.newState('ww2', 'tiger', { net: true, cls: 'tank', mouse: true, host: Net.host === Net.id }); res(c); }; Net.ui.refused = code => res({ refused: code }); c.$('MAPV = 3'); Net.connect('ww2', 'p', 'tank', 'tiger'); });
  ok(g.refused === 'map', 'a page of map 3 is refused in the page too (code map)');
  pg.$('Net').close(); N.stop(); done();
})();
