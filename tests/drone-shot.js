'use strict';
/* Small drones against AI shooters: an FPV flown at a squad of six riflemen and at a tank with a machine gun, from 400 m, straight in and with
   mild jinking, RUNS times each (40): the share shot down before it got there. And one that hovers near the squad. Most AI soldiers do not shoot at
   a small drone at all (DSHOT.share, the trait ai.dsh), and those that do are slow, short in their bursts and lose it when it jinks, so a straight-in
   drone is shot down rarely and a hovering one is in real danger. PAGE=<page> tests another copy (the page before the change prints its shares) */
const H = require('./harness'), C = H.load({ seed: 31 }), $ = C.$, ok = H.ok, RUNS = +process.env.RUNS || 40;
const DRONES = $('DRONES'), manBrain = $('manBrain'), DSHOT = $('DSHOT');
let S, T;
const fresh = i => {
  S = C.sandbox('modern'); T = S.T; S.over = false; S.demo = false; S.waveTimer = S.planT = 1e9; S.base[0].hp = S.base[1].hp = 1e9; S.input = {}; S.aim = { h: 0, p: 0, d: { x: 1, y: 0, z: 0 } }; S.mouse = true; S.my = null;
  C.run(.05); S.units = []; S.men = []; S.squads = []; S.planes = []; S.dsd = 12345 + i * 7919; return S;
};
function flat() {
  for (let z = -S.HW + 600; z < S.HW - 600; z += 97) for (let x = 900; x < S.W - 900; x += 131) {
    const h = C.hgt(x, z); let lv = h > T.WL + 6 && C.routeDist(T, x, z) > 120;
    for (const [a, b] of [[-560, 0], [460, 0], [0, 60], [0, -60], [100, 0], [-60, 0], [300, 0], [200, 0]]) if (Math.abs(C.hgt(x + a, z + b) - h) > Math.hypot(a, b) * .012 + .15) lv = false;
    if (lv && !C.near(x, z, 170).length) return { x, z, y: h };
  }
  throw new Error('no flat ground');
}
/* what defends: six riflemen in a loose group facing the drone, or a tank with a machine gun */
function defend(kind, F, i) {
  const X = F.x + 400;
  if (kind === 'squad') { for (let k = 0; k < 6; k++) { const m = C.addMan('rifleman', 1, X + (k % 3) * 4, F.z + (k >> 1) * 4 - 4, Math.PI); m.ai = manBrain(k); m.ai.gx = m.x; m.ai.gz = m.z; } return { x: X + 4, z: F.z }; }
  const u = C.addUnit('tank', 1, X, F.z, 't72', true); return { x: X, z: F.z, u };
}
/* one flight: from 400 m out and 25 m up (its operator 500 m behind it, out of the defenders' reach), to the target; sp m/s; jink: the share of the speed it swerves sideways, every 1.5 s; hover: it stops 60 m short, 12 m up, for 20 s */
function run(kind, mode, i) {
  const F = (fresh(i), flat()), d = defend(kind, F, i), y1 = C.hgt(d.x, d.z) + 1.5, a = { x: F.x, y: F.y + 25, z: F.z + (i % 5 - 2) * 3 };
  const P = C.addMan('blueDrone', 0, a.x - 500, a.z + 60, 0); P.ai = null; P.inv = 1e9; S.my = P; S.me = 0;
  const hov = mode === 'hover', b = hov ? { x: d.x - 60, y: F.y + 12, z: d.z } : { x: d.x, y: y1, z: d.z }, L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), dx = (b.x - a.x) / L, dy = (b.y - a.y) / L, dz = (b.z - a.z) / L, sp = DRONES.fpv.vmax, jk = mode === 'jink' ? .3 : 0;
  const o = C.addDrone('fpv', 0, a.x, a.y, a.z, 0, P, null); o.t0 = S.t - 10; const t0 = S.t; let tr = 0, held = false;
  C.run(hov ? 40 : 30, () => {
    o.link = o.lq = 1; tr = (o.x - a.x) * dx + (o.y - a.y) * dy + (o.z - a.z) * dz;
    if (o.dead || o.gone) return false;
    if (hov) { if (tr >= L - 1) held = true; if (held) { if (S.t - t0 > 40) return false; return true; } }
    if (!held) { const w = Math.sin((S.t - t0) * 2 * Math.PI / 1.5) * jk * sp; o.v = { x: dx * sp - dz * w, y: dy * sp, z: dz * sp + dx * w }; }
    return tr < L + 20;
  });
  const men = S.men.filter(m => m.team === 1);
  return { shot: !!o.dead, end: o.end, tr, L, shooters: men.filter(m => m.ai && m.ai.dsh).length, men: men.length, u: d.u && d.u.ai && d.u.ai.dsh };
}
const rate = (kind, mode) => { let n = 0, sh = 0, sd = 0; for (let i = 0; i < RUNS; i++) { const r = run(kind, mode, i); n++; if (r.shot) sh++; sd += r.shooters || (r.u ? 1 : 0); } return { n, sh, share: sh / n, trait: sd / n }; };
const out = {};
for (const [kind, mode] of [['squad', 'straight'], ['squad', 'jink'], ['squad', 'hover'], ['tank', 'straight'], ['tank', 'jink']]) {
  const r = out[kind + ' ' + mode] = rate(kind, mode);
  console.log('   ' + (kind === 'squad' ? 'squad of six' : 'tank with an MG').padEnd(16) + mode.padEnd(9) + ' shot down ' + r.sh + '/' + r.n + ' (' + (r.share * 100).toFixed(0) + '%)' + (r.trait ? '; firing ones per run ' + r.trait.toFixed(2) : ''));
}
if (DSHOT.react[0] > .8 || DSHOT.man.share) {
  ok(out['squad straight'].share <= .2, 'a squad shoots down a straight-in FPV rarely');
  ok(out['squad jink'].share <= out['squad straight'].share + .05 && out['squad jink'].share <= .2, 'and a jinking one no more often');
  ok(out['squad hover'].share >= .5, 'but a hovering one near it is in real danger');
  ok(out['tank straight'].share <= .15 && out['tank jink'].share <= .15, 'a tank machine gun seldom takes one');
}
H.done();
