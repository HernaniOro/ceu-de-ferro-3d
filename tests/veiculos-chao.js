'use strict';
/* the ground vehicles on the ground (cf-veiculos): every vehicle hung 1.5 m over the ground, its model, its hit boxes, its gun's pivot and
   its seats all from a frame at u.y + 1.5. Now that frame is VLIFT (0) over u.y: checked on the sim (the gun's pivot d.mh over the frame
   is where the model puts the turret, a hit in the middle of the hull lands on it, the AI aims at the vehicle's middle) and on the page's
   text (no model, hit or seat placed at the old 1.5 again). The scene's spring (SUSP) and the pack's turned models (PACK.back: the HMMWV
   drove backwards) are checked on the text: the 3D part is not loaded by the harness */
const fs = require('fs'), H = require('./harness'), { ok, done } = H;
console.log('page: ' + H.PAGE);
const html = fs.readFileSync(H.PAGE, 'utf8');
if (!/const VLIFT = /.test(html)) { console.log('no VLIFT: a page before cf-veiculos'); process.exit(0); }
const C = H.load({ seed: 3 }), $ = C.$, VLIFT = $('VLIFT'), GS = $('GS'), S = () => $('S');

console.log('-- the frame on the ground --');
ok(VLIFT === 0, 'a vehicle\'s frame stands on the ground (VLIFT ' + VLIFT + ')');
const old = [/g\.position\.set\(u\.x, u\.y \+ 1\.5, u\.z\)/, /m\.position\.set\(u\.x, u\.y \+ 1\.5, u\.z\)/, /y - o\.y - \(o\.kind \? 1\.5 : 0\)/, /y - u\.y - 1\.5, z - u\.z/, /SP\.y = u\.y \+ 1\.5/, /d\.mh = 1\.5 \+/, /\(d\.mh - 1\.5\) \/ GS/];
const left = old.filter(r => r.test(html));
ok(!left.length, 'no model, hit, seat or gun pivot from the old frame 1.5 m up' + (left.length ? ': ' + left.map(String).join(' ') : ''));

console.log('-- the sim on that frame --');
C.sandbox('modern');
const TANKS = $('TANKS'), TRNS = $('TRNS'), bodyY = $('bodyY');
for (const [kind, id] of [['tank', 'abrams'], ['tank', 't90'], ['car', 'hmmwv'], ['truck', 'ural'], ['lav', 'lav25']]) {
  const u = C.addVehicle(kind, id, 0, S().base[0].x - 200 - S().units.length * 30, S().base[0].z, 0), d = u.def, hull = d.parts[0].box;
  const mid = C.hitPart(u, u.x + hull[0], u.y + VLIFT + hull[1], u.z + hull[2]);
  ok(mid === 0 || d.parts[mid].box, id + ': a hit in the middle of its hull lands on the vehicle (part ' + d.parts[mid].id + ')');
  ok(d.mh > VLIFT && d.mh - VLIFT < GS * (1 + d.hh + (d.t ? d.t[2] : 1)), id + ': the gun\'s pivot ' + d.mh.toFixed(2) + ' m over the ground, inside the vehicle\'s height');
  const by = bodyY(u) - u.y; ok(by > .5 && by < GS * (.5 + d.hh) + 1, id + ': the AI aims ' + by.toFixed(2) + ' m over the ground, at the body');
}

console.log('-- the scene (text) --');
ok(/const SUSP = \{ f: [\d.]+, z: [\d.]+/.test(html) && !/[?&]susp=/.test(html.replace(/\/\*[\s\S]*?\*\//g, '')), 'one spring (SUSP), no taste left in the URL');
ok(/back: \{ car_hmmwv: 1 \}/.test(html) && /body\.scale\.set\(sx \* bk, sy, sz \* bk\)/.test(html), 'the HMMWV, made facing -x, is turned about the upright (PACK.back)');
ok(/aWheel\.x - uSF\.x\) \* uSF\.z > 0\./.test(html) && /-uSpin \/ aWheel\.w \* uSF\.z/.test(html), 'a turned model\'s wheels roll and steer its way (uSF.z)');
done();
