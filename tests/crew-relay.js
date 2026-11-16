'use strict';
/* the relay server and the crew messages: welcome.crew, crew (the record follows the body, no loss counted, the vehicle lost counts for
   who destroyed it), drive (to the host alone) and grant (from the host alone, to a soldier alone), and what is refused */
const N = require('./net'), { ok, done } = require('./harness');
const st = [100, 20, -50, .5, 0, 0, 30, 0, 77, -1, 2, 100];
(async () => {
  await N.start();
  const join = async (name, cls, model) => { const c = await N.raw(); c.send({ t: 'join', room: 'modern', name, cls, model }); c.me = (await c.wait('welcome')).id; c.w = c.got.find(m => m.t === 'welcome'); return c; };
  const h = await join('H', 'trn', 'hmmwv'), a = await join('A', 'inf', 'blueSaw'), e = await join('E', 'tank', 't90');
  ok(h.w.crew === 1 && h.w.trn === 1, 'welcome says crew: 1');
  h.send({ t: 'crew', cls: 'inf', model: 'blueRifle', st }); let m = await a.wait('crew');
  ok(m && m.id === h.me && m.cls === 'inf' && m.model === 'blueRifle' && m.st.length === 12 && m.x === undefined && !(await h.wait('crew', 150)), 'crew to inf with the vehicle left: the room is told, the sender is not');
  h.send({ t: 'mstate', p: [0, 0, 0], a: [0, 0], v: [0, 0], s: 0, hp: 100, f: 0 }); ok(await a.wait('mstate'), 'and the server takes a soldier\'s state from it now');
  h.send({ t: 'crew', cls: 'trn', model: 'tigr' }); h.send({ t: 'crew', cls: 'tank', model: 'abrams' }); h.send({ t: 'crew', cls: 'inf', model: 'nobody' });
  ok(!(await a.wait('crew', 200)), 'refused: the other side\'s vehicle, a class that is neither, a kit that does not exist');
  e.send({ t: 'crew', cls: 'inf', model: 'redRifle' }); ok(!(await a.wait('crew', 200)), 'refused: from a tank');
  a.send({ t: 'drive', v: -7, s: 0 }); m = await h.wait('drive');
  ok(m && m.from === a.me && m.v === -7 && m.s === 0 && !(await e.wait('drive', 100)), 'drive goes to the host alone');
  a.send({ t: 'drive', v: 3, s: 0 }); a.send({ t: 'drive', v: -7, s: 2 }); e.send({ t: 'drive', v: -7, s: 0 }); h.send({ t: 'drive', v: -7, s: 0 });
  ok(!(await h.wait('drive', 200)), 'refused: a player\'s vehicle, a passenger\'s seat, a sender that is no soldier, the host itself');
  h.send({ t: 'grant', to: a.me, v: -7, s: 0, st, o: [0, 0, 0, 0, 0] }); m = await a.wait('grant');
  ok(m && m.v === -7 && m.st[8] === 77 && m.o.length === 5 && !(await e.wait('grant', 100)), 'grant goes to that soldier alone');
  a.send({ t: 'grant', to: h.me, v: -7, s: 0, st, o: [] }); h.send({ t: 'grant', to: e.me, v: -7, s: 0, st, o: [] }); h.send({ t: 'grant', to: a.me, v: -7, s: 0, st: st.slice(1), o: [] });
  ok(!(await h.wait('grant', 150)) && !(await e.wait('grant', 100)) && !(await a.wait('grant', 100)), 'refused: not from the host, to one who is no soldier, a state of the wrong shape');
  a.send({ t: 'crew', cls: 'trn', model: 'hmmwv', v: -7 }); m = await h.wait('crew');
  ok(m && m.id === a.me && m.cls === 'trn' && m.v === -7, 'crew to trn names the entity taken');
  a.send({ t: 'gstate', p: [0, 0, 0], a: [0, 0, 0], v: [0, 0, 0], hp: 30, d: 0, f: 0 }); ok(await h.wait('gstate'), 'and her vehicle\'s state is relayed');
  a.send({ t: 'crew', cls: 'inf', model: 'blueSaw', st, x: 1, by: e.me }); m = await h.wait('crew'); const sc = await h.wait('scores');
  const row = id => sc && sc.players.find(p => p.id === id);
  ok(m && m.x === 1 && m.by === e.me && row(e.me).ai === 1 && row(e.me).kills === 0 && row(a.me).deaths === 0, 'a vehicle lost with its driver out alive: one to the destroyer\'s vehicle count, no kill and no death');
  for (const c of [h, a, e]) c.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
