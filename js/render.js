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
 if(m==5.||m==27.){if(f==2.||f==3.){float rings=max(abs(fract(uv.x)-.5),abs(fract(uv.y)-.5));pat+=.15*sin(rings*50.);col*=vec3(1.20,1.22,1.1);}else{pat+=.19*(rnd(vec2(px.x,floor(px.y/7.)))-.5);}}
 if(m==6.||m==18.){pat+=(large>.61?.10:-.045);col+=vec3(.008,.015,0.);}
 if(m==8.||m==12.||m==15.||m==49.||m==50.||m==51.||m==52.||m==53.||m==55.||m==57.||m==58.||m==59.||m==60.||m==61.||m==62.||m==63.||m==64.||m==68.||m==77.||m==78.||m==79.){if(fract(uv.y*3.)<.08||fract(uv.x+floor(uv.y*3.)*.37)<.035)col*=.6;if(m==12.&&f==2.&&min(fract(uv.x*3.),fract(uv.y*3.))<.12)col*=.59;if(m==15.&&f!=2.&&fract(w.y)>.46&&fract(w.y)<.61)col*=.5;}
 if(m==9.||m==10.||m==11.){col=color(3.);if(rnd(floor(uv*5.))>.67)col=m==9.?vec3(.23,.24,.23):(m==10.?vec3(.79,.46,.30):vec3(.76,.52,.90));}
 if(m==14.&&f==4.&&fract(w.x)>.18&&fract(w.x)<.82&&fract(w.y)>.25&&fract(w.y)<.6)col*=.32;
 if(m==20.||m==26.){if(fract(uv.y*2.)<.08||fract(uv.x+floor(uv.y*2.)*.5)<.05)col*=.65;}
 if(m==16.||m==56.){alpha=.28;if(min(fract(uv.x),fract(uv.y))<.045)alpha=.7;}
 if(m==7.){
   vec3 V=normalize(eye-w);
   float wave=sin(w.x*1.8+w.z*.7+time*1.35)+sin(w.z*2.7+time*1.1);
   vec3 N=normalize(vec3(.045*cos(w.x*1.8+time*1.35),1.,.055*cos(w.z*2.7+time*1.1)));
   float fres=pow(1.-clamp(dot(N,V),0.,1.),3.);
   float glint=pow(max(0.,dot(reflect(-normalize(vec3(.58,.62,-.54)),N),V)),38.);
   col=mix(vec3(.09,.47,.48),sky,.24+fres*.68)+vec3(1.,.82,.48)*glint*.8*light;
   col+=max(0.,wave-1.64)*vec3(.19,.28,.22);pat*=.13;alpha=.62+.31*fres;
 }
 if(m==80.)col=vec3(.38,.59,.25);
 if(m==81.)col=vec3(.98,.68,.22);
 if(m==82.)col=vec3(.75,.57,.88);
 if(m==31.){vec2 tile=abs(fract(uv)-.5);float ring=abs(tile.x+tile.y-.29);col=mix(color(31.),vec3(.84,.62,.29),1.-smoothstep(.022,.045,ring));}
 if(m==28.||m==29.||m==30.){
   vec2 t=abs(fract(uv)-.5);float diamond=t.x+t.y;
   vec3 gem=m==28.?vec3(.32,.67,.66):vec3(.27,.97,.82);
   col=mix(vec3(.22,.30,.31),gem,1.-smoothstep(.30,.34,diamond));
   if(abs(diamond-.42)<.028)col=vec3(.93,.72,.34);
   col+=gem*max(0.,.25-diamond)*2.;
 }
 if(m==34.)col=rnd(floor(uv*5.))>.62?vec3(.76,.57,.44):color(3.);
 if(m>=38.&&m<=40.&&f==2.){float row=step(.48,fract(w.x*4.));col=mix(color(38.),color(m)*1.17,row);}
 if(m==46.&&f==2.)col=fract(w.z)>.68?vec3(.91,.84,.65):vec3(.59,.28,.23);
 if(m==36.)col*=1.4;
 if(m==48.||m==66.||m==69.||m==70.||m==71.||m==72.||m==74.){
   if(fract(uv.y*3.)<.07 || fract(uv.x*2.+floor(uv.y*3.)*.5)<.045)col*=.7;
 }
 if(m==65.){if(fract(uv.y*3.)<.095||fract(uv.x*3.+floor(uv.y*3.)*.5)<.045)col*=.63;}
 if(m==75.)pat*=.38;
 if(m==73.){if(fract(uv.x*5.)<.05)col*=.7;pat*=.7;}
 if(m==67.){col=mix(col,vec3(1.,.82,.43),.36);pat*=.3;}
 if(m==77.){if(fract(w.y*3.)<.13)col*=.52;else if(rnd(floor(uv*7.))>.42)col=mix(col,vec3(.61,.42,.25),.5);}

 col+=pat;float shade=f==2.?1.05:(f==3.?.50:(f==0.||f==5.?.83:.68));vec3 lighting=mix(vec3(.28,.34,.55),vec3(1.03,1.00,.90),light)*shade*amb;
 float torch=0.;for(int i=0;i<8;i++){if(float(i)<numLamps)torch=max(torch,max(0.,1.-length(w-lamps[i])/7.));}
 lighting+=torch*vec3(.89,.61,.32);if(m==25.||m==13.||m==29.||m==30.||m==67.)lighting=max(lighting,vec3(1.06,.98,.76));
 col*=lighting;
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
 if(distance(d,-sun)<.039)c=vec3(.82,.87,.91);if(d.y>.07){vec2 stars=floor(d.xz*360./(d.y+.4));if(noise2(stars)>.998)c+=vec3((1.-light)*.7);}
 if(d.y>.055&&quality>0.){vec2 p=d.xz/(d.y+.025)*3.2+vec2(time*.008,0.);vec2 k=floor(p*vec2(1.5,3.))/vec2(1.5,3.);float n=sin(k.x*.46)+sin(k.y*.99)+sin(k.x*.81+k.y*.3);if(n>1.7)c=mix(c,mix(vec3(.14,.18,.29),vec3(.98,.85,.73),light),smoothstep(.05,.25,d.y)*.65);}
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
        scale = [0.7, 0.88, 1][settings.quality] * Math.min(devicePixelRatio || 1, 1.5);
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
        gl.uniform1f(p.u.quality, settings.motion ? settings.quality : 0);
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
      if (third) {
        const { x, y, z, yaw } = g.p,
          h = g.crouch ? 0.77 : 1,
          walk = g.keys.size && settings.motion ? Math.sin(g.elapsed * 12) * 0.09 : 0;
        const start = ent.length;
        box(ent, -0.25, y + 0.59 * h, -0.16, 0.5, 0.64 * h, 0.34, 18);
        box(ent, -0.19, y + 1.23 * h, -0.18, 0.38, 0.42 * h, 0.36, 8);
        box(ent, -0.22, y + 1.56 * h, -0.2, 0.44, 0.12 * h, 0.4, 12);
        box(ent, -0.34, y + 0.78 * h, -0.12 - walk, 0.12, 0.41 * h, 0.25, 17);
        box(ent, 0.22, y + 0.78 * h, -0.12 + walk, 0.12, 0.41 * h, 0.25, 17);
        box(ent, -0.21, y, -0.13 + walk, 0.18, 0.63 * h, 0.26, 27);
        box(ent, 0.03, y, -0.13 - walk, 0.18, 0.63 * h, 0.26, 27);
        box(ent, -0.19, y + 0.66 * h, 0.16, 0.38, 0.42 * h, 0.16, 12);
        for (let i = start; i < ent.length; i += 6) {
          const xx = ent[i],
            zz = ent[i + 2];
          ent[i] = x + xx * Math.cos(yaw) - zz * Math.sin(yaw);
          ent[i + 2] = z + xx * Math.sin(yaw) + zz * Math.cos(yaw);
        }
      }
      for (let mob of g.mobs) {
        const x = mob.x,
          y = mob.y,
          z = mob.z,
          a = Math.sin(g.elapsed * 7) * 0.08;
        if (mob.kind && mob.kind !== 'Raspejante') {
          const mat = {
            Saltim: 4,
            Musgato: 19,
            Luzerrante: 29,
            'Vigia de Cascalho': 3,
            'Guardião Prisma': 31,
          }[mob.kind];
          const scale =
            mob.kind === 'Guardião Prisma' ? 1.55 : mob.kind === 'Vigia de Cascalho' ? 1.15 : 0.72;
          const lift =
            mob.kind === 'Saltim'
              ? Math.abs(Math.sin(g.elapsed * 3)) * 0.16
              : mob.kind === 'Luzerrante'
                ? 0.45
                : 0;
          box(
            ent,
            x - 0.38 * scale,
            y + lift,
            z - 0.3 * scale,
            0.76 * scale,
            0.64 * scale,
            0.6 * scale,
            mat,
          );
          box(
            ent,
            x - 0.25 * scale,
            y + lift + 0.63 * scale,
            z - 0.29 * scale,
            0.5 * scale,
            0.37 * scale,
            0.5 * scale,
            mat,
          );
          for (const sign of [-1, 1])
            box(
              ent,
              x + sign * 0.17 * scale,
              y + lift + 0.94 * scale,
              z - 0.17 * scale,
              0.1 * scale,
              0.28 * scale,
              0.14 * scale,
              mob.kind === 'Guardião Prisma' ? 11 : mat,
            );
          continue;
        }
        box(ent, x - 0.41, y + 0.24, z - 0.36, 0.82, 0.5, 0.72, 18);
        box(ent, x - 0.3, y + 0.59, z - 0.28, 0.6, 0.46, 0.55, 11);
        box(ent, x - 0.27, y + 0.72, z - 0.3, 0.15, 0.13, 0.6, 13);
        box(ent, x + 0.12, y + 0.72, z - 0.3, 0.15, 0.13, 0.6, 13);
        for (let i of [-1, 1])
          for (let j of [-1, 1])
            box(
              ent,
              x + i * 0.27 - 0.1,
              y + Math.max(0, a * i * j),
              z + j * 0.23 - 0.1,
              0.19,
              0.34,
              0.19,
              12,
            );
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
            if (hit === 13 || hit === 25 || hit === 29 || hit === 30) lighting = 1.15;
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
        drawSprite(
          m.x,
          m.y + 0.45,
          m.z,
          m.kind === 'Guardião Prisma' ? 1.45 : 0.9,
          {
            Saltim: '#cfa968',
            Musgato: '#739358',
            Luzerrante: '#86f8d6',
            'Vigia de Cascalho': '#878987',
            'Guardião Prisma': '#539f9a',
          }[m.kind] || '#557969',
        );
        drawSprite(m.x, m.y + 0.85, m.z, 0.52, '#ba88c9');
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
