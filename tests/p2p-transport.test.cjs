const assert = require('node:assert/strict');
const events=[]; const log=[];
let hostPc=null,guestPc=null, clock=0;
class Channel {
 constructor(){this.readyState='connecting';this.bufferedAmount=0;this.sent=[];this.onmessage=null;this.onopen=null;this.onclose=null;}
 send(s){ if(this.readyState!=='open')throw Error('channel closed');this.sent.push(JSON.parse(s));const peer=this.peer;setTimeout(()=>peer?.onmessage?.({data:s}),0);}
 close(){this.readyState='closed';this.onclose?.(); if(this.peer?.readyState==='open'){this.peer.readyState='closed';this.peer.onclose?.();}}
}
class PC {
 constructor(){this.iceGatheringState='complete';this.connectionState='new';this.onconnectionstatechange=null;this.ondatachannel=null; if(!hostPc)hostPc=this;else guestPc=this;}
 createDataChannel(){this.channel=new Channel();return this.channel;}
 async createOffer(){return {type:'offer',sdp:'offer-datachannel-test-'.repeat(15)};}
 async createAnswer(){return {type:'answer',sdp:'answer-datachannel-test-'.repeat(15)};}
 async setLocalDescription(d){this.localDescription=d;}
 async setRemoteDescription(d){this.remoteDescription=d;if(d.type==='offer'){
   const inbound=new Channel();this.channel=inbound;hostPc.channel.peer=inbound;inbound.peer=hostPc.channel;this.ondatachannel?.({channel:inbound});
 }else if(d.type==='answer') {
   for(let pc of [hostPc,guestPc]) {pc.connectionState='connected';pc.channel.readyState='open';pc.channel.onopen?.();pc.onconnectionstatechange?.();}
 }}
 addEventListener(){}removeEventListener(){}close(){this.connectionState='closed';this.channel?.close();}
}
global.RTCPeerConnection=PC;
const Net=require(require('node:path').join(__dirname,'../js/multiplayer.js'));
(async()=>{
 const host=Net.create({name:'Anfitrião',onMessage:m=>events.push(['h',m]),onStatus:s=>log.push(['h',s])});
 const invite=await host.host();assert.ok(invite.startsWith('PRISMA1:'));
 const guest=Net.create({name:'Construtor',onMessage:m=>events.push(['g',m]),onStatus:s=>log.push(['g',s])});
 const answer=await guest.join(invite);await host.accept(answer);
 assert.ok(guest.connected&&host.connected);
 const huge={t:'world',rec:{edits:'abcde'.repeat(8000)}};
 await host.send(huge);await guest.send({t:'world-ready'});
 await new Promise(r=>setTimeout(r,160));
 assert.equal(events.find(x=>x[1].t==='world')[1].rec.edits,huge.rec.edits);
 assert.ok(events.find(x=>x[1].t==='world-ready'));
 assert.equal(typeof host.sendFast,'function');
 assert.equal(host.sendFast({t:'pose',x:1}),true);
 await new Promise(r=>setTimeout(r,60));
 assert.ok(events.find(x=>x[1].t==='pose'));
 assert.ok(hostPc.channel.sent.filter(x=>x.t==='part').length>1);
 host.close();guest.close();
 console.log(JSON.stringify({ok:true,events:events.map(x=>x[1].t),chunks:hostPc.channel.sent.filter(x=>x.t==='part').length,connect:log.slice(0,10)},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
