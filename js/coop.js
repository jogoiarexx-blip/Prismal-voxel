'use strict';
// Host-authoritative cooperative storage. Pure operations are intentionally testable
// without WebRTC, graphics or DOM; transactions are durable before acknowledgement.
const PrismaCoop = (() => {
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9-]{12,80}$/.test(id);
  function validInventory(items,count,maxId=256) {
    return Array.isArray(items) && items.length===count && items.every(t=>t===null ||
      (t && typeof t==='object' && Number.isInteger(t.b) && t.b>0 && t.b<maxId &&
       Number.isInteger(t.n) && t.n>=1 && t.n<=64 &&
       (t.dur===undefined || Number.isFinite(t.dur) && t.dur>=0 && t.dur<=1000)));
  }
  function ensureProfile(game,id,inventory,maxId=256) {
    if(!validId(id) || !game?.guestProfiles || !validInventory(inventory,36,maxId))return null;
    const existing=game.guestProfiles[id];
    if(existing) return validInventory(existing.inv,36,maxId) ? existing : null;
    return (game.guestProfiles[id]={inv:structuredClone(inventory),rev:0,seq:0,lastTx:0});
  }
  function snapshot(game,id,pos,tx) {
    const profile=game.guestProfiles[id];
    return {t:'chest-state',pos,rev:game.chestRevisions[pos]||0,
      items:game.chests[pos],inv:profile.inv,profileRev:profile.rev,tx};
  }
  // Serialize even if multiple reliable messages arrive before an IndexedDB
  // transaction completes. A single world must never have two chest commits in flight.
  const transactionQueues = new WeakMap();
  function inWorldQueue(game, action) {
    if (!game || typeof game !== 'object') return Promise.resolve({status:'invalid'});
    const previous=transactionQueues.get(game)||Promise.resolve();
    const current=previous.catch(()=>{}).then(action);
    transactionQueues.set(game,current.catch(()=>{}));
    return current;
  }
  function readChest(game,id,pos,seq,maxId=256){
    return inWorldQueue(game,()=>{
      const profile=validId(id)&&game.guestProfiles?.[id];
      if(!profile||!Number.isSafeInteger(seq)||seq<0||seq>(profile.seq||0)||!validInventory(profile.inv,36,maxId))return {status:'conflict'};
      const items=game.chests[pos]||Array(18).fill(null);
      if(!validInventory(items,18,maxId))return {status:'invalid'};
      return {status:'ready',state:{t:'chest-state',pos,rev:game.chestRevisions[pos]||0,items:structuredClone(items),inv:structuredClone(profile.inv),profileRev:profile.rev,initial:true}};
    });
  }
  // A pickup is a single world transaction: the drop and guest inventory
  // are persisted together. No client-side grant or second inventory write.
  function pickup(game,id,msg,fill,position,maxId=256){
    return inWorldQueue(game,async()=>{
      const profile=validId(id)&&game.guestProfiles?.[id];
      if(!profile||!validInventory(profile.inv,36,maxId)||!Number.isSafeInteger(msg?.request)||msg.request<1)
        return {status:'invalid'};
      const state=(status,amount=0,b=0)=>({status,state:{t:'loot-state',id,request:msg.request,drop:msg.drop,
        status,amount,b,rev:profile.rev,seq:profile.seq||0,inv:structuredClone(profile.inv)}});
      if(!Number.isSafeInteger(msg.drop)||msg.drop<1||!Number.isSafeInteger(msg.seq)||msg.seq<0||msg.seq>(profile.seq||0)||msg.rev!==profile.rev)return state('conflict');
      const p=typeof position==='function'?position():position;
      const d=game.drops.find(d=>d.id===msg.drop&&d.n>0);
      if(!p||!p.active||![p.x,p.y,p.z].every(Number.isFinite)||!d||
         !Number.isInteger(d.b)||d.b<1||d.b>=maxId||!Number.isInteger(d.n)||d.n<1||d.n>64||
         Math.hypot(d.x-p.x,d.z-p.z)>2.6||Math.abs(d.y-p.y)>2.6)return state('unavailable');
      const next=structuredClone(profile.inv),amount=d.n-fill(next,d.b,d.n,d.dur);
      if(!Number.isInteger(amount)||amount<0||amount>d.n||!validInventory(next,36,maxId))return state('invalid');
      if(!amount)return state('full');
      game.lootReservations ||= new Set();
      if(game.lootReservations.has(d.id))return state('unavailable');
      game.lootReservations.add(d.id);
      const old={inv:profile.inv,rev:profile.rev,n:d.n};
      profile.inv=next;profile.rev++;d.n-=amount;
      game.changed();
      let saved=false;
      try{saved=await game.save()===true;}catch{}
      if(!saved){profile.inv=old.inv;profile.rev=old.rev;d.n=old.n;game.lootReservations.delete(d.id);game.changed();return state('failed');}
      game.lootReservations.delete(d.id);
      game.drops=game.drops.filter(o=>o.n>0||game.lootReservations.has(o.id));
      return state('committed',amount,d.b);
    });
  }
  function transact(game,id,pos,msg,chestMove,maxId=256) {
    return inWorldQueue(game,()=>transactUnlocked(game,id,pos,msg,chestMove,maxId));
  }
  // Inventory snapshots are durable *before* an acknowledgement is sent. This
  // shares the chest queue so incoming updates cannot overwrite chest changes.
  function syncInventory(game,id,msg,maxId=256) {
    return inWorldQueue(game,()=>syncInventoryUnlocked(game,id,msg,maxId));
  }
  async function syncInventoryUnlocked(game,id,msg,maxId) {
    const profile=validId(id)&&game.guestProfiles?.[id];
    if(!profile || !validInventory(msg?.inv,36,maxId) || !validInventory(profile.inv,36,maxId) ||
       !Number.isSafeInteger(msg.seq) || msg.seq<1 || !Number.isInteger(msg.rev))
      return {status:'invalid'};
    const currentSeq=profile.seq||0;
    const ack=()=>({t:'guest-inv-ack',id,seq:currentSeq,rev:profile.rev});
    if(msg.seq<=currentSeq) return {status:'duplicate',state:ack()};
    if(msg.rev!==profile.rev) return {status:'conflict',state:{t:'guest-profile',
      id,rev:profile.rev,seq:currentSeq,tx:profile.lastTx||0,inv:profile.inv}};
    const previous={inv:profile.inv,seq:currentSeq};
    profile.inv=structuredClone(msg.inv);
    profile.seq=msg.seq;
    game.changed();
    let saved=false;
    try { saved=await game.save()===true; } catch {}
    if(!saved) {
      profile.inv=previous.inv;
      profile.seq=previous.seq;
      game.changed();
      return {status:'failed',state:{t:'guest-inv-error',id,seq:msg.seq,
        reason:'Falha ao salvar inventário. Tente novamente.'}};
    }
    return {status:'committed',state:{t:'guest-inv-ack',id,seq:msg.seq,rev:profile.rev}};
  }
  async function transactUnlocked(game,id,pos,msg,chestMove,maxId=256) {
    const profile=validId(id) && game.guestProfiles[id];
    const chest=game.chests[pos];
    if(!profile || !validInventory(profile.inv,36,maxId) || !validInventory(chest,18,maxId))
      return {status:'invalid',reason:'Baú ou inventário indisponível'};
    if(!Number.isSafeInteger(msg.tx) || msg.tx<=0) return {status:'invalid'};
    if(msg.tx<=profile.lastTx) return {status:'duplicate',state:snapshot(game,id,pos,msg.tx)};
    if(!Number.isInteger(msg.rev) || msg.rev!==(game.chestRevisions[pos]||0) ||
       !Number.isInteger(msg.profileRev) || msg.profileRev!==profile.rev)
      return {status:'conflict',state:snapshot(game,id,pos,msg.tx)};
    if(!['inv','chest'].includes(msg.from) || !['inv','chest'].includes(msg.to) ||
       !Number.isInteger(msg.index) || !Number.isInteger(msg.target) ||
       typeof msg.quick!=='boolean' || typeof msg.split!=='boolean')
      return {status:'invalid',state:snapshot(game,id,pos,msg.tx)};
    const nextInv=structuredClone(profile.inv),nextChest=structuredClone(chest);
    if(!chestMove(nextInv,nextChest,msg.from,msg.index,msg.to,msg.target,msg.quick,msg.split))
      return {status:'conflict',state:snapshot(game,id,pos,msg.tx)};
    if(!validInventory(nextInv,36,maxId) || !validInventory(nextChest,18,maxId))
      return {status:'invalid',state:snapshot(game,id,pos,msg.tx)};
    const previous={inv:profile.inv,rev:profile.rev,lastTx:profile.lastTx,
      chest, chestRev:game.chestRevisions[pos]||0};
    profile.inv=nextInv;profile.rev=previous.rev+1;profile.lastTx=msg.tx;
    game.chests[pos]=nextChest;game.chestRevisions[pos]=previous.chestRev+1;
    game.changed();
    let saved=false;
    try{saved=await game.save()===true;}catch{}
    if(!saved) {
      profile.inv=previous.inv;profile.rev=previous.rev;profile.lastTx=previous.lastTx;
      game.chests[pos]=previous.chest;game.chestRevisions[pos]=previous.chestRev;
      game.changed();
      return {status:'failed',reason:'O anfitrião não conseguiu salvar a transferência'};
    }
    return {status:'committed',state:snapshot(game,id,pos,msg.tx)};
  }
  function recoverGuestInventory(local,host,maxId=256) {
    if(!local || !host || !Number.isInteger(host.rev) || host.rev<0 ||
       !Number.isSafeInteger(host.seq) || host.seq<0 || !validInventory(host.inv,36,maxId))return null;
    const pending=local.pendingInv;
    const replay=!!(pending && Number.isSafeInteger(pending.seq) && pending.seq>host.seq &&
      pending.rev===host.rev && validInventory(pending.inv,36,maxId));
    return {inv:structuredClone(replay?pending.inv:host.inv),replay,
      pending:replay?structuredClone(pending):null,
      conflicted:!!(pending && !replay && pending.seq>host.seq),
      seq:Math.max(host.seq,replay?pending.seq:0)};
  }
  return {validId,validInventory,ensureProfile,transact,snapshot,syncInventory,recoverGuestInventory,readChest,pickup};
})();
if(typeof module!=='undefined')module.exports=PrismaCoop;
