'use strict';
/* sappers and posts online, headless, through the real relay server on its own port: a guest's sapper lays a mine that its side sees and
   the other does not, the other side's sapper finds it and lifts it, a guest walks onto a mine its side does not know and the host sets it
   off for him, a post built on the host is on every guest with the same soldier at its gun, and when the host leaves the next one keeps
   every mine (the other side's hidden ones too) and never reuses an id */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const all = [], dt = 1 / 60;
async function client(name, cls, model) {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: name.length * 97 + 5 }), $ = c.$, Net = $('Net');
  c.name = name; c.$ = $; c.Net = Net; c.on = true;
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
  await N.sleep(40); return true;
}
const until = async (f, ms) => { for (let t = Date.now(); !f() && Date.now() - t < (ms || 4000);) { await run(.1); await N.sleep(25); } return f(); };
const put = (c, x, z, h) => { const P = c.S.my; P.x = x; P.z = z; P.y = c.hgt(x, z); P.inv = 1e9; c.S.aim.h = h || 0; c.S.aim.p = -.25; };
const tap = async (c, k) => { c.S.input[k] = true; await run(.06); c.S.input[k] = false; await run(.06); };

(async () => {
  await N.start(); console.log('server: ' + N.SERVER + '\npage:   ' + H.PAGE);
  const host = await client('Host', 'tank', 'abrams'), g1 = await client('Azul', 'inf', 'blueEng'), g2 = await client('Verm', 'inf', 'redEng'), g3 = await client('Fuzil', 'inf', 'redRifle');
  const T = host.S.T, hd = host.$('hdist'), SAP = host.$('SAP'), FORT = host.$('FORT');
  await run(1);
  ok([host, g1, g2, g3].every(c => c.Net.sap) && host.S.host, 'the server knows the sappers (sap)');
  /* open ground away from everyone */
  let p = null;
  for (let z = -3000; z < 3000 && !p; z += 173) for (let x = 3000; x < host.S.W - 3000 && !p; x += 211) {
    const h = host.hgt(x, z); let lv = h > T.WL + 6 && host.routeDist(T, x, z) > 200 && !host.near(x, z, 150).length;
    for (const [a, b] of [[60, 0], [-60, 0], [0, 60], [0, -60]]) if (Math.abs(host.hgt(x + a, z + b) - h) > 2) lv = false;
    if (lv && host.S.men.every(m => hd(m, { x, z }) > 300) && host.S.units.every(u => hd(u, { x, z }) > 300)) p = { x, z };
  }
  const away = c => put(c, p.x + 600, p.z + 600 + 40 * all.indexOf(c));
  for (const c of [g1, g2, g3]) away(c);
  put(host, p.x - 900, p.z);
  /* g1 lays an AT mine through its own hands: N past the last work to the AT mine, then the trigger */
  put(g1, p.x, p.z, 0); await run(.3);
  g1.S.fm = { k: FORT.K.length - 1, P: g1.S.my }; await tap(g1, 'build'); await run(.2); await tap(g1, 'fire');
  const laid = await until(() => host.S.mines && host.S.mines.length === 1 && g1.S.mines && g1.S.mines.length === 1);
  const m0 = host.S.mines && host.S.mines[0];
  await run(1);
  ok(laid && m0 && m0.team === 0 && m0.k === 0 && g1.S.my.mn[0] === SAP.mines[0] - 1 && Math.abs(hd(m0, g1.S.my) - SAP.put) < 1, 'a guest\'s sapper lays an AT mine: the host has it, and so does the guest');
  ok(!(g2.S.mines || []).length && !(g3.S.mines || []).length, 'the other side\'s players are not sent it');
  /* g2, the other side's sapper, walks up to it, finds it and lifts it with V */
  put(g2, m0.x + 15, m0.z + 2, Math.PI);
  const found = await until(() => (g2.S.mines || []).some(o => o.id === m0.id));
  ok(found && (m0.kn & 2), 'the other side\'s sapper comes within ' + SAP.det + ' m: the host marks it known to his side, and it reaches him');
  put(g2, m0.x + 1.5, m0.z, Math.PI); await run(.3); await tap(g2, 'ordB');
  const lifting = !!g2.S.ml; await run(SAP.clear + .5);
  const gone = await until(() => !host.S.mines.length && !g1.S.mines.length);
  ok(lifting && gone, 'V by it lifts it: after ' + SAP.clear + ' s it is gone on the host and on its own side too');
  away(g2);
  /* an AP mine g3 does not know: the host sets it off under his body, and the burst is his own */
  put(g1, p.x + 200, p.z, 0); await run(.3); g1.S.mm = null; g1.S.fm = { k: FORT.K.length - 1, P: g1.S.my }; await tap(g1, 'build'); await tap(g1, 'build'); await run(.2); await tap(g1, 'fire');
  await until(() => host.S.mines.some(o => o.k === 1));
  const ap = host.S.mines.find(o => o.k === 1); away(g1); await run(SAP.arm + .5);
  const P3 = g3.S.my, hp0 = P3.hp; P3.inv = 0; put(g3, ap.x + 6, ap.z, Math.PI); P3.inv = 0;
  g3.S.input.up = true; const boom = await until(() => !host.S.mines.some(o => o.id === ap.id), 8000); g3.S.input.up = false; await run(.5);
  console.log('   the AP mine went off ' + (boom ? 'under him' : 'never') + ': his hp ' + hp0 + ' to ' + Math.max(0, Math.round(P3.hp)) + (P3.dead ? ', dead' : ''));
  ok(boom && (P3.dead || P3.hp < hp0), 'a guest walks onto an AP mine his side does not know: the host sets it off and the burst hurts the guest on his own client');
  /* a machine-gun nest built on the host, with its garrison */
  const f = host.fortStart(4, 0, p.x - 300, p.z, 0); host.fortAt(f, 1);
  const seen = await until(() => [g1, g2, g3].every(c => c.S.forts.some(q => q.id === f.id && q.prog >= 1)) && !!f.gm, 15000);
  await run(2);
  const gm = f.gm, onG = g1.S.forts.find(q => q.id === f.id), gun = onG && onG.gm;
  console.log('   the nest\'s gunner: ' + (gm ? gm.def.name + ' (' + gm.aid + ')' : 'nobody') + ' on the host; on a guest ' + (gun ? gun.def.name + ' (' + gun.aid + ') with ' + gun.arms[0].d.name : 'nobody'));
  ok(seen && gm && gun && gun.aid === gm.aid && gun.arms[0].d.name === gm.arms[0].d.name && gun.arms[0].d.lmg, 'a post built on the host is on every guest, its garrison at it and the same soldier at its gun');
  /* the host leaves: the next one (g1, side 0) keeps the other side's mine it was never told of, sends it on to that side, and gives out no id used before */
  const hid = host.$('mineLay')(0, 1, p.x + 40, p.z - 60), used = Math.max(m0.id, ap.id, hid ? hid.id : 0), has = (c, o) => !!o && (c.S.mines || []).some(q => q.id === o.id && !q.gone);
  const sent = await until(() => has(g2, hid) && has(g3, hid));
  ok(hid && sent && !has(g1, hid), 'a side 1 mine the host lays reaches side 1, not g1 on side 0');
  host.Net.close(); host.on = false;
  const took = await until(() => g1.S.host, 6000); await run(2);
  ok(took && has(g1, hid) && has(g2, hid) && has(g3, hid), 'the host leaves: the next host (side 0) has the other side\'s hidden mine, and that side still has it from him');
  const g4 = await client('Novo', 'inf', 'blueRifle'); away(g4);
  const nm = g1.$('mineLay')(0, 0, p.x - 40, p.z + 60);
  const got = await until(() => has(g4, nm)); await run(1);
  console.log('   the new host\'s first mine: id ' + (nm && nm.id) + ' (ids used before: up to ' + used + ')');
  ok(nm && nm.id > used && got && has(g2, hid), 'the new host gives its first mine an id never used in the match, and side 1 still has its own');
  ok(!has(g4, hid), 'a side 0 player who joins after the handover is not sent the other side\'s hidden mine');
  for (const c of all) c.Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
