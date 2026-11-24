'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const V=require('../js/world.js');
const read=n=>fs.readFileSync(path.join(__dirname,'../js/',n),'utf8');
const G=new Function('Voxel','Sound',read('game.js')+'\nreturn Game;')(V,{play(){}});
const View=new Function('Voxel',read('render.js')+'\nreturn View;')(V);
const S=G.Session.prototype;
for(const [d,expected] of [[5,60],[18,15],[28,10]]){
 const state={};let sum=0,n=0;
 for(let i=0;i<60;i++){const step=G.actorStep(state,1/60,d);if(step){n++;sum+=step;}}
 assert.equal(n,expected);assert.ok(Math.abs(sum-1)<1e-6);
}
assert.ok(G.actorStep({},1/60,28,true)>0);
const pile={drops:[],nextDropId:1};
for(let i=0;i<100;i++)S.addDrop.call(pile,0,2,0,3,1);
assert.equal(pile.drops.length,2);assert.equal(pile.drops.reduce((a,d)=>a+d.n,0),100);
pile.networkHost=true;S.addDrop.call(pile,0,2,0,3,1);assert.equal(pile.drops.length,3);
pile.networkHost=false;S.addDrop.call(pile,0,2,0,47,1,73);S.addDrop.call(pile,0,2,0,47,1,42);
assert.equal(pile.drops.length,5);assert.equal(pile.drops[3].dur,73);assert.equal(pile.drops[4].dur,42);
assert.ok(View.entityVisible({x:0,y:0,z:-5},[0,0,0],[0,0,-1],30));
assert.equal(View.entityVisible({x:0,y:0,z:20},[0,0,0],[0,0,-1],30),false);
assert.equal(View.entityVisible({x:0,y:0,z:-40},[0,0,0],[0,0,-1],30),false);
let changes=0;
const bag={p:{x:0,y:2,z:0},drops:[],chunks:new Map(),inv:Array(36).fill(null).map(()=>G.slot(3,64)),
 bag:{x:0,y:2,z:0,inv:[G.slot(3,8)]},changed(){changes++;},notify(){}};
bag.inv[0].n=60;S.loot.call(bag,1/60);
assert.equal(bag.inv[0].n,64);assert.equal(bag.bag.inv[0].n,4);assert.equal(changes,1);
const seen=new Set(),saplings={};
for(let i=0;i<70;i++)saplings[i+',2,0']={start:0};
const farm={saplings,elapsed:0,get(x){seen.add(x);return -1;}};
for(let i=0;i<3;i++)S.growSaplings.call(farm,1);
assert.equal(seen.size,70);
const lamp=[1,2,3];lamp.block=25;
const light={p:{x:0,y:2,z:0},elapsed:0,lit:new Map([['0,0',[lamp]]]),lightCache:new Map()};
const a=S.lights.call(light),b=S.lights.call(light);assert.ok(a===b);
light.elapsed=.2;assert.ok(S.lights.call(light)!==a);
console.log('OK: cadência da IA, conservação de drops, recuperação parcial, visibilidade, mudas e cache de luz');
