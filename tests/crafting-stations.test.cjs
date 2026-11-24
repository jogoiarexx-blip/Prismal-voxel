'use strict';
const assert = require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..');
const Voxel=require(path.join(base,'js/world.js'));
const ctx={Voxel,Sound:{play:()=>{}},Saves:{},View:{basis:()=>({f:[0,0,-1]})},setTimeout,clearTimeout,structuredClone,crypto:{randomUUID:()=>''},Math,console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(base,'js/game.js'),'utf8')+'\nthis.Game=Game;',ctx);
const Session=ctx.Game.Session;
let checks=0;
function check(value,msg){assert.ok(value,msg);checks++;}
const byStation=new Map([[0,[]],[12,[]],[14,[]]]);
for(const [idx,r] of Voxel.recipes.entries()) {
  check([0,12,14].includes(Voxel.recipeStation(r)),`station valid for recipe ${idx}`);
  byStation.get(Voxel.recipeStation(r)).push(idx);
}
for(const station of [0,12,14]) {
 const got=Voxel.recipesAtStation(station);
 check(got.length>0,`station ${station} contains recipes`);
 check(got.length===byStation.get(station).length,`station ${station} includes exactly its own recipes`);
 for(const {index,recipe} of got){
  check(Voxel.recipes[index]===recipe,`original recipe index ${index} preserved`);
  check(Voxel.recipeStation(recipe)===station,`no recipe from another station ${index}`);
 }
}
const hand = Voxel.recipes.findIndex(r => Voxel.recipeStation(r)===0 && r[0]===8);
const bench = Voxel.recipes.findIndex(r => Voxel.recipeStation(r)===12 && r[0]===22);
const furnace = Voxel.recipes.findIndex(r => Voxel.recipeStation(r)===14 && r[0]===16);
check([hand,bench,furnace].every(i=>i>=0),'representative recipes present');
const g={
  inv:Array(36).fill(null),goals:{},sealCount:3,networkGuest:true,settings:{},changed(){this.changes=(this.changes||0)+1},notify(){},
  nearStation:()=>true,
  canCraft:Session.prototype.canCraft,
};
for(const [i,b] of [5,8,21,4,9].entries())g.inv[i]={b,n:25};
check(g.canCraft(Voxel.recipes[hand],0),'hand recipe in backpack');
check(!g.canCraft(Voxel.recipes[hand],12),'hand recipe not in workbench');
check(!g.canCraft(Voxel.recipes[bench],0),'workbench recipe cannot be made in backpack despite proximity');
check(!g.canCraft(Voxel.recipes[furnace],0),'furnace recipe cannot be made in backpack despite proximity');
check(!g.canCraft(Voxel.recipes[furnace],12),'furnace recipe cannot be made in workbench');
check(!g.canCraft(Voxel.recipes[bench],14),'workbench recipe cannot be made in furnace');
check(g.canCraft(Voxel.recipes[bench],12),'workbench recipe at correct station');
check(!g.canCraft(Voxel.recipes[furnace],14),'guest furnace must be operated by host');
const original=JSON.stringify(g.inv);
check(!Session.prototype.craft.call(g,bench,0),'craft rejects the wrong station');
check(JSON.stringify(g.inv)===original,'rejected craft does not consume items');
check(Session.prototype.craft.call(g,bench,12),'bench recipe crafts at workbench');
check(!Session.prototype.craft.call(g,furnace,14),'guest cannot create unconfirmed furnace output');
check(Session.prototype.craft.call(g,hand,0),'hand recipe crafts in backpack');
g.nearStation=()=>false;
check(!g.canCraft(Voxel.recipes[bench],12),'bench crafting denied when player moves away');
check(!g.canCraft(Voxel.recipes[furnace],14),'furnace crafting denied when player moves away');
check(g.canCraft(Voxel.recipes[hand],0),'hand crafting not dependent on machines');
const ui=fs.readFileSync(path.join(base,'js/ui.js'),'utf8');
check(ui.includes('Voxel.recipesAtStation(activeStation)'),'UI filters by active station');
check(ui.includes('g.craft(+i, bagStation)'),'UI passes station to game-layer craft check');
check(ui.includes('else if (reset) bagStation = 0'),'open backpack resets previous station');
check(ui.includes('Nenhuma receita nesta categoria'),'empty recipe categories are explained');
console.log(`PASS ${checks} checks: recipes separated by apparatus and validated in gameplay`);
