'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path').resolve(__dirname,'..')+'/';
const Coop=require(path+'js/coop.js');
const Voxel=require(path+'js/world.js');
global.Voxel=Voxel; const Game=require('node:vm').runInThisContext(fs.readFileSync(path+'js/game.js','utf8')+'\nGame');
const id='guest-uuid-1234';
const pos='12,70,5';
const slot=(b,n)=>({b,n});
const blank=n=>Array.from({length:n},()=>null);
function setupWorld({save=true}={}){
 const bag=blank(36);bag[0]=slot(8,12);
 const chest=blank(18);chest[0]=slot(11,5);
 const world={guestProfiles:Object.create(null),chests:{[pos]:chest},chestRevisions:{[pos]:8},
  edits:{},changed(){this.changes=(this.changes||0)+1;},
  async save(){this.writes=(this.writes||0)+1;this.persisted=structuredClone({guestProfiles:this.guestProfiles,chests:this.chests,chestRevisions:this.chestRevisions});return save;}};
 Coop.ensureProfile(world,id,bag,Voxel.blocks.length);
 return world;
}
(async()=>{
 let count=0;const ok=(label,fn)=>{fn();count++;console.log('PASS',label)};
 ok('authoritative guest identity',()=>{assert.equal(Coop.validId(id),true);assert.equal(Coop.validId('__proto__'),false);assert.equal(Coop.validId(''),false)});
 const w=setupWorld();let pr=w.guestProfiles[id];
 ok('stored guest inventory',()=>{assert.equal(pr.inv[0].n,12);assert.equal(w.chests[pos][0].n,5)});
 ok('inventory shape validation',()=>{assert.equal(Coop.validInventory(pr.inv,36,Voxel.blocks.length),true);assert.equal(Coop.validInventory([slot(8,999)],36,Voxel.blocks.length),false)});
 const action={tx:1,rev:8,profileRev:0,from:'inv',index:0,to:'chest',target:1,quick:false,split:false};
 let result=await Coop.transact(w,id,pos,action,Game.Session.chestMove,Voxel.blocks.length);
 ok('durable shared chest transfer',()=>{assert.equal(result.status,'committed');assert.equal(w.writes,1);assert.equal(w.chests[pos][1].n,12);assert.equal(w.guestProfiles[id].inv[0],null);assert.equal(w.chestRevisions[pos],9);assert.equal(w.guestProfiles[id].lastTx,1)});
 result=await Coop.transact(w,id,pos,action,Game.Session.chestMove,Voxel.blocks.length);
 ok('duplicate delivery ignored after commit',()=>{assert.equal(result.status,'duplicate');assert.equal(w.writes,1);assert.equal(w.chests[pos][1].n,12)});
 result=await Coop.transact(w,id,pos,{...action,tx:2},Game.Session.chestMove,Voxel.blocks.length);
 ok('stale revision does not mutate inventory',()=>{assert.equal(result.status,'conflict');assert.equal(w.writes,1)});
 let w2=setupWorld({save:false});
 result=await Coop.transact(w2,id,pos,action,Game.Session.chestMove,Voxel.blocks.length);
 ok('failed persistence rolls back both inventories',()=>{assert.equal(result.status,'failed');assert.equal(w2.guestProfiles[id].inv[0].n,12);assert.equal(w2.chests[pos][1],null);assert.equal(w2.chestRevisions[pos],8);assert.equal(w2.guestProfiles[id].lastTx,0)});
 const reopened={...w.persisted,changed(){},save(){return Promise.resolve(true)}};
 result=await Coop.transact(reopened,id,pos,action,Game.Session.chestMove,Voxel.blocks.length);
 ok('reopened world preserves transaction receipts',()=>{assert.equal(result.status,'duplicate');assert.equal(reopened.guestProfiles[id].rev,1)});
 result=await Coop.transact(reopened,id,pos,{tx:2,rev:9,profileRev:1,from:'chest',index:1,to:'inv',target:1,quick:false,split:false},Game.Session.chestMove,Voxel.blocks.length);
 ok('consecutive transfer after reconnect succeeds',()=>{assert.equal(result.status,'committed');assert.equal(reopened.guestProfiles[id].inv[1].n,12);assert.equal(reopened.chests[pos][1],null)});
 const html=fs.readFileSync(path+'index.html','utf8');
 const ui=fs.readFileSync(path+'js/ui.js','utf8');
 const sw=fs.readFileSync(path+'offline.js','utf8');
 ok('chat HUD and script registration',()=>{assert.match(html,/id="mpChatFeed"/);assert.match(html,/id="mpChatComposer"/);assert.match(html,/js\/coop\.js/);assert.match(ui,/setTimeout\(\(\)=>item\.remove\(\),10000\)/);assert.match(ui,/KeyT/)});
 ok('offline resources versioned',()=>{assert.match(sw,/0\.9\.14/);assert.match(sw,/\.\/js\/coop\.js/);assert.match(html,/VERSÃO 0\.9\.14/)});
 ok('world snapshot preserves guest storage',()=>{const gm=fs.readFileSync(path+'js/game.js','utf8');assert.match(gm,/guestProfiles: this\.guestProfiles/);assert.match(gm,/chestRevisions: this\.chestRevisions/)});
 console.log('TOTAL PASS',count);
})().catch(e=>{console.error(e);process.exit(1)})
