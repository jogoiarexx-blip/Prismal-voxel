'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const V=require('../js/world.js');
const baseline=require('./expedition-baseline.json');
for(const b of baseline)assert.equal(crypto.createHash('sha256').update(V.generate(b.cx,b.cz,b.seed,b.sites,b.gen).a).digest('hex'),b.sha,'old ruin terrain unchanged');
const seed=V.seedHash('PRISMA-EXPEDICAO'),sites=V.planRuins(seed,{},null,5), cache=new Map();
const read=(x,y,z)=>{const k=V.key(x>>4,z>>4);if(!cache.has(k))cache.set(k,V.generate(x>>4,z>>4,seed,sites,5));return cache.get(k).a[V.idx(x&15,y,z&15)];};
assert.equal(sites.length,3);for(const s of sites){const p=V.treasurePoint(s);assert.equal(read(p.x,p.y,p.z),15);assert.equal(read(s.x,s.y+1,s.z),28);for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)assert(!V.land(s.x+dx,s.z+dz,seed,5).river);}
const cabin=sites[1];assert.equal(read(cabin.x-1,cabin.y,cabin.z+2),0);assert.equal(read(cabin.x-3,cabin.y+1,cabin.z+2),92);assert.equal(read(cabin.x-2,cabin.y+3,cabin.z+2),65);
const tomb=sites[2];for(let i=0;i<6;i++)for(const dx of [1,2]){const dz=3-i,floor=-1-i;assert.equal(read(tomb.x+dx,tomb.y+floor,tomb.z+dz),74);for(let dy=floor+1;dy<=floor+2;dy++)assert.equal(read(tomb.x+dx,tomb.y+dy,tomb.z+dz),0,'stair headroom');}
assert.equal(read(tomb.x,tomb.y-5,tomb.z-2),0,'open chamber passage');assert.equal(read(tomb.x,tomb.y-6,tomb.z-2),26);
const chests=V.expeditionChests(sites);assert.equal(Object.keys(chests).length,3);for(const items of Object.values(chests)){assert.equal(items.length,18);assert(items.some(Boolean));for(const i of items.filter(Boolean)){assert(V.blocks[i.b]&&i.n>=1&&i.n<=64);if(V.durability[i.b])assert.equal(i.dur,V.durability[i.b]);}}
// The actual mesh uses the same positions in arbitrary load order.
for(const s of sites){const p=V.treasurePoint(s),cx=p.x>>4,cz=p.z>>4;const job={cx,cz,seed,sites,edits:{},generator:5,rev:1};const a=V.makeJob(job,new Map()),b=V.makeJob(job,new Map());assert.deepEqual(a.a,b.a);assert.deepEqual(a.solid,b.solid);assert(a.solid.every(Number.isFinite));}
// No regeneration on load: both emptied and removed chests remain gone.
const ctx={Voxel:V,crypto:{randomUUID:()=> 'expedition-id'},Math,Date,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/navigation.js','utf8')+'\n'+fs.readFileSync('js/game.js','utf8')+'\nthis.Game=Game;this.Navigation=Navigation;',ctx);
const G=ctx.Game;G.Session.prototype.startWorker=function(){};G.Session.prototype.stream=function(){};
const fresh=G.fresh('Teste','PRISMA-EXPEDICAO','survival','normal',5);assert.equal(fresh.generator,5);assert.equal(Object.keys(fresh.chests).length,3);
const [a,b]=Object.keys(fresh.chests);fresh.chests[a]=Array(18).fill(null);delete fresh.chests[b];const saved=JSON.parse(JSON.stringify(fresh));const g=new G.Session(saved,null,{},()=>{},()=>{});assert(!g.chests[a].some(Boolean));assert.equal(g.chests[b],undefined);
for(let i=0;i<3;i++){g.navMode='treasure:'+i;const t=ctx.Navigation.target(g);assert.equal(t.key,g.navMode);assert.equal(t.label,V.treasurePoint(g.sites[i]).label);assert.equal(t.y,V.treasurePoint(g.sites[i]).y);}
assert.equal(ctx.Navigation.target({generator:4,navMode:'treasure:0',sites}),null);
const localStorage={getItem(k){return this[k]??null},setItem(k,v){this[k]=String(v)},removeItem(k){delete this[k]}};
const sc={localStorage,console,Date,Math};vm.createContext(sc);vm.runInContext(fs.readFileSync('js/store.js','utf8')+'\nthis.Saves=Saves;',sc);
(async()=>{await sc.Saves.put(saved);const loaded=await sc.Saves.get(saved.id);assert.equal(loaded.generator,5);assert(!loaded.chests[a].some(Boolean));assert.equal(loaded.chests[b],undefined);assert(sc.Saves.emergency({...loaded,saved:loaded.saved+3000}));assert(sc.Saves.recovery(loaded));console.log('PASS expedition: 12 legacy ruin samples, 3 treasure locations, cabin, stair clearance, deterministic meshing, navigation, save/reload and no loot regeneration');})().catch(e=>{console.error(e);process.exitCode=1});
