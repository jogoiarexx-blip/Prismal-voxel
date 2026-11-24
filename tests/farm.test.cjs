'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const V=require('../js/world.js');const ctx={Voxel:V,Sound:{play(){}},crypto:{randomUUID:()=> 'farm'},Math,Date,console,structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/navigation.js','utf8')+'\n'+fs.readFileSync('js/game.js','utf8')+'\nthis.Game=Game;',ctx);const P=ctx.Game.Session.prototype;
P.startWorker=function(){};P.stream=function(){};P.changed=function(){this.changes=(this.changes||0)+1;};P.mobMove=function(m,x,z){m.x=x;m.z=z;return true;};
const game=()=>new ctx.Game.Session(ctx.Game.fresh('Fazenda','farm-seed','survival','normal',5),null,{},()=>{},()=>{});
const animal=(kind,id=1)=>({kind,id,x:0,y:65,z:0,hp:V.farmHealth[kind]});
for(const kind of V.farmAnimals){
 const g=game(),a=animal(kind),b=animal(kind,2);g.p={...g.p,x:0,y:65,z:0};b.x=2;g.mobs=[a,b];g.nextMobId=3;g.elapsed=10;
 assert(g.feedFarm(a));assert(g.feedFarm(b));assert(!g.feedFarm(a));g.farmTick(1);assert.equal(g.mobs.length,3);const child=g.mobs[2];assert(child.juvenile&&child.tamed&&child.kind===kind);assert.equal(a.breedReady,130);assert.equal(b.loveUntil,0);g.farmTick(1);assert.equal(g.mobs.length,3);
 assert(V.farmScale(child)>.5&&V.farmScale(child)<1);const loaded=new ctx.Game.Session(g.snapshot(),null,{},()=>{},()=>{});assert(loaded.mobs[2].juvenile&&loaded.mobs[2].tamed);loaded.farmTick(180);assert.equal(loaded.mobs[2].juvenile,false);assert.equal(V.farmScale(loaded.mobs[2]),1);
 const d=animal(kind);g.mobs=[d];g.drops=[];g.strikeMob(d,5,1,0);g.strikeMob(d,5,1,0);assert.deepEqual(Array.from(g.drops,x=>[x.b,x.n]),V.farmDrops[kind]);assert(!g.strikeMob(d,5,1,0));
}
const g=game();g.p.x=0;g.p.z=0;g.elapsed=100;const sheep=animal('Ovelha'),cow=animal('Vaca',2),hen=animal('Galinha',3);g.mobs=[sheep,cow,hen];g.inv.fill(null);g.inv[0]={b:146,n:1,dur:80};assert(g.farmProduct(sheep,g.inv[0]));assert.equal(g.inv[0].dur,79);assert.equal(g.inv.find(x=>x?.b===123).n,2);g.farmProduct(sheep,g.inv[0]);assert.equal(g.inv[0].dur,79);assert.equal(sheep.woolReady,200);
g.inv[0]={b:144,n:1};assert(g.farmProduct(cow,g.inv[0]));assert.equal(g.inv[0].b,145);assert.equal(cow.milkReady,190);g.p.food=50;g.aimMob=()=>null;g.use();assert(g.inv.some(x=>x?.b===144));assert.equal(g.p.food,72);
g.farmTick(1);assert.equal(hen.eggReady,180);g.elapsed=181;g.farmTick(1);assert(g.drops.some(x=>x.b===142));const n=g.drops.length;g.farmTick(1);assert.equal(g.drops.length,n);
g.inv.fill({b:3,n:64});g.inv[0]={b:146,n:1,dur:80};g.elapsed=210;g.farmProduct(sheep,g.inv[0]);assert.equal(g.inv[0].dur,80);assert.equal(sheep.woolReady,200);
g.networkGuest=true;g.inv[0]={b:144,n:1};g.farmProduct(cow,g.inv[0]);assert.equal(g.inv[0].b,144);assert.equal(cow.milkReady,190);const state=g.networkMobState();const peer=game();peer.networkGuest=true;assert(peer.applyNetworkEntities({seq:1,mobs:state,drops:[]}));assert(peer.mobs.some(m=>m.kind==='Galinha'));
for(let id=140;id<=151;id++){assert(V.blocks[id]);assert(!V.blocks[id].solid&&!V.blocks[id].placeable)}
for(const id of [147,148,149,150,151])assert(V.recipesAtStation(14).some(r=>r.recipe[0]===id));
for(const id of [144,146])assert(V.recipesAtStation(12).some(r=>r.recipe[0]===id));
const fresh=ctx.Game.fresh('Expedição','farm-seed','survival','normal',5);assert(Object.values(fresh.chests).every(x=>x[5]?.n>0));
console.log('PASS four species: birth, maturity, persistence, meat drops, milk, wool, eggs, crafting, guest safety and regional loot');
