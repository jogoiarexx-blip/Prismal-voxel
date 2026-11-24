'use strict';
const View = (() => {
  const palette = Voxel.blocks.map((b) =>
    [0, 2, 4].map((i) => parseInt(b.hex.slice(i, i + 2), 16) / 255),
  );
  const basis = (p) => {
    const s = Math.sin(p.yaw),
      c = Math.cos(p.yaw),
      t = Math.sin(p.pitch),
      d = Math.cos(p.pitch);
    return { r: [c, 0, s], u: [-s * t, d, c * t], f: [s * d, t, -c * d] };
  };
  function camera(g, settings, alpha = 1) {
    const axes = basis(g.p),
      now = g.eye(),
      prev = g.previousEye || now;
    const eye = now.map((v, i) => prev[i] + (v - prev[i]) * alpha);
    if (!settings.thirdPerson) return { ...axes, eye, third: false };
    // Sweep the near plane as well as its center. A ray through the center
    // alone lets the corners of the camera slip inside a wall.
    const offset = axes.f.map(
      (n, i) => -(settings.recuo || 3.7) * n + 0.82 * axes.r[i] + 0.5 * axes.u[i],
    );
    const max = Math.hypot(...offset),
      dir = offset.map((v) => v / max);
    let reach = max;
    const read = (x, y, z) => {
      const b = g.get(x, y, z, true);
      return b < 0 ? 3 : b;
    };
    for (const [rx, uy] of [
      [0, 0],
      [-0.2, -0.15],
      [-0.2, 0.15],
      [0.2, -0.15],
      [0.2, 0.15],
    ]) {
      const start = eye.map((n, i) => n + rx * axes.r[i] + uy * axes.u[i]);
      const hit = Voxel.ray(read, start, dir, max, true);
      if (hit) reach = Math.min(reach, Math.max(0, hit.dist - 0.22));
    }
    if (reach < 0.75) return { ...axes, eye, third: false };
    const pos = eye.map((n, i) => n + dir[i] * reach);
    const distance = Math.max(0.25, g.hit?.dist ?? 6);
    const aim = now.map((n, i) => n + axes.f[i] * distance - pos[i]);
    const yaw = Math.atan2(aim[0], -aim[2]),
      pitch = Math.atan2(aim[1], Math.hypot(aim[0], aim[2]));
    return { ...basis({ yaw, pitch }), eye: pos, third: true };
  }
  const common =
    'uniform vec3 eye,R,U,F; uniform vec2 proj; uniform float time,day,light,quality,mist,beacon,immersed; uniform vec3 sky; ';
  const vs =
    `attribute vec3 pos;attribute float id,face,ao;varying vec3 w;varying float mat,side,amb,deep;` +
    common +
    `
 void main(){w=pos;vec3 p=pos;if((id==6.||id==18.||id>=80.&&id<=82.)&&quality>0.)p.x+=(id>=80.?.045:.018)*sin(time*1.6+p.z*.5+p.x*.37);
 vec3 d=p-eye;float z=dot(d,F);gl_Position=vec4(dot(d,R)*proj.x,dot(d,U)*proj.y,1.0005*z-.12,z);mat=id;side=face;amb=ao;deep=z;}`;
  const fs =
    `precision highp float; varying vec3 w;varying float mat,side,amb,deep;` +
    common +
    `
 uniform vec3 lamps[8];uniform float numLamps;
 float rnd(vec2 p){vec3 a=fract(vec3(p.xyx)*.1031);a+=dot(a,a.yzx+33.33);return fract((a.x+a.y)*a.z);}
 vec3 color(float id){` +
    palette
      .map(
        (c, i) => 'if(id<' + (i + 0.5) + ')return vec3(' + c.map((n) => n.toFixed(4)).join(',') + ');',
      )
      .join('') +
    `return vec3(.7);}
 void main(){float m=floor(mat+.5),f=floor(side+.5);vec2 uv=f<2.?w.zy:(f<4.?w.xz:w.xy);vec2 px=floor(uv*12.);float pix=rnd(px),large=rnd(floor(uv*3.)),cell=rnd(floor(uv+.0001));
 vec3 col=color(m);float pat=(pix-.5)*.105+(large-.5)*.105+(cell-.5)*.06;float alpha=1.;
 if(m==1.||m==17.){if(f!=2.&&(f==3.||fract(w.y)<.77+.12*rnd(vec2(floor(uv.x*6.),floor(w.y)))))col=color(2.);}
 // Botanical surfaces retain their original block IDs and atlas-free batching.
 if(m==5.||m==27.){
   if(f==2.||f==3.){
     vec2 q=abs(fract(uv)-.5);float rings=max(q.x,q.y);
     col*=.91+.23*smoothstep(.25,.48,rings)+.12*sin(rings*65.);
   }else{
     float bark=rnd(vec2(floor(uv.x*13.),floor(uv.y*1.8)));
     col*=.77+.40*bark;pat*=.62;
   }
 }
 if(m==6.||m==18.){
   float cluster=rnd(floor(uv*5.));
   vec3 shadeLeaf=m==6.?vec3(.20,.39,.14):vec3(.14,.33,.29);
   vec3 tipLeaf=m==6.?vec3(.47,.66,.22):vec3(.29,.55,.43);
   col=mix(shadeLeaf,tipLeaf,smoothstep(.19,.83,cluster));
   col*=.91+.16*pix;pat*=.52;
 }
 if(m==19.){col=mix(vec3(.19,.31,.19),color(19.)*1.14,smoothstep(.20,.80,large));pat*=.7;}
 if(m==4.){col*=.95+.07*sin(uv.x*17.+uv.y*8.);pat*=.43;}
 if(m==32.){
   float vein=abs(fract(uv.x*2.+uv.y*.75+(large-.5)*.15)-.5);
   col=mix(color(32.)*.82,vec3(.83,.95,.98),1.-smoothstep(.025,.12,vein));pat*=.36;
 }
 if(m==33.){col=mix(color(33.)*.71,color(33.)*1.24,large);pat*=.74;}
 if(m==8.||m==12.||m==15.||m==49.||m==50.||m==51.||m==52.||m==53.||m==55.||m==57.||m==58.||m==59.||m==60.||m==61.||m==62.||m==63.||m==64.||m==68.||m==77.||m==78.||m==79.){if(fract(uv.y*3.)<.08||fract(uv.x+floor(uv.y*3.)*.37)<.035)col*=.6;if(m==12.&&f==2.&&min(fract(uv.x*3.),fract(uv.y*3.))<.12)col*=.59;if(m==15.&&f!=2.&&fract(w.y)>.46&&fract(w.y)<.61)col*=.5;}
 // Handcrafted stations share the original palette but have distinct grain,
 // fine seams and hardware highlights, with no texture downloads.
 if(m==8.||m==68.||m==12.||m==83.||m==84.){
   float grain=sin(uv.x*32.+sin(uv.y*7.)*.9);
   col*=.965+.035*grain;
   if(m==12.&&f==2.&&fract(uv.x*4.)<.035)col*=.74;
   if(m==83.&&f==5.&&abs(fract(uv.x*2.)-.5)<.025)col*=.70;
   if(m==84.&&f!=2.&&fract(uv.x*4.)<.04)col*=.78;
 }
 if(m==35.||m==73.){float glint=max(0.,sin(uv.y*43.+uv.x*17.));col*=.87+.20*glint;pat*=.30;}
 // Mineral veins: coherent patches rather than isolated random pixels.
 if(m==9.||m==10.||m==11.||m==34.){
   vec2 oreUV=uv*4.;vec2 oreCell=floor(oreUV);vec2 q=abs(fract(oreUV)-.5);
   float oreSeed=rnd(oreCell+vec2(m*.23,m*.61));
   float edge=m==11.?q.x+q.y*.66:max(q.x,q.y);
   float mask=step(.59,oreSeed)*(1.-smoothstep(.23,.39,edge));
   vec3 mineral=m==9.?vec3(.18,.20,.21):m==10.?vec3(.78,.43,.23):m==34.?vec3(.66,.60,.51):vec3(.67,.43,.91);
   float facet=fract((fract(oreUV.x)+fract(oreUV.y))*2.);
   mineral*=.80+.35*facet;
   col=mix(color(3.)*(.90+.14*large),mineral,mask);pat*=.60;
 }
 if(m==14.&&f==4.&&fract(w.x)>.18&&fract(w.x)<.82&&fract(w.y)>.25&&fract(w.y)<.6)col*=.32;
 if(m==20.||m==26.){if(fract(uv.y*2.)<.08||fract(uv.x+floor(uv.y*2.)*.5)<.05)col*=.65;}
 if(m==16.||m==56.){alpha=.28;if(min(fract(uv.x),fract(uv.y))<.045)alpha=.7;}
 if(m==7.){
   vec3 V=normalize(eye-w);
   vec3 N=vec3(0.,1.,0.);
   float wave=0.;
   if(quality>0.){
     wave=sin(w.x*1.8+w.z*.7+time*1.35)+sin(w.z*2.7+time*1.1);
     N=normalize(vec3(.065*cos(w.x*1.8+time*1.35),1.,.075*cos(w.z*2.7+time*1.1)));
   }
   float fres=pow(1.-clamp(dot(N,V),0.,1.),3.);
   vec3 reflection=reflect(-V,N);
   vec3 reflectedSky=mix(sky,mix(vec3(.028,.065,.15),vec3(.28,.56,.79),light),clamp(reflection.y,0.,1.));
   float angle=(day-.25)*6.283185;
   vec3 sunDir=normalize(vec3(cos(angle)*.72,sin(angle),-.55));
   float glint=quality>0.?pow(max(0.,dot(reflect(-sunDir,N),V)),45.)*max(0.,sunDir.y):0.;
   col=mix(mix(vec3(.035,.16,.23),vec3(.055,.40,.43),light),reflectedSky,.24+fres*.70);
   col+=vec3(1.,.78,.42)*glint*.9+max(0.,wave-1.72)*vec3(.13,.22,.21)*light;
   pat*=.10;alpha=.48+.44*fres;
 }
 if(m==80.){col=mix(vec3(.25,.43,.18),vec3(.45,.64,.28),large);pat*=.45;}
 if(m==81.||m==82.){col=mix(color(m)*.85,color(m)*1.15,pix);pat*=.3;}
 if(m==31.){vec2 tile=abs(fract(uv)-.5);float ring=abs(tile.x+tile.y-.29);col=mix(color(31.),vec3(.84,.62,.29),1.-smoothstep(.022,.045,ring));}
 if(m==28.||m==29.||m==30.){
   vec2 t=abs(fract(uv)-.5);float diamond=t.x+t.y;
   vec3 gem=m==28.?vec3(.32,.67,.66):vec3(.27,.97,.82);
   col=mix(vec3(.22,.30,.31),gem,1.-smoothstep(.30,.34,diamond));
   if(abs(diamond-.42)<.028)col=vec3(.93,.72,.34);
   col+=gem*max(0.,.25-diamond)*2.;
 }

 if(m>=38.&&m<=40.&&f==2.){float row=step(.48,fract(w.x*4.));col=mix(color(38.),color(m)*1.17,row);}
 if(m==46.&&f==2.)col=fract(w.z)>.68?vec3(.91,.84,.65):vec3(.59,.28,.23);
 if(m==36.){col=mix(vec3(.16,.43,.32),vec3(.50,.96,.68),smoothstep(.25,.8,large));pat*=.4;}
 if(m==48.||m==66.||m==69.||m==70.||m==71.||m==72.||m==74.){
   if(fract(uv.y*3.)<.07 || fract(uv.x*2.+floor(uv.y*3.)*.5)<.045)col*=.7;
 }
 // Architectural finishes remain on the existing greedy terrain mesh.
 // Clay roof tiles use alternating rows, rounded highlights and a shadow lip.
 if(m==65.){
   vec2 tileUV=uv*vec2(3.,4.);
   float row=floor(tileUV.y), tileX=fract(tileUV.x+row*.5), tileY=fract(tileUV.y);
   float edge=min(tileX,1.-tileX);
   float ridge=sin(tileX*3.14159265);
   float lip=smoothstep(.02,.10,tileY);
   col*=.77+.29*ridge+.07*rnd(vec2(floor(tileUV.x+row*.5),row));
   col*=mix(.66,1.,lip)*mix(.77,1.,smoothstep(.018,.07,edge));
   col+=vec3(.075,.035,.014)*smoothstep(.80,.96,tileY);
   pat*=.58;
 }
 if(m==66.){
   vec2 brickUV=uv*vec2(2.,4.);
   float row=floor(brickUV.y), bx=fract(brickUV.x+.5*row), by=fract(brickUV.y);
   float mortar=min(min(bx,1.-bx),min(by,1.-by));
   vec3 brick=color(66.)*(.86+.19*rnd(vec2(floor(brickUV.x+.5*row),row)));
   brick*=.86+.14*smoothstep(.03,.12,mortar);
   col=mix(vec3(.49,.42,.34),brick,smoothstep(.035,.075,mortar));
   pat*=.65;
 }
 if(m==75.){
   col*=.98+.025*sin(uv.x*10.+sin(uv.y*5.));
   pat*=.23;
 }
 if(m==91.){
   if(f==2.||f==3.){
     vec2 q=abs(fract(uv)-.5);
     float ring=max(q.x,q.y);
     col*=1.10+.11*sin(ring*63.);
   }else{
     float grain=sin(uv.x*48.+sin(uv.y*3.)*1.3);
     col*=.91+.10*grain;
   }
   pat*=.6;
 }
 if(m==74.&&f==2.){
   vec2 tile=fract(uv*2.);
   float edge=min(min(tile.x,1.-tile.x),min(tile.y,1.-tile.y));
   col=color(74.)*(.89+.16*rnd(floor(uv*2.)));
   col*=mix(.62,1.,smoothstep(.018,.08,edge));
 }
 if(m==73.){if(fract(uv.x*5.)<.05)col*=.7;pat*=.7;}
 if(m==67.){col=mix(col,vec3(1.,.82,.43),.36);pat*=.3;}
 if(m==77.){if(fract(w.y*3.)<.13)col*=.52;else if(rnd(floor(uv*7.))>.42)col=mix(col,vec3(.61,.42,.25),.5);}
 // Character-only pixel patterns: no external creature textures, no texture memory.
 if(m>=105.&&m<=139.){
    float fleck=rnd(floor(uv*9.)+vec2(m*.13,m*.27));
    pat=(fleck-.5)*.11;
    if(m==105.||m==107.||m==109.)col*=fleck>.71?.82:1.06;
    if(m==111.){pat*=.33;col+=vec3(.045,.23,.19)*(0.4+0.6*sin(time*2.2+uv.x*4.));}
    if(m==110.){pat=0.;col*=1.26;}
    if(m==114.){col*=rnd(floor(uv*5.))>.5?1.14:.91;}
    // Subtle tiny flecks and cow-hide irregular shapes, all procedural.
    if(m==115.||m==123.){col*=.94+.09*rnd(floor(uv*7.));pat*=.75;}
    if(m==118.||m==119.){pat*=.38;col*=.97+.045*rnd(floor(uv*6.));}
    if(m==120.||m==121.){pat*=.55;col*=.91+.11*rnd(floor(uv*4.));}
    if(m==116.||m==117.||m==122.)pat*=.4;
    if(m==137.)col*=.85+.16*fleck;
    if(m==138.)col*=.91+.08*fleck;
    if(m==139.){pat=0.;col*=1.4;}
 }

 col+=pat;
 vec3 normal=f==0.?vec3(1.,0.,0.):f==1.?vec3(-1.,0.,0.):f==2.?vec3(0.,1.,0.):f==3.?vec3(0.,-1.,0.):f==4.?vec3(0.,0.,1.):vec3(0.,0.,-1.);
 float solarAngle=(day-.25)*6.283185;
 vec3 solarDir=normalize(vec3(cos(solarAngle)*.72,sin(solarAngle),-.55));
 float direct=max(0.,dot(normal,solarDir))*max(0.,solarDir.y);
 float shade=f==2.?1.0:(f==3.?.62:.80);
 // Roof shading is baked into the same AO attribute as terrain shade.
 vec3 lighting=mix(vec3(.23,.29,.46),vec3(.79,.83,.80),light)*shade*amb;
 lighting+=vec3(.34,.26,.16)*direct*amb;
 float torch=0.;
 for(int i=0;i<8;i++){
   if(float(i)<numLamps){
     vec3 toLamp=lamps[i]-w;
     float dist=length(toLamp);
     float falloff=max(0.,1.-dist/8.);
     float facing=.35+.65*max(0.,dot(normal,toLamp/max(dist,.01)));
     float flicker=.97+.03*sin(time*5.+lamps[i].x*1.3+lamps[i].z*.7);
     torch+=falloff*falloff*facing*flicker;
   }
 }
 lighting+=min(torch,1.2)*vec3(1.28,.83,.43);
 if(m==25.||m==13.||m==29.||m==30.||m==67.||m==110.||m==111.||m==136.)lighting=max(lighting,vec3(1.12,1.02,.80));
 col*=lighting;
 if(m==36.)col+=vec3(.035,.13,.08)*(1.-light*.5);
 float horizon=1.-clamp(abs(normalize(w-eye).y)*2.,0.,1.);
 col+=.018*horizon*vec3(.88,.72,.47)*light;
 if(immersed>.5)col=mix(col,sky,.22);float fog=immersed>.5?smoothstep(2.,20.,deep):smoothstep(36.-mist*12.,133.-mist*22.,deep);gl_FragColor=vec4(mix(col,sky,fog*.94),alpha);}`;
  const skyV =
    'attribute vec2 point;varying vec2 uv;void main(){uv=point;gl_Position=vec4(point,.9999,1.);}';
  const skyF =
    `precision highp float;varying vec2 uv;` +
    common +
    `
 float noise2(vec2 p){return fract(sin(dot(p,vec2(11.27,71.81)))*4375.53);}
 void main(){vec3 d=normalize(F+R*uv.x/proj.x+U*uv.y/proj.y);vec3 c=mix(sky,mix(vec3(.024,.042,.112),vec3(.34,.64,.82),light),smoothstep(0.,.82,d.y));
 float angle=(day-.25)*6.283185;vec3 sun=normalize(vec3(cos(angle)*.72,sin(angle),-.55));float sunD=length(d-sun);c+=vec3(.50,.32,.14)*exp(-sunD*9.)*light;
 if(max(abs(dot(d-sun,normalize(cross(sun,vec3(0.,1.,0.))))),abs(dot(d-sun,normalize(cross(sun,cross(sun,vec3(0.,1.,0.)))))))<.049&&dot(d,sun)>.96)c=vec3(1.,.9,.64);
 float twilight=(1.-smoothstep(.04,.42,abs(sun.y)))*exp(-abs(d.y)*5.);
 c+=vec3(.24,.085,.026)*twilight;
 float moonDist=distance(d,-sun);
 if(sun.y<0.){
   c+=vec3(.05,.07,.12)*exp(-moonDist*15.);
   if(moonDist<.039){float crater=noise2(floor(d.xz*440.));c=mix(vec3(.65,.72,.84),vec3(.91,.94,1.),crater);}
 }
 if(d.y>.07){
   vec2 stars=floor(d.xz*360./(d.y+.4));
   float star=noise2(stars);
   if(star>.997)c+=vec3(.68,.79,1.)*smoothstep(.997,1.,star)*(1.-smoothstep(.04,.46,light));
 }
 if(d.y>.055&&quality>0.){
   vec2 p=d.xz/(d.y+.025)*3.2+vec2(time*.008,0.);
   vec2 k=floor(p*vec2(1.5,3.))/vec2(1.5,3.);
   float n=sin(k.x*.46)+sin(k.y*.99)+sin(k.x*.81+k.y*.3);
   float clouds=smoothstep(1.48,2.02,n)*smoothstep(.055,.30,d.y);
   vec3 cloudColor=mix(vec3(.105,.15,.24),vec3(.94,.91,.84),light);
   c=mix(c,cloudColor,clouds*.72);
   if(quality>1.){
     float highCloud=sin(p.x*.23+p.y*.55)+sin(p.y*.61-p.x*.14);
     c=mix(c,cloudColor,smoothstep(1.62,1.96,highCloud)*smoothstep(.30,.70,d.y)*.20);
   }
 }
 float az=atan(d.z,d.x);
 float ridge=.045+.022*sin(az*13.)+.018*sin(az*27.)+.009*sin(az*63.);
 if(d.y<ridge&&d.y>-.20)c=mix(c,vec3(.25,.35,.42)*(.4+.6*light),.34);
 if(beacon>.0 && d.y>.03){float band=exp(-abs(d.y-(.34+.12*sin(az*3.+time*.07)))*10.);c+=vec3(.085,.44,.34)*band*beacon;}
 gl_FragColor=vec4(immersed>.5?sky:c,1.);}`;
  const lineV =
    'attribute vec3 pos;' +
    common +
    'void main(){vec3 d=pos-eye;float z=dot(d,F);gl_Position=vec4(dot(d,R)*proj.x,dot(d,U)*proj.y,1.0005*z-.122,z);}';
  const lineF = 'precision mediump float;void main(){gl_FragColor=vec4(1.,.94,.64,.92);}';
  function makeProgram(gl, vs, fs) {
    function comp(src, type) {
      let sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(sh));
      return sh;
    }
    const prog = gl.createProgram();
    const v = comp(vs, gl.VERTEX_SHADER),
      f = comp(fs, gl.FRAGMENT_SHADER);
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(prog));
    const a = {},
      u = {};
    for (const n of ['pos', 'id', 'face', 'ao', 'point']) a[n] = gl.getAttribLocation(prog, n);
    for (const n of [
      'eye',
      'R',
      'U',
      'F',
      'proj',
      'time',
      'day',
      'light',
      'sky',
      'quality',
      'mist', 'immersed',
      'beacon',
      'lamps',
      'numLamps',
    ])
      u[n] = gl.getUniformLocation(prog, n === 'lamps' ? 'lamps[0]' : n);
    return { prog, a, u };
  }
  function box(buf, x, y, z, sx, sy, sz, id) {
    const dims = [sx, sy, sz];
    for (let f = 0; f < 6; f++) {
      let ax = f >> 1,
        u = ax === 0 ? 2 : 0,
        v = ax === 1 ? 2 : 1;
      for (const [i, j] of [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
        [1, 1],
        [0, 1],
      ]) {
        let p = [x, y, z];
        if (f % 2 === 0) p[ax] += dims[ax];
        p[u] += i * dims[u];
        p[v] += j * dims[v];
        buf.push(...p, id, f, 1);
      }
    }
  }
  function tint(g,underwater) {
    const sun = Math.sin((g.time - 0.25) * Math.PI * 2),
      l = Voxel.clip((sun + 0.4) / 0.76, 0, 1),
      warm = 1 - Math.min(1, Math.abs(sun) * 2.5);
    return {
      l,
      c: underwater ? [0.055,0.41,0.51] : [0.125 + 0.55 * l + warm * 0.14, 0.18 + 0.61 * l - warm * 0.08, 0.29 + 0.55 * l - warm * 0.19],
    };
  }
  class GLRender {
    constructor(canvas, gl) {
      this.canvas = canvas;
      this.gl = gl;
      this.p = makeProgram(gl, vs, fs);
      this.skyP = makeProgram(gl, skyV, skyF);
      this.line = makeProgram(gl, lineV, lineF);
      this.meshes = new Map();
      this.bg = this.buffer(new Float32Array([-1, -1, 3, -1, -1, 3]));
      this.entities = gl.createBuffer();
      this.outline = gl.createBuffer();
      gl.enable(gl.DEPTH_TEST);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.type = 'WebGL';
    }
    buffer(arr) {
      const g = this.gl,
        b = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, b);
      g.bufferData(g.ARRAY_BUFFER, arr, g.STATIC_DRAW);
      return b;
    }
    remove(k) {
      let m = this.meshes.get(k);
      if (m) {
        for (let v of [m.s, m.a]) this.gl.deleteBuffer(v);
        this.meshes.delete(k);
      }
    }
    install(k, r) {
      this.remove(k);
      this.meshes.set(k, {
        s: this.buffer(r.solid),
        a: this.buffer(r.alpha),
        ns: r.solid.length / 6,
        na: r.alpha.length / 6,
        cx: r.cx,
        cz: r.cz,
      });
    }
    reset() {
      for (let k of this.meshes.keys()) this.remove(k);
    }
    attr(loc, size, stride, off) {
      if (loc < 0) return;
      const g = this.gl;
      g.enableVertexAttribArray(loc);
      g.vertexAttribPointer(loc, size, g.FLOAT, false, stride, off);
    }
    draw(g, settings, alpha = 1) {
      const gl = this.gl,
        c = this.canvas,
        scale = [0.7, 0.88, 1][settings.quality] * Math.min(devicePixelRatio || 1, 1.5) * Math.max(0.72,Math.min(1,this.dynamicScale || 1));
      const wi = Math.max(1, Math.round(c.clientWidth * scale)),
        he = Math.max(1, Math.round(c.clientHeight * scale));
      if (c.width !== wi || c.height !== he) {
        c.width = wi;
        c.height = he;
      }
      gl.viewport(0, 0, wi, he);
      const { r, u, f, eye, third } = camera(g, settings, alpha),
        underwater = g.get(...eye.map(Math.floor)) === 7,
        { l, c: sky } = tint(g,underwater),
        py = 1 / Math.tan((settings.fov * Math.PI) / 360),
        self = this;
      const glow = g.lights(30).length ? 1 : 0;
      function use(p) {
        gl.useProgram(p.prog);
        gl.uniform3fv(p.u.R, r);
        gl.uniform3fv(p.u.U, u);
        gl.uniform3fv(p.u.F, f);
        gl.uniform3fv(p.u.eye, eye);
        gl.uniform2f(p.u.proj, (py * he) / wi, py);
        gl.uniform1f(p.u.time, settings.motion ? g.elapsed : 0);
        gl.uniform1f(p.u.day, g.time);
        gl.uniform1f(p.u.light, l);
        gl.uniform3fv(p.u.sky, sky);
        gl.uniform1f(p.u.quality, settings.quality); // motion freezes time independently
        gl.uniform1f(p.u.immersed,underwater?1:0);
        gl.uniform1f(p.u.mist, g.misty ? 1 : 0);
        gl.uniform1f(p.u.beacon, glow);
      }
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      use(this.skyP);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bg);
      this.attr(this.skyP.a.point, 2, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.DEPTH_TEST);
      use(this.p);
      const lamps = g.lights();
      gl.uniform1f(this.p.u.numLamps, lamps.length);
      if (lamps.length) gl.uniform3fv(this.p.u.lamps, lamps.flat());
      function geom(b, n) {
        if (!n) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        self.attr(self.p.a.pos, 3, 24, 0);
        self.attr(self.p.a.id, 1, 24, 12);
        self.attr(self.p.a.face, 1, 24, 16);
        self.attr(self.p.a.ao, 1, 24, 20);
        gl.drawArrays(gl.TRIANGLES, 0, n);
        self.calls++;
        self.tris += n / 3;
      }
      let visible = [];
      this.calls = 1;
      this.tris = 1;
      for (const m of this.meshes.values()) {
        const dx = m.cx * 16 + 8 - eye[0],
          dz = m.cz * 16 + 8 - eye[2];
        if (f[0] * dx + f[2] * dz < -19 && Math.abs(g.p.pitch) < 0.65) continue;
        visible.push(m);
        geom(m.s, m.ns);
      }
      let ent = [];
      // Explorer model shared by local 3rd person and the remote P2P player.
      // Distinct torso, arms, boots, visor and pack; all procedural and batched.
      function explorerAvatar(p,remote=false) {
        const x=p.x,y=p.y,z=p.z,yaw=p.yaw||0;
        const h=p.crouch?.79:1;
        const gait=remote?(p.walkCycle||0):(g.walkCycle||0);
        const motion=remote?(p.moving?1:0):Math.min(1,(g.moveSpeed||0)/3.8);
        const wave=Math.sin(gait)*.10*motion;
        const bop=Math.abs(Math.sin(gait))*.035*motion;
        const start=ent.length;
        const chest=remote?17:108, pants=remote?27:109, scarf=remote?111:113;
        box(ent,-.23,y+(.63+bop)*h,-.16,.46,.61*h,.33,chest); // coat
        box(ent,-.22,y+(.61+bop)*h,-.20,.44,.12*h,.40,12); // belt
        box(ent,-.19,y+(1.22+bop)*h,-.19,.38,.36*h,.38,106); // face
        box(ent,-.215,y+(1.54+bop)*h,-.215,.43,.12*h,.43,12); // helmet
        box(ent,-.185,y+(1.49+bop)*h,-.225,.37,.06*h,.06,scarf); // visor
        box(ent,-.34,y+(.77+bop+wave)*h,-.13,.11,.43*h,.26,8);
        box(ent,.23,y+(.77+bop-wave)*h,-.13,.11,.43*h,.26,8);
        box(ent,-.33,y+(.75+bop+wave)*h,-.15,.09,.11*h,.30,109); // gauntlets
        box(ent,.24,y+(.75+bop-wave)*h,-.15,.09,.11*h,.30,109);
        box(ent,-.20,y+.11*h,-.13+wave,.18,.53*h,.27,pants);
        box(ent,.02,y+.11*h,-.13-wave,.18,.53*h,.27,pants);
        box(ent,-.21,y,-.23+wave,.19,.15*h,.35,112); // boots
        box(ent,.02,y,-.23-wave,.19,.15*h,.35,112);
        box(ent,-.18,y+(.79+bop)*h,.17,.36,.38*h,.13,12); // field pack
        box(ent,-.10,y+(1.03+bop)*h,.302,.20,.08*h,.035,scarf); // pack emblem
        // Held items and short swing cues apply to both explorers, without asset downloads.
        const held=remote?(p.held||0):(g.inv[g.selected]?.b||0);
        const swing=remote?(p.swing?.19:0):((g.attackCool||0)>0?.19:0);
        if(held && Voxel.blocks[held]) {
          const placing=Voxel.blocks[held].placeable;
          if(placing) {
            box(ent,.34,y+(.55+bop-wave-swing)*h,-.29,.23,.23*h,.23,held);
          } else {
            const head=held===47?35:held===22||held===42?3:held===43?24:
              held===44||held===89?35:held===45?11:held===90?3:21;
            box(ent,.39,y+(.45+bop-wave-swing)*h,-.21,.075,.40*h,.09,21);
            box(ent,.31,y+(.80+bop-wave-swing)*h,-.22,.24,.14*h,.12,head);
          }
        }
        for(let i=start;i<ent.length;i+=6){
          const xx=ent[i],zz=ent[i+2];
          ent[i]=x+xx*Math.cos(yaw)-zz*Math.sin(yaw);
          ent[i+2]=z+xx*Math.sin(yaw)+zz*Math.cos(yaw);
        }
      }
      if(third) explorerAvatar({...g.p,crouch:g.crouch});
      if(g.remotePlayer?.active) explorerAvatar(g.remotePlayer,true);
      // Each creature has its own lightweight voxel anatomy and patterned palette.
      // No GLB models, image atlases or additional draw calls are necessary.
      for (const mob of g.mobs) {
        const x=mob.x, y=mob.y, z=mob.z;
        if (![x,y,z,mob.face||0].every(Number.isFinite)) continue;
        const kind=mob.kind || 'Raspejante';
        const t=g.elapsed;
        const speed=Math.max(0,Math.min(1,mob.motion||0));
        // Gait advances from travelled distance, not global time: stationary legs rest.
        const step=Math.sin(mob.gait||0)*speed;
        const hop=kind==='Saltim' ? Math.max(0,Math.sin(mob.gait||0))*speed*.23 : 0;
        const wing=Math.sin(t*7+x)*.11;
        const bob=hop+(kind==='Luzerrante' ? .23+Math.sin(t*2.5+x)*.075 : Math.abs(step)*.025);
        const strike=Math.sin(Math.PI*Math.max(0,Math.min(1,1-(mob.attack||0)/.36)))*(mob.attack>0?1:0);
        const wind=mob.wind>0?.22:0;
        const recoil=(mob.hurt||0)>0?Math.sin((mob.hurt/.36)*Math.PI)*.12:0;
        const dead=mob.hp<=0 ? Math.max(.10,Math.min(1,(mob.dying||0)/.55)) : 1;
        const s=Math.min(1.2,Math.max(.08,(kind==='Guardião Prisma' ? 1.06 : kind==='Vaca' ? 1.14 :
          kind==='Ovelha' ? .97 : kind==='Porco' ? .91 :
          kind==='Vigia de Cascalho' ? 1.02 : kind==='Zumbi' ? 1.02 : kind==='Saltim' ? .72 : kind==='Galinha'?.64:.82)*dead*Voxel.farmScale(mob)));
        const start=ent.length;
        // One shared vertex buffer, no extra draw calls or additional texture atlases.
        // Clamped, positive cuboids prevent warped/stretched enemies even after
        // malformed network poses or an extremely long session.
        const piece=(px,py,pz,sx,sy,sz,material)=>{
          if(![px,py,pz,sx,sy,sz].every(Number.isFinite))return;
          px=Math.max(-2.6,Math.min(2.6,px));
          py=Math.max(-.6,Math.min(3.3,py));
          pz=Math.max(-2.6,Math.min(2.6,pz));
          sx=Math.max(.025,Math.min(1.3,sx));
          sy=Math.max(.025,Math.min(1.6,sy));
          sz=Math.max(.025,Math.min(1.3,sz));
          box(ent,px*s,(py+bob)*s,pz*s,sx*s,sy*s,sz*s,
            recoil>.04&&material!==110 ? 113 : material);
        };
        const eyes=(height,depth,material=110,spacing=.18,size=.09)=>{
          for (const side of [-1,1]) piece(side*spacing-size/2,height,-depth,size,size,size*.6,material);
        };
        if (kind === 'Ovelha') {
          // White fluffy body, grey face and four articulated black hooves.
          const wool=(mob.shorn||(mob.woolReady||0)>g.elapsed)?116:115;
          piece(-.42,.39,-.37,.84,.71,.78,wool);
          for(const side of [-1,1]) {
            piece(side*.35-.19,.50,-.4,.35,.38,.82,wool);
            piece(side*.30-.12,.12,-.27+side*step*.14,.25,.35,.22,116);
            piece(side*.30-.12,.12,.22-side*step*.14,.25,.35,.22,116);
            piece(side*.30-.13,.02,-.27+side*step*.14,.27,.14,.24,117);
            piece(side*.30-.13,.02,.22-side*step*.14,.27,.14,.24,117);
            piece(side*.20-.13,1.00,-.52,.26,.17,.22,116);
            piece(side*.18-.07,1.02,-.69,.12,.10,.07,112);
          }
          piece(-.30,.80,-.57,.60,.42,.32,116);
          piece(-.22,.84,-.76,.44,.18,.11,116);
          piece(-.12,.93,-.78,.24,.11,.04,117);
          piece(-.21,1.23,-.42,.42,.12,.25,wool);
          piece(-.20,.72,.39,.40,.25,.20,wool);
        } else if (kind === 'Porco') {
          // Pink round body, blocky muzzle, pointed ears, curled tail.
          piece(-.48,.31,-.39,.96,.66,.82,118);
          piece(-.36,.55,-.54,.72,.45,.41,118);
          piece(-.22,.59,-.79,.44,.23,.16,119);
          for(const side of [-1,1]) {
            piece(side*.16-.035,.72,-.805,.07,.07,.03,117); // nostrils
            piece(side*.24-.10,.95,-.54,.20,.24,.13,118); // ears
            piece(side*.22-.11,.78,-.76,.14,.095,.045,112); // eyes
            piece(side*.32-.12,.09,-.28+side*step*.15,.25,.25,.22,118);
            piece(side*.32-.12,.09,.30-side*step*.15,.25,.25,.22,118);
            piece(side*.32-.12,.05,-.29+side*step*.15,.25,.09,.23,117);
            piece(side*.32-.12,.05,.31-side*step*.15,.25,.09,.23,117);
          }
          piece(.34,.56,.42+Math.sin(t*3)*.04,.12,.14,.28,119); // tail
          piece(.4,.67,.64,.11,.11,.13,118);
        } else if (kind === 'Vaca') {
          // Distinctive brown-and-cream spotted cow, short horns and udder.
          piece(-.50,.42,-.40,1,.86,.86,120);
          piece(-.505,.72,-.39,.11,.43,.55,121);
          piece(.38,.56,-.26,.13,.42,.54,121);
          piece(-.16,.97,.03,.32,.25,.38,121);
          piece(-.38,.71,-.67,.76,.51,.39,120);
          piece(-.33,.77,-.86,.66,.26,.30,122);
          for(const side of [-1,1]) {
            piece(side*.21-.045,.84,-.88,.09,.07,.035,117);
            piece(side*.25-.075,1.12,-.67,.15,.16,.12,112);
            piece(side*.30-.08,1.24,-.61,.16,.22,.15,121); // horns
            piece(side*.32-.12,.08,-.29+side*step*.17,.25,.45,.24,120);
            piece(side*.32-.12,.08,.32-side*step*.17,.25,.45,.24,120);
            piece(side*.32-.13,.02,-.28+side*step*.17,.27,.16,.26,117);
            piece(side*.32-.13,.02,.32-side*step*.17,.27,.16,.26,117);
          }
          piece(-.16,.28,-.13,.32,.19,.36,119); // udder
          piece(.35,.84,.40+Math.sin(t*2)*.035,.13,.18,.36,120); // tail
        } else if(kind==='Galinha') {
          // Compact white bird with red comb, beak, animated wings and two legs.
          piece(-.32,.24,-.27,.64,.55,.76,115);
          piece(-.20,.66,-.47,.40,.38,.36,115);
          piece(-.13,.72,-.59,.26,.14,.16,113);
          piece(-.06,1.01,-.39,.12,.17,.25,88);
          piece(-.07,.57,-.55,.14,.14,.10,88);
          for(const side of [-1,1]){
            piece(side*.16-.04,.88,-.48,.08,.08,.07,112);
            piece(side*.28-.07,.34+Math.abs(step)*.08,-.13,.14,.36,.45,121);
            piece(side*.14-.035,.01,step*side*.17,.07,.26,.08,113);
            piece(side*.14-.09,0,-.08+step*side*.17,.18,.05,.17,113);
          }
          piece(-.18,.60,.43,.36,.36,.15,121);
        } else if(kind==='Zumbi') {
          // Compact nocturnal undead: pale voxel skin, tattered shirt and
          // distinctly slow arm reach. No imported rigging or sprite sheets.
          piece(-.30,.64,-.19,.60,.67,.40,138); // torso
          piece(-.23,1.30,-.24,.46,.40,.47,137); // head
          piece(-.28,1.59,-.25,.56,.13,.51,108); // dark hair
          piece(-.19,1.43,-.278,.13,.09,.04,139);
          piece(.09,1.43,-.278,.13,.09,.04,139);
          piece(-.14,1.25,-.275,.28,.06,.05,112);
          for(const side of [-1,1]) {
            // Keep all limb lengths fixed; animation changes only the offset.
            piece(side*.43-.11,.72,-.27+side*step*.08-strike*.16,.22,.58,.25,137);
            piece(side*.43-.11,.68,-.34-strike*.10,.22,.14,.26,137);
            piece(side*.17-.13,.08,-.13-side*step*.12,.27,.56,.30,138);
            piece(side*.17-.13,.00,-.25-side*step*.12,.27,.16,.40,112);
          }
          piece(-.24,.65,-.225,.48,.08,.05,112); // belt
        } else if(kind==='Saltim') {
          piece(-.36,.29,-.34,.72,.50,.68,105); // amber round body
          piece(-.29,.32,-.36,.58,.24,.13,106); // bright underside
          piece(-.29,.75,-.29,.58,.28,.56,105);
          for(const side of [-1,1]){
            piece(side*.23-.10,.91,-.17,.20,.24,.15,105); // expressive ears
            piece(side*.23-.13,.07,-.22,.23,.23,.23,113); // front paws
            piece(side*.22-.13,.07,.17+side*step*.16,.24,.22,.24,105);
            piece(side*.22-.04,.77,-.34,.08,.05,.08,112); // eyes
          }
          piece(-.12,.79,-.38,.24,.08,.08,106); // muzzle
          piece(-.08,.79,-.40,.16,.07,.06,109); // nose
          piece(-.09,.44,.33,.18,.2,.19,106); // tail
        } else if (kind==='Musgato') {
          piece(-.39,.20,-.36,.78,.57,.72,107);
          piece(-.34,.65,-.38,.68,.42,.44,107);
          piece(-.3,.38,-.37,.6,.18,.10,106);
          for (const side of [-1,1]) {
            piece(side*.24-.12,.98,-.25,.24,.25,.21,108); // pointed ears
            piece(side*.19-.09,.78,-.41,.18,.12,.07,111);
            piece(side*.28-.14,.0,-.25+side*step*.11,.25,.25,.24,108);
            piece(side*.28-.14,.0,.21-side*step*.11,.25,.25,.23,107);
          }
          piece(.33,.30,.22+Math.sin(t*3.2+x)*.055,.16,.13,.33,108); // curling tail
          piece(.38,.38,.48,.12,.12,.18,107);
          piece(-.1,.66,-.43,.20,.12,.06,106);
        } else if (kind==='Luzerrante') {
          piece(-.22,.45,-.21,.44,.48,.42,111);
          piece(-.27,.93,-.27,.54,.34,.54,111);
          piece(-.18,.48,-.25,.36,.16,.1,106);
          for(const side of [-1,1]){
            piece(side*.35-.09,.54+wing*side,-.10,.18,.53,.26,111); // spectral wings
            piece(side*.18-.10,1.17,-.04,.2,.22,.18,114);
            piece(side*.15-.08,1.03,-.29,.16,.12,.08,110);
          }
          piece(-.11,1.37,-.10,.22,.21,.20,111); // crown crystal
        } else if(kind==='Vigia de Cascalho') {
          piece(-.39,.53,-.35,.78,.84,.70,109);
          piece(-.34,1.36,-.31,.68,.47,.62,3);
          piece(-.22,1.47,-.38,.44,.15,.11,112);
          piece(-.12,.86,-.37,.24,.27,.1,113);
          for(const side of [-1,1]){
            piece(side*.51-.18,.51,-.22+side*step*.17+strike*.25-wind,.35,.83,.45,3); // arms
            piece(side*.22-.16,.02,-.22-side*step*.18,.32,.55,.43,109); // legs
            piece(side*.20-.08,1.57,-.38,.15,.13,.11,110); // amber eyes
            piece(side*.42-.1,1.2,-.15,.2,.28,.25,109);
          }
        } else if(kind==='Guardião Prisma') {
          piece(-.34,.58,-.34,.68,.88,.68,109);
          piece(-.26,1.49,-.26,.52,.42,.52,112);
          piece(-.28,1.01,-.365,.56,.36,.08,111); // prism core
          piece(-.16,1.12,-.42,.32,.18,.10,110);
          for(const side of [-1,1]){
            piece(side*.50-.20,.75,-.22+side*step*.12+strike*.36-wind,.4,.83,.45,109);
            piece(side*.53-.13,.73,-.35+side*step*.12+strike*.36-wind,.26,.37,.12,113);
            piece(side*.22-.14,.0,-.25-side*step*.15,.28,.64,.42,109);
            piece(side*.25-.10,1.87,-.17,.2,.43,.25,114); // horns
            piece(side*.18-.08,1.64,-.30,.16,.12,.09,111);
          }
          piece(-.19,2.10,-.14,.38,.27,.28,114); // crystal crown
        } else { // Raspejante: beetle-like hostile nocturnal crawler
          piece(-.40,.27,-.33,.8,.49,.66,108);
          piece(-.34,.59,-.32,.68,.29,.62,107);
          piece(-.33,.71+wind*.3+strike*.12,-.30,.66,.17,.60,109);
          piece(-.25,.32,-.42,.5,.17,.13,112);
          for (const side of [-1,1]) {
            piece(side*.25-.07,.61,-.38,.14,.13,.11,110);
            piece(side*.36-.12,.28,-.30+side*step*.15+strike*.24,.24,.21,.21,108);
            piece(side*.36-.12,.23,.13-side*step*.15,.25,.25,107);
            piece(side*.30-.10,.72,-.22,.20,.22,.17,109);
          }
          piece(-.09,.84,-.05,.18,.26,.18,114); // dorsal crystal
        }
        // Orient faces and limbs toward the mob's last heading (or toward player).
        const yaw=Number.isFinite(mob.face) ? mob.face : Math.atan2(g.p.x-x,-(g.p.z-z));
        const sin=Math.sin(yaw),cos=Math.cos(yaw);
        for(let i=start;i<ent.length;i+=6){
          const px=ent[i],pz=ent[i+2];
          ent[i]=x+px*cos-pz*sin;
          ent[i+1]+=y;
          ent[i+2]=z+px*sin+pz*cos;
        }
      }
      for (const p of g.fragments) box(ent, p.x, p.y, p.z, 0.1, 0.1, 0.1, p.b);
      for (let d of g.drops) {
        const y = d.y + 0.16 + Math.sin(g.elapsed * 3 + d.x) * 0.06;
        box(ent, d.x - 0.13, y, d.z - 0.13, 0.26, 0.26, 0.26, d.b);
      }
      if (g.bag) {
        const b = g.bag;
        box(ent, b.x - 0.35, b.y + 0.05, b.z - 0.3, 0.7, 0.65, 0.6, 15);
      }
      if (ent.length) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.entities);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ent), gl.DYNAMIC_DRAW);
        geom(this.entities, ent.length / 6);
      }
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      visible.sort(
        (a, b) =>
          (b.cx * 16 + 8 - eye[0]) ** 2 +
          (b.cz * 16 + 8 - eye[2]) ** 2 -
          ((a.cx * 16 + 8 - eye[0]) ** 2 + (a.cz * 16 + 8 - eye[2]) ** 2),
      );
      for (const m of visible) geom(m.a, m.na);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      // Outline the aimed block and, when holding a construction piece, its destination.
      // Both reuse one tiny dynamic buffer; no persistent ghost mesh.
      const outlines = g.hit ? [g.hit.p] : [];
      const preview = g.preview();
      if (preview?.valid) outlines.push(preview.pos);
      if (outlines.length) {
        use(this.line);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.outline);
        this.attr(this.line.a.pos, 3, 0, 0);
        for (const p of outlines) {
          const o = [];
          for (let ax = 0; ax < 3; ax++) {
            const u = (ax + 1) % 3, v = (ax + 2) % 3;
            for (let i of [0, 1]) for (let j of [0, 1]) for (let k of [0, 1]) {
              const t = p.map(x => x - .004);
              t[ax] += 1.008 * k; t[u] += 1.008 * i; t[v] += 1.008 * j;
              o.push(...t);
            }
          }
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(o), gl.DYNAMIC_DRAW);
          gl.drawArrays(gl.LINES, 0, o.length / 3);
        }
      }
    }
  }
  // Back of the explorer for the software renderer, in the same palette as the voxel model.
  const explorer = [
    '   hhhhh   ',
    '  hHHHHHh  ',
    ' hhhhhhhhh ',
    '   ttttt   ',
    '   ttttt   ',
    '  jjjjjjj  ',
    ' sJbbbbbJs ',
    ' sJbBBBbJs ',
    ' tJbBGBbJt ',
    ' tJbbbbbJt ',
    '  jjjjjjj  ',
    '   lL Ll   ',
    '   lL Ll   ',
    '   kk kk   ',
    '   kk kk   ',
  ];
  const clothing = {
    h: '#654533',
    H: '#af7f4b',
    t: '#be9069',
    j: '#345b53',
    J: '#498679',
    s: '#699b84',
    b: '#74503d',
    B: '#aa7e50',
    G: '#65e8c7',
    l: '#344752',
    L: '#495d61',
    k: '#493b38',
  };
  // Compact software raycaster for browsers without a GPU context.
  class CPURender {
    constructor(c) {
      this.canvas = c;
      this.ctx = c.getContext('2d', { alpha: false });
      this.type = 'CPU';
      this.calls = 1;
      this.tris = 0;
    }
    install() {}
    remove() {}
    reset() {}
    draw(g, settings, alpha = 1) {
      if (performance.now() - (this.last || 0) < 48) return;
      this.last = performance.now();
      const c = this.canvas,
        W = [144, 188, 224][settings.quality],
        H = Math.max(76, Math.round((W * c.clientHeight) / c.clientWidth));
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
        this.im = this.ctx.createImageData(W, H);
      }
      if (!this.im) this.im = this.ctx.createImageData(W, H);
      const pixels = this.im.data,
        { r, u, f, eye: o, third } = camera(g, settings, alpha),
        [ox, oy, oz] = o,
        underwater = g.get(...o.map(Math.floor)) === 7,
        { l, c: sky } = tint(g,underwater),
        h = Math.tan((settings.fov * Math.PI) / 360),
        ratio = W / H,
        depth = new Float32Array(W * H);
      const phase = settings.motion ? g.elapsed : 0;
      const beacon = g.lights(30).length > 0;
      const lamps = g.lights(), localLightCache=new Map();
      const lampLight=(x,y,z)=>{
        if(!lamps.length)return 0;
        const k=x+','+y+','+z;
        if(localLightCache.has(k))return localLightCache.get(k);
        let value=0;
        for(const lamp of lamps){
          const d=Math.hypot(x+.5-lamp[0],y+.5-lamp[1],z+.5-lamp[2]);
          value+=Math.max(0,1-d/8)**2;
        }
        value=Math.min(1,value); localLightCache.set(k,value); return value;
      };
      const sunAngle = (g.time - 0.25) * Math.PI * 2;
      const sunX = Math.cos(sunAngle) * 0.86,
        sunY = Math.sin(sunAngle),
        sunZ = -Math.cos(sunAngle) * 0.51;
      depth.fill(100);
      for (let y = 0; y < H; y++) {
        let vy = (1 - (2 * y) / H) * h;
        for (let x = 0; x < W; x++) {
          let vx = ((2 * x) / W - 1) * h * ratio,
            dx = f[0] + r[0] * vx + u[0] * vy,
            dy = f[1] + u[1] * vy,
            dz = f[2] + r[2] * vx + u[2] * vy;
          let bx = Math.floor(ox),
            by = Math.floor(oy),
            bz = Math.floor(oz),
            sx = dx < 0 ? -1 : 1,
            sy = dy < 0 ? -1 : 1,
            sz = dz < 0 ? -1 : 1,
            tx = dx ? ((sx < 0 ? bx : bx + 1) - ox) / dx : 1e9,
            ty = dy ? ((sy < 0 ? by : by + 1) - oy) / dy : 1e9,
            tz = dz ? ((sz < 0 ? bz : bz + 1) - oz) / dz : 1e9,
            ix = Math.abs(1 / dx),
            iy = Math.abs(1 / dy),
            iz = Math.abs(1 / dz),
            d = 0,
            ax = 1,
            hit = 0,
            cx = 1e9,
            cz = 1e9,
            chunk = null;
          while (d < 65 && by >= 0 && by < Voxel.H) {
            if (bx >> 4 !== cx || bz >> 4 !== cz) {
              cx = bx >> 4;
              cz = bz >> 4;
              chunk = g.chunks.get(Voxel.key(cx, cz))?.a;
            }
            hit = chunk ? chunk[Voxel.idx(bx & 15, by, bz & 15)] : 0;
            if (underwater && hit === 7) hit = 0;
            if (hit) break;
            if (tx < ty && tx < tz) {
              d = tx;
              tx += ix;
              bx += sx;
              ax = 0;
            } else if (ty < tz) {
              d = ty;
              ty += iy;
              by += sy;
              ax = 1;
            } else {
              d = tz;
              tz += iz;
              bz += sz;
              ax = 2;
            }
          }
          let rgb = sky,
            lighting = 1;
          if (hit && d < 65) {
            depth[y * W + x] = d;
            rgb = palette[hit];
            let fx = ox + dx * d,
              fy = oy + dy * d,
              fz = oz + dz * d,
              noise = Voxel.hash(
                Math.floor((ax === 0 ? fz : fx) * 8),
                Math.floor((ax === 1 ? fz : fy) * 8),
                hit,
              );
            lighting =
              (ax === 1 ? 1.04 : ax === 0 ? 0.8 : 0.68) * (0.45 + 0.55 * l) * (0.91 + noise * 0.16);
            if ((hit === 1 || hit === 17) && ax !== 1 && fy - Math.floor(fy) < 0.78) rgb = palette[2];
            if (hit === 9 || hit === 10 || hit === 11 || hit === 34) {
              const u=(ax===0?fz:fx)*4, v=(ax===1?fz:fy)*4;
              const q=Math.max(Math.abs(u-Math.floor(u)-.5),Math.abs(v-Math.floor(v)-.5));
              rgb=Voxel.hash(Math.floor(u),Math.floor(v),hit+981)>.59 && q<.36 ? palette[hit] : palette[3];
            }
            if (hit === 7) {
              const ripple = Math.sin(fx * 1.8 + fz * 0.8 + phase * 1.3) + Math.sin(fz * 2.7 + phase);
              const sheen = 0.47 * Math.max(0, 1 - Math.abs(dy)) + 0.09 * Math.max(0, ripple - 1);
              rgb = [0.06 + sky[0] * sheen, 0.38 + sky[1] * sheen, 0.41 + sky[2] * sheen];
            } else if (hit >= 28 && hit <= 31) {
              const a = ax === 0 ? fz : fx,
                b = ax === 1 ? fz : fy;
              const diamond = Math.abs(a - Math.floor(a) - 0.5) + Math.abs(b - Math.floor(b) - 0.5);
              if (Math.abs(diamond - (hit === 31 ? 0.3 : 0.42)) < 0.045) rgb = [0.86, 0.68, 0.37];
              else if (hit !== 31)
                rgb =
                  diamond < 0.31
                    ? hit === 28
                      ? [0.39, 0.74, 0.72]
                      : [0.36, 0.93, 0.81]
                    : [0.22, 0.31, 0.31];
            }
            const warmth=lampLight(bx,by,bz);
            if(warmth>0)rgb=rgb.map((v,i)=>v*(1+warmth*[.90,.55,.20][i]));
            if ([13,25,29,30,67,136].includes(hit)||Voxel.torchWall(hit)) lighting = 1.15;
            const target = g.hit;
            if (target && target.p[0] === bx && target.p[1] === by && target.p[2] === bz) {
              const a = ax === 0 ? fz : fx,
                b = ax === 1 ? fz : fy;
              if (
                Math.min(a - Math.floor(a), Math.ceil(a) - a, b - Math.floor(b), Math.ceil(b) - b) <
                0.018
              )
                rgb = [1, 0.91, 0.64];
            }
          } else {
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const elevation = dy / length,
              azimuth = Math.atan2(dz, dx);
            lighting = 1 - Math.max(0, elevation) * 0.27;
            const ridge = 0.055 + 0.03 * Math.sin(azimuth * 13) + 0.017 * Math.sin(azimuth * 31);
            if (elevation < ridge) rgb = [sky[0] * 0.72, sky[1] * 0.8, sky[2] * 0.83];
            else if (elevation > 0.04) {
              const solar = (dx * sunX + dy * sunY + dz * sunZ) / length;
              if (solar > 0.998) rgb = [1, 0.92, 0.69];
              else if (solar < -0.999) rgb = [0.82, 0.88, 0.96];
              else if (settings.quality > 0) {
                const tx = Math.floor((dx / (dy + 0.032)) * 7 + phase * 0.024) * 0.22;
                const tz = Math.floor((dz / (dy + 0.032)) * 12) * 0.15;
                if (Math.sin(tx) + Math.sin(tz) + Math.sin(tx * 0.7 + tz * 0.3) > 1.98)
                  rgb = [sky[0] * 0.61 + l * 0.39, sky[1] * 0.61 + l * 0.37, sky[2] * 0.67 + l * 0.3];
              }
              if (beacon) {
                const ribbon = Math.max(
                  0,
                  1 - Math.abs(elevation - 0.34 - 0.12 * Math.sin(azimuth * 3 + phase * 0.07)) * 8,
                );
                rgb = [rgb[0] + ribbon * 0.05, rgb[1] + ribbon * 0.36, rgb[2] + ribbon * 0.23];
              }
            }
          }
          const fog = underwater ? (hit ? .22+.78*Voxel.clip((d-2)/18,0,1) : 1) : hit ? Math.max(0, (d - 38) / 45) : 0;
          let at = (y * W + x) * 4;
          for (let i = 0; i < 3; i++)
            pixels[at + i] = (rgb[i] * lighting * (1 - fog) + sky[i] * fog) * 255;
          pixels[at + 3] = 255;
        }
      }
      this.ctx.putImageData(this.im, 0, 0);
      const drawSprite = (x, y, z, size, col) => {
        let v = [x - ox, y - oy, z - oz],
          dot = (t) => v.reduce((s, e, i) => s + e * t[i], 0),
          d = dot(f);
        if (d < 0.15) return;
        let xx = W * (0.5 + (dot(r) / (d * h * ratio)) * 0.5),
          yy = H * (0.5 - (dot(u) / (d * h)) * 0.5),
          w = (size * H) / (d * h * 2);
        if (xx < 0 || xx >= W || yy < 0 || yy >= H || depth[(yy | 0) * W + (xx | 0)] < d - 0.35) return;
        this.ctx.fillStyle = col;
        this.ctx.fillRect(xx - w / 2, yy - w / 2, w, w);
      };
      if (third) {
        const pixel = 0.102,
          height = g.crouch ? 0.8 : 1;
        for (let row = 0; row < explorer.length; row++)
          for (let col = 0; col < explorer[row].length; col++) {
            const color = clothing[explorer[row][col]];
            if (!color) continue;
            const offset = (col - 5) * pixel;
            drawSprite(
              g.p.x + r[0] * offset,
              g.p.y + (explorer.length - row) * pixel * height,
              g.p.z + r[2] * offset,
              pixel * 1.05,
              color,
            );
          }
      }
      for (const m of g.mobs) {
        // The low-end software renderer also keeps recognizable silhouettes.
        const kind=m.kind||'Raspejante', boss=kind==='Guardião Prisma';
        const col=({Saltim:'#d6a56a',Musgato:'#5a946b',Luzerrante:'#50efd4',
          'Vigia de Cascalho':'#687580','Guardião Prisma':'#677c83',
          'Zumbi':'#87a18a',
          'Ovelha':'#eee9d9','Porco':'#e7a6ab','Vaca':'#755a4a','Galinha':'#eee9d9'})[kind]||'#366658';
        const bob=kind==='Saltim'?Math.max(0,Math.sin(m.gait||0))*(m.motion||0)*.14:
          kind==='Luzerrante'?.32+Math.sin(g.elapsed*3)*.07:0;
        const die=m.hp<=0?Math.max(.1,Math.min(1,(m.dying||0)/.55)):1;
        const scale=(boss?1.5:kind==='Vaca'?1.2:kind==='Ovelha'?1.08:
          kind==='Vigia de Cascalho'?1.15:kind==='Galinha'?.6:.85)*die*Voxel.farmScale(m);
        const color=m.hurt>0?'#efb169':col;
        if(kind==='Galinha'){
          drawSprite(m.x,m.y+.40*scale,m.z,.85*scale,color);
          drawSprite(m.x,m.y+.84*scale,m.z-.2,.42*scale,col);
          drawSprite(m.x,m.y+1.12*scale,m.z-.2,.20*scale,'#b8645d');
          drawSprite(m.x,m.y+.77*scale,m.z-.35,.16*scale,'#cf9c59');continue;
        }
        drawSprite(m.x,m.y+.40*scale+bob,m.z,.85*scale,color);
        drawSprite(m.x,m.y+.84+bob,m.z,.53*scale,m.hurt>0?'#ffe39e':kind==='Musgato'?'#396e58':col);
        for(const side of [-1,1]){
          drawSprite(m.x+side*.19*scale,m.y+1.02*scale+bob,m.z,.13*scale,
            kind==='Luzerrante'?'#b49fe7':kind==='Saltim'?'#d6a56a':'#394f58');
          drawSprite(m.x+side*.13*scale,m.y+.92*scale+bob,m.z-.14,.09*scale,'#ffe174');
        }
        if(kind==='Luzerrante') for(const side of [-1,1])
          drawSprite(m.x+side*.39,m.y+.55+bob,m.z,.42,'#81dacb');
        if(kind==='Ovelha') {
          drawSprite(m.x,m.y+.70,m.z,.78*scale,'#eee9d9');
          drawSprite(m.x,m.y+.90,m.z-.33,.43*scale,'#867b73');
          drawSprite(m.x,m.y+1.08,m.z-.44,.09*scale,'#363b38');
        } else if (kind==='Porco') {
          drawSprite(m.x,m.y+.69,m.z-.22,.66*scale,'#e7a6ab');
          drawSprite(m.x,m.y+.67,m.z-.46,.32*scale,'#f1c1c0');
        } else if (kind==='Vaca') {
          drawSprite(m.x,m.y+.76,m.z,.83*scale,'#755a4a');
          drawSprite(m.x-.19,m.y+.97,m.z-.10,.31*scale,'#f4e2c3');
          drawSprite(m.x,m.y+1.07,m.z-.36,.38*scale,'#b8a08c');
        }
        if(kind==='Zumbi') {
          drawSprite(m.x,m.y+1.27+bob,m.z-.29,.36*scale,'#83a783');
          drawSprite(m.x-.13,m.y+1.39+bob,m.z-.36,.08,'#f3bb69');
          drawSprite(m.x+.13,m.y+1.39+bob,m.z-.36,.08,'#f3bb69');
        }
        if(boss) drawSprite(m.x,m.y+1.59,m.z,.34,'#b49fe7');
      }
      for (const p of g.fragments) drawSprite(p.x, p.y, p.z, 0.11, '#' + Voxel.blocks[p.b].hex);
      for (const d of g.drops) drawSprite(d.x, d.y + 0.25, d.z, 0.28, '#' + Voxel.blocks[d.b].hex);
      if (g.bag) drawSprite(g.bag.x, g.bag.y + 0.4, g.bag.z, 0.65, '#b58e5d');
    }
  }
  function create(c) {
    let gl = c.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: false });
    if (gl) {
      try {
        return new GLRender(c, gl);
      } catch (e) {
        console.warn(e);
        const n = c.cloneNode();
        c.replaceWith(n);
        c = n;
      }
    }
    c.style.imageRendering = 'pixelated';
    return new CPURender(c);
  }
  return { create, basis, camera };
})();
