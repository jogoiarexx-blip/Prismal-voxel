'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const V=require('../js/world.js');
const read=n=>fs.readFileSync(path.join(__dirname,'../js/',n),'utf8');
const G=new Function('Voxel','Sound',read('game.js')+'\nreturn Game;')(V,{play(){}});
const Sound=new Function(read('store.js')+'\nreturn Sound;')();
const fixture=keep=>({creative:false,meta:{difficulty:'normal',keepInventory:keep},p:{x:20,y:70,z:20},seed:42,generator:6,edits:{},inv:[G.slot(5,6),...Array(35).fill(null)],bag:null,stream(){},notify(){},changed(){},save(){}});
const normal=fixture(false),casual=fixture(true),legacy=fixture(undefined);
for(const s of [normal,casual,legacy])G.Session.prototype.respawn.call(s,'Queda');
for(const s of [normal,legacy]){assert.equal(G.count(s.inv,5),0);assert.equal(G.count(s.bag.inv,5),6);}
assert.equal(G.count(casual.inv,5),6);assert.equal(casual.bag,null);assert.equal(casual.p.life,100);
assert.equal(Sound.footstep(5),'stepWood');assert.equal(Sound.footstep(3),'stepStone');assert.equal(Sound.footstep(4),'stepSand');assert.equal(Sound.footstep(1),'step');
const version=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/VERSÃO (\d+\.\d+\.\d+)/)[1];
assert.ok(fs.readFileSync(path.join(__dirname,'../offline.js'),'utf8').includes("PREFIX + '"+version+"'"));
console.log('OK: modo casual, legado, passos e versão offline');
