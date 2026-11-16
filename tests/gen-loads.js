'use strict';
/* writes server.js's copy of the loadout tables (LOADS, STW) from the page's RACKS and STORES: node tests/gen-loads.js [PAGE=] [SERVER=].
   loadout.js fails when the two differ */
const fs = require('fs'), path = require('path'), H = require('./harness');
const SERVER = process.env.SERVER ? path.resolve(process.env.SERVER) : path.join(H.ROOT, 'server.js');
const $ = H.load().$, RACKS = $('RACKS'), STORES = $('STORES'), js = o => JSON.stringify(o).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ').replace(/\{/g, '{ ').replace(/\}/g, ' }').replace(/"/g, "'");
const loads = Object.keys(RACKS).map(id => '  ' + id + ': ' + js([RACKS[id].max].concat(RACKS[id].g.map(g => g[1])))).join(',\n');
const stw = Object.keys(STORES).map(k => k + ': ' + (STORES[k].st ? '[' + STORES[k].w + ', ' + STORES[k].st + ']' : STORES[k].w)).join(', ');
const src = fs.readFileSync(SERVER, 'utf8'), a = src.indexOf('const LOADS = {'), b = src.indexOf('const NST');
if (a < 0 || b < 0) throw new Error('LOADS block not found in ' + SERVER);
fs.writeFileSync(SERVER, src.slice(0, a) + 'const LOADS = {\n' + loads + '\n};\nconst STW = { ' + stw + ' };\n' + src.slice(b));
console.log('wrote ' + Object.keys(RACKS).length + ' planes and ' + Object.keys(STORES).length + ' stores to ' + SERVER);
