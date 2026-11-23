'use strict';
// Mundo Prisma P2P: two peers, manual encrypted WebRTC invitation exchange.
// No matchmaking/signaling backend and no third-party runtime libraries.
const PrismaNet = (() => {
  const PREFIX = 'PRISMA1:';
  const MAX_CODE_LENGTH = 170000;
  const MAX_PAYLOAD = 5_000_000;
  const RTC = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }] };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const encodeBase64 = (bytes) => {
    let result = '';
    for (let i=0;i<bytes.length;i+=8192) result += String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(result).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
  };
  const decodeBase64 = (value) => {
    const b64 = value.replace(/-/g,'+').replace(/_/g,'/');
    const raw = atob(b64 + '='.repeat((4-b64.length%4)%4));
    return Uint8Array.from(raw, c=>c.charCodeAt(0));
  };
  async function pack(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream !== 'undefined') {
      const zip = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
      return PREFIX + 'Z' + encodeBase64(new Uint8Array(await new Response(zip).arrayBuffer()));
    }
    return PREFIX + 'J' + encodeBase64(bytes);
  }
  async function unpack(input, expected) {
    const code = String(input||'').replace(/\s+/g,'').trim();
    if (!code.startsWith(PREFIX) || code.length > MAX_CODE_LENGTH || code.length < PREFIX.length+16)
      throw Error('Código inválido. Copie o convite completo.');
    const type=code.charAt(PREFIX.length), payload=code.slice(PREFIX.length+1);
    let bytes=decodeBase64(payload);
    if (type==='Z') {
      if (typeof DecompressionStream==='undefined') throw Error('Este navegador não consegue ler convites comprimidos.');
      bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    } else if (type!=='J') throw Error('Formato de convite desconhecido.');
    if (bytes.length>MAX_PAYLOAD) throw Error('Código excede o tamanho permitido.');
    const obj=JSON.parse(new TextDecoder().decode(bytes));
    if (obj?.v!==1 || obj.type!==expected || typeof obj.sdp!=='string' || obj.sdp.length>150000)
      throw Error('Código incompatível ou incompleto.');
    return obj;
  }
  function waitIce(pc) {
    if (pc.iceGatheringState==='complete') return Promise.resolve();
    return new Promise((resolve) => {
      const onChange = () => { if(pc.iceGatheringState==='complete') done(); };
      const done = () => { pc.removeEventListener('icegatheringstatechange',onChange); clearTimeout(timer); resolve(); };
      const timer=setTimeout(done,12000);
      pc.addEventListener('icegatheringstatechange',onChange);
    });
  }
  function create({onMessage=()=>{},onStatus=()=>{},name='Explorador'}={}) {
    if (typeof RTCPeerConnection==='undefined') throw Error('Seu navegador não oferece suporte ao WebRTC.');
    let pc=null, ch=null, queue=Promise.resolve(), closed=false, nextId=1, parts=new Map();
    let heartbeat=null, awaitingPing=0, interrupted=false, activeSends=0;
    const publicApi={connected:false, role:null, name:String(name).slice(0,28), remoteName:'Visitante', latencyMs:null, send, sendFast, close};
    const status=(name)=>{ if(!closed)onStatus(name); };
    function ping() {
      if(!ch || ch.readyState!=='open') return;
      if(awaitingPing && Date.now()-awaitingPing>14000) { status('slow'); awaitingPing=0; }
      if(!awaitingPing && ch.bufferedAmount<48000) {
        awaitingPing=Date.now();
        try{ch.send(JSON.stringify({t:'ping',at:awaitingPing}));}catch{}
      }
    }
    function startHeartbeat() { if(heartbeat)clearInterval(heartbeat); heartbeat=setInterval(ping,3500); ping(); }
    function attachChannel(c) {
      ch=c;
      ch.binaryType='arraybuffer';
      ch.onopen=()=>{ publicApi.connected=true; status('connected'); startHeartbeat(); send({t:'hello',name:publicApi.name}).catch(()=>{}); };
      ch.onclose=()=>{ publicApi.connected=false; interrupted=true;
        if(heartbeat)clearInterval(heartbeat);heartbeat=null; status('disconnected'); };
      ch.onerror=()=>status('error');
      ch.onmessage=(e)=>{
        try {
          const msg=JSON.parse(e.data);
          if(msg.t==='ping') {
            if(Number.isFinite(msg.at)&&ch.readyState==='open') ch.send(JSON.stringify({t:'pong',at:msg.at}));
            return;
          }
          if(msg.t==='pong') {
            if(Number.isFinite(msg.at) && msg.at===awaitingPing){
              publicApi.latencyMs=Math.max(0,Math.min(30000,Date.now()-msg.at));awaitingPing=0;
            }
            return;
          }
          if(msg.t==='part') {
            if(!Number.isSafeInteger(msg.id)||!Number.isSafeInteger(msg.i)||!Number.isSafeInteger(msg.n)||msg.n<1||msg.n>500||msg.i<0||msg.i>=msg.n||typeof msg.d!=='string'||msg.d.length>13000) return;
            let p=parts.get(msg.id);
            if(!p) { if(parts.size>3)parts.clear(); p={at:Date.now(),items:new Array(msg.n),size:0,received:0};parts.set(msg.id,p); }
            if(p.items.length!==msg.n || Date.now()-p.at>60000){parts.delete(msg.id);return;}
            if(typeof p.items[msg.i]!=='string'){p.items[msg.i]=msg.d;p.size+=msg.d.length;p.received++;}
            if(p.size>MAX_PAYLOAD){parts.delete(msg.id);return;}
            if(p.received===p.items.length) {
              parts.delete(msg.id); onMessage(JSON.parse(p.items.join('')));
            }
          } else if(msg.t==='hello') {
            publicApi.remoteName=String(msg.name||'Visitante').slice(0,28);
            onMessage({t:'hello',name:publicApi.remoteName});
          } else onMessage(msg);
        } catch(err) { console.warn('Mensagem P2P ignorada',err); }
      };
    }
    function setup(role) {
      closed=false;
      publicApi.role=role;
      pc=new RTCPeerConnection(RTC);
      pc.onconnectionstatechange=()=>{
        if(pc.connectionState==='failed') status('failed');
        else if(pc.connectionState==='disconnected') {interrupted=true;status('reconnecting');}
        else if(pc.connectionState==='connected' && interrupted && publicApi.connected){interrupted=false;status('recovered');}
      };
      if(role==='guest') pc.ondatachannel=(e)=>attachChannel(e.channel);
      return pc;
    }
    async function host() {
      const c=setup('host');
      attachChannel(c.createDataChannel('mundo-prisma',{ordered:true}));
      await c.setLocalDescription(await c.createOffer());
      status('gathering'); await waitIce(c);
      status('invite-ready');
      return pack({v:1,type:'offer',sdp:c.localDescription.sdp,name:publicApi.name});
    }
    async function join(invite) {
      const obj=await unpack(invite,'offer');
      publicApi.remoteName=String(obj.name||'Anfitrião').slice(0,28);
      const c=setup('guest');
      await c.setRemoteDescription({type:'offer',sdp:obj.sdp});
      await c.setLocalDescription(await c.createAnswer());
      status('gathering'); await waitIce(c);
      status('answer-ready');
      return pack({v:1,type:'answer',sdp:c.localDescription.sdp,name:publicApi.name});
    }
    async function accept(answer) {
      if(!pc || publicApi.role!=='host') throw Error('Crie uma sala antes de aceitar a resposta.');
      const obj=await unpack(answer,'answer');
      publicApi.remoteName=String(obj.name||'Convidado').slice(0,28);
      await pc.setRemoteDescription({type:'answer',sdp:obj.sdp});
      status('connecting');
    }
    // Transient positions never join the reliable world-save queue: stale poses are dropped.
    function sendFast(message) {
      if(!ch || ch.readyState!=='open' || ch.bufferedAmount>32000 || activeSends) return false;
      const raw=JSON.stringify(message);
      if(raw.length>10240) return false;
      try { ch.send(raw); return true; } catch { return false; }
    }
    function send(message) {
      activeSends++;
      queue=queue.catch(()=>{}).then(async()=>{
        if(!ch || ch.readyState!=='open') throw Error('Conexão P2P encerrada durante o envio.');
        const raw=JSON.stringify(message);
        if(raw.length>MAX_PAYLOAD) throw Error('Mundo muito grande para sincronizar nesta versão P2P.');
        if(raw.length<=11000) { ch.send(raw); return true; }
        const id=nextId++, n=Math.ceil(raw.length/11000);
        for(let i=0;i<n;i++) {
          const start=Date.now();
          while(ch.bufferedAmount>180000 && ch.readyState==='open') {
            if(Date.now()-start>18000) throw Error('Tempo esgotado enviando dados. Confira a conexão P2P.');
            await wait(25);
          }
          if(ch.readyState!=='open') throw Error('Conexão P2P interrompida.');
          ch.send(JSON.stringify({t:'part',id,i,n,d:raw.slice(i*11000,(i+1)*11000)}));
        }
        return true;
      }).finally(()=>{activeSends=Math.max(0,activeSends-1);});
      return queue;
    }
    function close() {
      closed=true;
      publicApi.connected=false;
      if(heartbeat)clearInterval(heartbeat);heartbeat=null;awaitingPing=0;
      if(ch){ch.onclose=null;ch.close();}
      if(pc)pc.close();
      parts.clear();
    }
    return Object.assign(publicApi,{host,join,accept});
  }
  return {create,pack,unpack};
})();
if(typeof module!=='undefined')module.exports=PrismaNet;
