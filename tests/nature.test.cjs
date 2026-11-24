'use strict';
const assert=require('node:assert/strict');
const V=require('../js/world.js');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
function cover(id,blocked=false,seed=82){
 const cache=new Map();
 for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++){
  const a=new Uint8Array(V.H*256);
  if(x===0&&z===0) for(let iz=0;iz<16;iz++)for(let ix=0;ix<16;ix++){
    a[V.idx(ix,70,iz)]=id;
    if(blocked)a[V.idx(ix,71,iz)]=7;
  }
  cache.set(V.key(x,z),{a,top:72});
 }
 const job=V.makeJob({cx:0,cz:0,seed,edits:{},sites:[],generator:3,rev:1},cache);
 const plants=[];
 for(let i=0;i<job.solid.length;i+=6)if(job.solid[i+3]>=80&&job.solid[i+3]<=82)plants.push(...job.solid.slice(i,i+6));
 assert(job.solid.every(Number.isFinite));
 assert(job.alpha.every(Number.isFinite));
 assert.equal(job.solid.length%6,0);
 assert(plants.length/6<=256*30,'at most five cosmetic quads per column');
 return {plants,blocks:job.a};
}
for(const id of [1,17,19]){
 const a=cover(id),b=cover(id);
 assert(a.plants.length>0,`vegetation on ${id}`);
 assert.deepEqual(a.plants,b.plants,'deterministic decorative geometry');
 for(let i=0;i<a.plants.length;i+=6){
  assert(a.plants[i+1]>=71&&a.plants[i+1]<72);
  assert(a.plants[i]>=0&&a.plants[i]<=16&&a.plants[i+2]>=0&&a.plants[i+2]<=16);
 }
 assert.equal(a.blocks[V.idx(8,71,8)],0,'decor is not a saved block');
 assert.equal(cover(id,true).plants.length,0,'no vegetation under water');
}
assert.equal(cover(4).plants.length,0,'no grass on sand');
assert.equal(cover(32).plants.length,0,'no grass on ice');
assert.equal(cover(33).plants.length,0,'no grass on ash');
const baseline=require('./nature-baseline.json');
for(const v of baseline){
 const generated=V.generate(v.x,v.z,v.seed,[],v.generator);
 assert.equal(createHash('sha256').update(generated.a).digest('hex'),v.hash,'terrain stays byte-identical to v0.9.26');
}
const render=fs.readFileSync('js/render.js','utf8');
assert.match(render,/float mask=step\(\.59,oreSeed\)/);
assert.match(render,/m==9\.\|\|m==10\.\|\|m==11\.\|\|m==34\./);
console.log(`PASS nature: three ground-cover families, water/terrain exclusions, deterministic bounded meshes, ${baseline.length} unchanged baseline chunks`);
