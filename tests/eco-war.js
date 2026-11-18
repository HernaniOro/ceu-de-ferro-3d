'use strict';
/* The economy at war (slice 3): a site is found by the other side and remembered (kn), shown in its view, a target of tanks, batteries, drones
   and attack planes; a guard and a fixed AA at a site on the def command; a strike orders a fire mission, only on a site that was seen; a scout
   moves the reconnaissance post; the AI looks and strikes by itself. ww2, seed 41, economy on. PAGE=<page> */
const H = require('./harness'), ok = H.ok;
const era = 'ww2', fresh = seed => { const C = H.load({ seed, eco: true }), S = C.newState(era, C.$('ERAS')[era].sides[0].fighter, { cls: 'plane' }); return { C, S, $: C.$, ECO: C.$('ECO') }; };
const J = v => JSON.stringify(v);
/* a place 250-350 m from a site where a vehicle of side 0 sees it */
function open(C, S, e) {
  const sees = C.$('sees');
  for (let r = 300; r <= 340; r += 20) for (let a = 0; a < 6.3; a += .4) {
    const t = C.addVehicle('tank', 'pz4', 0, e.x + Math.cos(a) * r, e.z + Math.sin(a) * r, 0); t.inv = 1e9;
    if (sees(t, e)) return t; t.dead = true;
  }
  return null;
}

console.log('-- found, remembered, shown --');
{
  const { C, S, $, ECO } = fresh(41), E = S.eco, pow = E.l.find(e => e.team === 1 && e.k === 'pow'), fab = E.l.find(e => e.team === 1 && e.k === 'fab');
  ok(Object.keys(E.d[0].kn).length === 0 && !$('spotted')(pow), 'at the start side 0 knows no enemy site');
  const tank = open(C, S, pow); ok(!!tank, 'a tank of side 0 stands in the open 300 m from side 1\'s usina');
  C.run(2);
  const k = E.d[0].kn[pow.id];
  ok(!!k && k.k === 'pow' && !k.dead && Math.hypot(k.x - pow.x, k.z - pow.z) < 1, 'it is in side 0\'s memory (kn)');
  const V = C.ecoView(0), f = V.foe.find(f => f.id === pow.id);
  ok(!!f && f.age < 3 && f.k === 'pow' && V.foe.length === 1, 'ecoView(0).foe lists it with age ' + (f && f.age));
  ok(C.genVM(0, false).eco.sites.some(s => s.t === 1 && s.k === 'pow' && Math.hypot(s.x - pow.x, s.z - pow.z) < 1), 'the general\'s view layer shows it');
  ok(!E.d[1].kn[pow.id] && C.ecoView(1).foe.length === 0, 'and side 1 learned nothing of side 0\'s sites from it');
  ok(S.glog.l[0].some(e => e.s.startsWith('Localizada usina inimiga')) && S.glog.l[0].filter(e => e.s.startsWith('Localizada usina')).length === 1, 'the log says so once');
  const list = []; $('bldTargets')(tank, list); ok(list.includes(pow), 'bldTargets(tank) includes it (a battery and a tank can pick it)');
  /* the strike: only on a site that was seen */
  const n0 = $('cmdOf')(0).fm.length;
  ok(!fab.dead && !E.d[0].kn[fab.id] && C.ecoCmd(0, { c: 'strike', id: fab.id }, 'ai').why === 'unknown', 'a strike on a site never seen: unknown');
  const r = C.ecoCmd(0, { c: 'strike', id: pow.id }, 'ai');
  ok(r.ok && E.d[0].tg === pow.id && $('cmdOf')(0).fm.length === n0 + 1 && $('cmdOf')(0).fm.some(M => M.k === 'he' && Math.hypot(M.x - pow.x, M.z - pow.z) < 1), 'a strike on the seen usina is taken: priority target set, a fire mission (S.cmd[0].fm ' + n0 + ' -> ' + $('cmdOf')(0).fm.length + ')');
  ok(C.ecoView(0).tg === pow.id, 'the view shows the priority target');
  C.hitObj(pow.o, 1e5, null);
  ok(pow.dead && E.d[0].kn[pow.id].dead && C.ecoView(0).foe.find(f => f.id === pow.id).dead, 'destroyed, the memory says dead');
  ok(H.nan(S) === null, 'no NaN');
}

console.log('-- guard and fixed AA on the def command --');
{
  const { C, S, $, ECO } = fresh(41), E = S.eco, fab = E.l.find(e => e.team === 0 && e.k === 'fab'), pow = E.l.find(e => e.team === 0 && e.k === 'pow'), d = E.d[0];
  E.open = false; d.res.aaf = ['hq'];
  for (const u of S.units) if (u.fixed && u.kind === 'aa' && u.team === 0 && Math.hypot(u.x - fab.x, u.z - fab.z) < ECO.gd.r * 2) u.dead = true;
  ok(C.ecoCmd(0, { c: 'def', id: fab.id, inf: 0, aa: 1 }, 'ai').ok, 'def on the fabrica: a fixed AA');
  C.run(5);
  const aa = S.units.find(u => !u.dead && u.fixed && u.es === fab);
  ok(!!aa && Math.hypot(aa.x - fab.x, aa.z - fab.z) < ECO.gd.r && (d.res.aaf || []).length === 0, 'within 5 s a fixed AA of side 0 stands by it, drawn from the reserve (' + (aa ? Math.round(Math.hypot(aa.x - fab.x, aa.z - fab.z)) : '-') + ' m)');
  C.run(3); ok(S.units.filter(u => !u.dead && u.fixed && u.es === fab).length === 1, 'and only one');
  ok(C.ecoView(0).sites.find(s => s.id === fab.id).aa >= 1 && S.glog.l[0].some(e => e.s.startsWith('Antiaérea fixa instalada')), 'the view counts it and the log says so');
  C.ecoCmd(0, { c: 'def', id: pow.id, inf: 1, aa: 0 }, 'ai');
  const mine = S.squads.filter(q => q.team === 0), P = $('cmdPosts')($('cmdOf')(0), mine, {}), g = P.filter(p => p[0] === 'egd');
  ok(g.length === 1 && g[0][2] === pow.j * 2, 'cmdPosts lists an egd post for the guarded usina (' + J(g) + ')');
  const O = $('post')(0, 'egd', pow.j * 2);
  ok(O && O.k === 'hold' && O.es === pow && Math.hypot(O.x - pow.x, O.z - pow.z) < 1 && $('GEN').tag.egd === 'GIN', 'its order holds the site, and the job has a name and a tag');
  const n = S.squads.length; d.res.squad = ['hq']; $('reinforce')(0, 'egd', pow.j * 2);
  const q = S.squads.find(q => q.job === 'egd'); ok(S.squads.length === n + 1 && !!q && q.ord.es === pow, 'a reinforcement from the reserve becomes the guard squad');
  const P2 = $('cmdPosts')($('cmdOf')(0), S.squads.filter(q => q.team === 0), { egd: [pow.j * 2] }); ok(!P2.some(p => p[0] === 'egd'), 'and the post is not asked for again');
  C.hitObj(pow.o, 1e5, null); C.run(1);
  C.plan(0); ok(!(q.job === 'egd' && q.ord.es.dead), 'the guard of a site that is gone is released');
}

console.log('-- the AI looks, finds, strikes --');
{
  const { C, S, $, ECO } = fresh(41), E = S.eco, d = E.d[0];
  const v0 = C.ecoView(0); ok(v0.lk.length === ECO.ai.look.length && v0.lk.every(a => a === 99999) && !v0.sc, 'the view carries when each look point was last scouted');
  let outc = null, sc = null;   // the AI's first looks are the guards of the sites: apply what it orders until it asks to scout
  for (let i = 0; i < 8 && !sc; i++) { outc = $('ecoAI')(0, C.ecoView(0)); sc = outc.find(c => c.c === 'scout'); if (!sc) for (const c of outc) C.ecoCmd(0, c, 'ai'); }
  ok(!!sc && sc.x > S.W * .5 && sc.why === 'procurar instalações inimigas', 'knowing no enemy site, the AI orders a scout into the enemy half (' + (sc && Math.round(sc.x) + ',' + Math.round(sc.z)) + ')');
  const vv = C.ecoView(0); ok(J($('ecoAI')(0, vv)) === J($('ecoAI')(0, vv)), 'the AI is pure');
  const r = C.ecoCmd(0, sc, 'ai'); ok(r.ok && d.sc && $('ecoScout')(0) === d.sc && d.lk.some(v => typeof v === 'number'), 'the scout is taken and the point marked as looked at');
  const O1 = $('post')(0, 'rec', 0);
  ok(O1.k === 'observe' && Math.hypot(O1.x - d.sc.x, O1.z - d.sc.z) < Math.hypot(S.base[0].x - d.sc.x, S.base[0].z - d.sc.z), 'the first reconnaissance team\'s post moves toward the scout point');
  const p = $('postDisp')(0, 'rec', 0); ok(p.k === 'observe' && p.disp === 'rec', 'postDisp gives a post through the wrapper');
  d.sc.T = S.t + 100;   // a scout is out: the AI looks no further and keeps its commands for the strike
  const pow = E.l.find(e => e.team === 1 && e.k === 'pow');
  d.kn[pow.id] = { k: 'pow', x: pow.x, z: pow.z, T: S.t - 5, dead: false };
  const v1 = C.ecoView(0), o1 = $('ecoAI')(0, v1).find(c => c.c === 'strike');
  ok(!!o1 && o1.id === pow.id && /^vista há /.test(o1.why), 'with a site seen five seconds ago the AI strikes it (' + (o1 && o1.why) + ')');
  d.tg = pow.id; ok(!$('ecoAI')(0, C.ecoView(0)).some(c => c.c === 'strike'), 'with a priority target it does not strike again');
  const fab = E.l.find(e => e.team === 0 && e.k === 'fab'), thr = C.ecoView(0); thr.sites.find(s => s.id === fab.id).thr = ECO.ai.thr + 1;
  ok($('ecoAI')(0, thr).some(c => c.c === 'def' && c.id === fab.id && c.inf >= 1 && /inimigo com força/.test(c.why)), 'a site with enemy strength near it gets a guard order');
}

console.log('-- the attack plane --');
{
  const { C, S, $, ECO } = fresh(41), E = S.eco, pow = E.l.find(e => e.team === 1 && e.k === 'pow');
  for (const u of S.units) if (u.team === 1) u.dead = true;
  for (const m of S.men) if (m.team === 1) m.dead = true;
  const id = S.E.sides[S.fac[0]].cas;
  const pl = C.addPlane(id, 0, pow.x - 3000, pow.y + 600, pow.z, 0, true, 'cas'); pl.inv = 1e9;
  C.aiPick(pl); const blind = pl.tgt;
  pow.seenT = S.t; C.aiPick(pl);
  ok(!blind && pl.tgt === pow, 'an attack plane ignores a site nobody has seen, and takes a seen one (' + id + ')');
  E.d[0].tg = null; const fab = E.l.find(e => e.team === 1 && e.k === 'fab'), gap = Math.hypot(fab.x - pow.x, fab.z - pow.z) || 1, ux = (fab.x - pow.x) / gap, uz = (fab.z - pow.z) / gap;
  fab.seenT = S.t; let diff = 0;   // a place from which the fabrica is nearer than the usina by 300 to 1000 m
  for (let c = 0; c < 2400 && !(diff > 300 && diff < 1000); c += 50) { pl.x = (fab.x + pow.x) / 2 + ux * c - uz * 5000; pl.z = (fab.z + pow.z) / 2 + uz * c + ux * 5000; pl.y = fab.y + 600; diff = Math.hypot(pow.x - pl.x, pow.z - pl.z) - Math.hypot(fab.x - pl.x, fab.z - pl.z); }
  C.aiPick(pl);
  const near = pl.tgt; E.d[0].tg = pow.id; C.aiPick(pl);
  ok(diff > 300 && near === fab && pl.tgt === pow, 'the priority target pulls a plane away from a site ' + Math.round(diff) + ' m nearer');
}
H.done();
