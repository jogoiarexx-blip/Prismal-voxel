'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const Coop=require('../js/coop.js');
const Voxel=require('../js/world.js');
global.Voxel=Voxel;
const vm=require('node:vm'),fs=require('node:fs');
const Game=vm.runInThisContext(fs.readFileSync(path.resolve(__dirname,'../js/game.js'),'utf8')+'\nGame');
const id='player-uuid-session-replay',pos='20,65,20';
const blank=n=>Array(n).fill(null);
const bag=(n=1)=>{const r=blank(36);r[0]={b:8,n};return r;};
const world={guestProfiles:{},chests:{[pos]:blank(18)},chestRevisions:{[pos]:0},changes:0,writes:0,
 changed(){this.changes++},async save(){this.writes++;this.disk=structuredClone({guestProfiles:this.guestProfiles,chests:this.chests,chestRevisions:this.chestRevisions});return true;}};
Coop.ensureProfile(world,id,bag(1),Voxel.blocks.length);
const version=()=>world.guestProfiles[id].rev;
const report=[];let checks=0;
const check=(msg,fn)=>{fn();checks++;report.push(msg)};
(async()=>{
 let out=await Coop.syncInventory(world,id,{seq:1,rev:0,inv:bag(20)},Voxel.blocks.length);
 check('inv saved before acknowledgment',()=>{assert.equal(out.status,'committed');assert.equal(out.state.seq,1);assert.equal(world.disk.guestProfiles[id].inv[0].n,20)});
 const writes=world.writes;
 out=await Coop.syncInventory(world,id,{seq:1,rev:0,inv:bag(64)},Voxel.blocks.length);
 check('duplicate packet idempotent',()=>{assert.equal(out.status,'duplicate');assert.equal(world.guestProfiles[id].inv[0].n,20);assert.equal(world.writes,writes)});
 let fails=0;
 const savedSave=world.save;
 world.save=async()=>{fails++;return false};
 out=await Coop.syncInventory(world,id,{seq:2,rev:0,inv:bag(25)},Voxel.blocks.length);
 check('lost persistence rolls back inventory',()=>{assert.equal(out.status,'failed');assert.equal(world.guestProfiles[id].inv[0].n,20);assert.equal(world.guestProfiles[id].seq,1)});
 world.save=savedSave;
 out=await Coop.syncInventory(world,id,{seq:2,rev:0,inv:bag(25)},Voxel.blocks.length);
 check('same sequence can be retried safely',()=>{assert.equal(out.status,'committed');assert.equal(world.guestProfiles[id].inv[0].n,25);assert.equal(world.disk.guestProfiles[id].seq,2)});
 const local={pendingInv:{seq:3,rev:0,inv:bag(32)}};
 const host={rev:0,seq:2,inv:bag(25)};
 const recovered=Coop.recoverGuestInventory(local,host,Voxel.blocks.length);
 check('reconnect recovers unacknowledged local inventory',()=>{assert.equal(recovered.replay,true);assert.equal(recovered.seq,3);assert.equal(recovered.inv[0].n,32)});
 out=await Coop.syncInventory(world,id,{seq:recovered.seq,rev:0,inv:recovered.inv},Voxel.blocks.length);
 check('host accepts replay exactly once',()=>{assert.equal(out.status,'committed');assert.equal(world.disk.guestProfiles[id].inv[0].n,32)});
 out=await Coop.syncInventory(world,id,{seq:3,rev:0,inv:bag(64)},Voxel.blocks.length);
 check('replayed packet cannot duplicate items',()=>{assert.equal(out.status,'duplicate');assert.equal(world.guestProfiles[id].inv[0].n,32)});
 const already=Coop.recoverGuestInventory(local,{rev:0,seq:3,inv:bag(32)},Voxel.blocks.length);
 check('acknowledged packet no longer needs replay',()=>{assert.equal(already.replay,false);assert.equal(already.inv[0].n,32)});
 // Keep chest moves queued behind durable inventory writes even if sent concurrently.
 let unblock;
 world.save=()=>new Promise(r=>{unblock=r});
 const first=Coop.syncInventory(world,id,{seq:4,rev:0,inv:bag(40)},Voxel.blocks.length);
 world.chests[pos][0]={b:8,n:5};
 const next=Coop.transact(world,id,pos,{tx:1,rev:0,profileRev:0,from:'chest',index:0,to:'inv',target:1,quick:false,split:false},Game.Session.chestMove,Voxel.blocks.length);
 await new Promise(r=>setImmediate(r));
 check('chest waits for inventory save',()=>{assert.equal(world.guestProfiles[id].inv[0].n,40);assert.equal(world.guestProfiles[id].inv[1],null)});
 unblock(true);assert.equal((await first).status,'committed');
 await new Promise(r=>setImmediate(r));
 unblock(true);assert.equal((await next).status,'committed');
 check('chest and inventory both committed in order',()=>{assert.equal(world.guestProfiles[id].inv[0].n,40);assert.equal(world.guestProfiles[id].inv[1].n,5);assert.equal(world.chestRevisions[pos],1)});
 world.save=savedSave;
 const conflict=Coop.recoverGuestInventory({pendingInv:{seq:5,rev:0,inv:bag(52)}},
  {rev:1,seq:4,inv:world.guestProfiles[id].inv},Voxel.blocks.length);
 check('conflicting chest revision never merges stale inventory',()=>{assert.equal(conflict.replay,false);assert.equal(conflict.conflicted,true);assert.equal(conflict.inv[0].n,40)});
 out=await Coop.syncInventory(world,id,{seq:5,rev:0,inv:bag(52)},Voxel.blocks.length);
 check('host refuses stale chest revision',()=>{assert.equal(out.status,'conflict');assert.equal(world.guestProfiles[id].inv[0].n,40)});
 // Simulated long session: 240 snapshots; crashes and retransmissions are injected.
 for(let i=5;i<=244;i++){
  const desired=1+(i%64),inv=bag(desired),payload={seq:i,rev:version(),inv};
  const received=await Coop.syncInventory(world,id,payload,Voxel.blocks.length);
  assert.equal(received.status,'committed');
  assert.equal(world.disk.guestProfiles[id].inv[0].n,desired);
  if(i%7===0)assert.equal((await Coop.syncInventory(world,id,payload,Voxel.blocks.length)).status,'duplicate');
 }
 check('240 successive durable updates and duplicate transmissions',()=>{assert.equal(world.guestProfiles[id].seq,244);assert.equal(world.disk.guestProfiles[id].inv[0].n,1+(244%64));});
 console.log('PASS '+checks+' scenarios; 240 simulated inventory updates, serial chest writes, rollback and replay, '+world.writes+' world writes');
})().catch(e=>{console.error(e);process.exitCode=1});
