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
  function transact(game,id,pos,msg,chestMove,maxId=256) {
    if (!game || typeof game !== 'object') return Promise.resolve({status:'invalid'});
    const previous = transactionQueues.get(game) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => transactUnlocked(game,id,pos,msg,chestMove,maxId));
    transactionQueues.set(game, current.catch(() => {}));
    return current;
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
  return {validId,validInventory,ensureProfile,transact,snapshot};
})();
if(typeof module!=='undefined')module.exports=PrismaCoop;
