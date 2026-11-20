'use strict';
const PREFIX = 'prisma-pages:' + self.registration.scope + ':';
const CACHE = PREFIX + '0.4.1',
  FILES = [
    './',
    './index.html',
    './art/i1.png',
    './art/i10.png',
    './art/i11.png',
    './art/i12.png',
    './art/i13.png',
    './art/i14.png',
    './art/i15.png',
    './art/i16.png',
    './art/i17.png',
    './art/i18.png',
    './art/i19.png',
    './art/i2.png',
    './art/i20.png',
    './art/i21.png',
    './art/i22.png',
    './art/i23.png',
    './art/i24.png',
    './art/i25.png',
    './art/i26.png',
    './art/i27.png',
    './art/i3.png',
    './art/i4.png',
    './art/i5.png',
    './art/i6.png',
    './art/i7.png',
    './art/i8.png',
    './art/i9.png',
    './art/prisma.png',
    './art/prisma.ttf',
    './art/expedicao.webp',
    './art/i28.png',
    './art/i29.png',
    './art/i30.png',
    './art/i31.png',

    './art/i32.png',
    './art/i33.png',
    './art/i34.png',
    './art/i35.png',
    './art/i36.png',
    './art/i37.png',
    './art/i38.png',
    './art/i39.png',
    './art/i40.png',
    './art/i41.png',
    './art/i42.png',
    './art/i43.png',
    './art/i44.png',
    './art/i45.png',
    './art/i46.png',
    './art/i47.png',
    './js/game.js',
    './js/icons.js',
    './js/render.js',
    './js/store.js',
    './js/ui.js',
    './js/worker.js',
    './js/world.js',
    './style.css',
  ];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const c = await caches.open(CACHE);
      return (
        (await c.match(event.request)) ||
        (event.request.mode === 'navigate' ? await c.match('./index.html') : null) ||
        Response.error()
      );
    }),
  );
});
