'use strict';
(() => {
  const $ = (s) => document.querySelector(s),
    $$ = (s) => Array.from(document.querySelectorAll(s)),
    home = $('#home'),
    game = $('#game'),
    overlay = $('#overlay'),
    dialog = $('#dialog');
  const heldView = new PrismaHeld.View($('#held'), Voxel);
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
    bagStation = 0,
    bagRecipeTab = 'all',
    chestPos = null,
    chestLoaded = false, chestPending = false, chestRevision = -1, chestTx = 0,
    remoteChestInventory = null,
    debug = false,
    gesture = null,
    joystickPointer = null,
    lastForwardTap = 0,
    hotbarSwipe = null,
    miningPointer = null,
    buildingPointer = null,
    buildRepeatAt = 0,
    buildCategory = 0,
    lookHoldTimer = null,
    mouseActive = false,
    lastMouse = null,
    edgeX = 0,
    edgeY = 0,
    lockedBefore = false,
    skipWarp = false,
    lastFrame = 0,
    acc = 0,
    fps = 60,
    perfFrames = new PrismaPerf.FrameHistory(),
    toastTimer = 0,
    loading = false,
    edition = 'survival',
    mp = null, mpRole = null, mpRecord = null, mpFresh = false,
    mpStartSent = false, mpRemote = null, mpMessages = [], mpLastPose = 0,
    mpLoading = false, mpGuest = false, mpWorldReady = false,
    mpEditBuffer = [], mpGuestEdits = [], mpLastHud = 0, mpLastSeq = -1, mpPoseSeq = 0,
    mpLastEntity = 0, mpEntitySeq = 0, mpLastRemoteHit = 0, mpLootSends = new Set(),
    mpHostWorldId = null, mpGuestProfile = null, mpGuestRevision = 0, mpGuestSeq = 0, mpLastGuestSync = 0,
    mpHostGuestId = null, mpChestBusy = false, mpGuestCheckpointAt = 0, chatUnlockPending = false, mpLastHostCheckpoint = 0,
    mpResyncAt=0, mpLastGuestInvHash=null, mpInventorySaving=false,
    pendingRecovery=null, lastEmergencyAt=0, lastMobilePerfAt=0, warnedEmergency=false, navArrivedKey=null;
  // A shareable URL fragment carries signaling data without a backend.
  // Remove it from the address bar after reading; it is never sent to GitHub Pages.
  let mpInviteConsumed = false;
  const mpInviteFromUrl = (() => {
    try {
      if (!location.hash.startsWith('#join=')) return '';
      const code=decodeURIComponent(location.hash.slice(6));
      history.replaceState(null,'',location.pathname+location.search);
      return code.startsWith('PRISMA1:') && code.length<170000 ? code : '';
    } catch { return ''; }
  })();
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
  function applyMobilePrefs() {
    document.body.classList.toggle('lefty', Boolean(settings.leftHanded));
    document.documentElement.style.setProperty('--touch-size',
      String(Math.max(0.8, Math.min(1.25, Number(settings.touchSize) || 1))));
    // Accessibility: typography-only HUD scaling avoids stretching the WebGL canvas.
    const hudScale = Math.max(0.75, Math.min(1.5, Number(settings.hudScale) || 1));
    document.documentElement.style.setProperty('--prisma-hud-scale', String(hudScale));
    document.body.classList.toggle('prisma-high-contrast', settings.highContrast === true);
    if (g) g.touchAutoJump = document.body.classList.contains('touchgame') && settings.autoJump !== false;
  }
  function haptic(pattern = 12) {
    if (settings.haptics !== false && document.body.classList.contains('touchgame')) {
      try { navigator.vibrate?.(pattern); } catch {}
    }
  }
  function touchActionEffect(type) {
    if (!document.body.classList.contains('touchgame')) return;
    const el = $('#touchImpact');
    el.className = '';
    void el.offsetWidth;
    el.className = type === 'blockBroken' ? 'pop' : type === 'blockPlaced' ? 'placed' : 'enemy';
    haptic(type === 'blockBroken' ? [10, 22, 10] : type === 'hitEnemy' ? 16 : 12);
  }
  function savePrefs() {
    Saves.prefs(settings);
    soundButton();
    applyMobilePrefs();
  }
  applyMobilePrefs();
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
  $('#expCompass').onclick = () => navigateTo('objective');
  $('#houseCompass').onclick = () => houseMenu();
  // Fixed 72 nodes (no new DOM allocation while playing). 7 HUD updates/sec.
  const compassNodes=[];
  for (let i=0;i<72;i++) {
    const node=document.createElement('span');
    node.className='compass-mark';
    node.dataset.deg=String(i*5);
    const label=i*5%45===0;
    if(label)node.classList.add('cardinal');
    else if(i*5%30===0)node.classList.add('major');
    if(label){const text=document.createElement('b');node.append(text);}
    $('#compassMarks').append(node);
    compassNodes.push(node);
  }
  function drawCompass(yaw, nav) {
    const marks=Navigation.compassMarks(yaw);
    const byDeg=new Map(marks.map(m=>[m.deg,m]));
    for(const el of compassNodes) {
      const mark=byDeg.get(Number(el.dataset.deg));
      el.hidden=!mark;
      if(!mark)continue;
      el.style.left=mark.left.toFixed(2)+'%';
      if(mark.label)el.firstElementChild.textContent=mark.label;
    }
    const pin=$('#compassWaypoint');
    const position=nav && Navigation.waypointPosition(nav.angle);
    pin.hidden=!position;
    if(position){
      pin.style.left=position.left.toFixed(2)+'%';
      pin.dataset.side=position.side;
    }
  }
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
      document.querySelectorAll('.seal-track i').forEach((item, index) => {
        item.classList.toggle('found', Boolean(seals[index]));
      });
      return true;
    } catch {
      toast('Não foi possível ler os mundos salvos');
      return false;
    }
  }
  worlds();
  function pauseSim() {
    heldView.hide();
    if (g) {
      g.paused = true;
      g.keys.clear();
      clearMobileControls();
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
      '<small class="eyebrow">' + (id === 'new' ? '✦ CRIAR MUNDO ✦' : '✦ MUNDO PRISMA ✦') + '</small><div class="dialogTitle"><h2 id="panelTitle">' +
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
    heldView.hide();
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
  $('#multiplayer').onclick = () => multiplayerMenu();
  $('#mpChatBtn').onclick = () => multiplayerChat();
  $('#mpChatComposer').onsubmit = (e) => {e.preventDefault();multiplayerSendChat();};
  $('#mpChatClose').onclick = () => closeQuickChat();
  $('#guide').onclick = () => guide('home');
  $('#navGuide').onclick = () => guide('home');
  $('#navWorlds').onclick = () => showWorlds();
  $('#navOptions').onclick = () => options('home');
  $('#pause').onclick = () => pauseMenu();
  $('#build').onclick = () => buildMenu();
  // Two-person WebRTC DataChannel lobby. Manual invite/response exchange means
  // it works on GitHub Pages with no matchmaking server or subscriptions.
  function multiplayerLeave() {
    if (mp) { mp.close(); mp = null; }
    mpRole=null; mpRecord=null; mpFresh=false; mpStartSent=false;
    mpGuest=false; mpLoading=false; mpMessages=[];
    chestLoaded=false;chestPending=false;chestRevision=-1;remoteChestInventory=null;
    mpWorldReady=false;mpEditBuffer=[];mpGuestEdits=[];mpLastSeq=-1;mpPoseSeq=0;
    mpLastEntity=0;mpEntitySeq=0;mpLastRemoteHit=0;mpLootSends.clear();
    mpHostWorldId=null;mpGuestProfile=null;mpGuestRevision=0;mpGuestSeq=0;mpHostGuestId=null;mpChestBusy=false;
    mpResyncAt=0;mpLastGuestInvHash=null;mpInventorySaving=false;
    closeQuickChat();$('#mpChatFeed').replaceChildren();
    if (g) {g.networkGuest=false;g.networkHost=false;}
    if (mpRemote) mpRemote.active=false;
    mpRemote=null;
    $('#mpChatBtn').hidden=true;
    const badge=$('#mpStatus');if(badge)badge.hidden=true;
  }
  function quickChatBubble(from,body) {
    const feed=$('#mpChatFeed');
    if(!feed)return;
    const item=document.createElement('div');
    item.className='mp-chat-bubble';
    const who=document.createElement('strong');who.textContent=from+': ';
    const words=document.createElement('span');words.textContent=String(body).slice(0,280);
    item.append(who,words);feed.append(item);
    while(feed.children.length>4)feed.firstElementChild.remove();
    setTimeout(()=>item.remove(),10000);
  }
  function closeQuickChat() {
    const box=$('#mpChatComposer');if(box)box.hidden=true;
    $('#mpChatQuickInput')?.blur();
  }
  function saveGuestCheckpoint() {
    if(mpRole!=='guest'||!g?.ready||!mpHostWorldId||!mpGuestProfile)return;
    mpGuestProfile.rev=mpGuestRevision;mpGuestProfile.tx=chestTx;mpGuestProfile.seq=mpGuestSeq;
    mpGuestProfile.inv=structuredClone(g.inv);mpGuestProfile.p={...g.p};
    mpGuestProfile.saved=Date.now();
    Saves.saveGuestProfile(mpHostWorldId,mpGuestProfile);
  }
  function exportGuestRecovery() {
    const pending=mpGuestProfile?.recoveryBackup;
    if(!pending || !validInventory(pending.inv,36))return toast('Nenhum inventário pendente para exportar.');
    // Recovery evidence is exported as JSON rather than injected into gameplay:
    // importing it automatically could create duplicated items in a shared chest.
    const data=JSON.stringify({kind:'mundo-prisma-inventory-recovery',version:1,
      worldId:mpHostWorldId,playerId:mpGuestProfile.id,
      saved:pending.saved,rev:pending.rev,seq:pending.seq,inventory:pending.inv},null,2);
    const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;
    a.download='mundo-prisma-inventario-pendente.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    toast('Backup dos itens pendentes exportado para conferência.');
  }
  function guestInventorySync(force=false) {
    if(mpRole!=='guest'||!mp?.connected||!g?.ready||!mpGuestProfile||!mpHostWorldId||!mpWorldReady)return;
    const key=JSON.stringify(g.inv);
    const old=mpGuestProfile.pendingInv;
    if(!force && !old && key===mpLastGuestInvHash)return;
    // Re-send the same transaction after a lost ACK. A different inventory
    // gets a new sequence number so no update can be applied twice.
    const pending=old && JSON.stringify(old.inv)===key && old.rev===mpGuestRevision
      ? old : {seq:++mpGuestSeq,rev:mpGuestRevision,inv:structuredClone(g.inv)};
    mpGuestSeq=Math.max(mpGuestSeq,pending.seq);
    mpGuestProfile.pendingInv=pending;
    saveGuestCheckpoint();
    mp.send({t:'guest-inv',id:mpGuestProfile.id, ...pending}).catch(()=>{});
  }
  async function restartWorldSync() {
    if(mpRole!=='host'||!g?.ready||!mp?.connected)return;
    const now=Date.now();
    if(now-mpResyncAt<2500)return; // coalesce both peers asking at once
    mpResyncAt=now;
    mpWorldReady=false;mpStartSent=false;mpEditBuffer=[];mpLastSeq=-1;
    if(mpRemote)mpRemote.active=false;
    try{const saved=await g.save();if(!saved)toast('Atenção: mundo ainda não foi salvo no disco.');}
    catch{toast('O salvamento falhou durante a reconexão.');}
    if(mp?.connected)sendHostWorld();
  }
  function currentGuestProfile() {
    return mpHostGuestId && g?.guestProfiles?.[mpHostGuestId];
  }
  function multiplayerMenu() {
    if (g && g.alive) return toast('Saia da partida atual antes de criar uma sala.');
    if (!globalThis.RTCPeerConnection || !window.isSecureContext) {
      panel('multiplayer','Multiplayer P2P',
        '<p>É necessário abrir o jogo em HTTPS ou localhost usando um navegador com WebRTC.</p>' +
        btn('back','Voltar','primary'));
      return;
    }
    panel('multiplayer','Multiplayer P2P',
      '<p class="mp-lead">Explore e construa no mesmo mundo com um amigo, usando uma conexão direta e criptografada.</p>' +
      '<div class="mp-choices">' +
        '<button class="mp-choice" data-act="mp-host"><span class="mp-emoji">✦</span><b>Criar sala</b><small>Escolha um mundo e gere o convite.</small></button>' +
        '<button class="mp-choice" data-act="mp-join"><span class="mp-emoji">◇</span><b>Entrar na sala</b><small>Cole o convite de quem criou.</small></button>' +
      '</div>' +
      '<div class="mp-hint"><strong>Como entrar?</strong> Compartilhe o link de convite. Seu amigo abre, copia a resposta e envia para você. O código técnico longo fica em Opções avançadas. Um código curto de 6 dígitos precisa de um servidor de sinalização.</div>' +
      '<p class="smallnote">Cooperação experimental: quedas breves podem ser recuperadas. Após falha permanente, gere novo convite. Inventários são confirmados após salvamento. Algumas redes exigem TURN.</p>',
      true);
  }
  async function multiplayerHostPanel() {
    await worlds();
    panel('mp-host','Criar sala',
      '<p class="mp-lead">Escolha qual mundo deseja compartilhar. Um amigo poderá construir com você.</p>'+
      '<label class="field">Seu apelido<input id="mpNickname" value="Anfitrião" maxlength="28" autocomplete="off"></label>'+
      '<label class="field">Mundo compartilhado<select id="mpWorldSelect"><option value="__new__">✦ Novo mundo P2P</option>'+ 
      worldList.map(w=>'<option value="'+esc(w.id)+'">'+esc(w.name)+' · '+mode(w.mode)+'</option>').join('')+'</select></label>'+
      '<div id="mpNewWorldFields" class="mp-new-world">'+
      '<label class="field">Nome do mundo<input id="mpWorldName" value="Aventura em dupla" maxlength="48"></label>'+
      '<label class="field">Modo<select id="mpWorldMode"><option value="survival">Sobrevivência</option><option value="creative">Criativo (blocos ilimitados)</option></select></label></div>'+
      '<button class="primary fullwidth" id="mpMakeInvite">Gerar convite P2P</button>'+
      '<p class="smallnote">Compartilhe o convite apenas com alguém de confiança. Antes de abrir um mundo importante, use Meus mundos → Backup. O Criativo é recomendado para construir em dupla.</p>',true);
    const sel=$('#mpWorldSelect'), fresh=$('#mpNewWorldFields');
    sel.onchange=()=>{fresh.hidden=sel.value!=='__new__';};
    $('#mpMakeInvite').onclick=async()=>{
      if(mpLoading)return;mpLoading=true;
      const button=$('#mpMakeInvite');button.disabled=true;button.textContent='Preparando convite…';
      try {
        const nickname=$('#mpNickname').value.trim().slice(0,28)||'Anfitrião';
        const worldId=sel.value;
        mpFresh=worldId==='__new__';
        mpRecord=mpFresh
          ? Game.fresh($('#mpWorldName').value.trim()||'Aventura em dupla',
              'PR-P2P-'+Math.random().toString(36).slice(2,9),$('#mpWorldMode').value,'normal')
          : await Saves.get(worldId);
        if(!mpRecord)throw Error('O mundo selecionado não foi encontrado.');
        if(!mpFresh && Saves.recovery(mpRecord))throw Error('Esse mundo tem uma recuperação pendente. Abra-o primeiro em Meus mundos.');
        mpRole='host';mpStartSent=false;mpRemote={active:false};mpMessages=[];mpGuest=false;
        mp=PrismaNet.create({name:nickname,onMessage:onMultiplayerMessage,onStatus:onMultiplayerStatus});
        const invite=await mp.host();
        panel('mp-offer','Seu convite está pronto',
          '<p class="mp-lead">1. Compartilhe o link. O amigo abrirá automaticamente a tela de entrada.</p>'+
          '<div class="btns">'+btn('mp-copy-link','Copiar link do convite','primary')+btn('mp-share','Compartilhar convite','secondary')+'</div>'+
          '<details class="mp-advanced"><summary>Opções avançadas · código técnico</summary><textarea id="mpShareCode" class="mp-code" readonly aria-label="Convite P2P">'+esc(invite)+'</textarea>'+btn('mp-copy','Copiar código técnico','secondary')+'</details>'+
          '<p class="mp-lead">2. Quando receber a resposta dele, cole abaixo para conectar.</p>'+
          '<textarea id="mpAnswerIn" class="mp-code" placeholder="Cole aqui o código de resposta do seu amigo" aria-label="Resposta P2P"></textarea>'+
          btn('mp-accept','Conectar e começar a jogar','primary fullwidth')+
          '<p class="smallnote">Mantenha esta aba aberta enquanto o amigo prepara a resposta. Use o código completo, sem cortar caracteres.</p>',true);
      } catch(e){console.error(e);toast('Não foi possível criar a sala: '+e.message);multiplayerLeave();multiplayerHostPanel();}
      finally{mpLoading=false;}
    };
  }
  async function multiplayerRehost() {
    if(!g?.ready || mpRole!=='host')return;
    if(mpLoading)return;
    mpLoading=true;
    try {
      await g.save();
      const username=mp?.name||'Anfitrião';
      mp?.close();
      mpStartSent=false;mpWorldReady=false;mpGuestEdits=[];mpEditBuffer=[];
      mpLastSeq=-1;mpPoseSeq=0;mpEntitySeq=0;mpResyncAt=0;
      mpRemote={active:false};mpRecord=g.snapshot();mpFresh=false;
      mp=PrismaNet.create({name:username,onMessage:onMultiplayerMessage,onStatus:onMultiplayerStatus});
      const invite=await mp.host();
      panel('mp-offer','Reconectar seu amigo',
        '<p class="mp-lead">Envie um novo link para o amigo. O mundo e seus baús permanecem salvos.</p>'+
        '<div class="btns">'+btn('mp-copy-link','Copiar novo link','primary')+btn('mp-share','Compartilhar','secondary')+'</div>'+
        '<details class="mp-advanced"><summary>Código técnico alternativo</summary><textarea id="mpShareCode" class="mp-code" readonly>'+esc(invite)+'</textarea>'+btn('mp-copy','Copiar código','secondary')+'</details>'+
        '<label class="field">Resposta do amigo<textarea id="mpAnswerIn" class="mp-code" placeholder="Cole aqui a resposta"></textarea></label>'+
        btn('mp-accept','Retomar partida cooperativa','primary fullwidth'),true);
      // Copy actions read this same field even if the advanced area is collapsed.
    } catch(e){toast('Não foi possível renovar a sala: '+e.message);}
    finally{mpLoading=false;}
  }
  function multiplayerJoinPanel() {
    const prefill=mpInviteConsumed ? '' : mpInviteFromUrl;
    mpInviteConsumed=true;
    panel('mp-join','Entrar na sala',
      '<p class="mp-lead">Abra o link do anfitrião para preencher o convite automaticamente. Se recebeu um código técnico, cole abaixo.</p>'+
      '<label class="field">Seu apelido<input id="mpNickname" maxlength="28" value="Explorador" autocomplete="off"></label>'+
      '<label class="field">Código do convite<textarea id="mpOfferIn" class="mp-code" placeholder="Cole o convite ou abra o link enviado pelo anfitrião">'+esc(prefill)+'</textarea></label>'+
      btn('mp-answer','Criar resposta','primary fullwidth')+
      '<p class="smallnote">A partida do convidado não sobrescreve seus mundos locais. Quem criou a sala conserva o mundo salvo.</p>',true);
  }
  async function multiplayerCreateAnswer() {
    if(mpLoading)return;
    const offer=$('#mpOfferIn')?.value.trim();
    const nick=$('#mpNickname')?.value.trim().slice(0,28)||'Explorador';
    if(!offer)return toast('Cole primeiro o convite do anfitrião.');
    mpLoading=true;
    try {
      mp?.close();
      mpRole='guest';mpRemote={active:false};mpGuest=true;mpWorldReady=false;
      mpLastSeq=-1;mpPoseSeq=0;mpLastGuestInvHash=null;mpResyncAt=0;
      mp=PrismaNet.create({name:nick,onMessage:onMultiplayerMessage,onStatus:onMultiplayerStatus});
      const answer=await mp.join(offer);
      panel('mp-answer','Resposta criada',
        '<p class="mp-lead">Copie a resposta e envie ao anfitrião. Ela será colada na tela da sala.</p>'+
        btn('mp-copy','Copiar resposta','primary fullwidth')+
        '<details class="mp-advanced"><summary>Ver resposta técnica</summary><textarea id="mpShareCode" class="mp-code" readonly aria-label="Resposta P2P">'+esc(answer)+'</textarea></details>'+
        '<p class="mp-connecting">Aguardando o anfitrião conectar…</p>'+
        '<p class="smallnote">Você entrará automaticamente no mundo quando a conexão estiver pronta.</p>',true);
    }catch(e){console.error(e);toast('Código inválido ou conexão indisponível: '+e.message);if(!g)multiplayerLeave();multiplayerJoinPanel();}
    finally{mpLoading=false;}
  }
  function multiplayerCopy() {
    const code=$('#mpShareCode'); if(!code)return;
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code.value).then(()=>toast('Código copiado!')).catch(()=>{
      code.focus();code.select();toast('Selecione o texto e copie manualmente.');
    });
    else{code.focus();code.select();toast('Texto selecionado. Use Ctrl+C para copiar.');}
  }
  function multiplayerCopyLink() {
    const value=$('#mpShareCode')?.value;
    if (!value || mpRole!=='host')return;
    const url=location.origin+location.pathname+location.search+'#join='+encodeURIComponent(value);
    if (url.length>18000) return toast('Convite muito longo para um link. Use Copiar código.');
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url)
      .then(()=>toast('Link copiado! O amigo abrirá Entrar na sala automaticamente.'))
      .catch(()=>toast('Não foi possível copiar o link. Use Copiar código.'));
    else toast('Seu navegador não permite copiar links automaticamente. Use Copiar código.');
  }
  async function multiplayerShare() {
    const invite=$('#mpShareCode')?.value;
    if(!invite||mpRole!=='host')return;
    const url=location.origin+location.pathname+location.search+'#join='+encodeURIComponent(invite);
    if(url.length>18000)return toast('Link excede o limite; copie o código técnico.');
    if(navigator.share){
      try{await navigator.share({title:'Mundo Prisma — jogar em dupla',url});return;}
      catch(e){if(e?.name==='AbortError')return;}
    }
    multiplayerCopyLink();
  }
  async function multiplayerAccept() {
    if(!mp || mpRole!=='host')return;
    const response=$('#mpAnswerIn')?.value.trim();
    if(!response)return toast('Cole a resposta enviada pelo convidado.');
    try {
      await mp.accept(response);
      panel('mp-offer','Conectando…',
        '<p class="mp-lead">Estabelecendo canal seguro entre os navegadores. A partida abrirá automaticamente.</p>'+
        '<p class="smallnote">Se não conseguir após alguns segundos, volte e gere um novo convite. Redes com NAT restritivo podem exigir um servidor TURN.</p>',true);
    } catch(e) {toast('Resposta inválida: '+e.message);}
  }
  function onMultiplayerStatus(s) {
    if(s==='connected') {
      if(mpRole==='host' && mpRecord && !g) launch(mpRecord,mpFresh,false);
      else if(mpRole==='host' && g?.ready) {resume(false);sendHostWorld();}
      else if(mpRole==='guest') panel('mp-answer','Sincronizando mundo…',
        '<p class="mp-lead">Conexão P2P estabelecida. Recebendo os blocos do anfitrião…</p>',true,false);
    } else if(s==='reconnecting' || s==='slow') {
      toast(s==='slow' ? 'Conexão lenta: verificando o amigo…' : 'P2P instável: tentando recuperar a conexão…');
    } else if(s==='recovered') {
      toast('Conexão recuperada: conferindo mundo e inventários…');
      if(mpRole==='host')restartWorldSync();
      else if(mpRole==='guest' && g?.ready) {
        saveGuestCheckpoint();mpWorldReady=false;mpLastSeq=-1;
        pauseSim();
        panel('load','Sincronizando novamente…',
          '<p class="mp-lead">A conexão voltou. Conferindo o mundo e seus itens com o anfitrião antes de liberar a construção.</p>',true,false);
        mp?.send({t:'resync-request'}).catch(()=>toast('Solicite um novo convite se a conexão não voltar.'));
      }
    } else if(s==='failed') {
      toast('P2P interrompido. É necessário renovar o convite para reconectar.');
      if(mpRole==='guest' && g?.ready) {
        saveGuestCheckpoint();
        panel('mp-lost','Conexão interrompida',
          '<p>O mundo do anfitrião permanece salvo. Peça outro link e entre novamente.</p>'+
          btn('mp-rejoin','Reconectar com novo link','primary fullwidth')+
          btn('mp-leave','Sair da partida','secondary'));
      }
    } else if(s==='disconnected') {
      saveGuestCheckpoint();
      if(mpRole==='host' && g?.ready)g.save().catch(()=>{});
      $('#mpChatBtn').hidden=true;
      if(mpRemote) mpRemote.active=false;
      if(mpRole==='guest' && g) {
        pauseSim();
        panel('mp-lost','Convidado desconectado',
          '<p>A conexão caiu. Seu inventário foi salvo neste navegador e poderá ser recuperado pelo anfitrião quando a sala voltar.</p>'+
          btn('mp-rejoin','Reconectar com novo convite','primary fullwidth')+
          btn('mp-leave','Voltar ao menu','secondary'));
      } else if(mpRole==='host') toast('Seu amigo saiu. Abra Pausa → Recriar convite para reconectar.');
    }
  }
  function onMultiplayerMessage(msg) {
    if(!mp || !msg || typeof msg!=='object')return;
    if(msg.t==='hello') {toast('Conectado com '+mp.remoteName);return;}
    if(msg.t==='resync-request' && mpRole==='host' && g?.ready && mp?.connected) {
      restartWorldSync();return;
    }
    if(msg.t==='chest-open' && mpRole==='host' && mpWorldReady && g?.ready) {
      const pos=msg.pos;
      if(!validSharedChest(pos) || msg.id!==mpHostGuestId || !currentGuestProfile()) {
        mp.send({t:'chest-error',pos,reason:'Baú indisponível. Aproxime-se e tente novamente.'}).catch(()=>{});
        return;
      }
      remoteChestInventory=structuredClone(currentGuestProfile().inv);
      const items=g.chests[pos] ||= Array(18).fill(null);
      mp.send({t:'chest-state',pos,rev:g.chestRevisions[pos]||0,items,
        inv:remoteChestInventory,profileRev:currentGuestProfile().rev,tx:chestTx,initial:true}).catch(()=>{});
      return;
    } else if(msg.t==='chest-action' && mpRole==='host' && mpWorldReady && g?.ready) {
      const pos=msg.pos;
      if(msg.id!==mpHostGuestId || !validSharedChest(pos)) {
        mp.send({t:'chest-error',pos,reason:'Baú indisponível. Aproxime-se e tente novamente.'}).catch(()=>{});
        return;
      }
      if(mpChestBusy){
        // Never leave the guest locked on "Aguardando" when the host is saving.
        mp.send({t:'chest-error',pos,reason:'Baú ocupado. Aguarde e tente novamente.'}).catch(()=>{});
        return;
      }
      mpChestBusy=true;
      PrismaCoop.transact(g,mpHostGuestId,pos,msg,Game.Session.chestMove,Voxel.blocks.length)
        .then(result=>{
          if(result.state){
            if(result.status==='committed')remoteChestInventory=structuredClone(result.state.inv);
            mp?.send(result.state).catch(()=>{});
          } else if(result.status==='failed') {
            mp?.send({t:'chest-error',pos,reason:result.reason}).catch(()=>{});
          }
        }).catch(e=>{console.error('Falha na transferência de baú',e);
          mp?.send({t:'chest-error',pos,reason:'Falha inesperada ao sincronizar baú.'}).catch(()=>{});
        }).finally(()=>{mpChestBusy=false;});
      return;
    } else if(msg.t==='chest-error' && mpRole==='guest' && g) {
      if(msg.pos===chestPos) {
        chestPending=false;chestLoaded=false;
        toast(typeof msg.reason==='string'?msg.reason.slice(0,110):'Baú indisponível');
      }
      return;
    } else if(msg.t==='chest-state' && mpRole==='guest' && g) {
      if(msg.pos!==chestPos || !Number.isInteger(msg.rev) || msg.rev<chestRevision)return;
      if(msg.gone) {
        chestPending=false;chestLoaded=false;
        if(screen==='chest'){toast('O baú compartilhado foi removido');resume();}
        return;
      }
      if(!validInventory(msg.items,18))return;
      g.chests[msg.pos]=structuredClone(msg.items);
      chestRevision=msg.rev;
      chestLoaded=true;
      // An unsolicited chest refresh must not clear a pending transaction.
      if(Number.isInteger(msg.tx) && msg.tx===chestTx || !chestPending)chestPending=false;
      if(validInventory(msg.inv,36) &&
         (msg.initial === true || Number.isInteger(msg.tx) && msg.tx===chestTx)) {
        g.inv=structuredClone(msg.inv);g.changed();bagSel=null;
        if(Number.isInteger(msg.profileRev))mpGuestRevision=msg.profileRev;
        saveGuestCheckpoint();
      }
      if(screen==='chest')chest(null,false);
      return;
    }
    if(msg.t==='world-ready' && mpRole==='host' && g) {
      const id=String(msg.id||'');
      if(!/^[a-zA-Z0-9-]{12,80}$/.test(id)||!validInventory(msg.inv,36))return;
      const known=g.guestProfiles[id];
      const accepted=PrismaCoop.ensureProfile(g,id,msg.inv,Voxel.blocks.length);
      if(!accepted)return;
      mpHostGuestId=id;
      if(!known)g.changed();
      remoteChestInventory=structuredClone(g.guestProfiles[id].inv);
      mp.send({t:'guest-profile',id,rev:g.guestProfiles[id].rev,tx:g.guestProfiles[id].lastTx,seq:g.guestProfiles[id].seq||0,inv:g.guestProfiles[id].inv}).catch(()=>{});
      mpWorldReady=true;mpLastEntity=0;flushHostEdits();toast('Mundo sincronizado com '+mp.remoteName);return;
    }
    if(msg.t==='guest-profile' && mpRole==='guest' && g?.ready && mpGuestProfile && msg.id===mpGuestProfile.id) {
      if(!validInventory(msg.inv,36)||!Number.isInteger(msg.rev)||msg.rev<0)return;
      const committedSeq=Number.isSafeInteger(msg.seq)?msg.seq:0;
      const recovery=PrismaCoop.recoverGuestInventory(mpGuestProfile,
        {inv:msg.inv,rev:msg.rev,seq:committedSeq},Voxel.blocks.length);
      if(!recovery)return;
      if(recovery.conflicted) {
        // Never merge unconfirmed items with a newer authoritative chest revision.
        // Preserve a local recovery record instead of silently deleting progress.
        mpGuestProfile.recoveryBackup={...mpGuestProfile.pendingInv,saved:Date.now()};
      }
      g.inv=recovery.inv;g.changed();
      mpGuestRevision=msg.rev;
      chestTx=Math.max(chestTx,Number.isSafeInteger(msg.tx)?msg.tx:0);
      mpGuestSeq=Math.max(mpGuestSeq,committedSeq,recovery.seq);
      if(!recovery.replay) {mpGuestProfile.pendingInv=null;mpLastGuestInvHash=JSON.stringify(msg.inv);}
      else mpLastGuestInvHash=null;
      mpWorldReady=true;saveGuestCheckpoint();
      if(recovery.replay) {guestInventorySync(true);toast('Recuperando itens pendentes após a reconexão…');}
      else if(recovery.conflicted)toast('Há itens não confirmados no backup local. O anfitrião mantém o inventário oficial.');
      else toast('Inventário sincronizado com o anfitrião.');
      return;
    }
    if(msg.t==='guest-inv' && mpRole==='host' && mpWorldReady && g?.ready) {
      if(msg.id!==mpHostGuestId)return;
      PrismaCoop.syncInventory(g,mpHostGuestId,msg,Voxel.blocks.length)
        .then(result=>{if(result.state && mp?.connected)mp.send(result.state).catch(()=>{});})
        .catch(e=>{console.warn('Inventário P2P não salvo',e);});
      return;
    }
    if(msg.t==='guest-inv-ack' && mpRole==='guest' && mpGuestProfile && msg.id===mpGuestProfile.id) {
      if(!Number.isSafeInteger(msg.seq) || !Number.isInteger(msg.rev))return;
      const pending=mpGuestProfile.pendingInv;
      if(pending && msg.seq>=pending.seq && msg.rev===pending.rev){
        mpGuestProfile.pendingInv=null;
        mpLastGuestInvHash=JSON.stringify(pending.inv);
        saveGuestCheckpoint();
      }
      return;
    }
    if(msg.t==='guest-inv-error' && mpRole==='guest') {
      toast('Inventário ainda não salvo. Tentaremos novamente.');return;
    }
    if(msg.t==='world' && mpRole==='guest') {
      const src=msg.rec;
      if(!src || src.schema!==1 || ![1,2,3].includes(src.generator) || typeof src.seed!=='string' ||
        typeof src.name!=='string' || !src.edits || typeof src.edits!=='object')return toast('Dados do mundo incompatíveis.');
      const rec=structuredClone(src);
      const existing=g && mpHostWorldId===src.id ? {p:{...g.p},inv:structuredClone(g.inv)} : null;
      if(g){g.stop();g=null;}
      mpHostWorldId=src.id;
      mpGuestProfile=Saves.guestProfile(src.id);
      mpGuestRevision=Number.isInteger(mpGuestProfile.rev)?mpGuestProfile.rev:0;
      mpGuestSeq=Number.isInteger(mpGuestProfile.seq)?mpGuestProfile.seq:0;
      mpLastGuestInvHash=null;
      chestTx=Math.max(chestTx,Number.isInteger(mpGuestProfile.tx)?mpGuestProfile.tx:0);
      rec.id='p2p-visitante-'+Date.now();
      rec.name=String(src.name).slice(0,48);
      rec.p=existing?.p || mpGuestProfile.p || {...rec.p,x:rec.p.x+1.8,z:rec.p.z+1.8};
      rec.inv=existing?.inv || (validInventory(mpGuestProfile.inv,36)?mpGuestProfile.inv:Game.fresh('Visitante',rec.seed,rec.mode,rec.difficulty).inv);
      rec.mobs=[];rec.selected=0;
      mpGuestEdits=[];
      mpWorldReady=false;
      launch(rec,false,true);
    } else if(msg.t==='pose' && g && mpRemote) {
      const {x,y,z,yaw,moving}=msg;
      const seq=Number.isSafeInteger(msg.seq)?msg.seq:null;
      if([x,y,z,yaw].every(Number.isFinite) && [x,y,z].every(v=>Math.abs(v)<100000) &&
          (seq===null || seq>mpLastSeq)) {
        if(seq!==null)mpLastSeq=seq;
        Object.assign(mpRemote,{targetX:x,targetY:y,targetZ:z,targetYaw:yaw,
          moving:!!moving,crouch:!!msg.crouch,sprint:!!msg.sprint,swing:!!msg.swing,
          life:Number.isFinite(msg.life)?Math.max(0,Math.min(100,msg.life)):100,
          held:Number.isInteger(msg.held)?msg.held:0,
          lastPacket:performance.now(),active:true});
        if(!Number.isFinite(mpRemote.x))Object.assign(mpRemote,{x,y,z,yaw});
      }
    } else if(msg.t==='edit' && mpRole==='guest' && (!g || !g.ready)) {
      if(mpGuestEdits.length<2000)mpGuestEdits.push(msg);
    } else if(msg.t==='batch' && mpRole==='guest' && (!g || !g.ready)) {
      if(mpGuestEdits.length<2000)mpGuestEdits.push(msg);
    } else if(msg.t==='edit' && g && [msg.x,msg.y,msg.z,msg.b].every(Number.isInteger)) {
      const {x,y,z,b}=msg;
      if(Math.abs(x)>100000||Math.abs(z)>100000||y<=0||y>=Voxel.H||b<0||!(b<105||Voxel.bedFoot(b)||Voxel.bedHead(b)||b===134||b===135||b===136))return;
      // Protect the shared chest from client-side deletion and item duplication.
      if(mpRole==='host' && [15,83,84].includes(g.get(x,y,z,true)) && ![15,83,84].includes(b))return;
      // Only accept edits near the most recently reported explorer position.
      if(mpRole==='host' && (!mpWorldReady || !mpRemote?.active || Math.hypot(x-mpRemote.x,y-mpRemote.y,z-mpRemote.z)>12))return;
      g.applyRemoteEdit(x,y,z,b);
    } else if(msg.t==='batch' && g && Array.isArray(msg.ops) && msg.ops.length<=300) {
      if(mpRole==='host' && (!mpWorldReady || !mpRemote?.active || !msg.ops.every(v=>Array.isArray(v)&&v.length===4&&v.every(Number.isInteger)&&Math.hypot(v[0]-mpRemote.x,v[1]-mpRemote.y,v[2]-mpRemote.z)<12 &&
        (![15,83,84].includes(g.get(v[0],v[1],v[2],true)) || [15,83,84].includes(v[3])))))return;
      g.applyRemoteBatch(msg.ops);
    } else if (msg.t==='entities' && mpRole==='guest' && g?.ready) {
      g.applyNetworkEntities(msg);
    } else if (msg.t==='mob-hit' && mpRole==='host' && mpWorldReady && g?.ready && mpRemote?.active) {
      const id=msg.id;
      const now=performance.now();
      const mob=g.mobs.find(m=>m.id===id && m.hp>0 && !m.dying);
      if(!Number.isSafeInteger(id)||!mob || now-mpLastRemoteHit<400 ||
          Math.hypot(mob.x-mpRemote.x,mob.y-(mpRemote.y+0.8),mob.z-mpRemote.z)>3.9)return;
      const eye=[mpRemote.x,mpRemote.y+1.6,mpRemote.z];
      const v=[mob.x-eye[0],mob.y+.6-eye[1],mob.z-eye[2]];
      const len=Math.hypot(...v);
      if(len>.01 && Voxel.ray((x,y,z)=>g.get(x,y,z,true),eye,v.map(n=>n/len),len,true))return;
      mpLastRemoteHit=now;
      const damage=msg.weapon===47?5:Voxel.durability[msg.weapon]?2:1;
      g.strikeMob(mob,damage,mpRemote.x,mpRemote.z);
    } else if (msg.t==='mob-feed' && mpRole==='host' && mpWorldReady && g?.ready && mpRemote?.active) {
      const mob=g.mobs.find(m=>m.id===msg.id && m.hp>0 && !m.dying);
      if(!mob || !Voxel.farmAnimals.includes(mob.kind) || mob.fed>0 ||
         msg.food!==Voxel.farmFood[mob.kind] || mpRemote.held!==msg.food ||
         Math.hypot(mob.x-mpRemote.x,mob.y-mpRemote.y,mob.z-mpRemote.z)>4)return;
      mob.hp=Math.min(Voxel.farmHealth[mob.kind],mob.hp+2);
      mob.fed=5; mob.flee=0;mob.graze=0;g.changed();
      mp.send({t:'feed-ok',id:mob.id,food:msg.food,kind:mob.kind}).catch(()=>{});
    } else if (msg.t==='feed-ok' && mpRole==='guest' && g?.ready) {
      const item=g.inv[g.selected];
      if(!item || item.b!==msg.food || !Voxel.farmAnimals.includes(msg.kind))return;
      if(!g.creative && !--item.n)g.inv[g.selected]=null;
      g.notify(msg.kind+' alimentado(a)');g.changed();
    } else if (msg.t==='mob-damage' && mpRole==='guest' && g?.ready &&
               Number.isFinite(msg.n) && msg.n>0 && msg.n<=24 && typeof msg.why==='string') {
      g.damage(msg.n,msg.why.slice(0,32));
    } else if (msg.t==='pickup' && mpRole==='host' && mpWorldReady && g?.ready && mpRemote?.active) {
      const d=g.drops.find(d=>d.id===msg.id && d.n>0);
      if(!d || mpLootSends.has(d.id) || !Number.isInteger(msg.cap) || msg.cap<1 || msg.cap>64 ||
         Math.hypot(d.x-mpRemote.x,d.z-mpRemote.z)>2.6 || Math.abs(d.y-mpRemote.y)>2.6)return;
      const n=Math.min(d.n,msg.cap);
      mpLootSends.add(d.id);
      mp.send({t:'loot-grant',id:d.id,b:d.b,n,dur:d.dur}).then(()=>{
        d.n-=n;g.drops=g.drops.filter(v=>v.n>0);g.changed();
      }).catch(()=>{}).finally(()=>mpLootSends.delete(d.id));
    } else if(msg.t==='loot-grant' && mpRole==='guest' && g?.ready) {
      g.receiveNetworkLoot(msg);
    } else if(msg.t==='chat' && typeof msg.text==='string') {
      const body=msg.text.slice(0,280);
      mpMessages.push({from:mp.remoteName,text:body});mpMessages=mpMessages.slice(-40);
      quickChatBubble(mp.remoteName,body);
    }
  }
  async function sendHostWorld() {
    if(!g||!mp?.connected||mpStartSent)return;
    mpStartSent=true;mpWorldReady=false;mpEditBuffer=[];
    try {
      const ok = await mp.send({t:'world',rec:g.snapshot()});
      if (!ok) throw Error('Canal de dados encerrado antes da transmissão do mundo.');
    } catch(e) {
      mpStartSent=false;
      toast('Falha ao enviar o mundo ao amigo. Reconecte a sala.');console.error(e);
    }
  }
  // Host buffers world changes until the guest confirms its chunks are ready.
  // The baseline is sent first; later block edits are replayed in channel order.
  function queueWorldEdit(ops) {
    if(!mp?.connected)return;
    if(mpRole==='host' && !mpWorldReady){
      if(mpEditBuffer.length+ops.length>6000) {
        toast('Muitas alterações aguardando sincronização. O convidado precisa reconectar.');
        return;
      }
      mpEditBuffer.push(...ops);
      return;
    }
    if(ops.length===1) {const [x,y,z,b]=ops[0];mp.send({t:'edit',x,y,z,b}).catch(()=>toast('Falha ao enviar um bloco.'));}
    else for(let i=0;i<ops.length;i+=200) mp.send({t:'batch',ops:ops.slice(i,i+200)}).catch(()=>toast('Falha na sincronização de construção.'));
  }
  function flushHostEdits() {
    const pending=mpEditBuffer;mpEditBuffer=[];
    for(let i=0;i<pending.length;i+=200) {
      const ops=pending.slice(i,i+200);
      mp.send({t:'batch',ops}).catch(()=>toast('Conexão instável ao atualizar construções.'));
    }
  }
  function flushGuestEdits() {
    const pending=mpGuestEdits;mpGuestEdits=[];
    for(const msg of pending){
      if(msg.t==='edit'){
        const {x,y,z,b}=msg;
        if([x,y,z,b].every(Number.isInteger) && Math.abs(x)<100000 && Math.abs(z)<100000 && y>0 && y<Voxel.H && b>=0 && b<Voxel.blocks.length) g.applyRemoteEdit(x,y,z,b);
      } else if(msg.t==='batch' && Array.isArray(msg.ops))g.applyRemoteBatch(msg.ops);
    }
  }
  function smoothRemote(dt,now) {
    if(!mpRemote?.active)return;
    if(now-(mpRemote.lastPacket||0)>14000) {mpRemote.active=false;return;}
    if(now-(mpRemote.lastPacket||0)>650)mpRemote.moving=false;
    const d=Math.hypot((mpRemote.targetX??mpRemote.x)-mpRemote.x,(mpRemote.targetY??mpRemote.y)-mpRemote.y,(mpRemote.targetZ??mpRemote.z)-mpRemote.z);
    if(d>12) {mpRemote.x=mpRemote.targetX;mpRemote.y=mpRemote.targetY;mpRemote.z=mpRemote.targetZ;}
    else {
      const a=1-Math.exp(-dt*12);
      for(const [prop,targ] of [['x','targetX'],['y','targetY'],['z','targetZ']])mpRemote[prop]+=(mpRemote[targ]-mpRemote[prop])*a;
    }
    mpRemote.walkCycle=(mpRemote.walkCycle||0)+(mpRemote.moving?dt*10:0);
    const turn=Math.atan2(Math.sin(mpRemote.targetYaw-mpRemote.yaw),Math.cos(mpRemote.targetYaw-mpRemote.yaw));
    mpRemote.yaw+=turn*(1-Math.exp(-dt*9));
  }
  function multiplayerChat() {
    if(!mp?.connected)return toast('Conecte-se primeiro a uma sala.');
    const box=$('#mpChatComposer');
    if(!box.hidden){closeQuickChat();return;}
    box.hidden=false;
    if(document.pointerLockElement){chatUnlockPending=true;document.exitPointerLock();}
    if(g){g.keys.clear();g.holding=false;}
    $('#mpChatQuickInput').focus({preventScroll:true});
  }
  function multiplayerSendChat() {
    const input=$('#mpChatQuickInput'),body=input?.value.trim();
    if(!body||!mp?.connected)return;
    const contents=body.slice(0,280);
    input.value='';
    mp.send({t:'chat',text:contents}).then(()=>{
      mpMessages.push({from:'Você',text:contents});mpMessages=mpMessages.slice(-40);
      quickChatBubble('Você',contents);
    }).catch(()=>toast('Mensagem não enviada'));
  }
  function newWorld(back) {
    backPanel = back;
    edition = 'survival';
    panel(
      'new',
      'Novo mundo',
      '<form id="newForm">' +
        '<p class="new-lede">Configure seu mundo, escolha como jogar e comece sua própria aventura no Prisma.</p>' +
        '<div class="world-fields">' +
          '<label class="field"><span class="field-heading"><span class="field-badge" aria-hidden="true">▣</span> Nome do mundo</span>' +
            '<input id="worldName" maxlength="48" required value="Meu mundo" autocomplete="off" placeholder="Nome do seu mundo"></label>' +
          '<div class="field"><label class="field-heading" for="worldSeed"><span class="field-badge" aria-hidden="true">✦</span> Semente</label>' +
            '<small>Use a mesma semente para reencontrar a paisagem.</small>' +
            '<div class="seed-input"><input id="worldSeed" maxlength="80" placeholder="Aleatória" autocomplete="off">' +
              '<button type="button" id="randomSeed" title="Gerar semente aleatória" aria-label="Gerar semente aleatória">⚄</button></div></div>' +
        '</div>' +
        '<div class="mode-heading"><span aria-hidden="true">✥</span> Modo de jogo</div>' +
        '<div class="modegrid" role="group" aria-label="Modo de jogo">' +
          '<button type="button" data-mode="survival" class="on" aria-pressed="true">' +
            '<span class="mode-symbol" aria-hidden="true">⛏</span><span class="mode-info"><b>Sobrevivência</b>' +
            '<small>Colete recursos, fabrique itens, construa e sobreviva aos desafios.</small></span>' +
            '<span class="mode-check" aria-hidden="true">✓</span></button>' +
          '<button type="button" data-mode="creative" aria-pressed="false">' +
            '<span class="mode-symbol creative-symbol" aria-hidden="true">▧</span><span class="mode-info"><b>Criativo</b>' +
            '<small>Construa livremente, sem limite de blocos, e voe para explorar.</small></span>' +
            '<span class="mode-check" aria-hidden="true">✓</span></button>' +
        '</div>' +
        '<label class="field rhythm-field" id="difficultyField"><span class="field-heading"><span class="field-badge" aria-hidden="true">◷</span> Ritmo da partida</span>' +
          '<select id="difficulty"><option value="normal">Normal · ciclo de 24 minutos</option>' +
          '<option value="short">Ciclo rápido · 4 minutos</option>' +
          '<option value="peaceful">Pacífico · sem criaturas hostis</option></select></label>' +
        '<details class="new-help"><summary><span>⚙</span><span><b>Informações do mundo</b>' +
          '<small>Como funcionam sementes, modos e construções.</small></span><span class="new-chevron">⌄</span></summary>' +
          '<p>Cada semente gera um mapa reproduzível. No modo Criativo você pode erguer casas bloco a bloco, sem modelos obrigatórios. A qualidade gráfica e os controles ficam em <b>Opções</b> no menu principal.</p></details>' +
        '<button type="submit" class="primary fullwidth create-play">' + icon('play') + 'Criar e jogar</button>' +
      '</form>',
      true,
    );
    $('#randomSeed').onclick = () => {
      $('#worldSeed').value = 'PR-' + Math.random().toString(36).slice(2, 9).toUpperCase();
      $('#worldSeed').focus();
    };
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
                  '<div class="world-actions">' + btn('load:' + esc(w.id), 'Abrir') +
                  btn('exportworld:' + esc(w.id), '↓ Backup', 'secondary') + '</div>' +
                  '</div>', 
              )
              .join('') +
            '</div><div class="btns">' +
            btn('newworld', icon('plus') + 'Novo mundo', 'primary') +
            btn('importworld', '↑ Importar mundo salvo', 'secondary') +
            '</div>'
        : '<p>Seu primeiro mundo começa aqui. Escolha um nome e um modo para explorar.</p><div class="btns">' +
            btn('newworld', icon('plus') + 'Novo mundo', 'primary') +
            btn('importworld', '↑ Importar mundo salvo', 'secondary') +
            '</div>',
    );
    dialog.insertAdjacentHTML('beforeend', '<input id="worldImportFile" type="file" accept=".json,.prisma,application/json" hidden>');
    // The file picker is outside gameplay; a selected file never alters an existing save.
    $('#worldImportFile').onchange = async (e) => {
      const file=e.target.files?.[0]; if (!file) return;
      await importWorld(file);
    };
  }
  async function exportWorld(id) {
    try {
      const rec = await Saves.get(id);
      if (!rec) return toast('Mundo não encontrado para backup.');
      const data = JSON.stringify({kind:'mundo-prisma-backup', version:1,
        exported:new Date().toISOString(), world:rec});
      const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
      const link=document.createElement('a');
      link.href=url;
      link.download=(String(rec.name || 'mundo').normalize('NFKD')
        .replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,44) || 'mundo') + '-backup.prisma.json';
      document.body.append(link);
      link.click(); link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      toast('Backup de ' + String(rec.name).slice(0,32) + ' preparado.');
    } catch(e) {console.error(e); toast('Falha ao exportar mundo.');}
  }
  function validateBackup(rec) {
    if (!rec || rec.schema !== 1 || ![1,2,3].includes(rec.generator) ||
        typeof rec.seed !== 'string' || rec.seed.length > 150 ||
        typeof rec.name !== 'string' || !rec.name.trim() ||
        !['survival','creative'].includes(rec.mode) ||
        !rec.p || ![rec.p.x,rec.p.y,rec.p.z,rec.p.yaw,rec.p.pitch].every(Number.isFinite) ||
        Math.max(Math.abs(rec.p.x),Math.abs(rec.p.z)) > 100000 ||
        rec.p.y < 0 || rec.p.y >= Voxel.H ||
        !Array.isArray(rec.inv) || rec.inv.length !== 36 ||
        rec.inv.some(t=>t && (!Number.isSafeInteger(t.b) || t.b < 0 || t.b >= Voxel.blocks.length ||
          !Number.isSafeInteger(t.n) || t.n < 1 || t.n > 64)) ||
        ![rec.p.life,rec.p.food,rec.p.air].every(v=>Number.isFinite(v)&&v>=0&&v<=100) ||
        !Number.isSafeInteger(rec.selected) || rec.selected < 0 || rec.selected > 8 ||
        !rec.edits || Array.isArray(rec.edits) || typeof rec.edits !== 'object' ||
        Object.keys(rec.edits).length > 1500)
      throw Error('Backup de mundo inválido ou incompatível.');
    return true;
  }
  async function importWorld(file) {
    if (file.size > 10*1024*1024) return toast('Backup acima de 10 MB: arquivo não importado.');
    try {
      const input=JSON.parse(await file.text());
      const rec=input?.kind==='mundo-prisma-backup' && input.version===1 ? input.world : input;
      validateBackup(rec);
      const imported=structuredClone(rec);
      imported.id=crypto.randomUUID?.() || 'mundo-importado-'+Date.now().toString(36);
      imported.name=String(rec.name).slice(0,35)+' (importado)';
      imported.saved=Date.now();
      await Saves.put(imported);
      await showWorlds();
      toast('Backup importado em novo mundo, sem sobrescrever o original.');
    } catch(e) { console.error(e); toast(e?.message?.startsWith('Backup')?e.message:'Não foi possível importar esse arquivo.'); }
  }
  async function loadWorld(id) {
    if (loading) return;
    try {
      const rec = await Saves.get(id);
      if (!rec) {
        toast('Mundo indisponível');
        return showWorlds();
      }
      const extra=Saves.recovery(rec);
      if(extra) {
        pendingRecovery={saved:rec, extra};
        panel('recover','Recuperar mundo',
          '<p>Encontramos um checkpoint de emergência mais recente para <strong>'+esc(rec.name)+
          '</strong>, criado antes de uma possível interrupção.</p>'+
          '<p class="smallnote">Checkpoint: '+new Date(extra.saved).toLocaleString('pt-BR')+
          ' · Última gravação: '+new Date(rec.saved).toLocaleString('pt-BR')+'</p>'+
          '<div class="btns">'+btn('restore-world','Recuperar progresso','primary')+
          btn('ignore-recovery','Usar último salvamento','secondary')+'</div>',true,false);
        return;
      }
      return launch(rec, false);
    } catch {
      toast('Não foi possível abrir este mundo');
    }
  }
  async function launch(rec, fresh, temporary = false) {
    perfFrames.reset();
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
      g.networkGuest = mpRole==='guest';
      g.networkHost = mpRole==='host';
      g.temporary = temporary;
      mpLastHostCheckpoint = performance.now();
      g.remotePlayer = mpRemote;
      $('#mpChatBtn').hidden = !mp?.connected;
      if (fresh && !temporary) {
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
    applyMobilePrefs();
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
    if (lookHoldTimer !== null) {
      clearTimeout(lookHoldTimer);
      lookHoldTimer = null;
    }
    if (gesture?.mining && g) g.resetMining();
    gesture = null;
  }
  function clearMobileControls() {
    joystickPointer = null;
    miningPointer = null;
    buildingPointer = null;
    $('#moveKnob').style.transform = '';
    $('#movePad').classList.remove('engaged');
    $$('#touch button').forEach((b) => b.classList.remove('pressed'));
    if (g) {
      g.touchMove.forward = 0;
      g.touchMove.side = 0;
      g.keys.delete('Space');
      g.resetMining();
    }
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
  function navigateTo(mode) {
    if (!g) return;
    const target=g.setNavMode(mode);
    navArrivedKey=null;
    if (mode==='off') toast('Navegação desativada');
    else toast(target ? 'Destino: '+target.label : 'Destino indisponível. Escolha outro no navegador.');
    hud();
  }
  function navigationCard(key, title, hint, enabled, selected=false) {
    return '<button class="nav-choice'+(selected?' on':'')+'" data-act="nav:'+esc(key)+'"'+(!enabled?' disabled':'')+'>'+
      '<span class="nav-choice-title">'+esc(title)+'</span><small>'+esc(hint)+'</small>'+
      '<b aria-hidden="true">'+(selected?'✓':'➜')+'</b></button>';
  }
  function houseMenu() {
    if (!g) return;
    const active=Navigation.normalize(g.navMode), h=g.house;
    const target=Navigation.target(g), guidance=Navigation.guidance(g.p,target);
    const homeDist=h?Math.round(Math.hypot(g.p.x-h.x-.5,g.p.z-h.z-.5)):null;
    const next=g.destination;
    const options=[
      navigationCard('home','⌂ Minha casa',h?'Casa: '+homeDist+' m · '+h.x+', '+h.y+', '+h.z:'Marque sua casa para ativar',!!h,active==='home'),
      navigationCard('objective','◇ Próximo objetivo',next?(Voxel.ruins[next.id]?.name||'Ruína')+' · '+Math.round(Math.hypot(g.p.x-next.x,g.p.z-next.z))+' m':'Todos os selos já registrados',!!next,active==='objective'),
      navigationCard('bag','▣ Mochila perdida',g.bag?'Recupere os itens deixados ao morrer':'Nenhuma mochila perdida',!!g.bag,active==='bag'),
      navigationCard('pin','⚑ Ponto marcado',g.navPin?'X '+g.navPin.x+' · Z '+g.navPin.z:'Marque um local da exploração',!!g.navPin,active==='pin'),
    ];
    for(let i=0;i<3;i++) {
      const s=g.sites?.find(v=>v?.id===i);
      if(!s) continue;
      const label=Voxel.ruins[i]?.name||'Ruína '+(i+1);
      options.push(navigationCard('ruin:'+i, '◇ '+label,
        (g.seals[i]?'Selo coletado':'Selo pendente')+' · '+Math.round(Math.hypot(g.p.x-s.x,g.p.z-s.z))+' m',true,active==='ruin:'+i));
    }
    panel('house','Navegador de destinos',
      '<p class="house-lede">Escolha um destino para receber orientação no jogo. A seta mostra a direção em <strong>linha reta</strong>: contorne rios, paredões e construções.</p>'+
      '<div class="nav-active"><small>DESTINO SELECIONADO</small><strong>'+esc(target?.label||'Nenhum destino ativo')+'</strong>'+
      '<span>'+(guidance ? guidance.distance+' m · '+esc(guidance.arrived?'Você chegou!':guidance.turn+(guidance.height?' · '+guidance.height:'')) : 'Selecione um local abaixo')+'</span></div>'+
      '<div class="nav-choices">'+options.join('')+'</div>'+
      '<div class="nav-management">'+btn('house-mark','⌂ Marcar casa aqui','secondary')+
        btn('nav-pin','⚑ Marcar ponto aqui','secondary')+
        (g.navPin?btn('nav-clear-pin','Remover ponto marcado','flat'):'')+
        (h?btn('house-clear','Remover casa','flat'):'')+
        btn('nav:off','Desligar orientação','flat')+'</div>'+
      '<p class="smallnote">Atalhos: <kbd>H</kbd> abrir navegador · <kbd>N</kbd> alternar Casa/Objetivo. Toque na barra da bússola no celular.</p>'+
      btn('resume','Voltar ao jogo','primary'),true);
  }
  function diagnosticText() {
    if (!g) return 'Nenhuma partida aberta';
    const perf = perfFrames.snapshot();
    // Count stored changes on demand, never in the per-frame render loop.
    const editedRegions = Object.keys(g.edits || {});
    const editedBlocks = editedRegions.reduce((sum, k) => sum + Object.keys(g.edits[k] || {}).length, 0);
    const chestCount = Object.keys(g.chests || {}).length;
    const qualityNames = ['Baixa','Média','Alta'];
    return [
      'MUNDO PRISMA · DIAGNÓSTICO LOCAL v0.9.26',
      'Gerado: ' + new Date().toISOString(),
      'Motor: ' + renderer.type + ' · qualidade: ' + (qualityNames[settings.quality] || settings.quality),
      'FPS médio: ' + perf.averageFPS + ' · FPS 1% low: ' + perf.low1FPS,
      'Quadro médio: ' + perf.avgMs + ' ms · p95: ' + perf.p95Ms + ' ms · amostras: ' + perf.samples,
      'Resolução dinâmica: ' + Math.round((renderer.dynamicScale || 1) * 100) + '%',
      'Draw calls: ' + renderer.calls + ' · triângulos: ' + renderer.tris,
      'Chunks: ' + g.chunks.size + ' · jobs pendentes: ' + g.pending.size + ' · worker ocupado: ' + !!g.busy,
      'Persistência: ' + editedRegions.length + ' regiões alteradas · ' + editedBlocks + ' blocos editados · ' + chestCount + ' baús',
      'XYZ: ' + [g.p.x,g.p.y,g.p.z].map(v=>Math.floor(v)).join(', ') + ' · chunk: ' + g.cx + ',' + g.cz,
      'Bioma: ' + ($('#biome').textContent || '-') + ' · seed: ' + g.meta.seed,
      'Estado do salvamento: ' + g.saveState,
      'P2P: ' + (mpRole || 'solo') + ' · conexão: ' + (mp?.connected ? 'ativa' : 'inativa'),
      'Este relatório foi criado localmente. Nenhum dado é enviado pelo jogo.',
    ].join('\n');
  }
  function copyDiagnostic() {
    const report = diagnosticText();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(report)
        .then(() => toast('Diagnóstico copiado. Você pode colá-lo ao relatar um problema.'))
        .catch(() => showDiagnosticReport(report));
    } else showDiagnosticReport(report);
  }
  function showDiagnosticReport(report) {
    panel('diagnostic', 'Diagnóstico técnico',
      '<p class="smallnote">Selecione o texto e copie para relatar um problema.</p>' +
      '<textarea id="diagText" rows="13" readonly class="diag-text">' + esc(report) + '</textarea>' +
      btn('back', 'Voltar', 'secondary'),true);
    const area = $('#diagText'); area?.focus(); area?.select();
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
        btn('housemenu', '◇ Navegar: casa e objetivos') +
        btn('save-now', '◉ Salvar progresso agora', 'secondary') +
        btn('diagnostic-copy', '▤ Copiar diagnóstico de desempenho', 'secondary') +
        '<p class="smallnote">Salvamento: '+esc(g.saveState)+'</p>'+
        (mpRole==='guest' && mpGuestProfile?.recoveryBackup ?
          btn('mp-backup-inv','↓ Exportar itens pendentes da reconexão','secondary') : '')+
        (mpRole==='host' && !mp?.connected ? btn('mp-rehost','♻ Recriar convite P2P','secondary') : '')+
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
    const wasGuest=mpGuest;
    if (mp) multiplayerLeave();
    homeMenu();
    toast(wasGuest ? 'Sessão encerrada' : 'Mundo salvo');
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
        '<h3 class="setting-subheading">Controles no celular</h3>' +
        slider('touchSensitivity', 'Sensibilidade da câmera ao deslizar', 0.5, 2.5, 0.05, settings.touchSensitivity ?? 1.15, '×') +
        slider('touchSize', 'Tamanho do joystick', 0.8, 1.25, 0.05, settings.touchSize ?? 1, '×') +
        '<h3 class="setting-subheading">Leitura e acessibilidade</h3>' +
        slider('hudScale', 'Tamanho dos textos do HUD', 0.75, 1.5, 0.05, Math.max(.75,Math.min(1.5,Number(settings.hudScale)||1)), '×') +
        '<label class="checkline"><input id="highContrast" type="checkbox"> Alto contraste na mira, bússola e indicadores</label>' +
        '<label class="checkline"><input id="autoJump" type="checkbox"> Pular automaticamente obstáculos baixos</label>' +
        '<label class="checkline"><input id="leftHanded" type="checkbox"> Inverter lados dos controles</label>' +
        '<label class="checkline"><input id="haptics" type="checkbox"> Vibrar ao quebrar e colocar blocos</label>' +
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
      ['autoJump', 'autoJump'],
      ['leftHanded', 'leftHanded'],
      ['haptics', 'haptics'],
      ['highContrast', 'highContrast'],
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
    for (const id of ['fov', 'sensitivity', 'touchSensitivity', 'touchSize', 'hudScale', 'volume', 'recuo']) {
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
        ['Construção livre / catálogo', 'B / botão Blocos'],
        ['Girar porta ou escada', 'G / botão Girar'],
        ['Copiar bloco mirado', 'P / oficina'],
        ['Desfazer bloco no Criativo', 'Z / oficina'],
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
        '<div class="guidecontent"><h3>Cultivo e abrigo</h3><p>Quebre grama para obter sementes. Coloque um canteiro junto à água, selecione as sementes e use o canteiro. Colha o trigo dourado e asse pão no forno. A cama nova ocupa dois blocos e define o retorno e a bússola da casa. Use H para marcar a casa ou outro ponto e alternar entre casa e objetivos com N.</p><h3>Antes da primeira noite</h3><p>Segure Espaço ou Nadar para subir e solte para afundar. Para sair da água, nade em direção a uma margem de até um bloco e segure Espaço ou Nadar. Segure o botão esquerdo em um tronco e se aproxime para recolher a madeira. Abra a mochila com E e transforme um tronco em quatro tábuas.</p><h3>Monte sua oficina</h3><p>Fabrique uma bancada com quatro tábuas e coloque-a no chão. Perto dela, combine três tábuas e duas hastes para produzir sua primeira picareta. Abra a oficina de construção (B no teclado) para fabricar escadas, lajes, cercas, portas, tijolos e telhas.</p><h3>Ilumine o abrigo</h3><p>Procure carvão na pedra ou queime um tronco no forno. Combine carvão e haste para fazer tochas. Os raspejantes recuam diante da luz.</p><h3>Animais pacíficos</h3><p>Durante o dia, procure ovelhas, porcos e vacas nos campos gramados, inclusive no modo Pacífico. Eles não atacam. Equipe trigo para alimentar ovelhas ou vacas, ou frutas para porcos; mire no animal próximo e use o botão direito ou toque no cenário. A lã também pode ser usada para fabricar camas. Animais feridos fogem por alguns segundos.</p><h3>Recupere forças</h3><p>Quebre folhas para encontrar frutas. Selecione-as e use o botão direito para comer. Se cair, volte ao local para recuperar a mochila.</p></div>';
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
        '<div class="guidecontent"><h3>Ecos dos Arquitetos</h3><p>Abra o Navegador (H) para selecionar a próxima ruína ou voltar à casa. Siga a bússola até as três ruínas. Aproxime-se do núcleo turquesa e use o botão direito ou R para despertar seu selo.</p><ul class="ruin-list">' +
        names +
        '</ul><p>O primeiro selo libera a pedra rúnica. Com os três, use a bancada para combinar cristal, cobre e vidro em um Farol Prisma. Coloque-o para acender uma aurora sobre sua base.</p></div>';
    } else
      body =
        '<p>Mundo Prisma é um sandbox voxel de exploração, sobrevivência e construção. Explore os Campos de Âmbar, a Floresta de Névoa e as Dunas de Vidro. Nas dunas, procure os obeliscos com cristais no topo.</p><p class="muted">Versão jogável 0.9.26 · Solo e multiplayer experimental<br>Arte, sprites, tipografia de título e efeitos sonoros criados para Mundo Prisma. Seu progresso é salvo neste navegador.</p>';
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
      case 'build':
      case 'chest':
      case 'house':
      case 'pause':
        return resume();
      case 'new':
        return backPanel === 'worlds' ? showWorlds() : homeMenu();
      case 'multiplayer':
      case 'mp-host':
      case 'mp-join':
      case 'mp-offer':
      case 'mp-answer':
        multiplayerLeave(); return homeMenu();
      case 'mp-chat':
        return resume();
      case 'mp-lost':
        return multiplayerJoinPanel();
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

  const bagTabs = [
    ['all', 'Todos', '▦'],
    ['build', 'Blocos', '▣'],
    ['tools', 'Ferramentas', '⛏'],
    ['utility', 'Utilidades', '⚒'],
    ['decor', 'Decoração', '▤'],
    ['survival', 'Sobrevivência', '✦'],
  ];
  function recipeCategory(id) {
    if ([22, 42, 43, 44, 45, 47, 89, 90].includes(id)) return 'tools';
    if ([12, 13, 14, 15, 24, 25, 30, 31, 67].includes(id)) return 'utility';
    if ([38, 41, 46].includes(id)) return 'survival';
    if ([77, 78, 79, 83, 84, 85, 87, 88].includes(id)) return 'decor';
    return 'build';
  }
  function blockCategory(id) {
    return recipeCategory(id);
  }
  function matchesBagTab(id, tab) {
    return tab === 'all' || recipeCategory(id) === tab;
  }
  function bagTabsMarkup(active = bagRecipeTab) {
    return '<div class="recipe-tabs" role="tablist" aria-label="Categorias de receitas">' +
      bagTabs.map(([id, label, glyph]) =>
        '<button class="recipe-tab' + (active === id ? ' on' : '') + '" data-act="crafttab:' + id + '" role="tab" aria-selected="' + (active === id) + '" title="' + esc(label) + '">' +
        '<span class="recipe-tab-glyph" aria-hidden="true">' + glyph + '</span>' +
        '<span class="recipe-tab-label">' + esc(label) + '</span></button>'
      ).join('') + '</div>';
  }

  function buildMenu(category = buildCategory) {
    if (!g) return;
    buildCategory = Math.max(0, Math.min(Voxel.buildCategories.length - 1, Number(category) || 0));
    const tabs = Voxel.buildCategories.map(([label], i) =>
      btn('buildtab:' + i, esc(label), 'tab' + (buildCategory === i ? ' on' : ''))).join('');
    const [label, ids] = Voxel.buildCategories[buildCategory];
    const cards = ids.map((id) => {
      const owned = Game.count(g.inv, id);
      const ri = Voxel.recipes.findIndex((r) => r[0] === id);
      const recipe = ri < 0 ? null : Voxel.recipes[ri];
      const available = recipe && g.canCraft(recipe, 0);
      const requirement = recipe
        ? recipe[2].map(([b,n]) => n + ' ' + esc(name(b))).join(' + ')
        : 'Encontre o material no mundo';
      const station = recipe?.[3] ? ' · Fabricar na ' + esc(name(recipe[3])) : '';
      const action = g.creative
        ? btn('buildpick:' + id, 'Selecionar 64', 'primary')
        : '<div class="build-actions">' +
          (owned ? btn('buildequip:' + id, 'Usar ' + owned, 'primary') : '') +
          (recipe
            ? (available
                ? btn('buildcraft:' + ri, 'Fabricar ×' + recipe[1], 'secondary')
                : '<button class="secondary" disabled title="' + (recipe[3] ? 'Abra ' + esc(name(recipe[3])) + ' para fabricar' : 'Faltam materiais') + '">' + (recipe[3] ? 'Na ' + esc(name(recipe[3])) : 'Indisponível') + '</button>')
            : owned ? '' : '<small class="build-unavailable">Colete no mundo</small>') +
          '</div>';
      return '<article class="build-card">' + img(id) + '<div class="build-copy"><b>' + esc(name(id)) +
        '</b><small>' + esc(g.creative ? 'Bloco pronto para construir' : requirement + station) +
        '</small></div>' + action + '</article>';
    }).join('');
    panel('build', 'Construção livre',
      '<p class="smallnote"><b>Sua casa, seu formato:</b> construa bloco por bloco, sem tamanho fixo, sem terreno obrigatório para projetos e sem modelos prontos. ' +
      (g.creative ? 'No Criativo, todos os blocos são ilimitados.' :
        'Na Sobrevivência, colete materiais e fabrique as peças.') +
      ' Mire em uma face e toque em Colocar; segure para continuar. Quebrar remove blocos. Escadas e portas podem ser giradas sem mover a câmera.</p>' +
      '<div class="build-quick-actions">' +
      btn('buildrotate', '↻ Girar peça 90°', 'secondary') +
      btn('buildpicklook', '▣ Copiar bloco mirado', 'secondary') +
      (g.creative && g.lastFreeBlock ? btn('build-undofree', '↶ Desfazer bloco', 'secondary') : '') +
      '</div>' +
      '<div class="tabbar build-tabs">' + tabs + '</div>' +
      '<div class="build-list">' + cards + '</div>' +
      '<details class="optional-projects"><summary>Projetos prontos (opcionais)</summary>' +
      '<p class="smallnote">Só use se quiser: os projetos automáticos 5×5 não limitam a construção livre. Eles exigem espaço vazio e solo plano.</p>' +
      ['base','cabin'].map((kind) => {
        const plan = g.blueprintPlan(kind);
        const title = kind === 'base' ? 'Fundação 5×5' : 'Cabana 5×5';
        const summary = plan.costs ? Object.entries(plan.costs).map(([id, n]) => n + ' ' + name(+id)).join(' · ') : plan.reason;
        const valid = plan.ok;
        return '<article class="build-card project-card"><div class="build-copy"><b>' + title +
          '</b><small>' + esc(summary) + '</small>' +
          (!valid ? '<small class="build-unavailable">' + esc(plan.reason) + '</small>' : '') +
          '</div><button class="primary" data-act="buildplan:' + kind + '" ' +
          (valid ? '' : 'disabled') + '>Construir projeto</button></article>';
      }).join('') +
      (g.creative && g.lastBlueprint ? btn('build-undo','↶ Desfazer último projeto','secondary') : '') +
      '</details>' +
      '<p class="smallnote">Girar altera portas e escadas em passos de 90°. A tecla G também gira e P copia o bloco mirado. Armários e barris armazenam itens; agache para colocar blocos junto a portas.</p>',
      true,
    );
  }
  function inventory(reset = true, station = null) {
    if (reset) bagSel = null;
    // E and the mobile Bag button always open hand crafting. Re-rendering an
    // already open station panel (tab/slot/craft) must preserve its context.
    if (station !== null) bagStation = station;
    else if (reset) bagStation = 0;
    const activeStation = bagStation;
    const availableRecipes = Voxel.recipesAtStation(activeStation);
    const stationLabel = activeStation ? name(activeStation) : 'Mochila';
    const craftingLabel = activeStation ? 'Receitas da ' + stationLabel : 'Receitas feitas à mão';
    const sel = bagSel?.type === 'inv' ? bagSel.i : -1;
    const inv = g.inv;
    const grid = (start, end, hot = false) =>
      '<div class="slots' + (hot ? ' hotbar-row' : ' inventory-row') + '">' +
      inv
        .slice(start, end)
        .map((t, n) => slotButton(t, n + start, 'inv', sel === n + start, hot && n + start < 9))
        .join('') +
      '</div>';
    const selectedRecipe = availableRecipes
      .find(({recipe}) => matchesBagTab(recipe[0], bagRecipeTab))?.recipe;
    const quickPreview = selectedRecipe
      ? '<div class="quickcraft-preview">' + img(selectedRecipe[0]) + '<b>' + esc(name(selectedRecipe[0])) + '</b><small>×' + selectedRecipe[1] + '</small></div>'
      : '<div class="quickcraft-preview empty"><small>Selecione uma categoria para ver receitas.</small></div>';
    let right;
    if (g.creative) {
      const catalog = Voxel.blocks
        .filter((t) => t.id > 0 && t.placeable && Voxel.itemId(t.id) === t.id && ![28, 29, 39].includes(t.id))
        .filter((b) => bagRecipeTab === 'all' || blockCategory(b.id) === bagRecipeTab)
        .map((b) =>
          '<button class="slot catalog-slot" data-act="catalog:' +
          b.id +
          '" title="' +
          esc(b.name) +
          '" aria-label="' +
          esc(b.name) +
          '">' +
          img(b.id) +
          '</button>'
        )
        .join('');
      right =
        '<div class="bag-panel bag-side-panel">' +
          '<div class="sectionhead bag-side-title">Catálogo Prisma</div>' +
          '<p class="smallnote bag-copy">Escolha um material para colocar diretamente no espaço ativo da barra rápida.</p>' +
          bagTabsMarkup() +
          '<div class="catalog bag-catalog">' + catalog + '</div>' +
        '</div>';
    } else {
      const recipeCards = availableRecipes
        .filter(({recipe}) => matchesBagTab(recipe[0], bagRecipeTab))
        .map(({recipe:r, index:i}) => {
          const ava = g.canCraft(r, activeStation);
          const stationText = activeStation && !g.nearStation(activeStation) ? ' · Aproxime-se da estação' : '';
          const sealText = g.sealCount < (r[4] || 0) ? ' · Requer ' + r[4] + ' selo(s)' : '';
          return (
            '<button class="recipe" data-act="craft:' +
            i +
            '" ' +
            (ava ? '' : 'disabled') +
            '>' +
            '<span class="recipe-icon">' + img(r[0]) + '</span>' +
            '<span><b>' + esc(name(r[0])) + ' ×' + r[1] + '</b><small>' +
            r[2].map(([b, n]) => n + ' ' + esc(name(b)).toLowerCase()).join(' + ') +
            stationText + sealText +
            '</small></span><strong>+</strong></button>'
          );
        })
        .join('');
      right =
        '<div class="bag-panel bag-side-panel">' +
          '<div class="quickcraft-box">' +
            '<div class="sectionhead bag-side-title">' + esc(craftingLabel) + '</div>' +
            '<div class="quickcraft-shell">' +
              '<div class="mini-craft-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
              '<span class="quickcraft-arrow">→</span>' +
              '<div class="mini-craft-output">' + quickPreview + '</div>' +
            '</div>' +
            '<p class="smallnote bag-copy">' + (activeStation
              ? 'Este aparelho mostra somente suas próprias receitas. Toque em <b>+</b> para fabricar.'
              : 'Aqui só aparecem receitas feitas à mão. Abra uma bancada ou forno para ver as receitas exclusivas.') + '</p>' +
          '</div>' +
          '<div class="recipe-book-head">' +
            '<div class="sectionhead bag-side-title">' + esc(craftingLabel) + '</div>' +
            '<div class="recipe-book-actions">' + btn('buildmenu', '▦ Construção livre', 'secondary') + '</div>' +
          '</div>' +
          bagTabsMarkup() +
          '<div class="recipes bag-recipes">' + (recipeCards ||
            '<p class="smallnote bag-copy">Nenhuma receita nesta categoria para ' + esc(stationLabel) + '.</p>') + '</div>' +
        '</div>';
    }
    panel(
      'bag',
      stationLabel,
      '<div class="bag-hero"></div>' +
      '<div class="invgrid prisma-bag-layout">' +
        '<div class="bag-panel bag-main-panel">' +
          '<div class="sectionhead bag-main-title">Barra rápida</div>' +
          grid(0, 9, true) +
          '<div class="inventory-headline"><div class="sectionhead bag-main-title">Inventário</div><small>3 × 9 (27 espaços)</small></div>' +
          grid(9, 45, false) +
          '<div class="bag-help-strip">' +
            '<span>◉ Clique em um item e depois no destino para mover.</span>' +
            '<span>◉ Clique direito em um espaço vazio para dividir a pilha.</span>' +
          '</div>' +
          (bagSel
            ? '<p class="smallnote bag-copy">Item selecionado: <b>' + esc(name(inv[bagSel.i]?.b)) + '</b>. Escolha para onde mover.</p>'
            : '<p class="smallnote bag-copy">Visual inspirado no inventário clássico de sandbox, com o estilo dourado e prisma do jogo.</p>') +
        '</div>' +
        right +
      '</div>',
      true,
    );
    bindSlots();
  }
  const validInventory = (items,count) => PrismaCoop.validInventory(items,count,Voxel.blocks.length);
  function validSharedChest(pos) {
    if(!mpRemote?.active || typeof pos!=='string' || !/^-?\d+,-?\d+,-?\d+$/.test(pos))return false;
    const [x,y,z]=pos.split(',').map(Number);
    if(![x,y,z].every(Number.isSafeInteger)||y<1||y>=Voxel.H ||
       Math.max(Math.abs(x),Math.abs(z))>100000 ||
       Math.hypot(x+.5-mpRemote.x,y-mpRemote.y,z+.5-mpRemote.z)>6.5)return false;
    return [15,83,84].includes(g.get(x,y,z,true));
  }
  function broadcastChest(pos,gone=false) {
    if(!g||mpRole!=='host'||!mpWorldReady||!mp?.connected)return;
    g.chestRevisions[pos]=(g.chestRevisions[pos]||0)+1;
    mp.send({t:'chest-state',pos,rev:g.chestRevisions[pos],
      items:gone?null:g.chests[pos]||Array(18).fill(null),gone}).catch(()=>toast('Falha ao sincronizar o baú.'));
  }
  function guestChestAction(from,index,to,target,quick=false,split=false) {
    if(!mp?.connected||!chestLoaded||chestPending)return;
    chestPending=true;const tx=++chestTx;
    mp.send({t:'chest-action',pos:chestPos,rev:chestRevision,tx,
      id:mpGuestProfile?.id,profileRev:mpGuestRevision,
      from,index,to,target,quick:!!quick,split:!!split}).catch(()=>{
      chestPending=false;toast('Não foi possível sincronizar os itens do baú.');
    });
  }
  function chest(hit, reset = true) {
    if (reset) {
      chestPos = hit.p.join(',');
      bagSel = null;
      if(mpRole==='guest' && mp?.connected) {
        chestLoaded=false;chestPending=true;chestRevision=-1;
        guestInventorySync();
        mp.send({t:'chest-open',pos:chestPos,id:mpGuestProfile?.id}).catch(()=>{
          chestPending=false;toast('Não foi possível abrir o baú do anfitrião.');
        });
      }
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
      mp?.connected ? 'Baú compartilhado' : 'Baú',
      (mpRole==='guest' && !chestLoaded ? '<p class="smallnote">Aguardando os itens do anfitrião…</p>' : '') +
      '<div class="sectionhead">Armazenamento</div>' +
        grid(chest, 'chest') +
        '<div class="sectionhead">Sua mochila</div>' +
        grid(g.inv, 'inv') +
        '<p class="smallnote">Clique no item e depois no destino. Shift + clique transfere a pilha.'+
        (mp?.connected?' O anfitrião confirma cada troca para evitar duplicações.':'')+'</p>',
      true,
    );
    bindSlots();
  }
  function transfer(type, i, quick = false) {
    if(screen==='chest' && mpRole==='host' && mpChestBusy) {toast('Baú salvando. Aguarde a confirmação.');return;}
    if(screen==='chest' && mpRole==='guest' && mp?.connected) {
      if(!chestLoaded || chestPending) {toast('Aguarde a sincronização do baú');return;}
      const src=type==='inv'?g.inv:g.chests[chestPos];
      if(!src || !Number.isInteger(i)||i<0||i>=src.length)return;
      if(quick) {
        if(src[i])guestChestAction(type,i,type==='inv'?'chest':'inv',-1,true,false);
        bagSel=null;return;
      }
      if(!bagSel) {if(src[i])bagSel={type,i};}
      else {guestChestAction(bagSel.type,bagSel.i,type,i,false,false);bagSel=null;}
      chest(null,false);return;
    }
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
    if(screen==='chest')broadcastChest(chestPos);
    screen === 'chest' ? chest(null, false) : inventory(false);
  }
  function bindSlots() {
    dialog.querySelectorAll('.slot[data-act^="inv:"],.slot[data-act^="chest:"]').forEach((el) => {
      el.oncontextmenu = (e) => {
        e.preventDefault();
        if(screen==='chest' && mpRole==='host' && mpChestBusy)return;
        const [type, index] = el.dataset.act.split(':');
        const slots = type === 'inv' ? g.inv : g.chests[chestPos],
          stack = slots[+index],
          dest = slots.findIndex((v) => !v);
        if (!stack || stack.n < 2 || dest < 0) return;
        if(screen==='chest' && mpRole==='guest' && mp?.connected) {
          guestChestAction(type,+index,type,dest,false,true);return;
        }
        const half = Math.floor(stack.n / 2);
        slots[dest] = { ...stack, n: half };
        stack.n -= half;
        bagSel = null;
        g.changed();
        if(screen==='chest')broadcastChest(chestPos);
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
      if(mpRole === 'host' && mp?.connected && !mpStartSent) sendHostWorld();
      if(mpRole === 'guest' && mp?.connected && g) {
        flushGuestEdits();
        mp.send({t:'world-ready',id:mpGuestProfile?.id,inv:g.inv}).catch(()=>toast('Falha ao confirmar a entrada no mundo.'));
      }
    } else if (s === 'worldEdit') {
      if(mp?.connected && !g?.applyingRemoteEdit) queueWorldEdit([[v.x,v.y,v.z,v.b]]);
    } else if (s === 'worldBatch') {
      if(mp?.connected && !g?.applyingRemoteEdit) queueWorldEdit(v);
    } else if(s==='p2pHitMob' && mpRole==='guest' && mp?.connected) {
      mp.send({t:'mob-hit',id:v.id,weapon:v.weapon}).catch(()=>toast('Golpe não enviado.'));
    } else if(s==='p2pFeedMob' && mpRole==='guest' && mp?.connected) {
      mp.send({t:'mob-feed',id:v.id,food:v.food}).catch(()=>toast('Não foi possível alimentar o animal.'));
    } else if(s==='p2pDamage' && mpRole==='host' && mpWorldReady && mp?.connected) {
      mp.send({t:'mob-damage',n:v.n,why:v.why}).catch(()=>{});
    } else if(s==='p2pPickup' && mpRole==='guest' && mp?.connected) {
      mp.send({t:'pickup',id:v.id,cap:v.cap}).catch(()=>{});
    } else if (s === 'hud') {
      if (screen === 'play') hud();
    } else if (s === 'station') {
      [15, 83, 84].includes(v.b) ? chest(v) : inventory(true, v.b===136?14:v.b);
    } else if(s==='chestBreak') {
      broadcastChest(v,true);
    } else if (s === 'blockBroken' || s === 'blockPlaced' || s === 'hitEnemy') {
      if (s !== 'blockBroken') heldView.pulse(s === 'blockPlaced' ? 'place' : 'attack');
      touchActionEffect(s);
    } else if (s === 'hurt') {
      if (settings.noFlash) return;
      $('#hurt').style.opacity = 0.7;
      setTimeout(() => ($('#hurt').style.opacity = 0), 190);
    }
  }
  function updateP2PHud() {
    const el=$('#mpStatus');if(!el)return;
    if(!mp?.connected || !g){el.hidden=true;return;}
    el.hidden=false;
    const ping=Number.isFinite(mp.latencyMs)?mp.latencyMs+' ms':'medindo…';
    const dist=mpRemote?.active?Math.round(Math.hypot(g.p.x-mpRemote.x,g.p.z-mpRemote.z))+' m':'aguardando';
    el.textContent='◈ '+mp.remoteName+' · '+dist+' · '+ping+(mpRemote?.active?' · ♥'+Math.round(mpRemote.life??100):'');
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
    $('#touchJumpLabel').textContent = g.swimming ? 'Nadar' : 'Pular';
    const active = g.inv[g.selected];
    const rotation = active && [49, 57, 69, 46].includes(active.b) && g.buildRotation
      ? ' · Girada +' + (g.buildRotation * 90) + '°' : '';
    heldView.update(g, settings, 0, screen === 'play');
    $('#itemname').textContent = active
      ? name(active.b) +
        (Voxel.durability[active.b] ? ' · ' + active.dur + '/' + Voxel.durability[active.b] : '')
      : 'Mão livre';
    if (rotation) $('#itemname').textContent += rotation;
    let html = g.inv
      .slice(0, 9)
      .map((t, i) => slotButton(t, i, 'hot', i === g.selected, true))
      .join('');
    if ($('#hotbar')._old !== html) {
      $('#hotbar').innerHTML = html;
      $('#hotbar')._old = html;
    }
    const aimedCreature = g.aimMob();
    $('#target').textContent = aimedCreature
      ? Voxel.farmAnimals.includes(aimedCreature.kind)
        ? aimedCreature.kind + (g.inv[g.selected]?.b === Voxel.farmFood[aimedCreature.kind]
          ? ' · Usar para alimentar' : ' · Animal pacífico')
        : aimedCreature.kind || 'Raspejante'
      : g.hit?.b === 28
        ? 'R · Despertar núcleo'
        : g.hit
          ? name(g.hit.b)
          : '';
    const navTarget=Navigation.target(g);
    const nav=Navigation.guidance(g.p,navTarget);
    // Compass strip replaces the two floating arrows, but keeps their
    // shortcuts: H selects any destination; N selects the next objective.
    drawCompass(g.p.yaw,nav);
    const navBtn=$('#houseCompass'), navLabel=$('#compassTitle'),navText=$('#navDirection');
    if(navTarget && nav){
      navLabel.textContent=(navTarget.type==='home'?'⌂ ':navTarget.type==='bag'?'▣ ':'◇ ')+navTarget.label+' · '+nav.distance+' m';
      navText.textContent=nav.arrived?'✓ Você chegou':nav.turn+(nav.height?' · '+nav.height:'');
      navBtn.classList.add('tracking');
      navBtn.classList.toggle('arrived',nav.arrived);
      navBtn.setAttribute('aria-label','Navegação: '+navTarget.label+', '+nav.distance+' metros. Abrir destinos (H)');
      if(nav.arrived && navArrivedKey!==nav.key){
        navArrivedKey=nav.key;
        toast('Destino alcançado: '+navTarget.label);
      }else if(!nav.arrived && navArrivedKey===nav.key && nav.distance>18){
        navArrivedKey=null;
      }
    } else {
      navLabel.textContent=g.navMode==='off'?'Navegação desligada':'Escolher destino (H)';
      navText.textContent='H: destinos · N: objetivo';
      navBtn.classList.remove('tracking','arrived');
      navBtn.setAttribute('aria-label','Abrir navegador de destinos (H)');
    }
    $('#breakbar').hidden = !g.holding || !g.progress;
    $('#breakbar span').style.width = Math.max(0, g.progress) * 100 + '%';
    const mineFeedback = $('#mineFeedback');
    const mineProgress = Math.min(100, Math.max(0, g.progress * 100));
    mineFeedback.hidden = !document.body.classList.contains('touchgame') || !g.holding || mineProgress <= 0;
    mineFeedback.style.setProperty('--mine-progress', mineProgress + '%');
    let task = g.creative
      ? 'Construa livremente: B = blocos · G = girar · F = voo ' + (g.fly ? 'ligado' : 'desligado')
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
        'PRISMA 0.9.26 · ' +
        renderer.type +
        '\n' +
        perfFrames.snapshot().averageFPS +
        ' FPS médio · 1% low ' + perfFrames.snapshot().low1FPS + ' · p95 ' + perfFrames.snapshot().p95Ms + ' ms\n' +
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
      case 'mp-host':
        multiplayerHostPanel();
        break;
      case 'mp-join':
        multiplayerJoinPanel();
        break;
      case 'mp-rehost':
        multiplayerRehost();
        break;
      case 'mp-rejoin':
        multiplayerJoinPanel();
        break;
      case 'mp-copy-link':
        multiplayerCopyLink();
        break;
      case 'mp-share':
        multiplayerShare();
        break;
      case 'mp-copy':
        multiplayerCopy();
        break;
      case 'mp-accept':
        multiplayerAccept();
        break;
      case 'mp-answer':
        multiplayerCreateAnswer();
        break;
      case 'mp-chat-send':
        multiplayerSendChat();
        break;
      case 'mp-chat':
        multiplayerChat();
        break;
      case 'mp-exit':
      case 'mp-leave':
        if(g){g.stop();g=null;} multiplayerLeave();homeMenu();
        break;
      case 'back':
        back();
        break;
      case 'home':
        homeMenu();
        break;
      case 'load':
        loadWorld(i);
        break;
      case 'restore-world':
        if(pendingRecovery) {
          const {extra}=pendingRecovery; pendingRecovery=null;
          Saves.put(extra).then(()=>launch(extra,false)).catch(()=>{
            toast('Falha ao gravar recuperação; ela continua protegida.');
            launch(extra,false);
          });
        }
        break;
      case 'ignore-recovery':
        if(pendingRecovery) {
          const {saved}=pendingRecovery;pendingRecovery=null;
          Saves.clearEmergency(saved.id);
          launch(saved,false);
        }
        break;
      case 'exportworld':
        exportWorld(i);
        break;
      case 'importworld':
        $('#worldImportFile')?.click();
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
      case 'mp-backup-inv':
        exportGuestRecovery();
        break;
      case 'diagnostic-copy':
        copyDiagnostic();
        break;
      case 'save-now':
        if(g)g.save().then(ok=>{
          toast(ok ? 'Progresso gravado com sucesso.' : 'Gravação falhou. Verifique o espaço do navegador.');
          if(screen==='pause')pauseMenu();
        });
        break;
      case 'opgame':
        options('pause');
        break;
      case 'expeditionpause':
        guide('pause', 2);
        break;
      case 'housemenu':
        houseMenu();
        break;
      case 'nav':
        if(g) {navigateTo(node.dataset.act.slice(4));houseMenu();}
        break;
      case 'nav-pin':
        g.markNavPin(); navArrivedKey=null; houseMenu(); toast('Ponto de interesse marcado');
        break;
      case 'nav-clear-pin':
        g.clearNavPin(); navArrivedKey=null; houseMenu(); toast('Ponto removido');
        break;
      case 'house-mark':
        g.markHouse(); navArrivedKey=null; houseMenu(); toast('Casa marcada. A bússola indica o caminho!');
        break;
      case 'house-track':
        g.trackHouse=!g.trackHouse; g.changed(); houseMenu();
        break;
      case 'house-clear':
        g.clearHouse(); navArrivedKey=null; houseMenu(); toast('Marcador removido');
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
        if (g.craft(+i, bagStation)) inventory(true, bagStation);
        break;
      case 'crafttab':
        bagRecipeTab = i;
        inventory(false, bagStation);
        break;
      case 'buildmenu':
        buildMenu();
        break;
      case 'buildtab':
        buildMenu(+i);
        break;
      case 'buildrotate':
        toast('Peça girada +' + g.rotateBuild() + '°');
        resume();
        break;
      case 'buildpicklook':
        if (g.pickBuildBlock()) { resume(); toast('Bloco copiado para a barra rápida'); }
        else buildMenu();
        break;
      case 'build-undofree':
        if (g.undoFreeBlock()) { resume(); toast('Último bloco desfeito'); }
        else buildMenu();
        break;
      case 'buildplan':
        if (g.placeBlueprint(i)) { resume(); toast('Projeto pronto! Abra Construir para os próximos materiais.'); }
        else buildMenu();
        break;
      case 'build-undo':
        if (g.undoBlueprint()) { resume(); toast('Projeto desfeito'); }
        else buildMenu();
        break;
      case 'buildpick':
        if (g.creative) {
          g.inv[g.selected] = Game.slot(+i, Voxel.durability[+i] ? 1 : 64);
          g.changed();
          resume();
          toast('Pronto para construir · ' + name(+i));
        }
        break;
      case 'buildequip':
        if (g.equip(+i)) { resume(); toast('Selecionado · ' + name(+i)); }
        else buildMenu();
        break;
      case 'buildcraft':
        if (g.craft(+i)) {
          const b = Voxel.recipes[+i][0];
          g.equip(b);
          resume();
          toast('Peça fabricada e equipada · ' + name(b));
        } else buildMenu();
        break;
      case 'catalog':
        g.inv[g.selected] = Game.slot(+i, Voxel.durability[+i] ? 1 : 64);
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
      gesture = { id: e.pointerId, x: e.clientX, y: e.clientY,
        startX: e.clientX, startY: e.clientY, moved: false, mining: false };
      lookHoldTimer = setTimeout(() => {
        lookHoldTimer = null;
        if (gesture?.id === e.pointerId && !gesture.moved && g && !g.paused) {
          gesture.mining = true;
          g.holding = true;
        }
      }, 290);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      cameraHint();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (screen !== 'play' || document.pointerLockElement === canvas) return;
      if (e.pointerType === 'touch') {
        if (gesture?.id !== e.pointerId) return;
        if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) > 9) {
          gesture.moved = true;
          if (lookHoldTimer !== null) {
            clearTimeout(lookHoldTimer);
            lookHoldTimer = null;
          }
        }
        if (gesture.moved && !gesture.mining)
          g.look((e.clientX - gesture.x) * 1.1 * (settings.touchSensitivity ?? 1.15),
            (e.clientY - gesture.y) * 1.1 * (settings.touchSensitivity ?? 1.15));
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
    if (gesture?.id === e.pointerId) {
      const tap = e.pointerType === 'touch' && !gesture.moved && !gesture.mining &&
        Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) < 10;
      releaseGesture();
      if (tap && g && screen === 'play' && !g.paused) g.use();
    }
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
    } else if (chatUnlockPending) {chatUnlockPending=false;}
    else if (lockedBefore && screen === 'play' && !g.paused) pauseMenu();
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
    if(!$('#mpChatComposer').hidden) {
      if(e.code==='Escape'){e.preventDefault();closeQuickChat();renderer?.canvas?.focus({preventScroll:true});}
      else if(e.target===$('#mpChatQuickInput'))e.stopPropagation();
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
      case 'KeyT':
        if(mp?.connected)multiplayerChat();
        break;
      case 'KeyE':
        inventory();
        break;
      case 'KeyB':
        buildMenu();
        break;
      case 'KeyG':
        toast('Peça girada +' + g.rotateBuild() + '°');
        break;
      case 'KeyP':
        if (g.pickBuildBlock()) toast('Bloco copiado para a barra rápida');
        break;
      case 'KeyZ':
        if (g.undoFreeBlock()) toast('Último bloco desfeito');
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
      case 'KeyH':
        houseMenu();
        break;
      case 'KeyN':
        navigateTo(g.navMode==='home'?'objective':g.house?'home':'objective');
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
  // A true two-finger layout: left joystick moves, right finger looks/acts.
  const stick = $('#movePad');
  const knob = $('#moveKnob');
  function updateStick(e) {
    if (!g || joystickPointer !== e.pointerId) return;
    const rect = stick.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    const radius = Math.min(rect.width, rect.height) * 0.34;
    const distance = Math.hypot(x, y);
    const scale = Math.min(1, distance / radius);
    const nx = distance ? x / distance : 0;
    const ny = distance ? y / distance : 0;
    const value = Math.max(0, (scale - 0.12) / 0.88);
    g.touchMove.side = nx * value;
    g.touchMove.forward = -ny * value;
    knob.style.transform = `translate(${nx * scale * radius}px, ${ny * scale * radius}px)`;
  }
  stick.addEventListener('pointerdown', (e) => {
    if (!g || g.paused || screen !== 'play' || joystickPointer !== null) return;
    e.preventDefault();
    joystickPointer = e.pointerId;
    stick.classList.add('engaged');
    try { stick.setPointerCapture(e.pointerId); } catch {}
    updateStick(e);
    const rect = stick.getBoundingClientRect();
    const forwardTap = e.clientY < rect.top + rect.height * 0.39;
    const now = performance.now();
    if (forwardTap && now - lastForwardTap < 350) {
      g.touchSprint = true;
      const sprintButton = $('#touch [data-touch="sprint"]');
      sprintButton.setAttribute('aria-pressed', 'true');
      haptic(10);
    }
    lastForwardTap = forwardTap ? now : 0;
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId === joystickPointer) { e.preventDefault(); updateStick(e); }
  });
  function releaseStick(e) {
    if (joystickPointer !== e.pointerId) return;
    joystickPointer = null;
    stick.classList.remove('engaged');
    knob.style.transform = '';
    if (g) { g.touchMove.forward = 0; g.touchMove.side = 0; }
  }
  stick.addEventListener('pointerup', releaseStick);
  stick.addEventListener('pointercancel', releaseStick);
  stick.addEventListener('lostpointercapture', releaseStick);
  $$('#touch button').forEach((b) => {
    const code = b.dataset.touch;
    const release = (e) => {
      if (code === 'mine' && miningPointer === e.pointerId) {
        miningPointer = null;
        if (g) g.resetMining();
      }
      if (code === 'use' && buildingPointer === e.pointerId) buildingPointer = null;
      if (code === 'jump' && g) g.keys.delete('Space');
      b.classList.remove('pressed');
    };
    b.addEventListener('pointerdown', (e) => {
      if (!g || g.paused || screen !== 'play') return;
      e.preventDefault();
      Sound.start();
      try { b.setPointerCapture(e.pointerId); } catch {}
      b.classList.add('pressed');
      if (code === 'camera') changeView();
      else if (code === 'journal') guide('play', 2);
      else if (code === 'mine' && miningPointer === null) {
        miningPointer = e.pointerId;
        g.holding = true;
      } else if (code === 'use') {
        g.use(true);
        buildingPointer = e.pointerId;
        buildRepeatAt = performance.now() + 340;
      }
      else if (code === 'rotate') toast('Peça girada +' + g.rotateBuild() + '°');
      else if (code === 'build') buildMenu();
      else if (code === 'bag') inventory();
      else if (code === 'jump') g.keys.add('Space');
      else if (code === 'sprint') {
        g.touchSprint = !g.touchSprint;
        b.setAttribute('aria-pressed', String(g.touchSprint));
      } else if (code === 'crouch') {
        g.touchCrouch = !g.touchCrouch;
        b.setAttribute('aria-pressed', String(g.touchCrouch));
      }
    });
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('lostpointercapture', release);
  });
  // Swiping the quickbar switches slots while preserving ordinary tap selection.
  $('#hotbar').addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && screen === 'play' && g)
      hotbarSwipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', (e) => {
    if (!hotbarSwipe || hotbarSwipe.id !== e.pointerId) return;
    const dx = e.clientX - hotbarSwipe.x;
    const dy = e.clientY - hotbarSwipe.y;
    hotbarSwipe = null;
    if (g && screen === 'play' && !g.paused && Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      g.selected = (g.selected + (dx < 0 ? 1 : 8)) % 9;
      hud();
      haptic(8);
    }
  });
  window.addEventListener('pointercancel', (e) => {
    if (hotbarSwipe?.id === e.pointerId) hotbarSwipe = null;
  });
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touchgame');
  applyMobilePrefs();
  function emergencyCheckpoint() {
    if(!g?.alive || g.temporary || mpRole==='guest')return false;
    let ok=false;
    try { ok=Saves.emergency(g.snapshot()); } catch {}
    if(!ok && !warnedEmergency) {
      warnedEmergency=true;
      if(!document.hidden)toast('Sem espaço para recuperação de emergência; faça um backup do mundo.');
    }
    return ok;
  }
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) { emergencyCheckpoint(); saveGuestCheckpoint(); if(g?.ready && mpRole!=='guest')g.save(); }
    if (document.hidden && g && screen === 'play') pauseMenu();
  });
  window.addEventListener('blur', () => {
    if (g && screen === 'play') pauseMenu();
  });
  window.addEventListener('pagehide', () => {
    emergencyCheckpoint();
    saveGuestCheckpoint();
    if(mpRole==='host' && g?.ready)g.save();
    else if (g) g.save();
    mp?.close();
  });
  function frame(now) {
    requestAnimationFrame(frame);
    const frameSeconds = (now - (lastFrame || now)) / 1000;
    const dt = Math.min(0.1, frameSeconds);
    lastFrame = now;
    if (!g || !g.ready || g.paused) return;
    if (!document.hidden) perfFrames.push(frameSeconds);
    // Sync local journal is a best-effort safety net for abrupt tab closures.
    // Normal IndexedDB autosaves remain the authoritative persistent record.
    if(!g.temporary && mpRole!=='guest' && now-lastEmergencyAt>15000) {
      lastEmergencyAt=now;
      emergencyCheckpoint();
    }
    // Mobile dynamic resolution: never lower the selected quality setting;
    // just temporarily render fewer pixels when FPS remains low.
    if(document.body.classList.contains('touchgame') && now-lastMobilePerfAt>4500) {
      lastMobilePerfAt=now;
      const current=renderer.dynamicScale || 1;
      renderer.dynamicScale=fps<27 ? Math.max(.72,current-.08) :
        fps>48 ? Math.min(1,current+.04) : current;
    }
    if (mouseActive && (edgeX || edgeY) && !document.pointerLockElement)
      g.look(edgeX * 820 * dt, edgeY * 590 * dt);
    // Hold-to-build, capped to ~4 blocks/sec to avoid excessive chunk rebuilding.
    if (buildingPointer !== null && now >= buildRepeatAt && g.preview()?.valid) {
      g.use(true);
      buildRepeatAt = now + 260;
    }
    fps = fps * 0.94 + (1 / Math.max(0.001, dt)) * 0.06;
    acc += dt;
    while (acc >= 1 / 60) {
      g.tick(1 / 60);
      acc -= 1 / 60;
    }
    if (mp?.connected && now-mpLastPose>95) {
      mpLastPose=now; const p=g.p;
      mp.sendFast({t:'pose',seq:++mpPoseSeq,x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2),yaw:+p.yaw.toFixed(2),moving:g.moveSpeed>0.1,crouch:!!g.crouch,sprint:g.moveSpeed>5,
        life:Math.round(p.life),held:g.inv[g.selected]?.b || 0,swing:g.attackCool>0});
    }
    if(mpRole==='host' && mpWorldReady && mp?.connected && now-mpLastEntity>320) {
      mpLastEntity=now;
      mp.sendFast({t:'entities',seq:++mpEntitySeq,
        mobs:g.networkMobState(),drops:g.networkDropState()});
    }
    smoothRemote(dt,now);
    if(mp?.connected && now-mpLastHud>1200) {mpLastHud=now;updateP2PHud();}
    // Host and solo games checkpoint positions, hunger, day/night and all world
    // edits regularly, even when no block was placed during this session.
    if(!g.temporary && now-mpLastHostCheckpoint>(mpRole==='host' ? 30000 : 45000)) {
      mpLastHostCheckpoint=now;
      g.save().catch(()=>{});
    }
    if(mpRole==='guest' && mpWorldReady && now-mpLastGuestSync>4500) {
      mpLastGuestSync=now;guestInventorySync();saveGuestCheckpoint();
    }
    renderer.draw(g, settings, Math.min(1, acc * 60));
    heldView.update(g, settings, dt, screen === 'play');
  }
  if(mpInviteFromUrl)setTimeout(()=>multiplayerJoinPanel(),120);
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol !== 'file:')
    navigator.serviceWorker.register('./offline.js').catch(() => {});
})();
