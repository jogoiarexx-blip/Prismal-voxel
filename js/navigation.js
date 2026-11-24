'use strict';
// Lightweight, world-local waypoint guidance. Coordinates denote straight-line
// bearings, not guaranteed walkable paths through mountains or buildings.
const Navigation = (() => {
  const radians = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const valid = (p) => p && ['x','z'].every(k => Number.isFinite(p[k]));
  const modes = ['home','objective','bag','pin','off'];
  function normalize(mode) {
    if (typeof mode !== 'string') return 'objective';
    if (modes.includes(mode)) return mode;
    if (/^(ruin|treasure):[012]$/.test(mode)) return mode;
    return 'objective';
  }
  function target(session) {
    if (!session) return null;
    const mode = normalize(session.navMode || (session.house ? 'home' : 'objective'));
    const site = (i) => Array.isArray(session.sites) ? session.sites.find(s=>s?.id===i) : null;
    let point=null, label='', key='', type=mode;
    if (mode === 'off') return null;
    if (mode === 'home') {point=session.house;label=point?.label || 'Minha casa';key='home';}
    else if (mode === 'pin') {point=session.navPin;label=point?.label || 'Meu ponto';key='pin';}
    else if (mode === 'bag') {point=session.bag;label='Mochila perdida';key='bag';}
    else if (mode === 'objective') {
      point=(session.sites || []).find(s=>s && !(session.seals||[])[s.id]);
      label=point ? ((typeof Voxel !== 'undefined' ? Voxel.ruins?.[point.id]?.name : null) || 'Próxima ruína') : '';
      key=point ? 'objective:'+point.id : '';
    } else if (mode.startsWith('treasure:')) {
      if(session.generator<5 || typeof Voxel==='undefined')return null;
      point=Voxel.treasurePoint(site(Number(mode.slice(9))));
      label=point?.label || 'Tesouro';key=mode;
    } else if (mode.startsWith('ruin:')) {
      const id=Number(mode.slice(5));point=site(id);
      label=(typeof Voxel !== 'undefined' ? Voxel.ruins?.[id]?.name : null) || 'Ruína '+(id+1);
      key=mode;
    }
    if (!valid(point)) return null;
    return {x:point.x,y:Number.isFinite(point.y)?point.y:0,z:point.z,
      label:String(label).slice(0,50),key,type};
  }
  function guidance(player, target) {
    if (!valid(player) || !valid(target)) return null;
    const dx=target.x+.5-player.x,dz=target.z+.5-player.z;
    const horizontal=Math.hypot(dx,dz);
    const dy=(target.y+.5)-(Number(player.y)||0);
    const yaw=Number.isFinite(player.yaw)?player.yaw:0;
    const angle=radians(Math.atan2(dx,-dz)-yaw);
    const a=Math.abs(angle);
    const turn=a < Math.PI/9 ? 'Em frente' : a >= Math.PI*5/6 ? 'Atrás de você'
      : a < Math.PI*2/3 ? (angle>0?'Vire à direita':'Vire à esquerda')
      : (angle>0?'À direita, quase atrás':'À esquerda, quase atrás');
    const height=dy>4?'Suba':dy < -4?'Desça':'';
    const arrived=horizontal <= 7 && Math.abs(dy)<6;
    return {distance:Math.round(horizontal),height,turn,angle,arrived,
      dy:Math.round(dy),key:target.key};
  }
  // Top-screen military-style compass. Yaw zero faces north (-Z),
  // positive yaw rotates clockwise toward east (+X). Keep this independent
  // from the waypoint so cardinal directions remain visible when guidance is off.
  const directions = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  const degrees = (a) => ((a % 360) + 360) % 360;
  const heading = (yaw) => degrees((Number.isFinite(yaw) ? yaw : 0) * 180 / Math.PI);
  const relative = (bearing, current) => ((bearing - current + 540) % 360) - 180;
  function compassMarks(yaw, view=70) {
    const current=heading(yaw), visible=[];
    for(let deg=0;deg<360;deg+=5) {
      const diff=relative(deg,current);
      if(Math.abs(diff)>view)continue;
      visible.push({deg,left:50+diff*50/view,label:deg%45===0?directions[deg/45]:'',major:deg%45===0||deg%30===0});
    }
    return visible;
  }
  function waypointPosition(angle, view=70) {
    if(!Number.isFinite(angle))return null;
    const deg=angle*180/Math.PI;
    return {left:Math.max(5,Math.min(95,50+deg*50/view)),
      side:deg < -view?'left':deg>view?'right':'center'};
  }
  return {normalize,target,guidance,radians,heading,compassMarks,waypointPosition};
})();
