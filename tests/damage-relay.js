'use strict';
/* the relay server and the longer damage model: dcap, the wider part states, part indices past ten, the new kinds of hit, via */
const N = require('./net'), { ok, done } = require('./harness');
(async () => {
  await N.start(); console.log('server: ' + N.SERVER);
  const join = async (cls, model) => { const c = await N.raw(); c.send({ t: 'join', room: 'modern', name: cls, cls, model }); c.w = await c.wait('welcome', 800); c.id = c.w && c.w.id; return c; };
  const none = async (c, t) => !(await c.wait(t, 150));
  const h = await join('tank', 'abrams'), a = await join('tank', 't90'), b = await join('plane', 'f22');
  const cap = await h.wait('dcap', 400); ok(h.w && cap && cap.v === 1 && h.w.crew === 1, 'dcap follows welcome');
  const gs = d => ({ t: 'gstate', p: [1, 2, 3], a: [0, 0, 0], v: [0, 0, 0], hp: 90, f: 0, d });
  const big = 2 ** 49 - 1; a.send(gs(big)); let m = await h.wait('gstate'); ok(m && m.d === big && m.from === a.id, '24 parts destroyed and burning pass, exactly');
  a.send(gs(0)); m = await h.wait('gstate'); ok(m && m.d === 0, 'and 0 for something whole');
  a.send(gs(1398101)); m = await h.wait('gstate'); ok(m && m.d === 1398101, 'the old number still passes');
  for (const d of ['AB', -1, 2 ** 49, 1.5, null, [1], { a: 1 }]) a.send(gs(d));
  ok(await none(h, 'gstate'), 'refused: a string, numbers out of range or not whole, anything else');
  b.send({ t: 'state', p: [1, 2, 3], q: [0, 0, 0, 1], v: [1, 0, 0], thr: 1, hp: 50, f: 0, d: 2 ** 48 + 3 }); m = await h.wait('state'); ok(m && m.d === 2 ** 48 + 3, 'a plane\'s too');
  a.send({ t: 'hit', to: h.id, dmg: 12.5, pt: 19, k: 1, w: 2, v: [9, 14] }); m = await h.wait('hit');
  ok(m && m.pt === 19 && m.k === 1 && m.w === 2 && m.v && m.v.join() === '9,14' && m.from === a.id, 'a hit on part 19 by a shaped charge, with the parts behind it');
  a.send({ t: 'hit', to: h.id, dmg: 3, pt: 2, k: 0 }); m = await h.wait('hit'); ok(m && m.v === undefined && m.w === undefined, 'no via, no field');
  a.send({ t: 'hit', to: h.id, dmg: 3, pt: 2, k: 1, v: [1, 2, 3, 4] }); m = await h.wait('hit'); ok(m && m.v === undefined && m.pt === 2, 'a via that is too long or not parts is dropped, the hit passes');
  for (const o of [{ pt: 24, k: 1 }, { pt: 3, k: 4 }, { pt: -1, k: 0 }, { pt: 1.5, k: 0 }]) a.send(Object.assign({ t: 'hit', to: h.id, dmg: 3 }, o));
  ok(await none(h, 'hit'), 'refused: part 24, kind 4');
  h.send({ t: 'ai', k: 1, e: [[-1, 'abrams', 0, 100, 0, 1, 2, 3, 0, 0, 0, 0, 0, 2 ** 48 + 12]] }); m = await a.wait('ai'); ok(m && m.e[0][13] === 2 ** 48 + 12, 'an AI vehicle row with the wider states');
  h.send({ t: 'ai', k: 0, e: [[-2, 'f22', 0, 100, 0, 1, 2, 3, 0, 0, 0, 1, 0, 0, 0, 4 ** 19]] }); m = await a.wait('ai'); ok(m && m.e[0][15] === 4 ** 19, 'and an AI plane row');
  h.send({ t: 'ai', k: 1, e: [[-1, 'abrams', 0, 100, 0, 1, 2, 3, 0, 0, 0, 0, 0, 2 ** 49]] }); ok(await none(a, 'ai'), 'a row with states out of range is refused');
  a.send({ t: 'aihit', to: -1, dmg: 20, pt: 15, k: 1, w: 1, v: [3] }); m = await h.wait('aihit'); ok(m && m.pt === 15 && m.w === 1 && m.v[0] === 3, 'aihit carries them to the host');
  N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
