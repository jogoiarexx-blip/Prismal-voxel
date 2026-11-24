'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const V=require('../js/world.js');
const seed=V.seedHash('PRISMA-EXPLORA');
let rivers=0, elevated=0, drops=0, deep=0, cross=0;
for(let x=12;x<180;x++)for(let z=20;z<70;z++){
  const a=V.land(x,z,seed,4),old=V.land(x,z,seed,3);
  assert(a.h<=old.h,'river must not raise original terrain');
  if(!a.river)continue;
  rivers++;assert(a.waterY>a.h && a.waterY<=V.SEA+9);
  if(a.waterY>V.SEA)elevated++;
  const b=V.land(x+1,z,seed,4);
  if(b.river && a.waterY!==b.waterY)drops++;
  if(x%16===15&&b.river)cross++;
}
assert(rivers>100 && elevated>0 && drops>0 && cross>0,'stepped stream crosses chunk boundaries');
for(let cx=2;cx<7;cx++)for(let cz=1;cz<5;cz++){
  const a=V.generate(cx,cz,seed,[],4),b=V.generate(cx,cz,seed,[],3);
  assert.deepEqual(a.a,V.generate(cx,cz,seed,[],4).a);
  for(let z=0;z<16;z++)for(let x=0;x<16;x++){
    const col=V.land(cx*16+x,cz*16+z,seed,4);
    assert.equal(a.a[V.idx(x,0,z)],3,'bedrock retained');
    if(col.river)for(let y=col.h+1;y<=col.waterY;y++)assert.equal(a.a[V.idx(x,y,z)],7,'river is filled');
    for(let y=9;y<45;y++)if(b.a[V.idx(x,y,z)]===3 && a.a[V.idx(x,y,z)]===0 && y<col.h-5)deep++;
  }
}
assert(deep>100,'new deep cave volume');
assert.deepEqual(V.generate(0,0,seed,[],3).a,V.generate(0,0,seed,[],4).a,'starter chunk unchanged');
const sites=V.planRuins(seed,{},null,4);
for(const site of sites)for(let dz=-4;dz<=4;dz++)for(let dx=-4;dx<=4;dx++)assert(!V.land(site.x+dx,site.z+dz,seed,4).river,'ruins avoid new waterways');
const job={cx:4,cz:3,seed,edits:{},sites:[],generator:4,rev:1};
const cache=new Map(),first=V.makeJob(job,cache);V.makeJob({...job,cx:5},cache);
const again=V.makeJob(job,cache);assert.deepEqual(first.a,again.a);assert.deepEqual(first.solid,again.solid);assert.deepEqual(first.alpha,again.alpha);assert(first.solid.every(Number.isFinite)&&first.alpha.every(Number.isFinite));
const ctx={Voxel:V,crypto:{randomUUID:()=> 'id'},Math,Date,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/game.js','utf8')+'\nthis.Game=Game;',ctx);
assert.equal(ctx.Game.fresh('A','seed','survival','normal').generator,3);assert.equal(ctx.Game.fresh('B','seed','survival','normal',4).generator,4);
const ui=fs.readFileSync('js/ui.js','utf8'),store=fs.readFileSync('js/store.js','utf8');assert.match(ui,/\[1,2,3,4\]\.includes\(src.generator\)/);assert.match(ui,/\[1,2,3,4\]\.includes\(rec.generator\)/);assert.match(store,/\[1,2,3,4\]\.includes\(r.generator\)/);assert.match(ui,/Number\(\$\('#worldGenerator'\)\.value\)/);assert.match(ui,/Number\(\$\('#mpWorldGenerator'\)\.value\)/);
console.log(`PASS exploration: ${rivers} water columns; ${elevated} elevated; ${drops} adjacent elevation changes; ${cross} chunk crossings; ${deep} new deep air voxels; deterministic meshes and generator wiring`);
const localStorage={getItem(k){return this[k]??null},setItem(k,v){this[k]=String(v)},removeItem(k){delete this[k]}};
const sc={localStorage,console,Date,Math};vm.createContext(sc);vm.runInContext(store+'\nthis.Saves=Saves;',sc);
(async()=>{const rec=ctx.Game.fresh('Exploração','seed','survival','normal',4);rec.saved=10000;rec.edits={'4,3':{[V.idx(1,65,2)]:8}};await sc.Saves.put(rec);const saved=await sc.Saves.get(rec.id);assert.equal(saved.generator,4);const newer=JSON.parse(JSON.stringify(saved));newer.saved=20000;newer.edits['4,3'][V.idx(1,65,2)]=3;assert(sc.Saves.emergency(newer));assert.equal(sc.Saves.recovery(saved).edits['4,3'][V.idx(1,65,2)],3);assert.equal(sc.Saves.recovery({...saved,generator:3}),null);console.log('PASS generator 4 local save, reload, emergency recovery and version isolation');})().catch(e=>{console.error(e);process.exitCode=1});
