'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'../js',n),'utf8');
const V=require('../js/world.js');
const G=new Function('Voxel','Sound',read('game.js')+'\nreturn Game;')(V,{play(){}});
const C=new Function(read('coop.js')+'\nreturn PrismaCoop;')();
const id='visitor-123456',p={active:true,x:0,y:70,z:0};
const make=()=>({guestProfiles:{[id]:{inv:Array(36).fill(null),rev:0,seq:0}},drops:[{id:1,b:3,n:8,x:0,y:70,z:0}],changed(){},async save(){return true;}});
const req={request:1,drop:1,seq:0,rev:0};
const pick=(g,m=req,pos=p)=>C.pickup(g,id,m,G.fill,pos,V.blocks.length);
async function run(){
 const g=make(),profile=g.guestProfiles[id];
 const result=await pick(g);assert.equal(result.status,'committed');assert.equal(profile.rev,1);assert.equal(G.count(profile.inv,3),8);assert.equal(g.drops.length,0);
 const duplicate=await pick(g);assert.equal(duplicate.status,'conflict');assert.equal(G.count(duplicate.state.inv,3),8);
 const restored=make();restored.guestProfiles=JSON.parse(JSON.stringify(g.guestProfiles));restored.drops=[];assert.equal((await pick(restored)).status,'conflict');
 const fail=make();fail.save=async()=>false;assert.equal((await pick(fail)).status,'failed');assert.equal(fail.drops[0].n,8);assert.equal(G.count(fail.guestProfiles[id].inv,3),0);assert.equal(fail.guestProfiles[id].rev,0);assert.equal(fail.lootReservations.size,0);
 const partial=make();partial.guestProfiles[id].inv=Array.from({length:36},()=>G.slot(3,64));partial.guestProfiles[id].inv[0].n=61;
 const result2=await pick(partial);assert.equal(result2.amount??result2.state.amount,3);assert.equal(partial.drops[0].n,5);assert.equal((await pick(partial,{...req,rev:1,request:2})).status,'full');
 const far=make();assert.equal((await pick(far,req,{...p,x:20})).status,'unavailable');assert.equal((await pick(far,{...req,seq:1})).status,'conflict');
 const race=make();let complete;race.save=()=>new Promise(r=>complete=r);const a=pick(race),b=pick(race);
 await Promise.resolve();await Promise.resolve();assert.ok(race.lootReservations.has(1));
 race.p=p;race.chunks=new Map([['0,0',{}]]);race.get=()=>3;race.inv=Array(36).fill(null);G.Session.prototype.loot.call(race,.02);assert.equal(race.drops.length,1);assert.equal(G.count(race.inv,3),0);
 complete(true);assert.equal((await a).status,'committed');assert.equal((await b).status,'conflict');assert.equal(G.count(race.guestProfiles[id].inv,3),8);
 const tool=make();tool.drops[0]={id:1,b:47,n:1,dur:27,x:0,y:70,z:0};assert.equal((await pick(tool)).status,'committed');assert.equal(tool.guestProfiles[id].inv[0].dur,27);
 console.log('OK: coleta única, reinício, rollback, coleta parcial, mochila cheia, distância, versão, concorrência e durabilidade');
}
run().catch(e=>{console.error(e);process.exitCode=1;});