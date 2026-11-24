'use strict';
const assert=require('node:assert/strict');
const V=require('../js/world.js');
const fs=require('node:fs');
// Synthetic isolated construction: avoid terrain seed effects and exercise the real worker mesh.
const cache=new Map();
for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)cache.set(V.key(x,z),{a:new Uint8Array(V.H*256),top:90});
const roof=(edits)=>V.makeJob({cx:0,cz:0,seed:8,edits,sites:[],generator:3,rev:1},cache);
function sample(result,id,f,y,xmin,xmax,zmin,zmax){
 const values=[];
 for(const buf of [result.solid,result.alpha])for(let i=0;i<buf.length;i+=6){
  if(buf[i+3]===id&&buf[i+4]===f&&Math.abs(buf[i+1]-y)<.001&&buf[i]>=xmin-.001&&buf[i]<=xmax+.001&&buf[i+2]>=zmin-.001&&buf[i+2]<=zmax+.001)values.push(buf[i+5]);
 }
 assert(values.length,`Missing face ${id}/${f}`);return values;
}
const edits={'0,0':{[V.idx(5,80,5)]:74,[V.idx(8,80,5)]:74,[V.idx(5,84,5)]:65,[V.idx(8,84,5)]:16,[V.idx(5,81,5)]:78}};
let mesh=roof(edits);
const floor=sample(mesh,74,2,81,5,6,5,6),open=sample(mesh,74,2,81,8,9,5,6);
assert(floor.every(v=>v<.5),'opaque roof dims floor');
assert(open.every(v=>v>.7),'glass roof does not block skylight');
let furniture=0;
for(let i=0;i<mesh.solid.length;i+=6){
 const [x,y,z,,,,]=mesh.solid.slice(i,i+6);
 if(x>5.01&&x<5.99&&y>81.01&&y<82.01&&z>5.01&&z<5.99){assert(mesh.solid[i+5]<.5);furniture++;}
}
assert(furniture>0,'furniture under roof is shaded');
assert(sample(mesh,65,2,85,5,6,5,6).every(v=>v>.7),'exposed roof top stays bright');
// Removing the roof restores light while keeping the same seed and block IDs.
const removed=structuredClone(edits);delete removed['0,0'][V.idx(5,84,5)];
assert(sample(roof(removed),74,2,81,5,6,5,6).every(v=>v>.7),'roof removal restores skylight');
// A slab roof is recognized; a table alone must not blacken the whole column.
removed['0,0'][V.idx(5,84,5)]=53;
assert(sample(roof(removed),74,2,81,5,6,5,6).every(v=>v<.5),'full width slab blocks direct sky');
// Adjacent chunk roof affects the air side of a wall on the edge.
const edge={'0,0':{[V.idx(15,80,5)]:75},'1,0':{[V.idx(0,84,5)]:65}};
assert(sample(roof(edge),75,0,80,16,16,5,6).every(v=>v<.5),'roof shade crosses chunk boundaries');
for(const v of [mesh.solid,mesh.alpha]){assert.equal(v.length%6,0);assert(v.every(Number.isFinite));}
const code=fs.readFileSync('js/render.js','utf8');
assert.match(code,/for\(int i=0;i<8;i\+\+\)/);
assert.match(code,/gl.uniform1f\(p.u.quality, settings.quality\)/);
assert.match(code,/settings.motion \? g.elapsed : 0/);
assert.match(code,/reflectedSky/);
console.log('PASS roof, glass, furniture, slab, cross-chunk shade, removal, bounded lights and independent motion/quality');
