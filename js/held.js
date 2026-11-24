'use strict';
// Local first-person viewmodel. Geometry is rasterized only when the hotbar item
// changes; movement uses a compositor transform, not extra WebGL draw calls.
const PrismaHeld = (() => {
  const PICK = new Set([22,42,43,44,45]);
  const W=240,H=260;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function kind(id,blocks){
    if(!id || !blocks[id])return 'empty';
    if(PICK.has(id))return 'pick';
    if([47,179,180,181,182].includes(id))return 'sword';
    if([89,183,184,185,186].includes(id))return 'axe';
    if([90,187,188,189,190].includes(id))return 'shovel';
    if(id===191)return 'bow';
    if([193,195].includes(id))return 'shield';
    if(id===25)return 'torch';
    if(blocks[id].placeable)return 'block';
    return 'item';
  }
  const shade=(hex,f)=>'#'+hex.replace('#','').match(/../g).map(c=>Math.round(clamp(parseInt(c,16)*f,0,255)).toString(16).padStart(2,'0')).join('');
  function poly(c,pts,color){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
  // A polygon with three-dimensional thickness, using the same pixel-block style.
  function prism(c,p,hex,dx=7,dy=-5){
    const q=p.map(([x,y])=>[x+dx,y+dy]);
    poly(c,q,shade(hex,.74));
    for(let i=0;i<p.length;i++){const j=(i+1)%p.length;poly(c,[p[i],p[j],q[j],q[i]],shade(hex,i%2?.69:1.16));}
    poly(c,p,shade(hex,1));
  }
  const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  function miniature(c,id,voxel){
    const parts=voxel.shapeParts?.(id)||[[0,0,0,1,1,1,id]];
    const faces=[];const size=57,ox=102,oy=150;
    const pr=([x,y,z])=>[ox+(x-z)*size*.84,oy+(x+z)*size*.36-y*size];
    for(const [x,y,z,w,h,d,mat=id] of parts){
      const X=x+w,Y=y+h,Z=z+d;
      const color=voxel.blocks[mat]?.hex||'a39172';
      const face=(points,f,top=false)=>faces.push({points:points.map(pr),depth:points.reduce((a,p)=>a+p[0]+p[1]+p[2],0)/4,color:shade(top&&[1,17].includes(mat)?(mat===1?'85a94f':'608971'):[1,17].includes(mat)?'93663e':color,f)});
      face([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],1.12,true);
      face([[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]],.76);
      face([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],.92);
    }
    faces.sort((a,b)=>a.depth-b.depth).forEach(f=>poly(c,f.points,f.color));
  }
  function paint(c,id,voxel){
    c.clearRect(0,0,W,H);
    const k=kind(id,voxel.blocks);
    // Sleeve, cuff and forearm are intentionally long enough to enter from the
    // lower-right edge, so the equipped object is not a floating inventory icon.
    prism(c,[[122,165],[151,148],[241,226],[241,273],[194,273]],'294e48',9,-6);
    prism(c,[[119,165],[148,147],[168,170],[138,190]],'576b68',6,-4);
    prism(c,[[116,161],[138,145],[153,154],[143,179],[128,185]],'c89461',6,-4);
    if(k==='block')miniature(c,id,voxel);
    else if(k!=='empty'){
      c.save();c.translate(132,164);c.rotate(k==='sword'?-.47:k==='torch'?-.18:-.33);
      const metal=voxel.blocks[id]?.hex||'a39172';
      if(['pick','axe','shovel','torch','sword'].includes(k)){
        prism(c,rect(-5,-100,10,108),k==='sword'?'584035':'98663b',4,-3);
        prism(c,rect(-5,-27,10,29),'5e4331',4,-2);
      }
      if(k==='pick'){
        prism(c,[[-47,-89],[-47,-98],[-35,-98],[-35,-105],[-19,-105],[-19,-111],[21,-111],[21,-105],[38,-105],[38,-98],[47,-98],[47,-83],[38,-83],[38,-92],[19,-92],[19,-98],[-17,-98],[-17,-91],[-36,-91],[-36,-81],[-47,-81]],metal,6,-5);
        prism(c,rect(-6,-108,12,16),'b38b58',3,-2);
      }else if(k==='axe'){
        prism(c,[[-4,-104],[25,-104],[25,-115],[44,-115],[44,-107],[51,-107],[51,-77],[43,-77],[43,-69],[23,-69],[23,-81],[-4,-81]],metal,6,-5);
        prism(c,rect(43,-106,8,27),'dbe2df',3,-2);
      }else if(k==='shovel'){
        prism(c,[[-8,-92],[-8,-111],[-24,-111],[-24,-139],[-15,-139],[-15,-147],[15,-147],[15,-139],[24,-139],[24,-111],[8,-111],[8,-92]],metal,5,-4);
      }else if(k==='sword'){
        prism(c,[[-9,-29],[-9,-124],[-5,-124],[-5,-139],[0,-149],[5,-139],[5,-124],[9,-124],[9,-29]],'bfcfd1',5,-3);
        prism(c,rect(-22,-37,44,9),'ad8652',5,-3);
        prism(c,rect(-8,1,16,9),'ad8652',4,-3);
      }else if(k==='torch'){
        // A layered ember and flame: no world light or extra gameplay effects.
        prism(c,rect(-10,-102,20,14),'6e492b',4,-3);
        prism(c,[[-15,-102],[-15,-123],[-9,-123],[-9,-135],[-2,-135],[-2,-143],[5,-143],[5,-129],[12,-129],[12,-118],[17,-118],[17,-102]],'ef9136',5,-4);
        prism(c,[[-8,-104],[-8,-118],[-2,-118],[-2,-130],[5,-130],[5,-117],[10,-117],[10,-104]],'ffdf68',3,-2);
      }else if(id===23){
        prism(c,rect(-13,-48,10,10),'a83243',4,-3);prism(c,rect(0,-42,13,13),'c74b57',4,-3);prism(c,rect(-11,-32,13,13),'d77665',4,-3);prism(c,rect(-4,-57,17,7),'638d4e',4,-3);
      }else if(id===41){prism(c,[[-25,-44],[-20,-57],[22,-57],[29,-44],[29,-25],[-25,-25]],'c78e50',5,-4);}
      else {prism(c,[[-19,-32],[-19,-57],[-10,-66],[17,-66],[25,-54],[25,-32]],metal,6,-5);}
      c.restore();
    }
    // Fingers overlap the grip rather than appearing behind it.
    prism(c,[[112,158],[121,147],[139,151],[146,163],[135,175],[120,172]],'d5aa78',5,-4);
    poly(c,[[119,157],[123,152],[137,156],[139,160],[126,160]],'#edc08b');
  }
  function motionPose({kind:k='empty',speed=0,walk=0,phase=0,action='',age=1,motion=true,left=false}={}){
    if(!motion)return {x:0,y:0,angle:0,flip:left?-1:1};
    const amount=clamp((Number.isFinite(speed)?speed:0)/4.3,0,1.3);
    const stride=Number.isFinite(walk)?walk:0;
    let x=Math.sin(stride)*4*amount,y=Math.abs(Math.cos(stride))*5*amount,angle=Math.sin(stride)*2*amount;
    const p=clamp(Number.isFinite(phase)?phase:0,0,1);
    if(action==='mine') {const s=Math.sin(Math.PI*p);x-=s*17;y-=s*13;angle-=s*(k==='sword'?28:21);}
    else if(action==='place'||action==='attack'||action==='use'){
      const duration=action==='attack'?.34:.25;
      const q=clamp((Number.isFinite(age)?age:1)/duration,0,1),s=Math.sin(q*Math.PI);
      x-=s*(action==='attack'?24:11);y-=s*(action==='attack'?16:18);angle-=s*(action==='attack'?35:11);
    }
    return {x:left?-x:x,y,angle:left?-angle:angle,flip:left?-1:1};
  }
  class View {
    constructor(canvas,voxel){this.canvas=canvas;this.voxel=voxel;this.ctx=canvas.getContext('2d');this.item=-1;this.session=null;this.age=1;this.action='';this.phase=0;canvas.width=W;canvas.height=H;}
    hide(){this.canvas.hidden=true;this.action='';this.age=1;this.phase=0;}
    pulse(action){this.action=action;this.age=0;}
    update(g,settings,dt,playing){
      if(!this.ctx||!g||!playing||g.paused||settings.thirdPerson){this.hide();return;}
      if(this.session!==g){this.session=g;this.item=-1;this.hide();}
      const item=g.inv[g.selected]?.b||0,k=kind(item,this.voxel.blocks);
      if(item!==this.item){paint(this.ctx,item,this.voxel);this.item=item;}
      this.canvas.hidden=false;
      const step=clamp(Number.isFinite(dt)?dt:0,0,.1);
      this.age+=step;
      const holding=!!g.holding;
      this.phase=holding?(this.phase+step*(k==='sword'?2.8:2.3))%1:0;
      const action=this.age<.34?this.action:holding?'mine':'';
      const pose=motionPose({kind:k,speed:g.moveSpeed,walk:g.walkCycle,phase:this.phase,action,age:this.age,motion:settings.motion!==false,left:!!settings.leftHanded});
      this.canvas.classList.toggle('left-held',pose.flip<0);
      this.canvas.style.transform=`translate(${pose.x.toFixed(2)}px,${pose.y.toFixed(2)}px) rotate(${pose.angle.toFixed(2)}deg) scaleX(${pose.flip})`;
    }
  }
  return {kind,paint,motionPose,View};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PrismaHeld;
