'use strict';
const assert=require('node:assert/strict');
const V=require('../js/world.js');
const fs=require('node:fs');
let checks=0;const check=(v,msg)=>{assert.ok(v,msg);checks++};
for(let i=0;i<8;i++){
 const low=57+i,high=97+i;
 const facing=i%4;
 const envelope=i<4?(facing%2?[.4,0,0,.2,1,1]:[0,0,.4,1,1,.2]):(facing%2?[0,0,facing===1?.08:.75,1,1,.17]:[facing===0?.08:.75,0,0,.17,1,1]);
 for(const id of [low,high]){
  const p=V.shapeParts(id);
  check(p.length>5&&p.length<=30,'bounded detail budget '+id);
  check(V.itemId(id)===57,'same recoverable door item');
  for(const q of p){
   check(q.slice(0,6).every(Number.isFinite),'finite geometry');
   check(q.slice(3,6).every(v=>v>0),'positive dimensions');
   for(let a=0;a<3;a++)check(q[a]>=envelope[a]-1e-6&&q[a]+q[a+3]<=envelope[a]+envelope[a+3]+1e-6,'part inside existing door envelope '+id);
   check(!!V.blocks[q[6]],'valid material');
  }
 }
 check(V.shapeParts(high).filter(p=>p[6]===56).length===4,'four glazed upper panes');
 check(V.shapeParts(low).some(p=>p[6]===24),'metal handle');
 // Compare the lower collision against the original slab for a uniform grid.
 for(let x=.025;x<1;x+=.1)for(let z=.025;z<1;z+=.1){
  const expected=x<envelope[0]+envelope[3]&&x+.04>envelope[0]&&z<envelope[2]+envelope[5]&&z+.04>envelope[2];
  check(V.intersects(low,0,0,0,x,.25,z,x+.04,.75,z+.04)===expected,'unchanged lower door collision '+low);
 }
}
const win=V.shapeParts(92);check(win.filter(q=>q[6]===56).length===4,'window panes');
check(V.intersects(92,0,0,0,.2,.25,.48,.3,.35,.52),'window pane prevents penetration');
check(!V.intersects(92,0,0,0,.2,.25,.1,.3,.35,.3),'space in front is clear');
for(const id of [65,66,74,75,91])check(!V.specialShape(id),'ordinary terrain still greedily meshed '+id);
const edits={'0,0':{}};for(const [i,id] of [57,97,61,101,92,65,66,74,75,91].entries())edits['0,0'][V.idx(2+i,85,5)]=id;
const m=V.makeJob({cx:0,cz:0,seed:123456,edits,rev:25,sites:[],generator:1},new Map());
check(m.rev===25&&m.solid.length>0&&m.alpha.length>0,'opaque and transparent meshing');
check(m.solid.every(Number.isFinite)&&m.alpha.every(Number.isFinite),'finite mesh data');
check(m.solid.length%6===0&&m.alpha.length%6===0,'vertex stride');
check(Array.from(m.alpha).some((x,i)=>i%6===3&&x===56),'transparent window material emitted');
const shader=fs.readFileSync('js/render.js','utf8');for(const id of [65,66,74,75,91])check(shader.includes('if(m=='+id+'.'),'procedural finish '+id);
console.log('PASS '+checks+' architecture assertions');
