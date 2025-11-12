export function initFallback(scene){
  const container = document.getElementById('game');
  container.innerHTML = '';
  container.style.position = 'relative';
  // simple runtime state
  const state = {
    vars: {},
    inventory: []
  };
  // start with a fresh state on each page load (no localStorage persistence)

  // background image element (covers whole game area)
  const bgEl = document.createElement('img');
  bgEl.style.position = 'absolute';
  bgEl.style.inset = '0';
  bgEl.style.width = '100%';
  bgEl.style.height = '100%';
  bgEl.style.objectFit = 'cover';
  bgEl.style.zIndex = '0';
  bgEl.style.pointerEvents = 'none';
  container.appendChild(bgEl);

  // object layer sits above background and below UI
  const objectLayer = document.createElement('div');
  objectLayer.style.position = 'absolute';
  objectLayer.style.inset = '0';
  objectLayer.style.zIndex = '5';
  objectLayer.style.pointerEvents = 'none';
  container.appendChild(objectLayer);

  // character layer (center-bottom) - above objects but below UI
  const charLayer = document.createElement('div');
  charLayer.style.position = 'absolute';
  charLayer.style.inset = '0';
  charLayer.style.zIndex = '6';
  charLayer.style.pointerEvents = 'none';
  container.appendChild(charLayer);

  // audio elements
  const sfxAudio = document.createElement('audio');
  sfxAudio.preload = 'auto';
  container.appendChild(sfxAudio);

  // inventory UI (simple)
  const inventoryUI = document.createElement('div');
  inventoryUI.style.position = 'absolute';
  inventoryUI.style.top = '10px';
  inventoryUI.style.right = '10px';
  inventoryUI.style.zIndex = '20';
  inventoryUI.style.background = 'rgba(0,0,0,0.5)';
  inventoryUI.style.padding = '8px';
  inventoryUI.style.borderRadius = '6px';
  inventoryUI.style.minWidth = '160px';
  inventoryUI.style.color = '#fff';
  inventoryUI.innerHTML = '<strong>Inventory</strong><div id="inv-list"></div>';
  container.appendChild(inventoryUI);

  // reset button to clear persisted demo state
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset demo';
  resetBtn.style.display = 'block';
  resetBtn.style.marginTop = '8px';
  resetBtn.onclick = ()=>{
    // reset in-memory state (no localStorage used)
    state.vars = {};
    state.inventory = [];
    updateInventoryUI();
    renderNode(current);
    console.log('[fallback] demo state reset (in-memory)');
  };
  inventoryUI.appendChild(resetBtn);

  const wrap = document.createElement('div');
  wrap.style.color = '#fff';
  wrap.style.padding = '18px';
  wrap.style.fontFamily = 'Segoe UI, Arial, sans-serif';
  wrap.style.boxSizing = 'border-box';
  wrap.style.height = '100%';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.justifyContent = 'flex-end';
  wrap.style.position = 'relative';
  wrap.style.zIndex = '10';
  // allow pointer events to pass through transparent parts of wrap so objects below can be clicked
  wrap.style.pointerEvents = 'none';

  const nameBox = document.createElement('div');
  nameBox.style.fontWeight = '700';
  nameBox.style.marginBottom = '6px';
  nameBox.classList.add('vn-name');

  const textBox = document.createElement('div');
  textBox.style.background = 'rgba(0,0,0,.6)';
  textBox.style.padding = '12px';
  textBox.style.borderRadius = '6px';
  textBox.classList.add('vn-textbox');

  const choicesDiv = document.createElement('div');
  choicesDiv.style.marginTop = '8px';
  choicesDiv.style.display = 'flex';
  choicesDiv.style.flexWrap = 'wrap';

  wrap.appendChild(nameBox);
  wrap.appendChild(textBox);
  wrap.appendChild(choicesDiv);
  container.appendChild(wrap);

  // fullscreen button
  const fsBtn = document.createElement('button');
  fsBtn.textContent = '⤢';
  fsBtn.title = 'Fullscreen';
  fsBtn.style.position = 'absolute';
  fsBtn.style.left = '10px';
  fsBtn.style.top = '10px';
  fsBtn.style.zIndex = '60';
  fsBtn.style.background = 'rgba(0,0,0,0.35)';
  fsBtn.style.borderRadius = '6px';
  fsBtn.onclick = ()=>{ if (container.requestFullscreen) container.requestFullscreen(); else alert('Fullscreen not supported'); };
  container.appendChild(fsBtn);

  // only enable pointer events on the interactive UI elements (so clicks elsewhere reach objects)
  nameBox.style.pointerEvents = 'auto';
  textBox.style.pointerEvents = 'auto';
  choicesDiv.style.pointerEvents = 'auto';

  if (!scene || !scene.nodes){
    textBox.textContent = 'No scene found — fallback renderer. Přidej scenes/scene1.json.';
    return;
  }

  let current = 'start';

  function updateInventoryUI(){
    const list = inventoryUI.querySelector('#inv-list');
    list.innerHTML = '';
    if (!state.inventory.length) { list.textContent = '(prázdné)'; return; }
    state.inventory.forEach(item=>{
      const it = document.createElement('div');
      it.classList.add('inv-item');
      if (item.img){
        const im = document.createElement('img'); im.src = item.img;
        it.appendChild(im);
      }
      const t = document.createElement('div'); t.textContent = item.name || item.id;
      it.appendChild(t);
      list.appendChild(it);
    });
    console.log('[fallback] inventory updated:', state.inventory.map(i=>i.id || i.name));
  }

  function persistState(){
    try{ localStorage.setItem('renjs_fallback_state', JSON.stringify(state)); }catch(e){ console.warn('Persist failed', e); }
  }

  // remove an object from the current scene (animation + mark as picked)
  function removeObject(obj){
    if (!obj || !obj.id) return;
    try{ state.vars['picked_'+obj.id] = true; }catch(e){}
    // animate and remove any DOM nodes with this data-obj-id
    const nodes = objectLayer.querySelectorAll(`[data-obj-id="${obj.id}"]`);
    console.log('[fallback] removeObject called for', obj.id, 'found', nodes.length);
    nodes.forEach(n=>{
      try{
        n.style.transition = 'transform 260ms ease, opacity 260ms ease';
        n.style.transformOrigin = '50% 50%';
        n.style.transform = 'scale(0.3)';
        n.style.opacity = '0';
        setTimeout(()=>{ try{ n.remove(); }catch(e){} }, 300);
      }catch(e){ try{ n.remove(); }catch(_){} }
    });
    persistState();
  }

  // small transient toast for quick feedback
  function showToast(txt, ms = 1400){
    try{
      const t = document.createElement('div');
      t.textContent = txt;
      t.style.position = 'absolute';
      t.style.left = '50%';
      t.style.top = '12%';
      t.style.transform = 'translateX(-50%)';
      t.style.padding = '8px 12px';
      t.style.background = 'rgba(0,0,0,0.75)';
      t.style.color = '#fff';
      t.style.borderRadius = '6px';
      t.style.zIndex = '80';
      t.style.fontSize = '14px';
      container.appendChild(t);
  setTimeout(()=>{ t.style.transition = 'opacity 220ms ease'; t.style.opacity = '0'; setTimeout(()=>{ try{ t.remove(); }catch(e){} }, 220); }, ms);
    }catch(e){ console.warn('toast failed', e); }
  }

  // character rendering based on state.vars.clothes
  // renderCharacter optionally accepts a character spec from the node
  // spec fields: visible (bool), img (string), clothes (string), x, y, anchor, width, height, z
  let currentNodeCharSpec = null;
  // map logical clothes values to image files (easy to extend)
  const CLOTHES_MAP = {
    'pyjamas': 'assets/images/mc_pyzamo.png',
    'backpack': 'assets/images/mc_batoh.png',
    'dressed': 'assets/images/mc.png'
  };

  function renderCharacter(spec){
    currentNodeCharSpec = spec || null;
    charLayer.innerHTML = '';
    // if node explicitly hides character
    if (spec && spec.visible === false) return;
    // determine source: priority - spec.img -> spec.clothes -> state.vars.clothes -> default
  // prefer the current state variable first (so setVar('clothes') overrides node default)
  const stateCloth = state.vars.clothes;
  const specCloth = spec && spec.clothes;
  const nodeClothesMap = spec && spec.clothesMap;
  const nodeDefault = spec && spec.defaultClothes;
  let src = null;
  // resolution order (highest priority first):
  // 1) node.clothesMap[state.vars.clothes]
  // 2) global CLOTHES_MAP[state.vars.clothes]
  // 3) node.clothesMap[spec.clothes]
  // 4) global CLOTHES_MAP[spec.clothes]
  // 5) node.img
  // 6) node.clothesMap[node.defaultClothes] or global CLOTHES_MAP[node.defaultClothes]
  // 7) fallback default
  if (stateCloth && nodeClothesMap && nodeClothesMap[stateCloth]) src = nodeClothesMap[stateCloth];
  else if (stateCloth && CLOTHES_MAP[stateCloth]) src = CLOTHES_MAP[stateCloth];
  else if (specCloth && nodeClothesMap && nodeClothesMap[specCloth]) src = nodeClothesMap[specCloth];
  else if (specCloth && CLOTHES_MAP[specCloth]) src = CLOTHES_MAP[specCloth];
  else if (spec && spec.img) src = spec.img;
  else if (nodeDefault && nodeClothesMap && nodeClothesMap[nodeDefault]) src = nodeClothesMap[nodeDefault];
  else if (nodeDefault && CLOTHES_MAP[nodeDefault]) src = CLOTHES_MAP[nodeDefault];
  else src = CLOTHES_MAP['dressed'];
    if (!src) return;
    const el = document.createElement('img');
    el.src = src;
    el.style.position = 'absolute';
    // position
    if (spec && spec.x) el.style.left = parseCoord(spec.x, false);
    else el.style.left = '50%';
    if (spec && spec.y) el.style.top = parseCoord(spec.y, true);
    else el.style.bottom = '6%';
    // sizing
    if (spec && spec.width) el.style.width = (typeof spec.width === 'number' ? spec.width + 'px' : spec.width);
    else el.style.width = '28%';
    if (spec && spec.height) el.style.height = (typeof spec.height === 'number' ? spec.height + 'px' : spec.height);
    el.style.maxWidth = '360px';
    el.style.zIndex = (spec && spec.z) ? String(spec.z) : '6';
    el.style.pointerEvents = 'none';
    el.style.transition = 'opacity 240ms ease, transform 240ms ease';
    // anchor
    if (spec && spec.anchor) applyAnchor(el, spec.anchor);
    else applyAnchor(el, '50% 100%');
    charLayer.appendChild(el);
  }

  function clearObjects(){
    objectLayer.innerHTML = '';
    objectLayer.style.pointerEvents = 'none';
  }

  function parseCoord(v, isY){
    if (v === undefined || v === null) return '0%';
    if (typeof v === 'string') return v;
    if (typeof v === 'number'){
      if (v > 0 && v <= 1) return (v*100) + '%';
      return v + 'px';
    }
    return '0%';
  }

  // Evaluate a condition object. Supports multiple shapes:
  // { var: 'name', equals: value }
  // { fn: 'equals', args: ['varName', value] }
  // { fn: 'and', args: [cond1, cond2] }
  const CONDITION_FNS = {
    equals: (varName, value) => (state.vars[varName] === value),
    notEquals: (varName, value) => (state.vars[varName] !== value),
    has: (varName) => !!state.vars[varName],
    not: (cond) => !evaluateCondition(cond),
    and: (...conds) => conds.every(c => evaluateCondition(c)),
    or: (...conds) => conds.some(c => evaluateCondition(c))
  };

  function evaluateCondition(cond){
    if (!cond) return true;
    // simple var/equals shape
    if (cond.var){
      const val = state.vars[cond.var];
      if (cond.equals !== undefined) return val === cond.equals;
      if (cond.notEquals !== undefined) return val !== cond.notEquals;
      return !!val;
    }
    // function shape
    if (cond.fn){
      const fn = CONDITION_FNS[cond.fn];
      if (!fn) { console.warn('Unknown condition fn', cond.fn); return false; }
      const args = (cond.args || []).map(a=>{
        // if arg is a condition object, evaluate it
        if (a && typeof a === 'object' && (a.fn || a.var)) return evaluateCondition(a);
        return a;
      });
      return fn.apply(null, args);
    }
    return false;
  }

  function applyAnchor(el, anchor){
    if (!anchor) return;
    const parts = String(anchor).split(/\s+/);
    const ax = parts[0] || '0%';
    const ay = parts[1] || '0%';
    // convert "50% 100%" => translate(-50%,-100%)
    el.style.transform = `translate(-${ax}, -${ay})`;
    el.style.transformOrigin = '0 0';
  }

  async function playSFX(src){
    if (!src) return;
    try{
      sfxAudio.src = src;
      await sfxAudio.play();
      return;
    }catch(e){
      // fallback to WebAudio beep if file cannot be played
      try{
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 880;
        o.connect(g); g.connect(ctx.destination);
        g.gain.value = 0.0001;
        // small ramp to audible for short click
        g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        o.start();
        setTimeout(()=>{ g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.02); try{ o.stop(); }catch(e){} ctx.close(); }, 120);
      }catch(e2){ console.warn('WebAudio fallback failed', e2); }
    }
  }

  function handleAction(action, obj){
    if (!action) return;
    if (Array.isArray(action)){
      action.forEach(a=> handleAction(a, obj));
      return;
    }
    // condition check: if fails, run onFail (action.onFail) or show toast/play failSFX
    if (action.condition){
      if (!evaluateCondition(action.condition)){
        if (action.onFail){
          try{ handleAction(action.onFail, obj); }catch(e){ console.warn('action.onFail failed', e); }
        } else {
          if (action.failSFX) playSFX(action.failSFX);
          if (action.failText) showToast(action.failText);
          else showToast('Není možné tuto akci provést nyní.');
        }
        return;
      }
    }
    // support a simple remove flag: remove the clicked object from the scene without adding to inventory
    if (action.remove && obj){
      try{ removeObject(obj); }catch(e){ console.warn('removeObject failed', e); }
    }
    switch(action.type){
      case 'remove':
        if (obj) removeObject(obj);
        if (action.goto) renderNode(action.goto);
        if (action.playSFX) playSFX(action.playSFX);
        break;
      case 'goto':
        if (action.target) renderNode(action.target);
        break;
      case 'pickup':
        // add to inventory and remove element with animation
        {
          const id = action.id || (obj && obj.id) || ('item_'+Date.now());
          const name = action.name || obj && obj.name || id;
          const img = obj && obj.img;
          console.log('[fallback] pickup triggered:', id, name);
          state.inventory.push({ id, name, img });
          // mark picked so it won't reappear
          if (obj && obj.id) state.vars['picked_'+obj.id] = true;
          updateInventoryUI();
          persistState();
          console.log('[fallback] inventory now:', state.inventory.map(i=>i.id || i.name));
          // animate removal if element present
          const el = objectLayer.querySelector(`[data-obj-id="${obj.id}"]`);
          if (el){
            el.style.transition = 'transform 260ms ease, opacity 260ms ease';
            el.style.transformOrigin = '50% 50%';
            el.style.transform = 'scale(0.3)';
            el.style.opacity = '0';
            setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 300);
          }
          // also remove any hitbox with same data-obj-id
          const hb = objectLayer.querySelectorAll(`[data-obj-id="${obj.id}"]`);
          hb.forEach(n=>{ try{ n.remove(); }catch(e){} });
          if (action.goto) renderNode(action.goto);
          if (action.playSFX) playSFX(action.playSFX);
        }
        break;
      case 'setVar':
        state.vars[action.name] = action.value;
          // if clothing or any character related var changed, re-render character layer using current node spec
          if (action.name === 'clothes' || (action.name && (String(action.name).toLowerCase().includes('clothes') || String(action.name).toLowerCase().includes('character')))){
            try{ renderCharacter(currentNodeCharSpec); }catch(e){ console.warn('renderCharacter failed', e); }
        }
        break;
      case 'playSFX':
        playSFX(action.src || action);
        break;
      case 'inspect':
        // simple inspection: show a temporary modal text
        alert(action.text || obj.name || 'Inspect');
        break;
      default:
        console.log('Unknown action', action);
    }
  }

  // context menu for using inventory items on objects
  function showUseMenu(obj, clientX, clientY){
    const existing = document.getElementById('use-menu'); if (existing) existing.remove();
    const menu = document.createElement('div');
    menu.id = 'use-menu';
    menu.style.position = 'absolute';
    // convert client coords to container-relative
    const rect = container.getBoundingClientRect();
    menu.style.left = (clientX - rect.left) + 'px';
    menu.style.top = (clientY - rect.top) + 'px';
    menu.style.background = 'rgba(0,0,0,0.85)';
    menu.style.border = '1px solid rgba(255,255,255,0.08)';
    menu.style.padding = '6px';
    menu.style.zIndex = '60';
    menu.style.color = '#fff';
    if (!state.inventory.length){ menu.textContent = 'Inventář prázdný'; container.appendChild(menu); setTimeout(()=>menu.remove(), 1200); return; }
    state.inventory.forEach(it=>{
      const row = document.createElement('div'); row.style.cursor = 'pointer'; row.style.padding = '4px'; row.textContent = it.name || it.id;
      row.addEventListener('click', ()=>{
        // find onUse mapping on object
        if (obj.onUse && obj.onUse[it.id]){
          handleAction(obj.onUse[it.id], obj);
        } else {
          // default: alert
          alert('Použití ' + it.name + ' na ' + (obj.name || obj.id) + ' nemá efekt.');
        }
        menu.remove();
      });
      menu.appendChild(row);
    });
    container.appendChild(menu);
    // auto remove on click elsewhere
    const rm = (e)=>{ if (!menu.contains(e.target)) menu.remove(); window.removeEventListener('click', rm); };
    window.addEventListener('click', rm);
  }

  function renderNode(id){
    const node = scene.nodes[id];
    if (!node){ textBox.textContent = 'Node "'+id+'" not found.'; return; }
    // background handling: if node.bg present, set image src
    if (node.bg){
      bgEl.src = node.bg;
      bgEl.style.display = '';
    } else {
      // hide background if none
      bgEl.style.display = 'none';
      bgEl.src = '';
    }
    // clear existing objects
    clearObjects();
    objectLayer.style.pointerEvents = 'auto';
    // render objects if any
    (node.objects || []).forEach(obj=>{
        // condition for object visibility
        if (obj.condition){
          if (!evaluateCondition(obj.condition)) return;
        }
      // hide if previously picked
      if (obj.id && state.vars['picked_'+obj.id]) return;
      const el = document.createElement('img');
      el.dataset.objId = obj.id;
      el.src = obj.img || '';
      el.style.position = 'absolute';
      el.style.left = parseCoord(obj.x, false);
      el.style.top = parseCoord(obj.y, true);
      if (obj.width) el.style.width = (typeof obj.width === 'number' ? obj.width + 'px' : obj.width);
      if (obj.height) el.style.height = (typeof obj.height === 'number' ? obj.height + 'px' : obj.height);
      if (obj.z) el.style.zIndex = String(obj.z);
      // hover/interactive styling
      el.style.transition = 'transform 160ms ease, filter 160ms ease, opacity 220ms ease';
      if (obj.interactive) {
        el.style.cursor = 'pointer';
        el.addEventListener('mouseenter', ()=>{ el.style.transform = 'scale(1.06)'; el.style.filter = 'drop-shadow(0 10px 18px rgba(0,0,0,.6))'; });
        el.addEventListener('mouseleave', ()=>{ el.style.transform = ''; el.style.filter = ''; });
      }
      applyAnchor(el, obj.anchor);
      // hitbox support
      if (obj.hitbox){
        const hb = document.createElement('div');
        hb.style.position = 'absolute';
        hb.style.left = `calc(${parseCoord(obj.x,false)}${obj.hitbox.x ? (' + '+obj.hitbox.x+'px') : ''})`;
        hb.style.top = `calc(${parseCoord(obj.y,true)}${obj.hitbox.y ? (' + '+obj.hitbox.y+'px') : ''})`;
        hb.style.width = (obj.hitbox.w ? (obj.hitbox.w+'px') : (obj.width || '32px'));
        hb.style.height = (obj.hitbox.h ? (obj.hitbox.h+'px') : (obj.height || '32px'));
        hb.style.zIndex = obj.z || 5;
        hb.style.background = 'transparent';
        hb.style.cursor = 'pointer';
        hb.dataset.objId = obj.id;
        hb.addEventListener('click', ()=> handleAction(obj.action, obj));
        hb.addEventListener('mouseenter', ()=>{ hb.style.outline = '2px solid rgba(43,144,255,0.18)'; });
        hb.addEventListener('mouseleave', ()=>{ hb.style.outline = ''; });
        hb.addEventListener('contextmenu', (ev)=>{ ev.preventDefault(); showUseMenu(obj, ev.clientX, ev.clientY); });
        objectLayer.appendChild(hb);
      } else if (obj.interactive){
        el.addEventListener('click', ()=> handleAction(obj.action, obj));
        el.addEventListener('contextmenu', (ev)=>{ ev.preventDefault(); showUseMenu(obj, ev.clientX, ev.clientY); });
      }
      objectLayer.appendChild(el);
    });
    nameBox.textContent = node.speaker || '';
    textBox.textContent = node.text || '';
    choicesDiv.innerHTML = '';
    if (node.choices && node.choices.length){
      node.choices.forEach(c=>{
        const btn = document.createElement('button');
        btn.textContent = c.text;
        btn.style.marginRight = '8px';
        btn.onclick = ()=>{ renderNode(c.target); };
        choicesDiv.appendChild(btn);
      });
    } else if (node.next){
      const btn = document.createElement('button');
      btn.textContent = 'Pokračovat';
      btn.onclick = ()=>{ renderNode(node.next); };
      choicesDiv.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.textContent = 'Konec';
      btn.onclick = ()=>{ textBox.textContent = 'Konec scény.'; choicesDiv.innerHTML = ''; };
      choicesDiv.appendChild(btn);
    }
    // determine character spec for this node (not treated as an object)
    const charSpec = node.character || null;
    try{ renderCharacter(charSpec); }catch(e){ console.warn('renderCharacter failed', e); }
  }

  renderNode(current);
}
