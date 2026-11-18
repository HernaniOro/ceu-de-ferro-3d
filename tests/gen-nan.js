'use strict';
/* the general's per-road posture with the seat held (PAGE=<page>, PORT_T=<port>): a lone player joins as infantry and claims the chair
   (as the hangar's "General" does); the view model's roads carry finite forces and a ratio, the posture text never says NaN. About 20 s */
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const dt = 1 / 60;
(async () => {
  await N.start();
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: 11, eco: true }), $ = c.$, Net = $('Net');
  c.on = true;
  await new Promise((res, rej) => { Net.ui.welcome = () => { c.newState('modern', 'blueRifle', { net: true, cls: 'inf', mouse: true, host: Net.host === Net.id }); res(); }; Net.ui.refused = rej; Net.connect('modern', 'Solo', 'inf', 'blueRifle'); });
  const run = async s => { for (let i = 0; i < s / dt; i++) { c.step(dt); Net.tick(dt); if (i % 2 === 0) await new Promise(r => setImmediate(r)); } await N.sleep(40); };
  const S = () => $('S'), chk = (tag) => {
    const V = c.genVM(0, false), R = V.road;
    ok(!!R && R.length > 0 && R.every(r => [r.own, r.foe, r.k].every(Number.isFinite) && typeof r.post === 'string'), tag + ': every road has finite own/foe/ratio and a posture (' + JSON.stringify(R && R.map(r => [r.own, r.foe, r.k, r.post])) + ')');
    ok(!/NaN/.test(JSON.stringify(V.post)), tag + ': the posture text has no NaN');
  };
  c.genClaim(1); await run(.1);
  chk('right after the claim, before the planner has run');
  await run(6);
  ok(S().gctl && S().gctl[0].seat === 'me' && S().gctl[0].atk === 'me', 'seat and attack domain are mine (host ' + S().host + ')');
  chk('after the claim');
  Net.close(); N.stop(); done();
})().catch(e => { console.error(e); N.stop(); process.exit(1); });
