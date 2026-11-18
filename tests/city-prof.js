/* top self-time functions of a .cpuprofile: node tests/city-prof.js file [n] */
const p = JSON.parse(require('fs').readFileSync(process.argv[2])), self = new Map(), dt = p.timeDeltas, id = new Map(p.nodes.map(n => [n.id, n]));
p.samples.forEach((s, i) => { const n = id.get(s), k = n.callFrame.functionName + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, +process.argv[3] || 14).map(([k, v]) => (v / 1000).toFixed(0).padStart(6) + ' ms  ' + k).join('\n'));
