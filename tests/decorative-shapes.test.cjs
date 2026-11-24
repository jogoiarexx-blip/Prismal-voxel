'use strict';
const assert=require('node:assert/strict');
const Voxel=require('../js/world.js');
let tests=0;const check=(x,why)=>{assert.ok(x,why);tests++};
const changed=[12,14,15,49,50,51,52,53,54,55,67,69,70,71,72,77,78,79,83,84,85,86,87,136];
const minParts=new Map([[12,11],[14,10],[15,12],[49,7],[69,7],[77,16],[78,10],[79,10],[83,12],[84,10],[85,6],[86,5],[87,10]]);
for(const id of changed){
  const parts=Voxel.shapeParts(id);
  check(Voxel.specialShape(id) && Array.isArray(parts),`Block ${id} has a detailed shape`);
  check(parts.length >= (minParts.get(id)||2),`Block ${id} contains its decorative elements`);
  check(parts.length <= 25,`Block ${id} stays within geometry budget`);
  const materials=new Set();
  for(const [i,part] of parts.entries()){
    check(part.length===6||part.length===7,`${id}.${i} shape tuple`);
    check(part.slice(0,6).every(Number.isFinite),`${id}.${i} finite`);
    check(part.slice(3,6).every(q=>q>0),`${id}.${i} positive dimensions`);
    for(let n=0;n<3;n++){
      check(part[n]>=-0.000001 && part[n]+part[n+3]<=1.000001,`${id}.${i} axis ${n} within cell`);
    }
    if(part.length===7){
      check(Number.isInteger(part[6]) && !!Voxel.blocks[part[6]],`${id}.${i} material exists`);
      materials.add(part[6]);
    }
  }
  if([12,14,15,77,78,79,83,84,85,87].includes(id))
    check(materials.size>=2,`${id} uses recognizable complementary materials`);
}
// Existing recipes, public block IDs and item recovery remain unchanged.
check(Voxel.itemId(136)===14,'lit furnace keeps standard furnace item');
for(let dir=0;dir<4;dir++){
  for(const base of [49,69]){
    const p=Voxel.shapeParts(base+dir);
    check(p.length===7,`${base}+${dir} consistent geometry`);
    // Each stair stays ground-connected, and a block remains climbable.
    check(p[0][1]===0 && p[0][4]===.49,`step base of ${base}+${dir}`);
    check(p[1][1]===.5,`second step of ${base}+${dir}`);
    const a=[p[1][0]+p[1][3]*.5,p[1][2]+p[1][5]*.5];
    const b=p[0];
    check(a[0]>.1&&a[0]<.9&&a[1]>.1&&a[1]<.9,`upper step ${base}+${dir} remains inside`);
  }
}
check(Voxel.intersects(49,0,0,0,.2,.01,.2,.8,.45,.8),'stair base solid');
check(Voxel.intersects(69,0,0,0,.2,.55,.8,.8,.95,.9),'stone stair raised step solid');
check(!Voxel.intersects(49,0,0,0,.2,.55,.2,.8,.95,.3),'air over the first step remains clear');
check(!Voxel.intersects(78,0,0,0,.45,.05,.45,.55,.60,.55),'table has usable space beneath its top');
check(!Voxel.intersects(77,0,0,0,.40,.60,.01,.50,.80,.06),'bookcase has open front, not a solid cube');
// Run real meshing with crafted objects, catching invalid materials and corrupt buffers.
const edits={'0,0':{}};
let x=1,z=1;for(const id of [12,14,15,49,69,77,78,79,83,84,85,87]){
  edits['0,0'][Voxel.idx(x,85,z)]=id; x+=2; if(x>14){x=1;z+=2;}
}
const result=Voxel.makeJob({cx:0,cz:0,seed:123456,edits,rev:22,sites:[],generator:1},new Map());
check(result.rev===22 && result.solid.length>0,'chunk mesh generated');
check(result.solid.every(Number.isFinite),'chunk mesh contains no NaN/Infinity');
check(result.solid.length%6===0 && result.alpha.length%6===0,'correct vertex stride');
const changedMaterials=new Set();for(let i=3;i<result.solid.length;i+=6)changedMaterials.add(result.solid[i]);
check(changedMaterials.has(35) && changedMaterials.has(68),'decorative metal and dark wood batched into existing mesh');
console.log(`PASS ${tests} decorative voxel assertions; ${changed.length} enhanced IDs; ${result.solid.length/6} total opaque vertices`);
