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
        .map((k) => JSON.parse(localStorage.getItem(k)));
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
    return (await perform('getAll')).sort((a, b) => b.saved - a.saved);
  }
  const defaults = {
    quality: 1,
    fov: 75,
    sensitivity: 1,
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
  return { list, get: (id) => perform('get', id), put: (r) => perform('put', r), settings, prefs };
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
