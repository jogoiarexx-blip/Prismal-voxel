'use strict';
const Icon = (() => {
  const shapes = {
    play: '3,2 13,8 3,14',
    pause: '2,2 6,2 6,14 2,14|10,2 14,2 14,14 10,14',
    world: '1,4 6,4 8,6 15,6 15,14 1,14',
    pin: '8,1 12,2 14,5 14,9 8,15 2,9 2,5 4,2|!6,5 10,5 10,9 6,9',
    gear: '6,0 10,0 10,2 12,3 14,2 16,5 14,7 14,9 16,11 14,14 12,13 10,14 10,16 6,16 6,14 4,13 2,14 0,11 2,9 2,7 0,5 2,2 4,3 6,2|!5,6 6,5 10,5 11,6 11,10 10,11 6,11 5,10',
    book: '0,3 5,3 8,5 11,3 16,3 16,13 11,13 8,15 5,13 0,13|!2,5 5,5 7,6 7,12 5,11 2,11|!9,6 11,5 14,5 14,11 11,11 9,12',
    mute: '0,6 3,6 7,2 7,14 3,10 0,10|9,5 11,5 12,7 14,5 16,6 14,8 16,10 14,11 12,9 10,11 9,10 11,8',
    sound:
      '0,6 3,6 7,2 7,14 3,10 0,10|9,5 11,6 12,8 11,10 9,11 10,8|12,2 14,3 16,6 16,10 14,13 12,14 14,10 14,6',
    full: '1,1 7,1 7,3 3,3 3,7 1,7|9,1 15,1 15,7 13,7 13,3 9,3|1,9 3,9 3,13 7,13 7,15 1,15|13,9 15,9 15,15 9,15 9,13 13,13',
    close: '2,3 4,1 8,6 12,1 14,3 10,8 14,13 12,15 8,10 4,15 2,13 6,8',
    heart: '1,3 3,1 6,1 8,4 10,1 13,1 15,3 15,7 8,14 1,7',
    food: '2,13 5,9 4,7 8,3 12,2 15,5 14,9 10,12 7,11 4,15',
    air: '8,1 13,8 14,11 12,14 8,15 4,14 2,11 3,8',
    cube: '1,4 8,0 15,4 15,12 8,16 1,12|!3,5 8,8 12,5 8,3|!3,7 7,9 7,13 3,11|!9,9 13,7 13,11 9,13',
    plus: '6,2 10,2 10,6 14,6 14,10 10,10 10,14 6,14 6,10 2,10 2,6 6,6',
  };
  const cache = {};
  function url(name) {
    if (cache[name]) return cache[name];
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const p = c.getContext('2d');
    p.scale(2, 2);
    for (let path of shapes[name].split('|')) {
      p.globalCompositeOperation = path[0] === '!' ? 'destination-out' : 'source-over';
      path = path.replace('!', '');
      p.beginPath();
      path.split(' ').forEach((s, i) => {
        const [x, y] = s.split(',').map(Number);
        if (i) p.lineTo(x, y);
        else p.moveTo(x, y);
      });
      p.closePath();
      p.fill();
    }
    return (cache[name] = c.toDataURL());
  }
  function markup(name) {
    return '<i aria-hidden="true" class="ico" style="--glyph:url(' + url(name) + ')"></i>';
  }
  function hydrate(root = document) {
    root.querySelectorAll('[data-ico]').forEach((el) => (el.outerHTML = markup(el.dataset.ico)));
  }
  return { markup, hydrate };
})();
