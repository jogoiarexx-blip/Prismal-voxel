'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync(require('node:path').resolve(__dirname,'../js/ui.js'),'utf8');
const start=src.indexOf('  function quickChatBubble('),end=src.indexOf('  function closeQuickChat()',start);
assert(start>=0 && end>start);
class Node { constructor(tag){this.tag=tag;this.children=[];this.parent=null;this.textContent='';this.className='';this.classList={add(){}};}
  append(...nodes){for(let n of nodes){n.parent=this;this.children.push(n)}}
  get firstElementChild(){return this.children[0]}
  remove(){if(!this.parent)return;this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null}
}
const feed=new Node('div');let timers=[];
const context={document:{createElement:(tag)=>new Node(tag)},$:(s)=>s==='#mpChatFeed'?feed:null,setTimeout:(fn,ms)=>{timers.push({fn,ms})}};
vm.createContext(context);vm.runInContext(src.slice(start,end)+'\nthis.popup=quickChatBubble;',context);
for(let i=1;i<=5;i++)context.popup('<script>alert(1)</script>','Mensagem '+i+' <img src=x>');
assert.equal(feed.children.length,4,'maximum four visible messages');
assert.equal(feed.children.at(-1).children[0].textContent,'<script>alert(1)</script>: ');
assert.equal(feed.children.at(-1).children[1].textContent,'Mensagem 5 <img src=x>');
assert.equal(timers.length,5);
assert(timers.every(x=>x.ms===10000));
for(const t of timers)t.fn();
assert.equal(feed.children.length,0,'all chat bubbles expire');
console.log('CHAT UI PASS max=4, expiry=10000ms, textContent prevents HTML injection');
