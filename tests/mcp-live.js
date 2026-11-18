'use strict';
/* the MCP bridge (mcp-general.js) against the REAL game: the relay (SERVER=<path>, PORT_T=<port>, GENKEY set), a real host page running headless in this process
   (the economy on, map version 4, the era ERA=modern|ww2, default modern) and the bridge as a child process, driven over its stdio as an MCP client would.
   Pass 1: the bridge commands the side the host is NOT on; pass 2: the host's own side. A readable transcript is printed (VERBOSE=1 for the raw answers).
   Match time is advanced fast (the host steps without sleeping) except while a bridge answer is awaited. About 1-2 minutes */
const path = require('path'), { spawn } = require('child_process');
process.env.SERVER = process.env.SERVER || path.join(__dirname, '..', 'server.js'); process.env.GENKEY = 'secret';
const N = require('./net'), H = require('./harness'), { ok, done } = H;
const ERA = process.env.ERA || 'modern', MCP = path.join(__dirname, '..', 'mcp-general.js'), VERBOSE = !!process.env.VERBOSE, dt = 1 / 60, kids = [];
const J = v => JSON.stringify(v), cut = (s, n) => (s.length > n ? s.slice(0, n) + '...(' + s.length + ' chars)' : s);
const say = (...a) => console.log(...a);

/* ---- the host: a real page instance joined to the room as a player ---- */
let host = null, fast = false, pumping = true, wall = 0;
async function startHost() {
  const c = H.load({ WebSocket: N.WebSocket, host: 'localhost:' + N.PORT, seed: 4242, eco: true, mapv: 4 }), $ = c.$, Net = $('Net');
  c.Net = Net; c.on = true;
  const model = ERA === 'ww2' ? 'tiger' : 'abrams';
  await new Promise((res, rej) => {
    Net.ui.welcome = () => { c.newState(ERA, model, { net: true, cls: 'tank', mouse: true, host: Net.host === Net.id }); res(); };
    Net.ui.refused = code => rej(new Error('host refused: ' + code)); Net.connect(ERA, 'Host', 'tank', model);
  });
  Object.defineProperty(c, 'S', { get: () => $('S') }); c.id = Net.id; host = c;
  /* the host's own tank plays nothing: the match is the two AIs' */
  c.director = () => {};
}
async function pump() {
  while (pumping) {
    const n = fast ? 12 : 1;
    for (let i = 0; i < n; i++) { if (host.S.cd) host.S.cd = {}; host.step(dt); host.Net.tick(dt); }
    if (fast) await new Promise(r => setImmediate(r)); else await N.sleep(1000 * dt);
  }
}
/* advance the match by s seconds of game time as fast as the host can (the bridge, a real process, answers in between) */
async function advance(s) { const T0 = host.S.t; fast = true; while (host.S.t - T0 < s) await N.sleep(5); fast = false; }

/* ---- the bridge as an MCP client sees it ---- */
function bridge(side, extra) {
  const p = spawn(process.execPath, [MCP], { env: Object.assign({}, process.env, { CEU_URL: 'ws://localhost:' + N.PORT, CEU_ROOM: ERA, CEU_SIDE: String(side), CEU_KEY: 'secret', CEU_NAME: 'Claude-live' }, extra || {}), stdio: ['pipe', 'pipe', 'pipe'] });
  kids.push(p);
  let buf = '', n = 0; const waits = new Map(), bad = [], errs = [];
  p.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); let m; try { m = JSON.parse(l); } catch (e) { bad.push(l); continue; } const w = waits.get(m.id); if (w) { waits.delete(m.id); w(m); } } });
  p.stderr.on('data', d => errs.push(String(d)));
  const rpc = (method, params, ms) => new Promise(res => { const id = ++n; waits.set(id, res); p.stdin.write(J({ jsonrpc: '2.0', id, method, params }) + '\n'); setTimeout(() => { if (waits.delete(id)) res(null); }, ms || 20000); });
  const call = async (name, args, label) => {
    const t0 = Date.now(), r = await rpc('tools/call', { name, arguments: args || {} }), ms = Date.now() - t0;
    const o = r && r.result ? { text: r.result.content[0].text, isError: r.result.isError, json: (() => { try { return JSON.parse(r.result.content[0].text); } catch (e) { return null; } })() } : { text: J(r), isError: true, json: null };
    say('  > ' + name + ' ' + cut(J(args || {}), 170) + (label ? '   [' + label + ']' : ''));
    say('  < ' + (o.isError ? 'ERROR ' : '') + cut(o.text, VERBOSE ? 6000 : 420) + '   (' + ms + ' ms)');
    return o;
  };
  const stop = () => new Promise(res => { p.once('exit', res); p.stdin.end(); setTimeout(() => { try { p.kill(); } catch (e) { /* gone */ } }, 1500); });
  return { p, rpc, call, bad, errs, stop, note: (m, params) => p.stdin.write(J({ jsonrpc: '2.0', method: m, params }) + '\n') };
}
const cleanup = () => { for (const k of kids) try { k.kill(); } catch (e) { /* gone */ } N.stop(); };

/* the host's truth about side t */
const gl = t => (host.S.glog ? host.S.glog.l[t] : []).map(e => e.s);
const ecoOf = t => host.S.eco.d[t];

async function session(side, full) {
  const S = () => host.S;
  say('\n======== bridge for side ' + side + (side === 0 ? ' (the host\'s own side)' : ' (the other side)') + ' ========');
  const b = bridge(side);
  const init = await b.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'live-test', version: '1' } });
  ok(init && init.result && init.result.serverInfo.name === 'ceu-general', 'initialize');
  b.note('notifications/initialized');
  const tl = await b.rpc('tools/list'), names = tl.result.tools.map(t => t.name);
  say('  tools: ' + names.join(', '));
  ok(['get_state', 'get_log', 'build_site', 'produce_unit', 'set_priority', 'send_command', 'ask_placement', 'ask_view', 'seat', 'wait'].every(x => names.includes(x)), 'tools/list has the tools, wait included');

  say('-- seat --');
  await advance(2);
  let r = await b.call('seat', { action: 'claim' });
  ok(r.json && r.json.heldByMe && S().gctl && S().gctl[side].seat === 'mcp', 'seat claim: the host\'s gctl for side ' + side + ' is mcp (' + (S().gctl && S().gctl[side].seat) + ')');
  await advance(3);
  ok(S().eco.ctl[side] === 'mcp' && S().gctl[side].atk === 'mcp' && S().gctl[side].def === 'ai', 'the claim took the economy too (eco ' + S().eco.ctl[side] + ', atk ' + S().gctl[side].atk + ', def/sup stay with the AI)');
  await advance(Math.max(0, 50 - S().t));

  say('-- state --');
  r = await b.call('get_state', { log_lines: 5, refresh_map: true });
  const st = r.json;
  ok(st && st.economy && st.economy.stock && st.economy.stock.en > 0 && st.economy.controller === 'mcp', 'get_state has the economy: stock, controller mcp');
  ok(st && st.economy && st.economy.queue.every(q => typeof q.kind === 'string' && !/^kind#/.test(q.kind)) && st.economy.sites.every(x => ['pow', 'mine', 'fab'].includes(x.kind)), 'kinds are names, not indexes (queue ' + J(st && st.economy && st.economy.queue.map(q => q.kind)) + ')');
  ok(st && st.general && st.general.squads && st.general.squads.length > 0 && st.general.squads.every(q => q.id > 0 && q.job && q.at), 'get_state has squads with ids, jobs and positions (' + (st && st.general && st.general.squads.length) + ')');
  ok(st && st.economy.ageSeconds !== null && st.general.ageSeconds !== null && st.map && st.map.ageSeconds !== null && st.clockAgeSeconds !== null, 'ages are present on economy, general, map and clock');
  ok(st && st.map && st.map.points.length >= 6 && st.map.points.every(p => p.name && p.holder) && st.map.points.some(p => p.holder === 'ours') && st.map.points.some(p => p.holder === 'enemy'), 'get_state has the map points with names and holders (' + (st && st.map && st.map.points.length) + ')');
  ok(st && st.economy.sites.length >= 3 && st.economy.sites.every(x => x.id > 0 && typeof x.x === 'number'), 'own sites with ids and positions (' + (st && st.economy.sites.map(x => x.kind + x.id).join(' ')) + ')');
  ok(st && Array.isArray(st.economy.knownEnemySites) && st.economy.reserve && typeof st.economy.reserve === 'object', 'known enemy sites and reserve by name');
  r = await b.call('ask_view', {});
  ok(r.json && r.json.data && r.json.data.eco && r.json.data.eco.costs && r.json.data.eco.costs.pow && r.json.data.eco.dep, 'ask_view: the cost table by kind name and the deposits');

  say('-- economy orders --');
  r = await b.call('ask_placement', { kind: 'pow' });
  const spots = r.json && r.json.data;
  ok(Array.isArray(spots) && spots.length > 0, 'ask_placement pow: candidates (' + (spots && spots.length) + ')');
  const spot = spots && spots[0];
  r = spot ? await b.call('build_site', { kind: 'pow', x: spot.x, z: spot.z, angle: spot.a, why: 'live test' }, 'at the first candidate') : { json: null };
  const sid = r.json && r.json.id;
  ok(r.json && r.json.accepted && sid > 0 && S().eco.l.some(e => e.id === sid && e.team === side && e.k === 'pow'), 'build_site pow: accepted, the host holds the site ' + sid);
  const mk = await b.call('produce_unit', { kind: 'truck', count: 2, why: 'live test' });
  const mkId = mk.json && mk.json.id;
  ok(mk.json && mk.json.accepted && ecoOf(side).q.filter(q => q.k === 'truck').length >= 2, 'produce_unit truck x2: the host queued them (first order id ' + mkId + ')');
  const qs = ecoOf(side).q, last = qs[qs.length - 1];
  r = await b.call('set_priority', { id: last.id, position: 0 }, 'the last order to the front');
  ok(r.json && r.json.accepted && ecoOf(side).q[0].id === last.id, 'set_priority: the host\'s queue has it first');
  r = await b.call('build_site', { kind: 'pow', x: 99999, z: 0 });
  ok(r.isError && /refused: map \(Fora do mapa/.test(r.text), 'build_site at a bad place is refused with the reason in Portuguese');

  say('-- tactical orders (squad ids and point indexes taken from the bridge\'s own state) --');
  r = await b.call('get_state', { log_lines: 0, refresh_map: true });
  const sq = r.json.general.squads, pts = r.json.map.points;
  const ids = sq.filter(q => !q.operation).map(q => q.id), q0 = S().squads.find(q => q.id === ids[0] && q.team === side);
  ok(ids.length > 0 && !!q0, 'the state lists squads of the side that the host knows (' + ids + ')');
  const L = q0 && q0.men.find(m => !m.dead);
  r = q0 ? await b.call('send_command', { d: 'cmd', command: { c: 'move', x: Math.round(L.x + 30), z: Math.round(L.z), ids: [q0.id], why: 'live move' } }, 'move a squad') : { json: null };
  ok(r.json && r.json.accepted && q0.op && q0.op.k === 'usr' && q0.op.o === 'move', 'move: the host\'s squad ' + (q0 && q0.id) + ' is in a manual (usr) operation');
  const q1 = ids.length > 1 ? S().squads.find(q => q.id === ids[1] && q.team === side) : null, ownPt = pts.find(p => p.holder === 'ours' && !p.base);
  r = q1 && ownPt ? await b.call('send_command', { d: 'cmd', command: { c: 'hold', pi: ownPt.i, ids: [q1.id], why: 'live hold' } }, 'hold one of our points') : { json: null, text: '' };
  ok(q1 && ownPt ? r.json && (r.json.accepted ? true : /refused/.test(r.text)) : true, 'hold on ' + (ownPt && ownPt.name) + ': ' + (r.json ? r.json.result : 'skipped, fewer than two free squads or no own point'));
  const enemyPts = pts.filter(p => p.holder !== 'ours' && p.base !== 'enemy'), pickIds = sq.filter(q => q.operation !== 'atk').map(q => q.id).slice(0, 3);
  let atk = null; const tried = [];
  for (const p of enemyPts.sort((a, c) => (side ? c.x - a.x : a.x - c.x)).slice(0, 5)) {
    r = await b.call('send_command', { d: 'cmd', command: { c: 'atk', pi: p.i, H: 60, ids: pickIds } }, 'assault on ' + p.name + ' (' + p.holder + ')');
    tried.push(p.i + ':' + (r.json && r.json.accepted ? 'ok' : (r.json && r.json.result.split(' ')[1])));
    if (r.json && r.json.accepted) { atk = r.json.id; break; }
  }
  ok(!!atk && S().cmd[side].ops.some(o => o.id === atk && o.k === 'atk' && o.by === 'mcp' && !o.over), 'atk on an enemy point: the host holds a live assault op ordered by the bridge (tried ' + tried + ')');
  r = await b.call('send_command', { d: 'cmd', command: { c: 'hold', pi: 0, ids: [999999] } }, 'invalid on purpose: no such squad');
  ok(r.isError && r.json && r.json.accepted === false && /\(Nenhuma esquadra livre/.test(r.json.result), 'a bad command is refused with a Portuguese reason (' + (r.json && r.json.result) + ')');
  r = await b.call('send_command', { c: 'bogus' });
  ok(r.isError, 'a malformed call (no command object) is an error result');
  r = await b.call('send_command', { d: 'cmd', command: { c: 'bogus' } });
  ok(r.isError && /Ordem/.test(r.text), 'an unknown command name is refused by the host (' + (r.json && r.json.result) + ')');

  say('-- waiting --');
  fast = true;
  r = await b.call('wait', { seconds: 20, stop_on_event: false }, 'the match runs fast meanwhile');
  fast = false;
  ok(r.json && r.json.waitedMatchSeconds >= 19 && r.json.reason === 'time' && r.json.changes && Array.isArray(r.json.events), 'wait 20 s of match time returns on time with a summary (' + (r.json && r.json.waitedMatchSeconds) + ' s match, ' + (r.json && r.json.waitedWallSeconds) + ' s wall)');
  r = await b.call('wait', { seconds: 3, stop_on_event: false }, 'at the real pace of the match');
  ok(r.json && r.json.reason === 'time' && r.json.waitedWallSeconds >= 2 && r.json.waitedWallSeconds < 9, 'wait 3 s at the match\'s own pace takes about 3 s of wall time');
  const ask0 = Date.now(); fast = true;
  r = await b.call('wait', { seconds: 60 }, 'stops on a notable event if one comes');
  fast = false;
  ok(r.json && ['time', 'event'].includes(r.json.reason), 'wait 60 returned by ' + (r.json && r.json.reason) + ' after ' + (r.json && r.json.waitedMatchSeconds) + ' match seconds; events ' + (r.json && cut(J(r.json.events), 300)));

  say('-- 120 s of match --');
  await advance(120);
  await N.sleep(1500); await advance(2);
  const es = S().eco.l.find(e => e.id === sid);
  ok(!!es && !es.dead && es.prog >= 1, 'the host\'s site ' + sid + ' is finished (' + (es && Math.round(es.prog * 100)) + ' %)');
  const dq = ecoOf(side);
  ok(dq.made > 0, 'unit orders were served: ' + dq.made + ' units made, queue now ' + J(dq.q.map(q => q.k)));
  say('  squad ' + (q0 && q0.id) + ' op: ' + (q0 && q0.op ? q0.op.k + '/' + q0.op.o : 'none (arrived)') + '; assault ' + atk + ' ' + (atk ? (S().cmd[side].ops.find(o => o.id === atk) || { st: 'gone' }).st : ''));
  const lg = gl(side), jr = (S().gj || []).filter(j => j.t === side && j.by === 'mcp');
  ok(lg.some(s => /Constr/.test(s)) && lg.some(s => /Produz 2/.test(s)), 'the side\'s order log has the build and produce lines');
  ok(lg.some(s => /^Modelo: construir/.test(s)) && lg.some(s => /^Modelo: mover/.test(s)), 'the log names the author: "Modelo: ..." lines');
  ok(['build', 'make', 'prio', 'move'].every(c => jr.some(j => j.c.c === c && j.ok)) && jr.some(j => !j.ok), 'the host journal has the bridge (by mcp) as author of ' + J([...new Set(jr.map(j => j.c.c + (j.ok ? '' : '!')))]));
  r = await b.call('get_log', { lines: 12 });
  ok(r.json && r.json.lines && r.json.lines.length > 0, 'get_log over the bridge has lines (' + (r.json && r.json.lines && r.json.lines.length) + ')');
  r = await b.call('get_state', { log_lines: 4 });
  ok(r.json && r.json.economy && r.json.economy.ageSeconds < 10 && r.json.matchClockT > 100, 'get_state (streamed parts) after 120 s is fresh (age ' + (r.json && r.json.economy && r.json.economy.ageSeconds) + ' s, clock ' + (r.json && r.json.matchClockT) + ')');
  r = await b.call('get_state', { log_lines: 0 });
  ok(r.json && r.json.map && r.json.economy.sites.some(x => x.id === sid && x.status === 'working'), 'full get_state shows the new site as working');
  say('  state size: ' + r.text.length + ' bytes; points held: ' + J(r.json.map.points.map(p => p.holder[0]).join('')));

  say('-- release --');
  r = await b.call('seat', { action: 'release' });
  await advance(3);
  const g = S().gctl && S().gctl[side];
  ok(r.json && !r.json.heldByMe && (!g || (g.seat === 'ai' && g.atk === 'ai' && g.eco === 'ai' && g.def === 'ai' && g.sup === 'ai')) && S().eco.ctl[side] === 'ai', 'after the release every domain is back to ai (' + J(g) + ', eco ' + S().eco.ctl[side] + ')');
  ok(b.bad.length === 0, 'nothing but JSON-RPC on stdout');
  say('  bridge stderr: ' + (b.errs.join('').trim().split('\n').slice(-3).join(' | ') || '(none)'));
  await b.stop();
}

(async () => {
  await N.start(); say('server: ' + N.SERVER + '\npage:   ' + H.PAGE + '\nera:    ' + ERA);
  await startHost();
  ok(host.Net.gen && host.Net.eco && !!host.S.eco && host.S.host, 'the host page joined the room as host with the economy on');
  const bp = pump();
  await advance(3);
  await session(1);
  await session(0);
  pumping = false; await bp;
  host.Net.close(); cleanup(); done();
})().catch(e => { console.error(e); cleanup(); process.exit(1); });
process.on('SIGINT', () => { cleanup(); process.exit(130); });
