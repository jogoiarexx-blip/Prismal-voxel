'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const V=require('../js/world.js');
const G=new Function('Voxel','Sound',fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8')+'\nreturn Game;')(V,{play(){}});
const seed=V.seedHash('Prisma'),sites=V.planRuins(seed,{}, {x:.5,z:3.5},6);
const houses=V.villageHouses(-3,-3,seed,sites);
assert.ok(houses.length);
const h=houses[0],chunks=new Map();
for(let cx=Math.floor((h.x-24)/16);cx<=Math.floor((h.x+24)/16);cx++)
 for(let cz=Math.floor((h.z-24)/16);cz<=Math.floor((h.z+24)/16);cz++)
  chunks.set(V.key(cx,cz),V.generate(cx,cz,seed,sites,6));
const messages=[];
const s={generator:6,seed,sites,p:{x:h.x+12,y:h.y,z:h.z},mobs:[],nextMobId:1,chunks,
 inv:Array(36).fill(null),selected:0,networkGuest:false,notify(v){messages.push(v)},
 get(x,y,z,barrier=false){if(y<0||y>=V.H)return 0;return chunks.get(V.key(x>>4,z>>4))?.a[V.idx(x&15,y,z&15)]??(barrier?-1:0);},
 floorAt:G.Session.prototype.floorAt};
const spawn=()=>G.Session.prototype.spawnVillagers.call(s);
spawn();const n=s.mobs.length;assert.ok(n>0&&n<=8);spawn();assert.equal(s.mobs.length,n);
for(const m of s.mobs){assert.equal(m.kind,'Aldeão');assert.equal(s.get(Math.floor(m.x),m.y,Math.floor(m.z)),0);}
const m=s.mobs[0];s.aimMob=()=>m;
assert.equal(G.Session.prototype.use.call(s),true);assert.match(messages[0],/Fazendeiro|Ferreiro|Construtor/);
assert.equal(G.Session.prototype.strikeMob.call(s,m,5,0,0),false);assert.equal(m.hp,12);
s.inv[0]=G.slot(47);G.Session.prototype.mine.call(s,.1);assert.equal(s.inv[0].dur,100);
const guest={networkGuest:true,lastNetworkMobSeq:-1,mobs:[],drops:[],guestPickupPending:new Map()};
assert.ok(G.Session.prototype.applyNetworkEntities.call(guest,{seq:1,mobs:G.Session.prototype.networkMobState.call(s),drops:[]}));
assert.equal(guest.mobs.length,n);assert.equal(guest.mobs[0].job,m.job);
s.mobs=[];s.networkGuest=true;spawn();assert.equal(s.mobs.length,0);
s.networkGuest=false;s.generator=5;spawn();assert.equal(s.mobs.length,0);
console.log('OK:',n,'aldeões, diálogo, proteção, P2P e ausência de duplicatas');
