'use strict';
/* Céu de Ferro 3D: serves the game page and relays PvP messages between the players of a room.
   It never simulates anything. It assigns ids, checks message shape and class (plane, tank, aa, art, inf), owns the scoreboard and names the host:
   the earliest-joined player still in the room, whose client simulates the room's AI battle. AI entities have negative ids.
   welcome names what this server knows, so that a page can tell an older one: swap, inf, obj, sup (supply bases: base and build),
   trn (transport: the class trn, the sniper kits, and the messages board, seats, eject and cargo), cmd (the commander: the mortar kits,
   toss k 3 and 4, s on shot and aishot, and the message cmd). */
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const { WebSocketServer } = require('ws');

const PORT = +process.env.PORT || 8080, PAGE = path.join(__dirname, 'Céu de Ferro 3D.html'), MAXLEN = 2048, MAXAI = 16384, AICAP = 64, CAP = 16;
/* valid models per room and class, the first half of each list on side 0 and the second on side 1; the page's PLANES, TANKS, AAS, ARTS and
   INF tables are the other copy. inf: the infantry kits, in the order an AI soldier's snapshot row names them by index */
const MODELS = {
  ww2: { plane: ['stuka', 'bf109', 'spit', 'p47'], tank: ['tiger', 'pz4', 'sherman', 't34'], aa: ['wirbel', 'm16'], art: ['hummel', 'priest'], inf: ['schutze', 'mgschutze', 'pzjager', 'scharf', 'grwTrupp', 'rifleman', 'bargunner', 'bazookaman', 'sniper', 'mortarman'], trn: ['kubel', 'opel', 'jeep', 'gmc'] },
  modern: { plane: ['f22', 'a10', 'su57', 'su25'], tank: ['abrams', 'leo2', 't90', 't72'], aa: ['nasams', 'pantsir'], art: ['pzh', 'msta'], inf: ['blueRifle', 'blueSaw', 'blueAT', 'blueAD', 'blueSniper', 'blueMortar', 'redRifle', 'redMG', 'redAT', 'redAD', 'redSniper', 'redMortar'], trn: ['hmmwv', 'hemtt', 'lav25', 'tigr', 'ural', 'btr82'] }
};
/* helicopters: aircraft to every check of an AI row or a loss, a class of their own to join, swap and hstate. None in 1944 */
MODELS.ww2.heli = []; MODELS.modern.heli = ['ah64', 'uh60', 'mi28', 'mi8'];
/* plane loadouts, the other copy of the page's RACKS and STORES. LOADS: per plane the kg it lifts and, per hardpoint group, the most of each
   store; STW: a store's kg, and the lot it comes in when not one by one. The order of STW is the order of the page's STORES: a release names
   its store as 2 + its place there */
const LOADS = {
  stuka: [1800, { sc500: 1, sc1000: 1, sc250: 1, ab250: 1 }, { sc50: 4, sc250: 2 }],
  bf109: [600, { sc250: 1, sc500: 1, sc50: 4 }, { wgr21: 2, ammo20: 1 }],
  spit: [460, { lb250: 2 }, { lb500: 1 }, { ammo20: 1 }],
  p47: [1500, { lb500: 2, lb1000: 2 }, { hvar: 10 }, { lb500: 1, ammo50: 1 }],
  f22: [1900, { gbu39: 8, gbu32: 2, mk83: 2 }, { aim120: 6 }, { aim9x: 2 }],
  a10: [3300, { mk82: 6, mk84: 2, cbu87: 4, gbu12: 4 }, { agm65: 6, mk82: 6, cbu87: 4, hydra: 28 }, { aim9: 2, hydra: 14 }],
  su57: [2300, { kh38: 2, kab500: 2, fab500: 2, fab250: 4 }, { r77: 6 }, { r73: 2 }],
  su25: [3300, { kh25: 4, kab500: 2, fab500: 4, rbk500: 4 }, { s8: 80, fab250: 4, rbk500: 2 }, { r73: 2 }]
};
const STW = { gbu39: 130, agm65: 300, kh38: 520, kh25: 300, aim120: 160, aim9: 86, r77: 190, r73: 105, s8: [15, 20], mk82: 227, mk83: 450, fab250: 250, fab500: 500, mk84: 925, aim9x: 85, cbu87: 430, rbk500: 500, gbu12: 277, gbu32: 470, kab500: 525, hydra: [14, 7], sc50: 50, sc250: 250, sc500: 500, sc1000: 1000, ab250: 220, wgr21: 110, lb250: 113, lb500: 227, lb1000: 454, hvar: [64, 2], ammo20: 80, ammo50: 80 };
const NST = Object.keys(STW).length;
const rooms = { ww2: new Map(), modern: new Map() };
for (const era in MODELS) { const m = MODELS[era]; rooms[era].host = null; rooms[era].models = m; rooms[era].air = new Set(m.plane); rooms[era].gnd = new Set([...m.tank, ...m.aa, ...m.art, ...m.trn, 'truck']); rooms[era].inf = new Set(m.inf); }
for (const era in MODELS) for (const id of MODELS[era].heli) rooms[era].air.add(id);
let nextId = 1;

const model = (era, cls, id) => typeof cls === 'string' && Object.hasOwn(era, cls) && era[cls].includes(id);
const side = (era, cls, id) => +(era[cls].indexOf(id) >= era[cls].length / 2);
const num = v => typeof v === 'number' && Number.isFinite(v);
const vec = (v, n) => Array.isArray(v) && v.length === n && v.every(num);
const pid = v => Number.isInteger(v) && v > 0, aid = v => Number.isInteger(v) && v < 0;
const ref = v => v === null || pid(v) || aid(v);
/* a guided missile has an id, so that an interception can name it: the launching client's player id times 4096 plus its own counter.
   m.m: the id of the missile a launch creates, kept only when it is the sender's to give; m.tm: the missile it is aimed at */
const mid = v => Number.isInteger(v) && v >= 4096 && v < 2 ** 40;
const launch = (c, m, o) => { if (mid(m.m) && Math.floor(m.m / 4096) === c.player.id) o.m = m.m; if (mid(m.tm)) o.tm = m.tm; return o; };
const armour = c => c.player.cls === 'tank' || c.player.cls === 'art' || c.player.cls === 'trn';
/* the damage model's fields: d part states (two bits a part, bit 20 burning), pt the part a hit struck, k the kind of hit */
const bits = v => Number.isInteger(v) && v >= 0 && v < 1 << 21, part = v => Number.isInteger(v) && v >= 0 && v < 10, kind = v => Number.isInteger(v) && v >= 0 && v < 4;
const blow = m => num(m.dmg) && m.dmg > 0 && m.dmg <= 1000 && part(m.pt) && kind(m.k);
/* world objects: a flat list of pairs, an object's id and its stage (1 damaged, 2 down) or the damage done to it */
const pairs = (l, ok) => Array.isArray(l) && l.length > 0 && l.length <= 200 && l.length % 2 === 0 && l.every((v, i) => (i % 2 ? ok(v) : Number.isInteger(v) && v >= 0 && v < 65536));
/* a loadout for that plane, one choice per group, [store, n] or 0, within each group's limits and the plane's weight; anything else is null,
   which is the plane's own load */
function load(cls, id, lo) {
  const L = cls === 'plane' && Object.hasOwn(LOADS, id) ? LOADS[id] : null; let w = 0;
  if (!L || !Array.isArray(lo) || lo.length !== L.length - 1) return null;
  for (let i = 0; i < lo.length; i++) {
    const c = lo[i], g = L[i + 1];
    if (c === 0) continue;
    if (!Array.isArray(c) || c.length !== 2 || typeof c[0] !== 'string' || !Object.hasOwn(g, c[0])) return null;
    const s = STW[c[0]], st = Array.isArray(s) ? s[1] : 1;
    if (!Number.isInteger(c[1]) || c[1] < 1 || c[1] > g[c[0]] || c[1] % st) return null;
    w += (Array.isArray(s) ? s[0] : s) * c[1];
  }
  return w > L[0] ? null : lo.map(c => c && [c[0], c[1]]);
}
const slot = i => Number.isInteger(i) && i >= 0 && i < 2 + NST;
const host = c => c.room.host === c, toss = m => Number.isInteger(m.k) && m.k >= 0 && m.k <= 4 && vec(m.p, 3) && vec(m.v, 3);
const scores = c => cast(c, { t: 'scores', players: [...c.room.values()].map(o => ({ id: o.player.id, kills: o.player.kills, deaths: o.player.deaths, ai: o.player.ai })) }, true);
/* one AI entity of a snapshot: [id, model, team, hp, flags, then 10 numbers for a plane (p, q, v) or 8 for a vehicle (p, heading, turret, pitch, vx, vz), then its part states].
   A soldier's row (k 2) is shorter: [id, kit index, team, hp, flags, x, z, heading, stance and weapon and squad packed in one integer] */
const aiEnt = (room, e, k) => Array.isArray(e) && aid(e[0]) && (e[2] === 0 || e[2] === 1) && (k === 2 ? e.length === 9 && e.every(num) && Number.isInteger(e[1]) && e[1] >= 0 && e[1] < room.inf.size && Number.isInteger(e[8]) && e[8] >= 0 && e[8] < 256
  : e.length === (k ? (room.gnd.has(e[1]) ? 14 : 0) : room.air.has(e[1]) ? 16 : 0) && e.every((v, i) => i === 1 || num(v)) && bits(e[e.length - 1]));
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const cast = (c, m, all) => { for (const o of c.room.values()) if (all || o !== c) send(o.ws, m); };

/* c→s messages. Every handler but join runs only for a client that is already in a room. */
const RX = {
  join(c, m) {
    if (c.room) return;
    const era = typeof m.room === 'string' && Object.hasOwn(MODELS, m.room) ? MODELS[m.room] : null;
    if (!era) return send(c.ws, { t: 'error', code: 'room' });
    if (!model(era, m.cls, m.model)) return send(c.ws, { t: 'error', code: 'model' });
    const room = rooms[m.room];
    if (room.size >= CAP) return send(c.ws, { t: 'error', code: 'full' });
    const name = (typeof m.name === 'string' ? m.name.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 16).trim() : '') || 'Piloto';
    c.player = { id: nextId++, name, cls: m.cls, model: m.model, lo: load(m.cls, m.model, m.lo), kills: 0, deaths: 0, ai: 0 };
    c.room = room; room.set(c.player.id, c); if (!room.host) room.host = c;
    send(c.ws, { t: 'welcome', id: c.player.id, host: room.host.player.id, swap: 1, inf: 1, obj: 1, sup: 1, hl: 1, lo: 1, trn: 1, cmd: 1, crew: 1, players: [...room.values()].map(o => o.player) });
    send(c.ws, { t: 'fcap', v: 1 });   // this server knows fort and fbuild (trenches and sandbags)
    cast(c, { t: 'joined', player: c.player });
  },
  /* another vehicle in mid-match, of the room's era and of the side the player is on: the record changes in place and the room is told.
     Anything else is refused to the sender alone (no: 1), with the vehicle it keeps. The score and the host are not touched */
  swap(c, m) {
    const era = c.room.models, p = c.player;
    if (!model(era, m.cls, m.model) || side(era, m.cls, m.model) !== side(era, p.cls, p.model)) return send(c.ws, { t: 'swap', id: p.id, cls: p.cls, model: p.model, no: 1 });
    p.cls = m.cls; p.model = m.model; p.lo = load(m.cls, m.model, m.lo);
    cast(c, { t: 'swap', id: p.id, cls: p.cls, model: p.model, lo: p.lo }, true);
  },
  /* another loadout on the plane the player has: over its airfield, or chosen for the next one. A refused one is the plane's own load */
  load(c, m) { const p = c.player; if (p.cls !== 'plane') return; p.lo = load(p.cls, p.model, m.lo); cast(c, { t: 'load', id: p.id, lo: p.lo }); },
  state(c, m) {
    if (c.player.cls !== 'plane' || !vec(m.p, 3) || !vec(m.q, 4) || !vec(m.v, 3) || !num(m.thr) || !num(m.hp) || !Number.isInteger(m.f) || !bits(m.d)) return;
    cast(c, { t: 'state', from: c.player.id, p: m.p, q: m.q, v: m.v, thr: m.thr, hp: m.hp, f: m.f & 31, d: m.d });
  },
  gstate(c, m) {
    if (c.player.cls === 'plane' || c.player.cls === 'inf' || !vec(m.p, 3) || !vec(m.a, 3) || !vec(m.v, 3) || !num(m.hp) || !Number.isInteger(m.f) || !bits(m.d)) return;
    cast(c, { t: 'gstate', from: c.player.id, p: m.p, a: m.a, v: m.v, hp: m.hp, f: m.f & 31, d: m.d });
  },
  /* a soldier: p position, a [heading, aim pitch], v [vx, vz], s stance (bits 0-1) and weapon in hand (bit 2), f flags (1 firing its small arm, 4 dead, 16 invulnerable) */
  mstate(c, m) {
    if (c.player.cls !== 'inf' || !vec(m.p, 3) || !vec(m.a, 2) || !vec(m.v, 2) || !num(m.hp) || !Number.isInteger(m.f) || !Number.isInteger(m.s) || m.s < 0 || m.s > 7) return;
    cast(c, { t: 'mstate', from: c.player.id, p: m.p, a: m.a, v: m.v, s: m.s, hp: m.hp, f: m.f & 31 });
  },
  /* what a soldier throws or launches unguided, from p at v: k 0 its rocket, 1 a hand grenade, 2 a smoke grenade, 3 a mortar bomb, 4 a
     mortar smoke bomb. A guided one goes as ord. shot and aishot: s 1, a howitzer's smoke round.
     cmd: the host's word on what each side's commander is at, for the players' maps: c, per side, [what, then x, z, kind of each mark] */
  cmd(c, m) { if (host(c) && Array.isArray(m.c) && m.c.length === 2 && m.c.every(l => Array.isArray(l) && l.length <= 100 && l.every(num))) cast(c, { t: 'cmd', c: m.c }); },
  toss(c, m) { if (c.player.cls === 'inf' && toss(m)) cast(c, { t: 'toss', from: c.player.id, k: m.k, p: m.p, v: m.v }); },
  aitoss(c, m) { if (host(c) && aid(m.id) && toss(m)) cast(c, { t: 'aitoss', id: m.id, k: m.k, p: m.p, v: m.v }); },
  shot(c, m) {
    if (!armour(c) || !vec(m.p, 3) || !vec(m.v, 3)) return;
    cast(c, Object.assign({ t: 'shot', from: c.player.id, p: m.p, v: m.v }, m.s === 1 && { s: 1 }));
  },
  ord(c, m) {
    if (!slot(m.i) || !ref(m.target)) return;
    cast(c, launch(c, m, { t: 'ord', from: c.player.id, i: m.i, target: m.target }));
  },
  /* a smoke screen where a tank or a gun fired its launchers; an interception: the missile with this id is gone, for everyone */
  smoke(c, m) { if (armour(c) && vec(m.p, 3)) cast(c, { t: 'smoke', from: c.player.id, p: m.p }); },
  mkill(c, m) { if (mid(m.id)) cast(c, { t: 'mkill', from: c.player.id, id: m.id }); },
  flare(c) { cast(c, { t: 'flare', from: c.player.id }); },
  hit(c, m) {
    const o = c.room.get(m.to);
    if (!o || o === c || !blow(m)) return;
    send(o.ws, { t: 'hit', from: c.player.id, to: m.to, dmg: m.dmg, pt: m.pt, k: m.k, by: host(c) && aid(m.by) ? m.by : null });
  },
  down(c, m) {
    if (!ref(m.by)) return;
    const k = c.room.get(m.by), by = aid(m.by) ? m.by : k && k !== c ? m.by : null;
    c.player.deaths++; if (k && k !== c) k.player.kills++;
    cast(c, Object.assign({ t: 'down', id: c.player.id, by, det: m.det === 1 ? 1 : 0 }, m.left === 1 && { left: 1 }), true); scores(c);   // left: the vehicle was abandoned for another
  },
  /* the AI battle: snapshots and events come from the host only, and damage to an AI entity goes to the host only */
  ai(c, m) {
    if (!host(c) || (m.k !== 0 && m.k !== 1 && m.k !== 2) || !Array.isArray(m.e) || m.e.length > AICAP || !m.e.every(e => aiEnt(c.room, e, m.k))) return;
    cast(c, { t: 'ai', k: m.k, e: m.e });
  },
  aiord(c, m) {
    if (!host(c) || !aid(m.id) || !slot(m.i) || !ref(m.target)) return;
    cast(c, launch(c, m, { t: 'aiord', id: m.id, i: m.i, target: m.target }));
  },
  aismoke(c, m) { if (host(c) && aid(m.id) && vec(m.p, 3)) cast(c, { t: 'aismoke', id: m.id, p: m.p }); },
  aishot(c, m) {
    if (!host(c) || !aid(m.id) || !vec(m.p, 3) || !vec(m.v, 3)) return;
    cast(c, Object.assign({ t: 'aishot', id: m.id, p: m.p, v: m.v }, m.s === 1 && { s: 1 }));
  },
  aiflare(c, m) { if (host(c) && aid(m.id)) cast(c, { t: 'aiflare', id: m.id }); },
  aidown(c, m) {
    if (!host(c) || !aid(m.id) || !ref(m.by) || !(c.room.air.has(m.model) || c.room.gnd.has(m.model) || c.room.inf.has(m.model))) return;
    const k = c.room.get(m.by);
    cast(c, { t: 'aidown', id: m.id, by: m.by, model: m.model, det: m.det === 1 ? 1 : 0 }, true);
    if (k) { k.player.ai++; scores(c); }
  },
  /* the world's objects belong to the host: it alone says what stage they came to (full: 1, all of them, for someone who has just joined),
     and what anyone else's rounds did to them goes to it alone */
  obj(c, m) { if (host(c) && pairs(m.e, v => v === 1 || v === 2)) cast(c, Object.assign({ t: 'obj', e: m.e }, m.full === 1 && { full: 1 })); },
  ohit(c, m) {
    const h = c.room.host;
    if (h !== c && pairs(m.h, v => num(v) && v > 0 && v <= 1000)) send(h.ws, { t: 'ohit', from: c.player.id, h: m.h });
  },
  /* supply bases are world objects too, with a life of their own: the host lists them all, a row each, [id, side, x, z, heading, percent
     built, hp, stage]; a soldier's request to start one goes to the host alone, once a second at most */
  base(c, m) {
    if (host(c) && Array.isArray(m.e) && m.e.length <= 16 && m.e.every(e => vec(e, 8) && Number.isInteger(e[0]) && e[0] >= 0 && e[0] < 65536 && (e[1] === 0 || e[1] === 1) && e[5] >= 0 && e[5] <= 100 && (e[7] === 0 || e[7] === 1 || e[7] === 2))) cast(c, { t: 'base', e: m.e });
  },
  build(c, m) {
    const h = c.room.host, now = Date.now();
    if (h === c || c.player.cls !== 'inf' || !vec(m.p, 2) || !num(m.a) || now - (c.bt || 0) < 1000) return;
    c.bt = now; send(h.ws, { t: 'build', from: c.player.id, p: m.p, a: m.a });
  },
  /* trenches and sandbags built during the match are the host's too: its list comes in parts i of n, a row each, [id, kind (1 trench,
     2 sandbags), side, x, z, facing, percent built, hp, stage]; a soldier's request for one goes to the host alone, 700 ms apart at least */
  fort(c, m) {
    if (host(c) && Number.isInteger(m.i) && Number.isInteger(m.n) && m.i >= 0 && m.i < m.n && m.n <= 8 && Array.isArray(m.e) && m.e.length <= 40 && m.e.every(e => vec(e, 9) && Number.isInteger(e[0]) && e[0] >= 0 && e[0] < 65536 && (e[1] === 1 || e[1] === 2) && (e[2] === 0 || e[2] === 1) && e[6] >= 0 && e[6] <= 100 && (e[8] === 0 || e[8] === 1 || e[8] === 2))) cast(c, { t: 'fort', i: m.i, n: m.n, e: m.e });
  },
  fbuild(c, m) {
    const h = c.room.host, now = Date.now();
    if (h === c || c.player.cls !== 'inf' || (m.k !== 1 && m.k !== 2) || !vec(m.p, 2) || !num(m.a) || now - (c.ft || 0) < 700) return;
    c.ft = now; send(h.ws, { t: 'fbuild', from: c.player.id, k: m.k, p: m.p, a: m.a });
  },
  /* transport. board: a soldier asks the owner of vehicle v for a seat (s 0) or says it is out (s -1): the player whose vehicle it is, or
     the host for an AI entity's. seats: who is aboard, a row a vehicle, [vehicle, boxed AI soldiers or -1, then a player or 0 per seat]:
     a transport's player speaks for its own, the host for the AI's and for the boxed squads of all. eject: the owner of a lost vehicle
     tells one aboard what it took getting out and who did it. cargo: a guest at the wheel asks the host to call squads (1) or let them off (0) */
  board(c, m) {
    const o = aid(m.v) ? c.room.host : c.room.get(m.v);
    if (c.player.cls !== 'inf' || !o || o === c || (pid(m.v) && o.player.cls !== 'trn') || (m.s !== 0 && m.s !== -1)) return;
    send(o.ws, { t: 'board', from: c.player.id, v: m.v, s: m.s });
  },
  seats(c, m) {
    const row = e => Array.isArray(e) && e.length >= 2 && e.length <= 16 && (e[0] === c.player.id ? c.player.cls === 'trn' : host(c) && (aid(e[0]) || pid(e[0]))) && Number.isInteger(e[1]) && e[1] >= -1 && e[1] <= 16 && e.slice(2).every(v => v === 0 || pid(v));
    if (Array.isArray(m.e) && m.e.length <= 32 && m.e.every(row)) cast(c, { t: 'seats', from: c.player.id, e: m.e });
  },
  eject(c, m) {
    const o = c.room.get(m.to);
    if (!o || o === c || o.player.cls !== 'inf' || !(c.player.cls === 'trn' || host(c)) || !num(m.dmg) || m.dmg < 0 || m.dmg > 1000 || !ref(m.by)) return;
    send(o.ws, { t: 'eject', from: c.player.id, to: m.to, dmg: m.dmg, by: m.by });
  },
  cargo(c, m) {
    const h = c.room.host;
    if (h !== c && c.player.cls === 'trn' && (m.k === 0 || m.k === 1)) send(h.ws, { t: 'cargo', from: c.player.id, k: m.k });
  },
  aihit(c, m) {
    const h = c.room.host;
    if (h === c || !aid(m.to) || !blow(m)) return;
    send(h.ws, { t: 'aihit', from: c.player.id, to: m.to, dmg: m.dmg, pt: m.pt, k: m.k });
  }
};
/* a flown helicopter: the plane's state plus c the collective and a the gun's [yaw, pitch]; flags as state, and 32 squad aboard, 64 landed.
   lift: a guest's transport asks the host to let a squad in (k 1, sq its number) or out (k 0, n the kits, p where, h toward); the host's
   answer to the first, the kits taken aboard, goes to that guest alone */
RX.gstate = (old => (c, m) => { if (c.player.cls !== 'heli') old(c, m); })(RX.gstate);
RX.hstate = (c, m) => {
  if (c.player.cls !== 'heli' || !vec(m.p, 3) || !vec(m.q, 4) || !vec(m.v, 3) || !vec(m.a, 2) || !num(m.c) || !num(m.hp) || !Number.isInteger(m.f) || !bits(m.d)) return;
  cast(c, { t: 'hstate', from: c.player.id, p: m.p, q: m.q, v: m.v, c: m.c, a: m.a, hp: m.hp, f: m.f & 127, d: m.d });
};
RX.lift = (c, m) => {
  const h = c.room.host, o = c.room.get(m.to), kits = v => Array.isArray(v) && v.length > 0 && v.length <= 8 && v.every(k => Number.isInteger(k) && k >= 0 && k < 8);
  if (h === c) { if (o && o !== c && o.player.cls === 'heli' && m.k === 1 && kits(m.n)) send(o.ws, { t: 'lift', k: 1, n: m.n }); return; }
  if (c.player.cls !== 'heli') return;
  if (m.k === 1 && Number.isInteger(m.sq) && m.sq > 0 && m.sq < 32) send(h.ws, { t: 'lift', from: c.player.id, k: 1, sq: m.sq });
  else if (m.k === 0 && kits(m.n) && vec(m.p, 2) && num(m.h)) send(h.ws, { t: 'lift', from: c.player.id, k: 0, n: m.n, p: m.p, h: m.h });
};

/* crew: a player is a soldier who may sit at the wheel or the gun of a transport, and the record follows the body. welcome says crew: 1.
   crew: the sender is now cls, model, inf or trn of its own side, with no loss counted. To inf it may bring st, the vehicle it left
   (place, hull and turret, hp, part states, rounds of two arms, smoke, material) and x, 1 or 2, when that vehicle was lost, with by, who destroyed it (a vehicle its crew got out of counts as an AI
   kill, and the soldier's death, if it comes, is a down like any other); to trn, v,
   the AI entity it took. drive: a soldier asks the host for seat s of the parked AI vehicle v. grant: the host's yes, to that soldier alone */
const two = cls => cls === 'inf' || cls === 'trn', vst = v => vec(v, 12) && bits(v[7]);
RX.crew = (c, m) => {
  const era = c.room.models, p = c.player;
  if (!two(p.cls) || !two(m.cls) || !model(era, m.cls, m.model) || side(era, m.cls, m.model) !== side(era, p.cls, p.model)) return;
  const o = { t: 'crew', id: p.id, cls: m.cls, model: m.model };
  const k = c.room.get(m.by), lost = m.cls === 'inf' && vst(m.st) && (m.x === 1 || m.x === 2);
  if (m.cls === 'inf' && vst(m.st)) o.st = m.st;
  if (lost) { o.x = m.x; o.by = aid(m.by) ? m.by : k && k !== c ? m.by : null; }
  if (m.cls === 'trn' && aid(m.v)) o.v = m.v;
  p.cls = m.cls; p.model = m.model; p.lo = null;
  cast(c, o);
  if (lost && k && k !== c) { k.player.ai++; scores(c); }
};
RX.drive = (c, m) => {
  const h = c.room.host;
  if (h !== c && c.player.cls === 'inf' && aid(m.v) && (m.s === 0 || m.s === 1)) send(h.ws, { t: 'drive', from: c.player.id, v: m.v, s: m.s });
};
RX.grant = (c, m) => {
  const o = c.room.get(m.to);
  if (!host(c) || !o || o === c || o.player.cls !== 'inf' || !aid(m.v) || (m.s !== 0 && m.s !== 1) || !vst(m.st) || !Array.isArray(m.o) || m.o.length > 16 || !m.o.every(v => v === 0 || pid(v))) return;
  send(o.ws, { t: 'grant', v: m.v, s: m.s, st: m.st, o: m.o });
};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' || req.url.split('?')[0] !== '/') { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('404'); }
  fs.readFile(PAGE, (err, buf) => {
    if (err) { res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Não foi possível ler a página do jogo.'); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(buf);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 1 << 16 });
wss.on('connection', ws => {
  const c = { ws, room: null, player: null };
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('error', () => {});
  ws.on('message', (data, binary) => {
    if (binary || data.length > MAXAI) return;
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string' || !Object.hasOwn(RX, m.t) || (m.t !== 'ai' && data.length > MAXLEN)) return;
    if (m.t !== 'join' && !c.room) return;
    RX[m.t](c, m);
  });
  ws.on('close', () => {
    if (!c.room) return;
    const room = c.room;
    room.delete(c.player.id); cast(c, { t: 'left', id: c.player.id });
    if (room.host !== c) return;
    room.host = room.values().next().value || null;
    if (room.host) cast(c, { t: 'host', id: room.host.player.id });
  });
});
const beat = setInterval(() => {
  for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue; } ws.alive = false; ws.ping(); }
}, 10000);
wss.on('close', () => clearInterval(beat));

server.listen(PORT, '0.0.0.0', () => {
  console.log('Céu de Ferro 3D no ar.');
  console.log('  Neste computador: http://localhost:' + PORT);
  for (const list of Object.values(os.networkInterfaces())) for (const a of list) if (a.family === 'IPv4' && !a.internal) console.log('  Na rede local:    http://' + a.address + ':' + PORT);
});
