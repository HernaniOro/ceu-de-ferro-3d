'use strict';
/* Friendly fire: a friend's bullet and blast hurt with FF.on and not without, the shooter's own side is safe at the muzzle, an AI with a friend on
   its line holds fire, and a 60 s battle has no NaN and few team kills against enemy kills */
const H = require('./harness'), ok = H.ok;
const C = H.load({ seed: 3 }), $ = C.$, FF = $('FF'), S = C.sandbox('ww2'), kit = $('INF').ww2[0].find(k => $('KITS')[k]) || Object.keys($('KITS'))[0];
const man = (t, x, z) => { const m = C.addMan(kit, t, x, z, 0); m.inv = 0; return m; };
const fire = (dmg, dx) => { const a = man(0, 100, 100), v = man(0, 100 + dx, 100), y = v.y + 1; let n = 0; C.$('S').bullets.push({ x: 100 + dx - 3, y, z: 100, vx: 400, vy: 0, vz: 0, life: 1, team: 0, dmg, ap: 0, by: a, tr: 0 }); const hp = v.hp; C.run(.2); return hp - v.hp; };
for (const on of [1, 0]) { FF.on = on;
  const d = fire(30, 30); ok(on ? d > 0 : d === 0, 'FF.on=' + on + ': a friend\'s bullet takes ' + d.toFixed(1) + ' hp from a friend');
  const a = man(0, 300, 300), v = man(0, 310, 300), e = man(1, 300, 310), h0 = v.hp, e0 = e.hp; C.explode(305, v.y, 300, 20, 60, a, 0, true); ok(on ? v.hp < h0 : v.hp === h0, 'FF.on=' + on + ': a friend\'s blast ' + (on ? 'hurts' : 'spares') + ' a friend (' + (h0 - v.hp).toFixed(1) + ' hp)'); }
FF.on = 1;
{ const d = fire(30, 4); ok(d === 0, 'at the muzzle (4 m) a friend is safe'); }
{ const a = man(0, 500, 500), v = man(0, 560, 500), f = man(0, 530, 500), t = man(1, 700, 500);
  for (const o of [v, f, t]) o.y = a.y;   // flat ground for the line
  ok(!!$('ffLine')(a, t) && $('ffHeld')(a, t), 'an AI with a friend on its line holds fire');
  f.z = 540; v.z = 540; a.ffT = 0; ok(!$('ffLine')(a, t), 'with the friend 40 m off the line it fires'); }
FF.on = 1;
for (const sd of [11]) { const C2 = H.load({ seed: sd }), S2 = C2.newState('ww2', C2.$('ERAS').ww2.sides[0].fighter, { cls: 'plane' }); let tk = 0, ek = 0;
  const g = C2.killMan; C2.killMan = (m, b) => { if (!m.dead && b && b.team !== undefined && b.team !== m.team) ek++; return g(m, b); };
  const P = S2.my; C2.run(60, () => { P.inv = 9; P.hp = P.def.hp; S2.lives = 9; S2.base[0].hp = 300; });
  const n = H.nan(S2); ok(!n, 'a 60 s battle with FF on: no NaN' + (n ? ' ' + n : ''));
  tk = S2.ffk || 0; console.log('   team kills ' + tk + ', enemy kills (soldiers) ' + ek); ok(tk <= ek, 'far fewer team kills than enemy kills'); }
H.done();
