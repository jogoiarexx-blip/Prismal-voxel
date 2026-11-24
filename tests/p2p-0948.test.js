'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'../js',n),'utf8');
class Channel{
 constructor(label,opts){this.label=label;this.opts=opts;this.readyState='open';this.bufferedAmount=0;this.sent=[];}
 send(raw){this.sent.push(raw);}
 close(){this.readyState='closed';}
}
let peer;
class RTC{
 constructor(){peer=this;this.channels=[];this.iceGatheringState='complete';}
 createDataChannel(label,opts){const c=new Channel(label,opts);this.channels.push(c);return c;}
 async createOffer(){return {type:'offer',sdp:'mock offer'};}
 async setLocalDescription(x){this.localDescription=x;}
 close(){}
}
const Net=new Function('RTCPeerConnection','setInterval','clearInterval',read('multiplayer.js')+'\nreturn PrismaNet;')(RTC,()=>1,()=>{});
const Coop=new Function(read('coop.js')+'\nreturn PrismaCoop;')();
async function run(){
 const received=[],net=Net.create({onMessage:m=>received.push(m)});
 const code=await net.host(),obj=await Net.unpack(code,'offer');assert.equal(obj.v,Net.PROTOCOL);
 const [reliable,fast]=peer.channels;assert.equal(reliable.opts.ordered,true);assert.equal(fast.opts.ordered,false);assert.equal(fast.opts.maxRetransmits,0);
 reliable.onopen();
 const bulk=net.send({t:'world',data:'x'.repeat(24000)});
 assert.ok(net.sendFast({t:'pose',seq:1}));assert.equal(JSON.parse(fast.sent[0]).t,'pose');
 assert.equal(net.sendFast({t:'edit',x:1}),false);
 fast.bufferedAmount=40000;assert.equal(net.sendFast({t:'pose',seq:2}),false);
 fast.bufferedAmount=0;fast.onmessage({data:JSON.stringify({t:'edit',x:1})});assert.equal(received.length,0);
 fast.onmessage({data:JSON.stringify({t:'pose',seq:3})});assert.equal(received[0].seq,3);
 await bulk;const parts=reliable.sent.map(JSON.parse).filter(m=>m.t==='part');assert.ok(parts.length>=3);
 for(const part of parts)reliable.onmessage({data:JSON.stringify(part)});
 assert.equal(received[1].data.length,24000);
 net.close();assert.equal(net.sendFast({t:'pose',seq:4}),false);
 const id='visitor-123456',inv=Array(36).fill(null);let finish;
 const game={guestProfiles:{[id]:{inv,rev:0,seq:0,lastTx:0}},chests:{},chestRevisions:{},changed(){},save(){return new Promise(r=>finish=r);}};
 const next=inv.slice();next[0]={b:3,n:8};
 const saving=Coop.syncInventory(game,id,{inv:next,rev:0,seq:1},196);
 const readPending=Coop.readChest(game,id,'1,2,3',1,196);
 await Promise.resolve();await Promise.resolve();assert.ok(typeof finish==='function');finish(true);
 assert.equal((await saving).status,'committed');
 const chest=await readPending;assert.equal(chest.status,'ready');assert.equal(chest.state.inv[0].n,8);
 assert.equal((await Coop.readChest(game,id,'1,2,3',2,196)).status,'conflict');
 console.log('OK: protocolo atual, canais separados, congestionamento, fragmentação e baú após confirmação de inventário');
}
run().catch(e=>{console.error(e);process.exitCode=1;});