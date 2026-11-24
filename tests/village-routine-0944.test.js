'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const V=require('../js/world.js');
const G=new Function('Voxel','Sound',fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8')+'\nreturn Game;')(V,{play(){}});
const S=G.Session.prototype;
const seed=V.seedHash('Prisma'),sites=V.planRuins(seed,{}, {x:.5,z:3.5},7),homes=[];
for(let gz=-3;gz<=3;gz++)for(let gx=-3;gx<=3;gx++){
 const houses=V.villageHouses(gx,gz,seed,sites);
 for(const h of houses)if(V.villageGarden(h,seed,houses))homes.push(h);
}
assert.ok(homes.length>=12);
for(const h of homes.slice(0,12)){
 const chunks=new Map();
 for(let cx=(h.x-10)>>4;cx<=(h.x+10)>>4;cx++)for(let cz=(h.z-10)>>4;cz<=(h.z+12)>>4;cz++)chunks.set(V.key(cx,cz),V.generate(cx,cz,seed,sites,7));
 const dummy={seed,sites,generator:7,elapsed:0,chunks,plots:{},mobs:[],p:{x:h.x+12,y:h.y,z:h.z+12},
 get(x,y,z,barrier=false){if(y<0)return 3;if(y>=V.H)return 0;return chunks.get(V.key(x>>4,z>>4))?.a[V.idx(x&15,y,z&15)]??(barrier?-1:0);},
 set(x,y,z,b){const c=chunks.get(V.key(x>>4,z>>4));if(!c)return false;c.a[V.idx(x&15,y,z&15)]=b;return true;},
 floorAt:S.floorAt,mobMove:S.mobMove,changed(){}};
 const x=h.x+.5,z=h.z+5.5,y=dummy.floorAt(x,z,h.y+2,true);
 const m={id:1,x,y,z,homeKey:h.x+','+h.z,houseY:h.y,homeX:x,homeZ:z,job:0,hp:12};dummy.mobs=[m];
 const walk=(m,vx,vz,speed,rad,ht)=>{const d=Math.hypot(vx,vz);if(d<.001)return false;const dx=vx/d*.05*speed,dz=vz/d*.05*speed;return dummy.mobMove(m,m.x+dx,m.z+dz,rad,ht)||dummy.mobMove(m,m.x+dx,m.z,rad,ht)||dummy.mobMove(m,m.x,m.z+dz,rad,ht);};
 const tick=(night)=>{for(let i=0;i<600;i++){dummy.elapsed+=.05;S.villageRoutine.call(dummy,m,.05,night,walk,.29,1.7,15,10,10);}};
 tick(false);assert.equal(m.activity,'farm');assert.equal(dummy.get(m.garden.x,m.garden.y+1,m.garden.z),39);
 tick(true);assert.equal(m.activity,'sleep');tick(false);assert.equal(m.activity,'farm');
 m.x=h.x+.5;m.y=h.y+1;m.z=h.z+.5;m.job=1;tick(false);assert.equal(m.activity,'forge');
 m.job=2;tick(false);assert.equal(m.activity,'build');
}
console.log('OK: 12 casas, trabalho agrícola, sono, retorno, oficina e bancada');
