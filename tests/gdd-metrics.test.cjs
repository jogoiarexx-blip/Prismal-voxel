'use strict';
const assert = require('node:assert/strict');
const Metrics = require('../js/performance.js');
const Voxel = require('../js/world.js');
const fs = require('node:fs');
const path = require('node:path');
const meter = new Metrics.FrameHistory(100);
assert.equal(meter.snapshot().samples,0);
for(let i=0;i<99;i++) assert(meter.push(1/60));
assert(meter.push(1/20));
let t=meter.snapshot();
assert.equal(t.samples,100);
assert(t.averageFPS<60 && t.averageFPS>56);
assert.equal(t.low1FPS,20);
assert(t.p95Ms<18);
for(let i=0;i<12;i++)meter.push(1/120);
assert.equal(meter.snapshot().samples,100,'ring buffer remains bounded');
assert(meter.push(.4),'real 400ms stutter is counted');
assert(!meter.push(NaN) && !meter.push(3),'background gaps over 2 seconds are ignored');
meter.reset();assert.equal(meter.snapshot().samples,0);
// Requirements from GDD §§3,19: same seed/generator/chunk -> same terrain, even across reads.
for (const seed of ['MUNDO-TESTE-1','PRISMA-TESTE-2']) {
 const hash=Voxel.seedHash(seed);
 for (const [cx,cz] of [[0,0],[-1,0],[0,1],[7,-9]]) {
   const first=Voxel.generate(cx,cz,hash,[],3);
   const second=Voxel.generate(cx,cz,hash,[],3);
   const a=ArrayBuffer.isView(first)?first:(first.a||first.blocks||first);
   const b=ArrayBuffer.isView(second)?second:(second.a||second.blocks||second);
   assert.deepEqual(a,b,'determinism '+seed+':'+cx+','+cz);
 }
}
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const offline=fs.readFileSync(path.join(__dirname,'../offline.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../js/ui.js'),'utf8');
assert.match(html,/src="js\/performance\.js"/);
assert.match(offline,/\.\/js\/performance\.js/);
assert.match(ui,/perfFrames\.push\(frameSeconds\)/);
assert.match(ui,/diagnostic-copy/);
assert.match(ui,/1% low/);
console.log('PASS GDD metrics: 1% low, bounded sampling, tab gaps, procedural seed determinism, UI wiring');
