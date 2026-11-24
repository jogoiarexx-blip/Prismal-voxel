'use strict';
const Saves = (() => {
  const prefix = 'mundo-prisma:v1:',
    localKey = prefix + 'prefs';
  let database;
  function open() {
    if (!database) {
      database = new Promise((resolve) => {
        try {
          const r = indexedDB.open('MundoPrisma', 1);
          r.onupgradeneeded = () => {
            if (!r.result.objectStoreNames.contains('worlds'))
              r.result.createObjectStore('worlds', { keyPath: 'id' });
          };
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => resolve(null);
          r.onblocked = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return database;
  }
  async function perform(method, arg) {
    let db = await open();
    if (!db) {
      if (method === 'put') {
        localStorage.setItem(prefix + 'world:' + arg.id, JSON.stringify(arg));
        return;
      }
      if (method === 'get') return JSON.parse(localStorage.getItem(prefix + 'world:' + arg) || 'null');
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix + 'world:'))
        .flatMap((k) => {
          try { const rec = JSON.parse(localStorage.getItem(k)); return rec && typeof rec === 'object' ? [rec] : []; }
          catch { return []; } // One damaged local backup must not hide all other worlds.
        });
    }
    return new Promise((yes, no) => {
      const tx = db.transaction('worlds', method === 'put' ? 'readwrite' : 'readonly'),
        r = tx.objectStore('worlds')[method](...(arg === undefined ? [] : [arg]));
      tx.oncomplete = () => yes(r.result);
      tx.onerror = () => no(tx.error || r.error);
      tx.onabort = () => no(tx.error || Error('Gravação interrompida'));
    });
  }
  async function list() {
    return (await perform('getAll')).filter((w) => w && typeof w === 'object')
      .sort((a, b) => (b.saved || 0) - (a.saved || 0));
  }
  const defaults = {
    quality: 1,
    fov: 75,
    sensitivity: 1,
    touchSensitivity: 1.15,
    touchSize: 1,
    hudScale: 1,
    highContrast: false,
    leftHanded: false,
    autoJump: true,
    haptics: true,
    volume: 0.45,
    sound: true,
    motion: true,
    invert: false,
    thirdPerson: false,
  };
  function settings() {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(localKey) || '{}') };
    } catch {
      return { ...defaults };
    }
  }
  function prefs(v) {
    try {
      localStorage.setItem(localKey, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  }
  const emergencyPrefix = prefix + 'recovery:';
  const maxRecoveryBytes = 1_800_000; // bounded sync write; leave room for normal browser storage
  function validWorld(r) {
    return !!r && typeof r === 'object' && r.schema === 1 &&
      [1,2,3,4].includes(r.generator) && typeof r.id === 'string' && r.id.length > 0 &&
      (typeof r.seed === 'string' || (typeof r.seed === 'number' && Number.isFinite(r.seed))) && Array.isArray(r.inv) && r.inv.length === 36 &&
      !!r.edits && typeof r.edits === 'object' && !Array.isArray(r.edits) &&
      !!r.p && [r.p.x,r.p.y,r.p.z].every(Number.isFinite) &&
      Number.isFinite(r.saved);
  }
  function recovery(saved) {
    if (!validWorld(saved)) return null;
    try {
      const raw = localStorage.getItem(emergencyPrefix + saved.id);
      if (!raw || raw.length > maxRecoveryBytes) return null;
      const candidate = JSON.parse(raw);
      const r = candidate?.world;
      if (!validWorld(r) || r.id !== saved.id || r.seed !== saved.seed ||
          r.generator !== saved.generator || r.schema !== saved.schema ||
          !Number.isFinite(candidate.at) || Math.abs(candidate.at-r.saved)>15000 ||
          candidate.at <= saved.saved + 1500) return null;
      return r;
    } catch { return null; }
  }
  function emergency(r) {
    if (!validWorld(r)) return false;
    try {
      const record = JSON.stringify({at:r.saved, world:r});
      if (record.length > maxRecoveryBytes) return false;
      const k = emergencyPrefix + r.id;
      // Never let an older tab replace a newer recovery checkpoint.
      const prior = localStorage.getItem(k);
      if (prior && prior.length < maxRecoveryBytes) {
        try { if (JSON.parse(prior).at > r.saved) return true; } catch {}
      }
      localStorage.setItem(k, record);
      return true;
    } catch { return false; } // storage quota or private mode
  }
  function clearEmergency(id, savedAt = Infinity) {
    try {
      const k = emergencyPrefix + id;
      const raw = localStorage.getItem(k);
      if (raw && (JSON.parse(raw).at || 0) <= savedAt) localStorage.removeItem(k);
    } catch {} // a corrupt entry is harmless: recovery() will ignore it
  }
  async function put(r) {
    await perform('put',r);
    clearEmergency(r.id, r.saved);
  }
  const localGuests = new Map();
  function guestProfile(worldId) {
    const key=prefix+'guest:'+String(worldId).slice(0,90);
    if(localGuests.has(key))return localGuests.get(key);
    try {const raw=JSON.parse(localStorage.getItem(key)||'null');
      if(raw && /^[a-zA-Z0-9-]{12,80}$/.test(raw.id)){localGuests.set(key,raw);return raw;}
    } catch {}
    const data={id:crypto.randomUUID?.() || 'guest-'+Date.now().toString(36)+Math.random().toString(36).slice(2),rev:0,tx:0};
    localGuests.set(key,data);
    try {localStorage.setItem(key,JSON.stringify(data));}catch{}
    return data;
  }
  function saveGuestProfile(worldId,data) {
    if(!worldId||!data||typeof data.id!=='string')return false;
    const key=prefix+'guest:'+String(worldId).slice(0,90);
    localGuests.set(key,data);
    try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}
  }
  return { list, get: (id) => perform('get', id), put, emergency, recovery, clearEmergency, settings, prefs, guestProfile, saveGuestProfile };
})();
const Sound = (() => {
  let ctx,
    last = 0;
  function start() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch {}
  }
  function play(kind, settings) {
    if (!settings.sound || !ctx || !settings.volume) return;
    const now = ctx.currentTime;
    if (kind === 'step' && now - last < 0.24) return;
    if (kind === 'step') last = now;
    const specs = {
      ui: [410, 610, 0.075, 'sine'],
      mine: [125, 48, 0.12, 'triangle'],
      place: [200, 67, 0.08, 'triangle'],
      pickup: [540, 850, 0.12, 'sine'],
      craft: [390, 780, 0.22, 'sine'],
      discovery: [330, 990, 0.65, 'sine'],
      swim: [190, 80, 0.13, 'sine'],
      step: [71, 42, 0.045, 'triangle'],
      hurt: [210, 62, 0.18, 'sawtooth'],
      enemy: [98, 57, 0.31, 'triangle'],
      eat: [350, 170, 0.12, 'triangle'],
    };
    const [a, b, len, type] = specs[kind] || specs.ui;
    const osc = ctx.createOscillator(),
      amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(a, now);
    osc.frequency.exponentialRampToValueAtTime(b, now + len);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(
      Math.max(0.001, settings.volume * (kind === 'step' ? 0.05 : 0.14)),
      now + 0.01,
    );
    amp.gain.exponentialRampToValueAtTime(0.0001, now + len);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + len + 0.015);
  }
  return { start, play };
})();
