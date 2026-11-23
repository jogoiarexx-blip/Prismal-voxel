const assert=require('node:assert/strict');const fs=require('fs');const vm=require('vm');
const base=require('node:path').join(__dirname,'..')+'/';
const Voxel=require(base+'js/world.js');
const ctx={Voxel,Sound:{play:()=>{}},Saves:{},View:{basis:()=>({f:[0,0,-1]})},setTimeout,clearTimeout,structuredClone,crypto:{randomUUID:()=>''},Math,console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(base+'js/game.js','utf8')+'\nthis.Game=Game;',ctx);const Game=ctx.Game;
let checks=0;const ok=(condition,msg)=>{assert(condition,msg);checks++};
const s=Voxel.shapeParts;
ok(s(15).length>=8,'chest decorative shape');ok(s(14).length>=7,'furnace details');ok(s(136).length>s(14).length,'lit furnace has fire');
ok(Voxel.itemId(136)===14,'lit furnace yields classic furnace');
ok([134,135].every(id=>Voxel.blocks[id].placeable&&!Voxel.blocks[id].solid&&s(id).length>=3),'saplings visually planted');
for(const id of [15,14,136,134,135]) for(const p of s(id)) ok(p.slice(0,6).every(Number.isFinite) && p.slice(3,6).every(x=>x>0),`shapes ${id} positive`);
let inv=Array(36).fill(null),chest=Array(18).fill(null);inv[0]={b:5,n:12};
ok(Game.Session.chestMove(inv,chest,'inv',0,'chest',0,false,false),'deposit');
ok(chest[0].n===12&&inv[0]===null,'deposit atomic');
ok(Game.Session.chestMove(inv,chest,'chest',0,'inv',1,false,false),'withdraw');
ok(inv[1].n===12 && chest[0]===null,'withdraw atomic');
ok(Game.Session.chestMove(inv,chest,'inv',1,'inv',3,false,true),'split');
ok(inv[1].n===6 && inv[0]?.n===6,'split to empty slot');
ok(!Game.Session.chestMove(inv,chest,'inv',999,'chest',0,false,false),'reject malformed index');
ok(Game.Session.chestMove(inv,chest,'inv',0,'chest',0,true,false),'quick transfer');
ok(chest[0]?.n===6&&inv[0]===null,'quick transfer no dupes');
// a tree collapses only when last trunk has been removed
const leaves=new Map(), key=(x,y,z)=>`${x},${y},${z}`;for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)leaves.set(key(dx,69,dz),6);
leaves.set(key(0,66,0),5);
let drops=[],nOps=0;
const tree={creative:false,get:(x,y,z)=>leaves.get(key(x,y,z))||0,applyBlockBatch(ops){nOps++;for(const [x,y,z,b] of ops)leaves.set(key(x,y,z),b)},addDrop:(...a)=>drops.push(a),notify:()=>{}};
ok(Game.Session.prototype.finishTree.call(tree,0,65,0,5)===0,'leaves remain with surviving log');
leaves.set(key(0,66,0),0);
ok(Game.Session.prototype.finishTree.call(tree,0,65,0,5)>10,'remove orphan leaves after last log');
ok(drops.length===1&&drops[0][3]===134,'drop one replanted amber sapling');
ok(nOps===1,'one batched mesh update');
// other tree nearby must be protected
for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)leaves.set(key(dx,69,dz),6);
leaves.set(key(2,67,0),5);drops=[];
ok(Game.Session.prototype.finishTree.call(tree,0,65,0,5)===0,'adjacent living tree remains intact');
ok(drops.length===0,'no sapling drop when neighbour is alive');
// sapling growth respects buildings, loaded blocks and persists as batch
const world=new Map([[key(0,65,0),134]]);const fake={saplings:{[key(0,65,0)]:{start:0}},elapsed:140,saplingTimer:0,get(x,y,z){return y===64?1:world.get(key(x,y,z))||0},applyBlockBatch(ops){for(const [x,y,z,b] of ops)world.set(key(x,y,z),b)},notify:()=>{}};
Game.Session.prototype.growSaplings.call(fake,1);ok(world.get(key(0,65,0))===5,'sapling grows wooden trunk');ok(!fake.saplings[key(0,65,0)],'grown sapling removed from timer');
const world2=new Map([[key(0,65,0),135],[key(1,70,0),12]]);const fake2={saplings:{[key(0,65,0)]:{start:0}},elapsed:140,saplingTimer:0,get(x,y,z){return y===64?1:world2.get(key(x,y,z))||0},applyBlockBatch(){throw Error('blocked tree should not overwrite building')},notify:()=>{}};
Game.Session.prototype.growSaplings.call(fake2,1);ok(world2.get(key(0,65,0))===135,'sapling does not overwrite a house');
// remote mob snapshot accepts zombies and normalizes animation values
const peer={networkGuest:true,lastNetworkMobSeq:-1,mobs:[],drops:[],guestPickupPending:new Map()};
const msg={seq:1,mobs:[{id:1,kind:'Zumbi',x:1,y:70,z:1,hp:8,face:0,motion:900,gait:1e8,hurt:8,attack:8,dying:0,wind:0}]};
ok(Game.Session.prototype.applyNetworkEntities.call(peer,msg)===true,'zombie accepted via P2P');
ok(peer.mobs[0].motion===1&&peer.mobs[0].hurt<=.36&&peer.mobs[0].gait<629,'mob animations clamped');
console.log(`PASS ${checks} assertions: geometry, furnace, trees, saplings, chest, P2P zombies`);
