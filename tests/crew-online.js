'use strict';
/* crew online, headless, through the real relay server: a host in an HMMWV, a guest soldier on its side and a guest soldier on the other
   who only watches. The host gets out and the guest takes the wheel (drive, grant, crew); the guest drives, is hit, gets out and the
   vehicle is the host's again with what it had; the host's soldier takes it back; the gun seat; the guest leaving the room at the wheel;
   the host leaving with the guest at the wheel */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + name.charCodeAt(0) }), $ = c.$, Net = $('Net');
  c.name = name; c.$ = $; c.Net = Net; c.on = true;
  await new Promise((res, rej) => { Net.ui.welcome = () => { c.newState('modern', model, { net: true, cls, mouse: true, host: Net.host === Net.id }); res(); }; Net.ui.refused = code => rej(new Error(name + ' refused: ' + code)); Net.connect('modern', name, cls, model); });
  $('resupply = () => { S.rearm = 0; }');   // the test stands on the home airfield, which would mend and rearm what it measures
  Object.defineProperty(c, 'S', { get: () => $('S') }); c.id = Net.id; c.plan = () => {}; c.director = () => {}; all.push(c); return c;
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
const put = (c, x, z, h) => { const P = c.S.my; P.x = x; P.z = z; P.y = P.man ? c.$('manY')(x, z) : c.hgt(x, z); if (h !== undefined) { P.h = h; if (c.S.aim) c.S.aim.h = h; } P.inv = 0; };
const press = async (c, k) => { c.S.input[k] = true; await run(.05); c.S.input[k] = false; await run(.25); };
const gh = (c, o) => c.Net.ghosts.get(o.id), rec = (c, o) => c.Net.players.get(o.id), near = (c, u) => [...c.Net.ai.values()].find(o => o.occ && Math.hypot(o.x - u.x, o.z - u.z) < 6);
const cars = c => c.S.units.filter(u => u.kind === 'car' && !u.dead).length;

(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const h = await client('Hugo', 'trn', 'hmmwv'), a = await client('Ana', 'inf', 'blueSaw'), c = await client('Caio', 'inf', 'redRifle');
  const B = h.S.base[0], BX = B.x - 300, BZ = B.z - 150;
  ok(h.Net.crew && a.Net.crew && h.S.host && h.S.rider && h.S.rider.in === h.S.my, 'welcome says crew; Hugo hosts in an HMMWV with his soldier at the wheel');
  await run(.5); put(h, BX, BZ, 0); put(a, BX + 3, BZ + 6); put(c, BX + 60, BZ + 40); await run(1);
  const V = h.S.my, hm = h.S.rider, Va = gh(a, h), Vc = gh(c, h);
  ok(Va && Vc && Va.kind === 'car' && cars(a) === 1 && cars(c) === 1, 'one HMMWV on every client');
  /* the host gets out */
  V.arms[0].ammo = 77; V.hp = V.max - 7; const dH = rec(a, h).deaths;
  await press(h, 'yawR'); await run(.8);
  ok(h.S.my === hm && V.aid < 0 && !V.net && V.left && rec(a, h).cls === 'inf' && rec(a, h).deaths === dH, 'Hugo steps out: he is a soldier, the HMMWV is an AI entity of the host, parked, and nobody died');
  ok(a.Net.ai.get(V.aid) === Va && c.Net.ai.get(V.aid) === Vc && Va.bye && gh(a, h) && gh(a, h).man && gh(c, h).man && cars(a) === 1 && cars(c) === 1, 'on both guests the same HMMWV is now that entity, and Hugo a soldier beside it');
  /* the guest takes the wheel */
  put(h, BX - 12, BZ - 9); await run(.5);
  ok(a.S.near === Va && a.S.nearS === 0, 'Ana, beside it, is offered the wheel');
  await press(a, 'yawR'); await run(.8);
  ok(a.S.my === Va && a.S.rider && Va.occ[0] === a.S.rider && !Va.net && !Va.aid && Va.arms[0].ammo === 77 && Math.abs(Va.hp - (V.max - 7)) < .11, 'E: the host grants it, and it is hers, with its 77 rounds and its damage');
  ok(gh(h, a) === V && V.net && V.pid === a.id && !V.aid && rec(h, a).cls === 'trn' && gh(c, a) === Vc && Vc.pid === a.id && cars(h) === 1 && cars(c) === 1, 'the host and the third client have the same vehicle as her ghost now');
  const x0 = Va.x; a.S.aim.h = Va.h; a.S.input.up = true; await run(4); a.S.input.up = false; a.S.input.brake = true; await run(3); a.S.input.brake = false;
  ok(Va.x - x0 > 20 && Math.hypot(V.x - Va.x, V.z - Va.z) < 3 && Math.hypot(Vc.x - Va.x, Vc.z - Va.z) < 3, 'she drives ' + Math.round(Va.x - x0) + ' m and both others follow her snapshots');
  /* a hit on her vehicle goes to her */
  const hp0 = Va.hp; h.$('damageUnit')(V, 6, h.S.my, false, { k: 0, pt: 0 }); await run(.6);
  ok(Va.hp < hp0 && Math.abs(V.hp - Va.hp) < .2, 'a hit resolved on the host lands on her copy (' + hp0.toFixed(1) + ' to ' + Va.hp.toFixed(1) + ')');
  /* gun seat and back */
  await press(a, 'yawL'); ok(a.S.my === Va && a.S.rider.seat === 1 && rec(h, a).cls === 'trn' && gh(h, a) === V, 'Q, stopped: she moves to the gun and the vehicle is still hers');
  a.S.input.fire = true; await run(1); a.S.input.fire = false; await run(.3);
  ok(Va.arms[0].ammo < 77, 'and fires it (' + Va.arms[0].ammo + ' rounds left)');
  /* she gets out: the host's again */
  const am = Va.arms[0].ammo, dA = rec(h, a).deaths; await press(a, 'yawR'); await run(.8);
  ok(a.S.my.man && !a.S.my.in && V.aid < 0 && !V.net && V.left && V.arms[0].ammo === am && rec(h, a).cls === 'inf' && rec(h, a).deaths === dA, 'she gets out: the host owns it again, parked, with the ' + am + ' rounds she left');
  ok(a.Net.ai.get(V.aid) === Va && Va.net && c.Net.ai.get(V.aid) === Vc && cars(a) === 1 && cars(c) === 1 && gh(c, a).man, 'and it is the same object on both guests, under the host\'s new id');
  /* the other side is not offered it */
  put(c, Vc.x + 3, Vc.z + 4); await run(.5); ok(!c.S.near, 'Caio, an enemy beside it, is not offered it');
  put(c, BX + 60, BZ + 40);
  /* the host's soldier takes it back */
  put(h, V.x + 3, V.z + 5); await run(.5); await press(h, 'yawR'); await run(.8);
  ok(h.S.my === V && !V.aid && rec(a, h).cls === 'trn' && gh(a, h) === Va && Va.pid === h.id && gh(c, h) === Vc, 'Hugo takes the wheel again: his vehicle, the same object on both guests');
  await press(h, 'yawR'); await run(.8);
  /* the guest leaves the room at the wheel */
  put(a, Va.x + 3, Va.z + 5); await run(.5); await press(a, 'yawR'); await run(.8);
  ok(a.S.my === Va && gh(h, a) === V, 'Ana takes it once more');
  a.Net.close(); a.on = false; await run(1.5);
  ok(!V.dead && !V.net && V.aid < 0 && V.left && c.Net.ai.get(V.aid) === Vc && cars(c) === 1, 'she leaves the room: the HMMWV stays, the host\'s, parked, on the third client too');
  /* host migration with a guest at the wheel */
  const d = await client('Davi', 'inf', 'blueRifle'); await run(2);
  const Vd = d.Net.ai.get(V.aid); put(d, V.x + 3, V.z + 5); await run(1.5); await press(d, 'yawR'); await run(.8);   // 1.5 s: his ghost on the host has a long way to ease after the jump
  ok(Vd && d.S.my === Vd && gh(h, d) === V, 'Davi, who came later, takes the wheel');
  h.Net.close(); h.on = false; await run(3);
  const nh = c.S.host ? c : d;
  ok(nh.S.host && d.S.my === Vd && !Vd.dead && gh(c, d) === Vc && !Vc.dead, 'Hugo leaves: ' + nh.name + ' hosts, and Davi still drives the HMMWV on both clients');
  await press(d, 'yawR'); await run(1);
  const own = nh === d ? Vd : Vc;
  ok(d.S.my.man && own.aid < 0 && !own.net && !Vd.dead && !Vc.dead && cars(c) === 1 && cars(d) === 1, 'he gets out: the new host owns it, parked');
  for (const x of all) if (x.on) x.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
