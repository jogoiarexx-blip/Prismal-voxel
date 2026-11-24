'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const V=require('../js/world.js');
const G=new Function('Voxel','Sound',fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8')+'\nreturn Game;')(V,{play(){}});
const S=G.Session.prototype;
const mock={generator:6,creative:false,networkGuest:false,p:{x:0,y:64,z:0},
 mobs:[{id:1,kind:'Aldeão',job:0,x:1,y:64,z:0,hp:12,homeKey:'1,0'}],
 inv:Array(36).fill(null),day:1,marketDay:0,marketStock:{},
 changed(){},notify(){},villageOffers:S.villageOffers};
const trade=i=>S.tradeVillage.call(mock,1,i);
assert.equal(V.blocks[178].solid,false);assert.equal(V.blocks[178].placeable,false);
mock.inv[0]=G.slot(40,48);
for(let i=0;i<5;i++)assert.ok(trade(0));
assert.equal(G.count(mock.inv,178),15);assert.equal(G.count(mock.inv,40),8);assert.equal(trade(0),false);
mock.marketStock=JSON.parse(JSON.stringify(mock.marketStock));assert.equal(trade(0),false);
mock.day=2;assert.ok(trade(0));assert.ok(trade(2));
assert.equal(G.count(mock.inv,178),16);assert.equal(G.count(mock.inv,41),2);
mock.networkGuest=true;assert.equal(trade(2),false);mock.networkGuest=false;
mock.creative=true;assert.equal(trade(2),false);mock.creative=false;
mock.p.x=30;assert.equal(trade(2),false);mock.p.x=0;
assert.equal(trade(-1),false);assert.equal(trade(1.5),false);
mock.inv=Array.from({length:36},()=>G.slot(3,64));mock.inv[0]=G.slot(178,64);
const before=JSON.stringify(mock.inv),stock=JSON.stringify(mock.marketStock);
assert.equal(trade(2),false);assert.equal(JSON.stringify(mock.inv),before);
assert.equal(JSON.stringify(mock.marketStock),stock);
console.log('OK: compra, venda, estoque diário, recuperação, mochila cheia e permissões');
