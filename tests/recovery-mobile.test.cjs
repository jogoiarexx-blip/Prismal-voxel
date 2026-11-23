'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
class MemoryStore {
  constructor(){this.map=new Map();this.block=false;}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){if(this.block) throw Error('QuotaExceededError');this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
  key(i){return [...this.map.keys()][i]??null;}
  get length(){return this.map.size;}
}
const localStorage = new MemoryStore();
const ctx={localStorage,crypto:{randomUUID:()=> 'fake-uuid'},console,Date,Math,structuredClone};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'js/store.js'),'utf8')+'\nthis.Saves=Saves',ctx);
const Saves=ctx.Saves;
const Voxel=require('../js/world.js');
const ctxGame={Voxel,Sound:{play:()=>{}},Saves:{},View:{basis:()=>({f:[0,0,-1]})},setTimeout,clearTimeout,structuredClone,crypto:{randomUUID:()=> 'fake-uuid'},Math,console,
  document:{body:{classList:{contains:()=>true}}}};
vm.createContext(ctxGame);vm.runInContext(fs.readFileSync(path.join(root,'js/game.js'),'utf8')+'\nthis.Game=Game',ctxGame);
const Game=ctxGame.Game;
const base={...Game.fresh('Teste','world-recovery','survival','normal'),id:'abc-recovery-world',saved:10000};
const copy=(t)=>({...structuredClone(base),saved:t});
const id=base.id;
(async()=>{
 let n=0;
 const ok=(what,fn)=>{fn();console.log('PASS',what);n++;};
 await Saves.put(base);
 ok('no unrequested recovery',()=>assert.equal(Saves.recovery(base),null));
 const newer=copy(16000);newer.edits={'0,0':{1:8}};
 ok('write sync crash recovery',()=>assert.equal(Saves.emergency(newer),true));
 ok('newer world snapshot returned',()=>assert.equal(Saves.recovery(base).edits['0,0'][1],8));
 ok('stale tab cannot overwrite recovery',()=>{assert.equal(Saves.emergency(copy(14000)),true);assert.equal(Saves.recovery(base).saved,16000);});
 await Saves.put(copy(13000));
 ok('older async save does not clear newer checkpoint',()=>assert.equal(Saves.recovery(copy(13000)).saved,16000));
 await Saves.put(copy(17000));
 ok('successful newer DB save cleans up emergency',()=>assert.equal(Saves.recovery(copy(17000)),null));
 ok('stale recovery ignored',()=>{Saves.emergency(copy(12000));assert.equal(Saves.recovery(copy(14000)),null);});
 ok('mismatched seed rejected',()=>{Saves.emergency({...copy(24000),seed:'other-seed'});assert.equal(Saves.recovery(base),null);});
 const key='mundo-prisma:v1:recovery:'+id;
 ok('corrupt local data ignored',()=>{localStorage.setItem(key,'not json');assert.equal(Saves.recovery(base),null);});
 localStorage.block=true;
 ok('quota errors do not affect IDB-save path',()=>assert.equal(Saves.emergency(copy(26000)),false));
 localStorage.block=false;
 ok('invalid world snapshot rejected',()=>assert.equal(Saves.emergency({id,saved:28000}),false));
 ok('mobile chunk radius reduced',()=>{
   const f={p:{x:0,z:0},settings:{quality:1},pending:new Set(),chunks:new Map(),lit:new Map(),renderer:{remove(){}},pump(){}};
   Game.Session.prototype.stream.call(f,true);assert.equal(f.radius,3);assert(f.pending.size>0);
 });
 ok('renderer dynamic scale stays clamped',()=>{
   const code=fs.readFileSync(path.join(root,'js/render.js'),'utf8');assert.match(code,/Math\.max\(0\.72,Math\.min\(1,this\.dynamicScale \|\| 1\)\)/);
 });
 ok('UI exposes recovery choices',()=>{
   const code=fs.readFileSync(path.join(root,'js/ui.js'),'utf8');assert.match(code,/btn\('restore-world'/);assert.match(code,/btn\('ignore-recovery'/);assert.match(code,/Saves\.emergency\(g\.snapshot\(\)\)/);
 });
 console.log(`PASS ${n} recovery/performance tests`);
})().catch(e=>{console.error(e);process.exitCode=1});
