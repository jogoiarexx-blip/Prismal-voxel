'use strict';
(() => {
  const $ = (s) => document.querySelector(s),
    $$ = (s) => Array.from(document.querySelectorAll(s)),
    home = $('#home'),
    game = $('#game'),
    overlay = $('#overlay'),
    dialog = $('#dialog');
  let settings = Saves.settings(),
    g = null,
    renderer = null,
    screen = 'home',
    worldList = [],
    guideTab = 0,
    origin = 'home',
    cfgBack = 'home',
    backPanel = 'home',
    bagSel = null,
    chestPos = null,
    debug = false,
    gesture = null,
    mouseActive = false,
    lastMouse = null,
    edgeX = 0,
    edgeY = 0,
    lockedBefore = false,
    skipWarp = false,
    lastFrame = 0,
    acc = 0,
    fps = 60,
    toastTimer = 0,
    loading = false,
    edition = 'survival';
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const btn = (id, txt, cls = 'flat') =>
    '<button class="' + cls + '" data-act="' + id + '">' + txt + '</button>';
  const icon = Icon.markup,
    name = (b) => Voxel.blocks[b]?.name || '',
    img = (b) => '<img alt="" src="' + (globalThis.PRISMA_ITEMS?.[b] || 'art/i' + b + '.png') + '">',
    mode = (m) => (m === 'creative' ? 'Criativo' : 'Sobrevivência');
  function toast(t) {
    let n = $('#toast');
    n.textContent = t;
    n.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => n.classList.remove('on'), 2500);
  }
  function savePrefs() {
    Saves.prefs(settings);
    soundButton();
  }
  function soundButton() {
    const b = $('#sound');
    b.innerHTML = icon(settings.sound ? 'sound' : 'mute');
    b.title = b.ariaLabel = settings.sound ? 'Desativar som' : 'Ativar som';
    b.setAttribute('aria-pressed', settings.sound);
  }
  function fullscreen() {
    const r = document.fullscreenElement
      ? document.exitFullscreen?.()
      : document.documentElement.requestFullscreen?.();
    if (r) r.catch(() => toast('Tela cheia indisponível nesta janela'));
    else toast('Tela cheia indisponível nesta janela');
  }
  Icon.hydrate();
  soundButton();
  $('#full').innerHTML = icon('full');
  $('#sound').onclick = () => {
    Sound.start();
    settings.sound = !settings.sound;
    savePrefs();
    Sound.play('ui', settings);
  };
  $('#full').onclick = fullscreen;
  $('#expCard').onclick = () => guide('home', 2);
  $('#expCompass').onclick = () => guide('play', 2);
  const motes = $('.motes');
  for (let i = 0; i < 15; i++) {
    let n = document.createElement('i');
    n.style.left = 23 + ((i * 29) % 75) + '%';
    n.style.top = 26 + ((i * 19) % 64) + '%';
    n.style.animationDelay = -(i * 0.75) + 's';
    motes.append(n);
  }
  async function worlds() {
    try {
      worldList = await Saves.list();
      const latest = worldList[0];
      $('#playTitle').textContent = latest ? 'Continuar' : 'Jogar';
      $('#playDetail').textContent = latest
        ? latest.name + ' · Dia ' + latest.day + ' · ' + mode(latest.mode)
        : 'Criar meu primeiro mundo';
      $('#quickNew').hidden = !latest;
      const seals = latest?.seals || [false, false, false];
      const next = Voxel.ruins.find((_, i) => !seals[i]);
      $('#expImage').innerHTML = img(next ? 28 : 30);
      $('#expTitle').textContent = next?.name || 'Farol Prisma';
      $('#expProgress').textContent = seals.filter(Boolean).length + ' de 3 selos';
      return true;
    } catch {
      toast('Não foi possível ler os mundos salvos');
      return false;
    }
  }
  worlds();
  function pauseSim() {
    if (g) {
      g.paused = true;
      g.keys.clear();
      g.resetMining();
      releaseGesture();
      mouseActive = false;
      resetMouse();
      acc = 0;
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }
  function panel(id, title, body, wide = false, closable = true) {
    pauseSim();
    screen = id;
    overlay.hidden = false;
    dialog.className = wide ? 'wide' : '';
    dialog.dataset.screen = id;
    dialog.innerHTML =
      '<small class="eyebrow">MUNDO PRISMA</small><div class="dialogTitle"><h2 id="panelTitle">' +
      title +
      '</h2>' +
      (closable
        ? '<button data-act="back" class="tool close" aria-label="Voltar" title="Voltar">' +
          icon('close') +
          '</button>'
        : '') +
      '</div>' +
      body;
    dialog.focus({ preventScroll: true });
  }
  function homeMenu() {
    screen = 'home';
    overlay.hidden = true;
    home.hidden = false;
    game.hidden = true;
    worlds();
    $('#play').focus({ preventScroll: true });
  }
  function mainPlay() {
    Sound.start();
    if (worldList.length) loadWorld(worldList[0].id);
    else newWorld('home');
  }
  $('#play').onclick = mainPlay;
  $('#quickNew').onclick = () => newWorld('home');
  $('#worlds').onclick = () => showWorlds();
  $('#options').onclick = () => options('home');
  $('#guide').onclick = () => guide('home');
  $('#pause').onclick = () => pauseMenu();
  function newWorld(back) {
    backPanel = back;
    edition = 'survival';
    panel(
      'new',
      'Novo mundo',
      '<form id="newForm"><label class="field">Nome do mundo<input id="worldName" maxlength="48" required value="Meu mundo" autocomplete="off"></label><label class="field">Semente <small>Use a mesma semente para reencontrar a paisagem.</small><input id="worldSeed" maxlength="80" placeholder="Aleatória" autocomplete="off"></label><strong>Modo de jogo</strong><div class="modegrid"><button type="button" data-mode="survival" class="on" aria-pressed="true"><b>Sobrevivência</b><small>Colete e fabrique.</small></button><button type="button" data-mode="creative" aria-pressed="false"><b>Criativo</b><small>Construa e voe livremente.</small></button></div><label class="field" id="difficultyField">Ritmo da partida<select id="difficulty"><option value="normal">Normal · ciclo de 24 minutos</option><option value="short">Ciclo rápido · 4 minutos</option><option value="peaceful">Pacífico · sem criaturas hostis</option></select></label><button type="submit" class="primary fullwidth">' +
        icon('play') +
        'Criar e jogar</button></form>',
    );
    $('#newForm').onsubmit = async (e) => {
      e.preventDefault();
      if (loading) return;
      const title = $('#worldName').value.trim() || 'Meu mundo',
        seed =
          $('#worldSeed').value.trim() || 'PR-' + Math.random().toString(36).slice(2, 9).toUpperCase();
      let rec = Game.fresh(title, seed, edition, $('#difficulty').value);
      await launch(rec, true);
    };
  }
  async function showWorlds() {
    await worlds();
    panel(
      'worlds',
      'Meus mundos',
      worldList.length
        ? '<div class="stack">' +
            worldList
              .map(
                (w) =>
                  '<div class="worldrow">' +
                  icon('world') +
                  '<div><b>' +
                  esc(w.name) +
                  '</b><small>' +
                  mode(w.mode) +
                  ' · Dia ' +
                  Number(w.day || 1) +
                  ' · ' +
                  new Date(w.saved).toLocaleDateString('pt-BR') +
                  '</small></div>' +
                  btn('load:' + esc(w.id), 'Abrir') +
                  '</div>',
              )
              .join('') +
            '</div><div class="btns">' +
            btn('newworld', icon('plus') + 'Novo mundo', 'primary') +
            '</div>'
        : '<p>Seu primeiro mundo começa aqui. Escolha um nome e um modo para explorar.</p><div class="btns">' +
            btn('newworld', icon('plus') + 'Novo mundo', 'primary') +
            '</div>',
    );
  }
  async function loadWorld(id) {
    if (loading) return;
    try {
      const rec = await Saves.get(id);
      if (!rec) {
        toast('Mundo indisponível');
        return showWorlds();
      }
      return launch(rec, false);
    } catch {
      toast('Não foi possível abrir este mundo');
    }
  }
  async function launch(rec, fresh) {
    if (loading) return;
    loading = true;
    Sound.start();
    Sound.play('ui', settings);
    panel(
      'load',
      'Preparando o mundo',
      '<p class="muted">Gerando os primeiros blocos de ' + esc(rec.name) + '…</p>',
      false,
      false,
    );
    await new Promise((r) => setTimeout(r, 30));
    try {
      if (!renderer) {
        renderer = View.create($('#view'));
        bindCanvas(renderer.canvas);
      }
      if (g) g.stop();
      home.hidden = true;
      game.hidden = false;
      g = new Game.Session(rec, renderer, settings, toast, signal);
      if (fresh) {
        const ok = await g.save();
        if (!ok) toast('Você pode jogar, mas o salvamento está indisponível.');
      }
      if (g.ready && screen === 'load') resume(false);
    } catch (e) {
      console.error(e);
      g?.stop();
      g = null;
      game.hidden = true;
      home.hidden = false;
      panel(
        'error',
        'Não foi possível abrir o mundo',
        '<p>O navegador não conseguiu iniciar o jogo. Você pode tentar novamente pelo menu principal.</p>' +
          btn('home', 'Menu principal', 'primary'),
      );
    } finally {
      loading = false;
    }
  }
  function resume(lock = true) {
    if (!g || !g.ready) return;
    screen = 'play';
    overlay.hidden = true;
    home.hidden = true;
    game.hidden = false;
    g.paused = false;
    lastFrame = performance.now();
    acc = 0;
    renderer.canvas.focus({ preventScroll: true });
    if (lock && !document.body.classList.contains('touchgame')) activateMouse();
    cameraHint();
    hud();
  }
  function cameraHint() {
    const hint = $('#cameraHint');
    hint.hidden =
      screen !== 'play' ||
      document.pointerLockElement === renderer?.canvas ||
      document.body.classList.contains('touchgame');
    hint.textContent = mouseActive
      ? 'Mova o mouse para olhar · nas bordas, a câmera continua girando'
      : 'Mova o mouse para olhar · clique no cenário para capturar o cursor';
  }
  function releaseGesture() {
    gesture = null;
  }
  function resetMouse() {
    lastMouse = null;
    edgeX = edgeY = 0;
  }
  function activateMouse() {
    mouseActive = true;
    const canvas = renderer.canvas;
    if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
      // A host can block capture. Free look keeps working with ordinary pointer movement.
      try {
        canvas.requestPointerLock()?.catch(() => {});
      } catch {}
    }
    cameraHint();
  }
  function changeView() {
    settings.thirdPerson = !settings.thirdPerson;
    savePrefs();
    hud();
    toast(settings.thirdPerson ? 'Câmera em terceira pessoa' : 'Câmera em primeira pessoa');
  }
  function pauseMenu() {
    if (!g) return;
    panel(
      'pause',
      'Jogo pausado',
      '<div class="pause-card"><div class="pause-location">' +
        icon('pin') +
        esc($('#biome').textContent) +
        '</div><h3>' +
        esc(g.meta.name) +
        '</h3><p>' +
        mode(g.meta.mode) +
        ' · Dia ' +
        g.day +
        '</p></div>' +
        '<div class="pause-grid"><div class="pause-actions">' +
        btn('resume', icon('play') + 'Voltar ao jogo', 'primary') +
        btn('opgame', icon('gear') + 'Opções') +
        btn('guidegame', icon('book') + 'Guia de campo') +
        btn('savequit', icon('world') + 'Salvar e voltar ao menu') +
        '</div>' +
        '<button class="pause-goal" data-act="expeditionpause">' +
        img(g.destination ? 28 : 30) +
        '<small>Expedição</small><strong>' +
        (g.destination ? Voxel.ruins[g.destination.id].name : 'Farol Prisma') +
        '</strong><span>' +
        g.sealCount +
        ' de 3 selos</span><span class="progress-line">' +
        [0, 1, 2].map((i) => '<i class="' + (g.seals[i] ? 'found' : '') + '"></i>').join('') +
        '</span><u>Abrir diário</u></button></div>',
      true,
    );
    g.save();
  }
  async function quit() {
    if (!g) return;
    const ok = await g.save();
    if (!ok) {
      toast('Falha ao salvar. A partida continua aberta.');
      return;
    }
    g.stop();
    g = null;
    homeMenu();
    toast('Mundo salvo');
  }
  function options(back) {
    cfgBack = back;
    panel(
      'options',
      'Opções',
      '<label class="field">Qualidade gráfica<select id="quality"><option value="0">Baixa · menor distância de visão</option><option value="1">Média · água e vegetação animadas</option><option value="2">Alta · maior distância de visão</option></select></label>' +
        slider('recuo', 'Distância da câmera externa', 2, 6, 0.1, settings.recuo || 3.7, ' m') +
        slider('fov', 'Campo de visão', 55, 100, 1, settings.fov, '°') +
        slider('sensitivity', 'Sensibilidade do mouse', 0.35, 2.5, 0.05, settings.sensitivity, '×') +
        '<label class="checkline"><input id="thirdPerson" type="checkbox"> Câmera em terceira pessoa (V)</label>' +
        slider('volume', 'Volume', 0, 100, 1, Math.round(settings.volume * 100), '%') +
        '<label class="checkline"><input id="noFlash" type="checkbox"> Desativar flash de dano</label><label class="checkline"><input id="audioCheck" type="checkbox"> Ativar som</label><label class="checkline"><input id="motion" type="checkbox"> Animar vegetação e atmosfera</label><label class="checkline"><input id="invert" type="checkbox"> Inverter eixo vertical do mouse</label><div class="btns">' +
        btn('back', 'Concluir', 'primary') +
        '</div>',
    );
    $('#quality').value = settings.quality;
    $('#quality').onchange = (e) => {
      settings.quality = +e.target.value;
      g?.stream(true);
      savePrefs();
    };
    for (let [id, prop] of [
      ['audioCheck', 'sound'],
      ['noFlash', 'noFlash'],
      ['motion', 'motion'],
      ['thirdPerson', 'thirdPerson'],
      ['invert', 'invert'],
    ]) {
      let input = $('#' + id);
      input.checked = settings[prop];
      input.onchange = () => {
        settings[prop] = input.checked;
        Sound.start();
        savePrefs();
        if (prop === 'sound') Sound.play('ui', settings);
      };
    }
    for (const id of ['fov', 'sensitivity', 'volume', 'recuo']) {
      let n = $('#' + id);
      n.oninput = () => {
        let v = Number(n.value);
        settings[id] = id === 'volume' ? v / 100 : v;
        n.previousElementSibling.querySelector('output').textContent = v + n.dataset.unit;
        savePrefs();
      };
    }
  }
  function slider(id, label, min, max, step, val, unit) {
    return (
      '<label class="field"><span class="row">' +
      label +
      '<output>' +
      val +
      unit +
      '</output></span><input id="' +
      id +
      '" type="range" min="' +
      min +
      '" max="' +
      max +
      '" step="' +
      step +
      '" value="' +
      val +
      '" data-unit="' +
      unit +
      '"></label>'
    );
  }
  const guides = [
    ['Controles', null],
    ['Sobrevivência', null],
    ['Expedição', null],
    ['Sobre o jogo', null],
  ];
  function guide(back, tab = 0) {
    origin = back;
    guideTab = tab;
    let body = '';
    if (tab === 0) {
      const rows = [
        ['Mover', 'W A S D'],
        ['Olhar', 'Mouse / setas'],
        ['Alternar câmera', 'V'],
        ['Diário da expedição', 'J'],
        ['Pular ou nadar', 'Espaço'],
        ['Correr / agachar', 'Ctrl / Shift'],
        ['Minerar ou atacar', 'Clique esquerdo'],
        ['Colocar, comer ou usar', 'Clique direito'],
        ['Selecionar espaço', '1–9 / rolagem'],
        ['Mochila e fabricação', 'E'],
        ['Guia / pausa', 'Tab / Esc'],
        ['Ativar voo no Criativo', 'F'],
        ['Informações de desempenho', 'F3'],
      ];
      body =
        rows
          .map(([a, b]) => '<div class="guideitem"><span>' + a + '</span><kbd>' + b + '</kbd></div>')
          .join('') +
        '<p class="smallnote">Mova o mouse para olhar. Clique no cenário para capturar o cursor e use Esc para liberá-lo. No celular, deslize o dedo sobre o cenário. As teclas Q e R também servem para minerar e usar.</p>';
    } else if (tab === 1) {
      body =
        '<div class="guidecontent"><h3>Cultivo e abrigo</h3><p>Quebre grama para obter sementes. Coloque um canteiro junto à água, selecione as sementes e use o canteiro. Colha o trigo dourado e asse pão no forno. Use uma cama para marcar o retorno.</p><h3>Antes da primeira noite</h3><p>Segure Espaço ou Nadar para subir e solte para afundar. Para sair da água, nade em direção a uma margem de até um bloco e segure Espaço ou Nadar. Segure o botão esquerdo em um tronco e se aproxime para recolher a madeira. Abra a mochila com E e transforme um tronco em quatro tábuas.</p><h3>Monte sua oficina</h3><p>Fabrique uma bancada com quatro tábuas e coloque-a no chão. Perto dela, combine três tábuas e duas hastes para produzir sua primeira picareta.</p><h3>Ilumine o abrigo</h3><p>Procure carvão na pedra ou queime um tronco no forno. Combine carvão e haste para fazer tochas. Os raspejantes recuam diante da luz.</p><h3>Recupere forças</h3><p>Quebre folhas para encontrar frutas. Selecione-as e use o botão direito para comer. Se cair, volte ao local para recuperar a mochila.</p></div>';
    } else if (tab === 2) {
      const expedition = g || worldList[0];
      const names = Voxel.ruins
        .map((ruin, i) => {
          const site = expedition?.sites?.[i];
          const line = site
            ? Math.round(Math.hypot(site.x - expedition.p.x, site.z - expedition.p.z)) +
              ' blocos de distância'
            : 'Selo de ' + ruin.seal;
          const status = expedition?.seals?.[i] ? 'Selo registrado' : line;
          return (
            '<li class="ruin-entry"><span class="rune rune-' +
            i +
            '" aria-hidden="true">◇</span><div><b>' +
            ruin.name +
            '</b><small>' +
            status +
            '</small></div></li>'
          );
        })
        .join('');
      body =
        '<div class="guidecontent"><h3>Ecos dos Arquitetos</h3><p>Siga a bússola até as três ruínas. Aproxime-se do núcleo turquesa e use o botão direito ou R para despertar seu selo.</p><ul class="ruin-list">' +
        names +
        '</ul><p>O primeiro selo libera a pedra rúnica. Com os três, use a bancada para combinar cristal, cobre e vidro em um Farol Prisma. Coloque-o para acender uma aurora sobre sua base.</p></div>';
    } else
      body =
        '<p>Mundo Prisma é um sandbox voxel de exploração, sobrevivência e construção. Explore os Campos de Âmbar, a Floresta de Névoa e as Dunas de Vidro. Nas dunas, procure os obeliscos com cristais no topo.</p><p class="muted">Versão jogável 0.4.1 · Um jogador<br>Arte, sprites, tipografia de título e efeitos sonoros criados para Mundo Prisma. Seu progresso é salvo neste navegador.</p>';
    panel(
      'guide',
      'Guia de campo',
      '<div class="tabbar">' +
        guides.map((v, i) => btn('guide:' + i, v[0], 'tab' + (tab === i ? ' on' : ''))).join('') +
        '</div>' +
        body,
    );
  }
  function back() {
    switch (screen) {
      case 'load':
        return;
      case 'options':
        return cfgBack === 'pause' ? pauseMenu() : homeMenu();
      case 'guide':
        return origin === 'pause' ? pauseMenu() : origin === 'play' ? resume() : homeMenu();
      case 'bag':
      case 'chest':
      case 'pause':
        return resume();
      case 'new':
        return backPanel === 'worlds' ? showWorlds() : homeMenu();
      default:
        return homeMenu();
    }
  }
  function slotButton(t, i, prefix, active = false, hot = false) {
    const title = t
      ? name(t.b) + (Voxel.durability[t.b] ? ' · ' + t.dur + '/' + Voxel.durability[t.b] + ' usos' : '')
      : 'Espaço vazio';
    return (
      '<button class="slot' +
      (active ? ' active' : '') +
      '" data-act="' +
      prefix +
      ':' +
      i +
      '" aria-label="' +
      esc(title) +
      '" title="' +
      esc(title) +
      '">' +
      (hot ? '<em>' + (i + 1) + '</em>' : '') +
      (t
        ? img(t.b) +
          '<b>' +
          (Voxel.durability[t.b] ? '' : g.creative && prefix === 'hot' ? '∞' : t.n) +
          '</b>'
        : '') +
      '</button>'
    );
  }
  function inventory(reset = true, station = null) {
    if (reset) bagSel = null;
    const sel = bagSel?.type === 'inv' ? bagSel.i : -1;
    const inv = g.inv;
    let grid = (start, end) =>
      '<div class="slots">' +
      inv
        .slice(start, end)
        .map((t, n) => slotButton(t, n + start, 'inv', sel === n + start, n + start < 9))
        .join('') +
      '</div>';
    let right;
    if (g.creative) {
      right =
        '<div class="sectionhead">Catálogo de blocos</div><div class="catalog">' +
        Voxel.blocks
          .filter((t) => t.id > 0 && ![7, 28, 29, 39].includes(t.id))
          .map(
            (b) =>
              '<button class="slot" data-act="catalog:' +
              b.id +
              '" title="' +
              b.name +
              '" aria-label="' +
              b.name +
              '">' +
              img(b.id) +
              '</button>',
          )
          .join('') +
        '</div><p class="smallnote">Escolha um material para o espaço ativo da barra.</p>';
    } else {
      right =
        '<div class="sectionhead">Receitas</div><div class="recipes">' +
        Voxel.recipes
          .map((r, i) => {
            const ava = g.canCraft(r);
            const station = r[3] && !g.nearStation(r[3]) ? ' · Requer ' + name(r[3]) : '';
            return (
              '<button class="recipe" data-act="craft:' +
              i +
              '" ' +
              (ava ? '' : 'disabled') +
              '>' +
              img(r[0]) +
              '<span><b>' +
              name(r[0]) +
              ' ×' +
              r[1] +
              '</b><small>' +
              r[2].map(([b, n]) => n + ' ' + name(b).toLowerCase()).join(' + ') +
              station +
              (g.sealCount < (r[4] || 0) ? ' · Requer ' + r[4] + ' selo(s)' : '') +
              '</small></span><strong>+</strong></button>'
            );
          })
          .join('') +
        '</div>';
    }
    panel(
      'bag',
      station ? name(station) : 'Mochila',
      '<div class="invgrid"><div><div class="sectionhead">Barra rápida</div>' +
        grid(0, 9) +
        '<div class="sectionhead">Mochila</div>' +
        grid(9, 36) +
        '<p class="smallnote">' +
        (bagSel
          ? 'Selecione o destino de ' + esc(name(inv[bagSel.i]?.b)) + '.'
          : 'Clique no item e no destino para mover. Clique direito divide a pilha em um espaço vazio.') +
        '</p></div><div>' +
        right +
        '</div></div>',
      true,
    );
    bindSlots();
  }
  function chest(hit, reset = true) {
    if (reset) {
      chestPos = hit.p.join(',');
      bagSel = null;
    }
    const chest = (g.chests[chestPos] ||= Array(18).fill(null));
    const grid = (arr, type) =>
      '<div class="slots">' +
      arr
        .map((t, i) =>
          slotButton(t, i, type, bagSel?.type === type && bagSel.i === i, type === 'inv' && i < 9),
        )
        .join('') +
      '</div>';
    panel(
      'chest',
      'Baú',
      '<div class="sectionhead">Armazenamento</div>' +
        grid(chest, 'chest') +
        '<div class="sectionhead">Sua mochila</div>' +
        grid(g.inv, 'inv') +
        '<p class="smallnote">Clique no item e depois no destino. Shift + clique transfere a pilha.</p>',
      true,
    );
    bindSlots();
  }
  function transfer(type, i, quick = false) {
    let arr = (t) => (t === 'inv' ? g.inv : g.chests[chestPos]),
      a = arr(type);
    if (quick && screen === 'chest' && a[i]) {
      let t = a[i];
      let left = Game.fill(arr(type === 'inv' ? 'chest' : 'inv'), t.b, t.n, t.dur);
      a[i] = left ? { ...t, n: left } : null;
      bagSel = null;
    } else if (!bagSel) {
      if (!a[i]) return;
      bagSel = { type, i };
    } else {
      const from = arr(bagSel.type),
        j = bagSel.i,
        t = from[j];
      if (t && (a !== from || i !== j)) {
        if (a[i]?.b === t.b && !Voxel.durability[t.b]) {
          const move = Math.min(64 - a[i].n, t.n);
          a[i].n += move;
          t.n -= move;
          if (!t.n) from[j] = null;
        } else [a[i], from[j]] = [t, a[i]];
      }
      bagSel = null;
    }
    g.changed();
    screen === 'chest' ? chest(null, false) : inventory(false);
  }
  function bindSlots() {
    dialog.querySelectorAll('.slot[data-act^="inv:"],.slot[data-act^="chest:"]').forEach((el) => {
      el.oncontextmenu = (e) => {
        e.preventDefault();
        const [type, index] = el.dataset.act.split(':');
        const slots = type === 'inv' ? g.inv : g.chests[chestPos],
          stack = slots[+index],
          dest = slots.findIndex((v) => !v);
        if (!stack || stack.n < 2 || dest < 0) return;
        const half = Math.floor(stack.n / 2);
        slots[dest] = { ...stack, n: half };
        stack.n -= half;
        bagSel = null;
        g.changed();
        screen === 'chest' ? chest(null, false) : inventory(false);
      };
      el.draggable = true;
      el.ondragstart = (e) => {
        const [type, i] = el.dataset.act.split(':');
        bagSel = { type, i: +i };
        e.dataTransfer.setData('text/plain', 'slot');
      };
      el.ondragover = (e) => e.preventDefault();
      el.ondrop = (e) => {
        e.preventDefault();
        const [type, i] = el.dataset.act.split(':');
        if (bagSel) transfer(type, +i);
      };
    });
  }
  function signal(s, v) {
    if (s === 'ready') {
      if (screen === 'load' && g) resume(false);
    } else if (s === 'hud') {
      if (screen === 'play') hud();
    } else if (s === 'station') {
      v.b === 15 ? chest(v) : inventory(true, v.b);
    } else if (s === 'hurt') {
      if (settings.noFlash) return;
      $('#hurt').style.opacity = 0.7;
      setTimeout(() => ($('#hurt').style.opacity = 0), 190);
    }
  }
  function hud() {
    if (!g) return;
    game.classList.toggle('raining', Boolean(g.exposed && settings.motion));
    $('#biome').textContent =
      g.region || (g.dunes ? 'Dunas de Vidro' : g.misty ? 'Floresta de Névoa' : 'Campos de Âmbar');
    let minutes = Math.floor(g.time * 1440);
    $('#clock').textContent =
      'DIA ' +
      g.day +
      ' · ' +
      String(Math.floor(minutes / 60)).padStart(2, '0') +
      'h' +
      String(minutes % 60).padStart(2, '0');
    const stat = (c, ic, n) => '<span class="stat ' + c + '">' + icon(ic) + Math.ceil(n) + '</span>';
    $('#vitals').innerHTML = g.creative
      ? ''
      : stat('health', 'heart', g.p.life) +
        stat('food', 'food', g.p.food) +
        (g.submerged || g.p.air < 95 ? stat('air', 'air', g.p.air) : '');
    const jumpButton = $('#touch [data-touch="jump"]');
    jumpButton.textContent = g.swimming ? 'Nadar' : 'Pular';
    const active = g.inv[g.selected];
    const held = $('#held');
    held.hidden = settings.thirdPerson || !active;
    if (held.dataset.item !== String(active?.b)) {
      held.dataset.item = String(active?.b);
      held.innerHTML = active ? img(active.b) : '';
    }
    held.classList.toggle('swing', Boolean(g.holding && settings.motion));
    $('#itemname').textContent = active
      ? name(active.b) +
        (Voxel.durability[active.b] ? ' · ' + active.dur + '/' + Voxel.durability[active.b] : '')
      : 'Mão livre';
    let html = g.inv
      .slice(0, 9)
      .map((t, i) => slotButton(t, i, 'hot', i === g.selected, true))
      .join('');
    if ($('#hotbar')._old !== html) {
      $('#hotbar').innerHTML = html;
      $('#hotbar')._old = html;
    }
    $('#target').textContent = g.aimMob()
      ? g.aimMob().kind || 'Raspejante'
      : g.hit?.b === 28
        ? 'R · Despertar núcleo'
        : g.hit
          ? name(g.hit.b)
          : '';
    const site = g.destination;
    const compass = $('#expCompass');
    if (site) {
      const dx = site.x + 0.5 - g.p.x,
        dz = site.z + 0.5 - g.p.z;
      const rel = Math.atan2(dx, -dz) - g.p.yaw;
      compass.querySelector('i').style.transform = 'rotate(' + rel + 'rad)';
      compass.querySelector('span').textContent =
        Voxel.ruins[site.id].name + ' · ' + Math.round(Math.hypot(dx, dz)) + ' m';
    } else {
      compass.querySelector('i').style.transform = 'rotate(0)';
      compass.querySelector('span').textContent = g.goals.place30
        ? 'Expedição concluída'
        : '3 selos · Fabrique o farol';
    }
    $('#breakbar').hidden = !g.holding || !g.progress;
    $('#breakbar span').style.width = g.progress * 100 + '%';
    let task = g.creative
      ? 'E · Escolha blocos no catálogo. F · Voo ' + (g.fly ? 'ligado' : 'desligado')
      : !g.goals.wood
        ? 'Recolha seu primeiro tronco'
        : !g.goals.craft8
          ? 'Abra a mochila e fabrique tábuas'
          : !g.goals.place12
            ? 'Fabrique e posicione uma bancada'
            : !g.goals.craft22
              ? 'Fabrique uma picareta na bancada'
              : !g.goals.place25
                ? 'Ilumine seu abrigo com uma tocha'
                : 'Explore a Floresta de Névoa';
    if (g.swimming)
      task = document.body.classList.contains('touchgame')
        ? 'Segure Nadar e avance em direção à margem'
        : 'Segure Espaço e nade em direção à margem';
    if (g.bag && !g.swimming)
      task =
        'Recupere a mochila em ' +
        Math.floor(g.bag.x) +
        ', ' +
        Math.floor(g.bag.y) +
        ', ' +
        Math.floor(g.bag.z);
    $('#quest').innerHTML = '<small>' + (g.creative ? 'CRIATIVO' : 'GUIA DE CAMPO') + '</small>' + task;
    $('#debug').hidden = !debug;
    if (debug)
      $('#debug').textContent =
        'PRISMA 0.4.1 · ' +
        renderer.type +
        '\n' +
        Math.round(fps) +
        ' FPS · ' +
        renderer.calls +
        ' chamadas · ' +
        renderer.tris +
        ' triângulos\nSeed ' +
        g.meta.seed +
        ' · ' +
        $('#biome').textContent +
        '\nXYZ ' +
        [g.p.x, g.p.y, g.p.z].map((n) => n.toFixed(1)).join(' / ') +
        '\nChunk ' +
        g.cx +
        ', ' +
        g.cz +
        ' · ' +
        g.chunks.size +
        ' ativos · fila ' +
        g.pending.size +
        '\nSalvamento · ' +
        g.saveState;
  }
  document.addEventListener('click', (e) => {
    const node = e.target.closest('[data-act],[data-mode]');
    if (!node) return;
    if (node.dataset.mode) {
      edition = node.dataset.mode;
      $$('[data-mode]').forEach((b) => {
        const on = edition === b.dataset.mode;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
      });
      $('#difficultyField').hidden = edition === 'creative';
      return;
    }
    const [a, i] = node.dataset.act.split(':');
    Sound.start();
    if (!['inv', 'chest', 'hot', 'craft'].includes(a)) Sound.play('ui', settings);
    switch (a) {
      case 'back':
        back();
        break;
      case 'home':
        homeMenu();
        break;
      case 'load':
        loadWorld(i);
        break;
      case 'newworld':
        newWorld('worlds');
        break;
      case 'resume':
        resume();
        break;
      case 'savequit':
        quit();
        break;
      case 'opgame':
        options('pause');
        break;
      case 'expeditionpause':
        guide('pause', 2);
        break;
      case 'guidegame':
        guide('pause');
        break;
      case 'guide':
        guide(origin, +i);
        break;
      case 'hot':
        g.selected = +i;
        hud();
        break;
      case 'inv':
      case 'chest':
        transfer(a, +i, e.shiftKey);
        break;
      case 'craft':
        if (g.craft(+i)) inventory(true);
        break;
      case 'catalog':
        g.inv[g.selected] = Game.slot(+i, +i === 22 ? 1 : 64);
        g.changed();
        toast(name(+i) + ' na barra rápida');
        inventory();
        break;
    }
  });
  function bindCanvas(canvas) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (screen !== 'play') return;
      Sound.start();
      if (e.pointerType !== 'touch') {
        if (e.button !== 0 && e.button !== 2) return;
        document.body.classList.remove('touchgame');
        canvas.focus({ preventScroll: true });
        if (!mouseActive && e.button === 0) {
          activateMouse();
          return;
        }
        if (e.button === 0) g.holding = true;
        else g.use();
        return;
      }
      if (gesture) return;
      document.body.classList.add('touchgame');
      resetMouse();
      mouseActive = false;
      gesture = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      cameraHint();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (screen !== 'play' || document.pointerLockElement === canvas) return;
      if (e.pointerType === 'touch') {
        if (gesture?.id !== e.pointerId) return;
        g.look(e.clientX - gesture.x, e.clientY - gesture.y);
        gesture.x = e.clientX;
        gesture.y = e.clientY;
        return;
      }
      if (gesture) return;
      if (document.body.classList.contains('touchgame')) {
        document.body.classList.remove('touchgame');
        cameraHint();
      }
      if (lastMouse) g.look(e.clientX - lastMouse.x, e.clientY - lastMouse.y);
      lastMouse = { x: e.clientX, y: e.clientY };
      if (mouseActive) {
        const rect = canvas.getBoundingClientRect();
        const nearEdge = (point, start, end) =>
          Math.max(0, 1 - (end - point) / 18) - Math.max(0, 1 - (point - start) / 18);
        edgeX = nearEdge(e.clientX, rect.left, rect.right);
        edgeY = nearEdge(e.clientY, rect.top, rect.bottom);
      }
    });
    canvas.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') lastMouse = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointerleave', resetMouse);
    canvas.addEventListener('pointercancel', (e) => {
      if (e.pointerId === gesture?.id) releaseGesture();
    });
    canvas.addEventListener('lostpointercapture', (e) => {
      if (e.pointerId === gesture?.id) releaseGesture();
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (screen === 'play') {
          e.preventDefault();
          g.selected = (g.selected + (Math.sign(e.deltaY) || 1) + 9) % 9;
          hud();
        }
      },
      { passive: false },
    );
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (g) {
        pauseMenu();
        g.save().then((ok) =>
          toast(
            ok
              ? 'Renderização interrompida. Mundo salvo. Reabra a página.'
              : 'Renderização interrompida. Verifique o salvamento.',
          ),
        );
      }
    });
  }
  document.addEventListener('mousemove', (e) => {
    if (!g || screen !== 'play' || document.pointerLockElement !== renderer.canvas) return;
    if (skipWarp) {
      skipWarp = false;
      if (Math.abs(e.movementX) > 180 || Math.abs(e.movementY) > 180) return;
    }
    g.look(e.movementX, e.movementY);
  });
  window.addEventListener('pointerup', (e) => {
    if (gesture?.id === e.pointerId) releaseGesture();
    if (g && e.pointerType !== 'touch' && e.button === 0) g.resetMining();
  });
  document.addEventListener('pointerlockchange', () => {
    const locked = !!renderer && document.pointerLockElement === renderer.canvas;
    if (locked && screen !== 'play') {
      document.exitPointerLock();
      return;
    }
    resetMouse();
    if (locked) {
      mouseActive = true;
      releaseGesture();
      skipWarp = true;
    } else if (lockedBefore && screen === 'play' && !g.paused) pauseMenu();
    lockedBefore = locked;
    cameraHint();
  });
  document.addEventListener('keydown', (e) => {
    if (screen === 'home') {
      if (
        e.code === 'Enter' &&
        (!document.activeElement || [document.body, $('#play')].includes(document.activeElement))
      ) {
        e.preventDefault();
        mainPlay();
      }
      return;
    }
    if (screen !== 'play') {
      if (
        e.code === 'Escape' ||
        (e.code === 'KeyE' && ['bag', 'chest'].includes(screen)) ||
        (e.code === 'Tab' && screen === 'guide' && origin === 'play')
      ) {
        e.preventDefault();
        back();
      } else if (e.code === 'Tab' && !overlay.hidden) {
        const focusables = dialog.querySelectorAll('button:not([disabled]),input,select,[tabindex="0"]');
        if (
          focusables.length &&
          ((e.shiftKey && document.activeElement === focusables[0]) ||
            (!e.shiftKey && document.activeElement === focusables[focusables.length - 1]))
        ) {
          e.preventDefault();
          focusables[e.shiftKey ? focusables.length - 1 : 0].focus();
        }
      }
      return;
    }
    if (
      [
        'Tab',
        'Escape',
        'Space',
        'ControlLeft',
        'ControlRight',
        'F3',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.code) ||
      e.ctrlKey
    )
      e.preventDefault();
    if (!g) return;
    g.keys.add(e.code);
    if (e.repeat) return;
    switch (e.code) {
      case 'Escape':
        pauseMenu();
        break;
      case 'KeyE':
        inventory();
        break;
      case 'Tab':
        guide('play');
        break;
      case 'KeyQ':
        g.holding = true;
        break;
      case 'KeyR':
        g.use();
        break;
      case 'KeyF':
        if (g.creative) {
          g.fly = !g.fly;
          g.vy = 0;
          toast('Voo ' + (g.fly ? 'ativado' : 'desativado'));
        }
        break;
      case 'KeyV':
        changeView();
        break;
      case 'KeyJ':
        guide('play', 2);
        break;
      case 'F3':
        debug = !debug;
        hud();
        break;
      default:
        if (/^Digit[1-9]$/.test(e.code)) {
          g.selected = Number(e.code.slice(-1)) - 1;
          hud();
        }
    }
  });
  document.addEventListener('keyup', (e) => {
    if (g) {
      g.keys.delete(e.code);
      if (e.code === 'KeyQ') g.resetMining();
    }
  });
  $$('#touch button').forEach((b) => {
    const code = b.dataset.touch;
    const release = () => {
      if (!g) return;
      g.keys.delete(code === 'jump' ? 'Space' : code);
      if (code === 'mine') g.resetMining();
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      if (!g || g.paused) return;
      if (code === 'camera') changeView();
      else if (code === 'journal') guide('play', 2);
      else if (code === 'mine') g.holding = true;
      else if (code === 'use') g.use();
      else if (code === 'bag') inventory();
      else g.keys.add(code === 'jump' ? 'Space' : code);
    });
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
  });
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touchgame');
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && g && screen === 'play') pauseMenu();
  });
  window.addEventListener('blur', () => {
    if (g && screen === 'play') pauseMenu();
  });
  window.addEventListener('pagehide', () => {
    if (g) g.save();
  });
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - (lastFrame || now)) / 1000);
    lastFrame = now;
    if (!g || !g.ready || g.paused) return;
    if (mouseActive && (edgeX || edgeY) && !document.pointerLockElement)
      g.look(edgeX * 820 * dt, edgeY * 590 * dt);
    fps = fps * 0.94 + (1 / Math.max(0.001, dt)) * 0.06;
    acc += dt;
    while (acc >= 1 / 60) {
      g.tick(1 / 60);
      acc -= 1 / 60;
    }
    renderer.draw(g, settings, Math.min(1, acc * 60));
  }
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol !== 'file:')
    navigator.serviceWorker.register('./offline.js').catch(() => {});
})();
