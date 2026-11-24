'use strict';
// Run: node tests/voxel-0940.test.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const V=require('../js/world.js');
const source=fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8');
const G=new Function('Voxel','Sound',source+'\nreturn Game;')(V,{play(){}});
let checked=0,cross=0;
for(const seed of ['Prisma','Mundo','Floresta']){
 const s=V.seedHash(seed),sites=V.planRuins(s,{}, {x:.5,z:3.5},6),cache=new Map();
 function chunk(cx,cz){const k=cx+','+cz;if(!cache.has(k))cache.set(k,V.generate(cx,cz,s,sites,6));return cache.get(k);}
 function at(x,y,z){return chunk(Math.floor(x/16),Math.floor(z/16)).a[V.idx(x&15,y,z&15)];}
 for(let gz=-3;gz<=3;gz++)for(let gx=-3;gx<=3;gx++){
  const houses=V.villageHouses(gx,gz,s,sites);
  assert.deepEqual(houses,V.villageHouses(gx,gz,s,sites));
  for(const h of houses){
   assert.equal(at(h.x,h.y,h.z),8);assert.equal(at(h.x,h.y+1,h.z+2),0);
   assert.equal(at(h.x,h.y+7,h.z),65);assert.equal(at(h.x-1,h.y+1,h.z-1),12);
   assert.equal(at(h.x-3,h.y+4,h.z),65);assert.equal(at(h.x+3,h.y+4,h.z),65);
   if(Math.floor((h.x-3)/16)!==Math.floor((h.x+3)/16)||Math.floor((h.z-3)/16)!==Math.floor((h.z+3)/16))cross++;
   checked++;
  }
 }
 for(const [k,c] of cache){const [cx,cz]=k.split(',').map(Number);assert.deepEqual(c.a,V.generate(cx,cz,s,sites,6).a);}
}
assert.ok(checked>0);assert.ok(cross>0);
for(const id of [176,177]){
 assert.equal(V.blocks[id].solid,false);assert.equal(V.blocks[id].placeable,false);
 assert.ok(V.recipesAtStation(12).some(x=>x.recipe[0]===id));
}
const p={inv:Array(36).fill(null),p:{life:100},damageCool:0,signal(){},notify(){},changed(){},settings:{}};
p.inv[0]=G.slot(176);p.inv[1]=G.slot(177);
const hit=(n,why)=>{p.damageCool=0;G.Session.prototype.damage.call(p,n,why);};
hit(20,'Zumbi');assert.equal(p.p.life,87);assert.equal(p.inv[1].dur,109);assert.equal(p.inv[0].dur,65);
hit(10,'Fome');assert.equal(p.p.life,77);assert.equal(p.inv[1].dur,109);
p.inv[1].dur=1;hit(10,'Zumbi');assert.equal(p.inv[1],null);
p.inv[15]=G.slot(177);hit(10,'Zumbi');assert.equal(p.inv[0].dur,64);assert.equal(p.inv[15].dur,110);
console.log('OK:',checked,'casas,',cross,'atravessando chunks; armaduras e crafting');
