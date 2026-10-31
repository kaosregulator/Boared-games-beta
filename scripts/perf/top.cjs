// Self and total time per function in a .cpuprofile. node top.cjs file [n]
const p = JSON.parse(require('fs').readFileSync(process.argv[2]));
const n = Number(process.argv[3] || 30);
const by = new Map(p.nodes.map(x => [x.id, x])); const parent = new Map(); for (const x of p.nodes) for (const c of x.children || []) parent.set(c, x.id);
const dt = {}; for (let i = 0; i < p.samples.length; i++) dt[p.samples[i]] = (dt[p.samples[i]] || 0) + p.timeDeltas[i];
const key = x => `${x.callFrame.functionName || '(anon)'} ${x.callFrame.url.split('/').pop()}:${x.callFrame.lineNumber}:${x.callFrame.columnNumber}`;
const self = new Map(), tot = new Map();
for (const x of p.nodes) { const t = (dt[x.id] || 0) / 1000; if (!t) continue; self.set(key(x), (self.get(key(x)) || 0) + t); const seen = new Set(); let q = x.id; while (q) { const k = key(by.get(q)); if (!seen.has(k)) { seen.add(k); tot.set(k, (tot.get(k) || 0) + t); } q = parent.get(q); } }
console.log('SELF'); for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, n)) console.log(Math.round(v), k);
console.log('TOTAL'); for (const [k, v] of [...tot].sort((a, b) => b[1] - a[1]).slice(0, n)) console.log(Math.round(v), k);
