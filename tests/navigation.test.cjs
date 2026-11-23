'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base=path.resolve(__dirname,'..');
const Voxel = require('../js/world.js');
const Navigation=vm.runInNewContext(fs.readFileSync(path.join(base,'js/navigation.js'),'utf8')+'\nNavigation', {Voxel,Math,Number});
let count=0;
function ok(label,fn){fn();count++;console.log('PASS navigation:',label)}
const places=[{id:0,x:95,y:70,z:-40},{id:1,x:-65,y:64,z:-70},{id:2,x:20,y:72,z:60}];
const world={navMode:'objective', sites:places,seals:[false,false,false],house:{x:12,y:72,z:8,label:'Base'},bag:{x:34,y:69,z:45},navPin:{x:-34,y:63,z:12,label:'Minério'},p:{x:.5,y:70.5,z:.5,yaw:0}};
ok('selects next unfinished objective',()=>{assert.equal(Navigation.target(world).x,95); world.seals[0]=true;assert.equal(Navigation.target(world).x,-65);world.seals[0]=false});
ok('selects home independently from objective',()=>{world.navMode='home';const d=Navigation.target(world);assert.equal(d.key,'home');assert.equal(d.label,'Base')});
ok('selects specifically requested ruin, even already visited',()=>{world.navMode='ruin:2';world.seals[2]=true;assert.equal(Navigation.target(world).x,20);world.seals[2]=false});
ok('tracks lost backpack and custom waypoint',()=>{world.navMode='bag';assert.equal(Navigation.target(world).key,'bag');world.navMode='pin';assert.equal(Navigation.target(world).label,'Minério')});
ok('disables navigation and rejects malformed modes',()=>{world.navMode='off';assert.equal(Navigation.target(world),null);assert.equal(Navigation.normalize('ruin:<script>'),'objective');assert.equal(Navigation.normalize('ruin:3'),'objective')});
ok('points forward at negative Z',()=>{const g=Navigation.guidance({x:.5,y:70.5,z:.5,yaw:0},{x:0,y:70,z:-40,key:'north'});assert.ok(Math.abs(g.angle)<0.03);assert.equal(g.turn,'Em frente')});
ok('points right at positive X and left at negative X',()=>{const r=Navigation.guidance({x:.5,z:.5,yaw:0},{x:40,z:0,key:'r'}), l=Navigation.guidance({x:.5,z:.5,yaw:0},{x:-40,z:0,key:'l'});assert.ok(r.angle>0);assert.ok(l.angle<0);assert.equal(r.turn,'Vire à direita');assert.equal(l.turn,'Vire à esquerda')});
ok('yaw rotation correctly changes relative bearing',()=>{const r=Navigation.guidance({x:0,y:0,z:0,yaw:Math.PI/2},{x:45,y:0,z:0,key:'east'});assert.equal(r.turn,'Em frente')});
ok('reaches destination and gives altitude hints',()=>{const t={x:2,y:100,z:3,key:'target'};const high=Navigation.guidance({x:2.5,y:70,z:3.5,yaw:0},t);assert.equal(high.height,'Suba');assert.equal(high.arrived,false);const near=Navigation.guidance({x:2.5,y:100.5,z:3.5,yaw:0},t);assert.equal(near.arrived,true);assert.equal(near.distance,0)});
ok('has safe optional coordinates',()=>{assert.equal(Navigation.guidance({x:NaN,z:0},null),null);assert.equal(Navigation.target({...world,navMode:'pin',navPin:{x:Infinity,z:0}}),null)});
ok('integrated scripts and HUD',()=>{const html=fs.readFileSync(path.join(base,'index.html'),'utf8');const ui=fs.readFileSync(path.join(base,'js/ui.js'),'utf8');const game=fs.readFileSync(path.join(base,'js/game.js'),'utf8');const offline=fs.readFileSync(path.join(base,'offline.js'),'utf8');assert.ok(html.indexOf('js/navigation.js') < html.indexOf('js/game.js'));assert.match(offline,/\.\/js\/navigation\.js/);assert.match(ui,/case 'nav'/);assert.match(ui,/node\.dataset\.act\.slice\(4\)/);assert.match(ui,/case 'KeyH'/);assert.match(ui,/case 'KeyN'/);assert.match(game,/navMode: this\.navMode/);assert.match(game,/navPin: this\.navPin/)});
console.log('TOTAL navigation PASS',count)
