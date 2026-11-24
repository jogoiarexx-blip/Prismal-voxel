'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Voxel=require('../js/world.js');
const ctx={Voxel,Sound:{play(){}},crypto:{randomUUID:()=> 'crops'},Math,Date,console,structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/navigation.js','utf8')+'\n'+fs.readFileSync('js/game.js','utf8')+'\nthis.Game=Game;',ctx);
const P=ctx.Game.Session.prototype;P.startWorker=function(){};P.stream=function(){};P.changed=function(){};
function make(rec){const g=new ctx.Game.Session(rec||ctx.Game.fresh('Horta','teste','survival','normal'),null,{},()=>{},()=>{});g.chunks.set('0,0',{a:new Uint8Array(16*16*Voxel.H)});g.get=(x,y,z)=>g.chunks.get('0,0').a[Voxel.idx(x&15,y,z&15)]||0;g.set=(x,y,z,b)=>{g.chunks.get('0,0').a[Voxel.idx(x&15,y,z&15)]=b;return true};g.aimMob=()=>null;return g;}
for(const seed of [37,152,153,154]){
 const g=make();g.inv.fill(null);g.inv[0]={b:seed,n:2};g.set(5,65,5,38);assert(g.cropAction({b:38,p:[5,65,5]},g.inv[0]));assert.equal(g.inv[0].n,1);const first=Voxel.cropForItem(seed),c=Voxel.cropInfo(first);assert.equal(g.get(5,65,5),first);
 for(let i=0;i<90;i++)g.growCrops();assert.equal(g.plots['5,65,5'],0,'dry growth paused');g.set(6,65,5,7);
 for(let i=0;i<Math.ceil(c.seconds/2);i++)g.growCrops();assert.equal(g.get(5,65,5),first===39?39:first+1);
 const loaded=make(g.snapshot());loaded.set(5,65,5,g.get(5,65,5));loaded.set(6,65,5,7);for(let i=0;i<c.seconds;i++)loaded.growCrops();assert.equal(loaded.get(5,65,5),c.last);assert.equal(loaded.plots['5,65,5'],undefined);
 assert(loaded.cropAction({b:c.last,p:[5,65,5]},null));assert.equal(loaded.get(5,65,5),38);assert(loaded.drops.some(d=>d.b===c.item));const count=loaded.drops.length;loaded.cropAction({b:c.last,p:[5,65,5]},null);assert.equal(loaded.drops.length,count);
 loaded.networkGuest=true;loaded.inv[0]={b:seed,n:1};loaded.cropAction({b:38,p:[5,65,5]},loaded.inv[0]);assert.equal(loaded.inv[0].n,1);assert.equal(loaded.get(5,65,5),38);
}
const g=make();g.inv[0]=null;const animal={id:1,kind:'Vaca',tamed:true,hp:9,x:1,y:65,z:1};g.mobs=[animal];g.aimMob=()=>animal;g.use();assert(animal.follow);assert(make(g.snapshot()).mobs[0].follow);g.use();assert(!animal.follow);g.networkGuest=true;g.use();assert(!animal.follow);
for(let id=155;id<=163;id++){const parts=Voxel.shapeParts(id);assert(parts.length<=13);for(const p of parts)for(let i=0;i<3;i++)assert(p[i]>=0&&p[i]+p[i+3]<=1.000001);assert(!Voxel.blocks[id].placeable);}
for(const id of [164,165,166])assert(Voxel.recipesAtStation(14).some(x=>x.recipe[0]===id));
const edits={'0,0':{}};for(let i=0;i<9;i++)edits['0,0'][Voxel.idx(i+1,90,5)]=155+i;const job=Voxel.makeJob({cx:0,cz:0,seed:12,edits,sites:[],generator:3,rev:1},new Map());assert(job.solid.every(Number.isFinite));for(const id of [152,153,154])assert(job.solid.some((v,i)=>i%6===3&&v===id));
console.log('PASS crops: four types, dry/wet stages, persistence, harvest, duplicate prevention, guest restrictions, follow, recipes and geometry');
