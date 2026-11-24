'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Voxel = require('../js/world.js');
// Simulate the localStorage fallback used when IndexedDB is unavailable.
const localStorage={
  getItem(k){return Object.hasOwn(this,k)?this[k]:null;},
  setItem(k,v){this[k]=String(v);},
  removeItem(k){delete this[k];}
};
const ctx={localStorage,console,Math,Date,crypto:{randomUUID:()=> 'stress-session'},structuredClone};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/store.js'),'utf8')+';this.Saves=Saves;',ctx);
const Saves=ctx.Saves;
const gameCtx={Voxel,Sound:{play(){}},View:{basis:()=>({f:[0,0,-1]})},Saves,crypto:ctx.crypto,Math,console};
vm.createContext(gameCtx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8')+';this.Game=Game;',gameCtx);
const fresh=gameCtx.Game.fresh;
const world=fresh('Obras e cavernas','GDD-stress-2026','survival','normal');
world.id='large-world-test';
world.saved=10000;
const keys=[];
let total=0;
// Simulates 3,200 manually edited voxels across positive and negative chunks.
for(let i=0;i<80;i++){
  const cx=i%10-5, cz=Math.floor(i/10)-4;
  const k=cx+','+cz, edits={};
  for(let j=0;j<40;j++) edits[Voxel.idx(j%16,52+Math.floor(j/16),j*7%16)] = 8+(j%5);
  world.edits[k]=edits;
  keys.push(k);total+=Object.keys(edits).length;
}
world.chests={'-4,2,63':Array.from({length:18},(_,i)=>i===1?{b:8,n:32}:null)};
world.inv[0]={b:22,n:1,dur:14};
world.goals={wood:true,craft8:true,place12:true};
world.house={x:-23,y:64,z:36};
world.navMode='home';
const clone=v=>structuredClone(v);
(async()=>{
  assert(total>=3000);
  await Saves.put(world);
  let saved=await Saves.get(world.id);
  assert.deepEqual(Object.keys(saved.edits).sort(),keys.sort());
  for (const k of keys) assert.equal(JSON.stringify(saved.edits[k]),JSON.stringify(world.edits[k]),'persist edited region '+k);
  assert.equal(saved.chests['-4,2,63'][1].n,32);
  assert.equal(saved.inv[0].dur,14);
  assert.equal(JSON.stringify(saved.house),JSON.stringify(world.house));
  const old=clone(saved);
  // Emergency checkpoint is used only if newer than the main save.
  saved.saved+=9000;
  saved.edits['-5,-4'][Voxel.idx(15,60,15)]=3;
  saved.chests['-4,2,63'][1].n=12;
  assert.equal(Saves.emergency(saved),true);
  assert.equal(Saves.recovery(old).edits['-5,-4'][Voxel.idx(15,60,15)],3);
  await Saves.put(saved);
  assert.equal(Saves.recovery(saved),null,'new durable save clears older recovery');
  // Corrupt sibling world must not hide good worlds.
  localStorage.setItem('mundo-prisma:v1:world:corrupt','not json');
  const rows=await Saves.list();
  assert(rows.some(r=>r.id===world.id));
  // Round-trip changes and isolated worlds.
  const other=fresh('Outro mundo','GDD-other','creative','peaceful');
  other.id='separate-world';
  await Saves.put(other);
  const again=await Saves.get(world.id);
  assert.equal(again.edits['-5,-4'][Voxel.idx(15,60,15)],3);
  assert.equal((await Saves.get(other.id)).seed,'GDD-other');
  // Source world object is not overwritten by subsequent changes to other worlds.
  const current=await Saves.get(world.id);
  assert.equal(current.saved,saved.saved);
  console.log(`PASS GDD large world: ${keys.length} regions, ${total} edited voxels, chests, emergency recovery, corrupted sibling, world isolation`);
})().catch(err=>{console.error(err);process.exitCode=1;});
