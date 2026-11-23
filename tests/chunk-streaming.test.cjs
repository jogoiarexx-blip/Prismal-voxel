'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Voxel=require('../js/world.js');
const ctx={Voxel,Sound:{play(){}},View:{basis:()=>({f:[0,0,-1]})},console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8')+';this.Game=Game;',ctx);
const Game=ctx.Game;
const g=Object.create(Game.Session.prototype);
let writes=0, signals=0, installed=0;
const blockData=()=>new Uint8Array(Voxel.S*Voxel.S*Voxel.H);
Object.assign(g,{
 edits:{},chunks:new Map([['0,0',{a:blockData()}]]),revs:new Map(),lit:new Map(),pending:new Set(),
 cx:0,cz:0,radius:2,alive:true,busy:true,applyingRemoteEdit:false,
 changed(){writes++},signal(){signals++},relight(){},pump(){},renderer:{install(){installed++}},
});
// A blueprint or tree batch crosses a chunk boundary while only one chunk is loaded.
g.applyBlockBatch([[15,68,2,8],[16,68,2,8]]);
assert.equal(g.chunks.get('0,0').a[Voxel.idx(15,68,2)],8);
assert.equal(g.edits['1,0'][Voxel.idx(0,68,2)],8);
assert.ok(g.revs.get('1,0')>=1,'unloaded chunk revision advances');
assert.ok(g.pending.has('1,0'),'nearby unloaded chunk queued for generation');
assert.equal(writes,1);
// Network updates must not accept stale mesh jobs created before the edit.
const previousRev=g.revs.get('1,0');
assert.ok(g.applyRemoteEdit(16,68,2,20));
assert.ok(g.revs.get('1,0')>previousRev,'remote unloaded edit invalidates old jobs');
assert.equal(g.edits['1,0'][Voxel.idx(0,68,2)],20);
const pendingBefore=g.pending.size;
g.received({cx:1,cz:0,rev:0,a:blockData()});
assert.equal(installed,0,'stale job is not installed');
assert.ok(g.pending.has('1,0'),'stale job is requeued');
// Remote edits crossing the same seam commit together without re-broadcast.
const broadcasts=signals;
assert.ok(g.applyRemoteBatch([[15,68,2,4],[17,68,2,5]]));
assert.equal(g.chunks.get('0,0').a[Voxel.idx(15,68,2)],4);
assert.equal(g.edits['1,0'][Voxel.idx(1,68,2)],5);
assert.equal(signals,broadcasts,'remote edits are not echoed back to peer');
assert.ok(g.pending.size>=pendingBefore);
assert.equal(g.applyRemoteBatch([[17,9999,2,8]]),false,'reject invalid network batch');
console.log('PASS chunk streaming: unloaded writes, revision invalidation, stale worker rejection, network seam and safe validation');
