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

  const TRANSFORM_DATA_KEY = '__rnTransformParts';
  const TRANSFORM_ORDER = ['base', 'hover', 'animation', 'effect'];

  function setTransformPart(el, part, value){
    if (!el) return;
    if (!el[TRANSFORM_DATA_KEY]) el[TRANSFORM_DATA_KEY] = {};
    el[TRANSFORM_DATA_KEY][part] = value || '';
    const parts = el[TRANSFORM_DATA_KEY];
    const dynamicKeys = Object.keys(parts).filter(k => !TRANSFORM_ORDER.includes(k));
    const order = TRANSFORM_ORDER.concat(dynamicKeys);
    const combined = order.map(key => parts[key]).filter(Boolean).join(' ');
    el.style.transform = combined;
  }

  // navigate between nodes with optional transition (default: fade)
  function navigateTo(id, opts){
    if (!id) return;
    // prefer explicit opts, otherwise use target node's `transition` config if present
    let ms = 420;
    let trans = 'fade';
    const nodeCfg = (scene && scene.nodes && scene.nodes[id]) ? scene.nodes[id].transition : null;
    if (nodeCfg && nodeCfg.ms !== undefined && Number(nodeCfg.ms)) ms = Number(nodeCfg.ms);
    if (nodeCfg && nodeCfg.type) trans = String(nodeCfg.type);
    if (opts){
      if (opts.ms !== undefined && Number(opts.ms)) ms = Number(opts.ms);
      if (opts.transition) trans = String(opts.transition);
    }
    if (trans === 'fade'){
      try{
        container.style.transition = `opacity ${ms}ms ease`;
        container.style.pointerEvents = 'none';
        container.style.opacity = '0';
      }catch(e){ /* ignore */ }
      setTimeout(()=>{
        try{ renderNode(id); }catch(e){ console.warn('navigateTo render failed', e); }
        try{
          // fade back in
          container.style.opacity = '1';
          setTimeout(()=>{ try{ container.style.transition = ''; container.style.pointerEvents = 'auto'; }catch(e){} }, Math.max(60, ms));
        }catch(e){}
      }, ms);
    } else {
      renderNode(id);
    }
  }

  function getAnimationProgress(el){
    if (!el || !el.__animData) return null;
    const animData = el.__animData;
    const parentRect = (animData.parentRect && animData.parentRect.width)
      ? animData.parentRect
      : ((el.offsetParent && typeof el.offsetParent.getBoundingClientRect === 'function')
        ? el.offsetParent.getBoundingClientRect()
        : objectLayer.getBoundingClientRect());
    if (!parentRect || (!parentRect.width && !parentRect.height)) return null;
    const currentRect = el.getBoundingClientRect();
    const startRect = animData.startRect;
    const endRect = animData.endRect;
    if (!currentRect || !startRect || !endRect) return null;
    const targetX = endRect.left - parentRect.left;
    const targetY = endRect.top - parentRect.top;
    const currentX = currentRect.left - parentRect.left;
    const currentY = currentRect.top - parentRect.top;
    const startX = startRect.left - parentRect.left;
    const startY = startRect.top - parentRect.top;
    const totalX = startX - targetX;
    const totalY = startY - targetY;
    const remainingDist = Math.hypot(currentX - targetX, currentY - targetY);
    const totalDist = Math.max(1e-5, Math.hypot(totalX, totalY));
    const fraction = Math.min(1, Math.max(0, remainingDist / totalDist));
    return { fraction, parentRect };
  }

  function composeTransition(baseTransition, transformSpec){
    const baseParts = (baseTransition || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => !s.toLowerCase().startsWith('transform'));
    const pieces = [`transform ${transformSpec}`].concat(baseParts);
    return pieces.join(', ');
  }

  function setupRotation(el, obj, rotateCfg){
    if (!el || !rotateCfg) return;
    try{
      if (el.__rotationData && el.__rotationData.stop){
        el.__rotationData.stop();
      }
      const rawDuration = rotateCfg.duration ?? rotateCfg.ms ?? rotateCfg.period ?? rotateCfg.time;
      const parsedDuration = Number(rawDuration);
      const baseDuration = (Number.isFinite(parsedDuration) && parsedDuration > 0)
        ? parsedDuration
        : 1200;
      const rawDegrees = rotateCfg.degrees ?? rotateCfg.angle ?? rotateCfg.range ?? rotateCfg.turns;
      const parsedDegrees = Number(rawDegrees);
      const degreesPerCycle = (Number.isFinite(parsedDegrees) && parsedDegrees !== 0)
        ? parsedDegrees
        : 360;
      const directionRaw = rotateCfg.direction || rotateCfg.dir || rotateCfg.rotationDirection;
      const direction = (directionRaw === 'ccw' || directionRaw === 'counterclockwise' || directionRaw === 'anticlockwise' || directionRaw === -1)
        ? -1
        : 1;
      const offsetRaw = (rotateCfg.startDeg !== undefined) ? rotateCfg.startDeg : rotateCfg.offset;
      const parsedOffset = Number(offsetRaw);
      const offset = (Number.isFinite(parsedOffset)) ? parsedOffset : 0;
      const speedKey = obj && obj.id ? 'speed_' + obj.id : null;
      const initialFactorRaw = speedKey && state.vars && state.vars[speedKey] !== undefined
        ? Number(state.vars[speedKey])
        : 1;
      const speedFactor = (Number.isFinite(initialFactorRaw) && initialFactorRaw > 0) ? initialFactorRaw : 1;
      const rafFn = (typeof window !== 'undefined' && window.requestAnimationFrame) ? window.requestAnimationFrame.bind(window)
        : (cb)=>setTimeout(()=>cb(Date.now()), 16);
      const cafFn = (typeof window !== 'undefined' && window.cancelAnimationFrame) ? window.cancelAnimationFrame.bind(window)
        : (id)=>clearTimeout(id);
      const rotData = {
        baseDuration,
        degreesPerCycle,
        direction,
        offset,
        speedFactor,
        progress: 0,
        lastTs: null,
        running: true,
        rafId: null
      };
      const step = (ts)=>{
        if (!rotData.running) return;
        const hasDocument = (typeof document !== 'undefined' && document && document.body && typeof document.body.contains === 'function');
        if (hasDocument && !document.body.contains(el)){
          rotData.running = false;
          setTransformPart(el, 'spin', '');
          return;
        }
        if (rotData.lastTs === null) rotData.lastTs = ts;
        const delta = ts - rotData.lastTs;
        rotData.lastTs = ts;
        const duration = Math.max(16, rotData.baseDuration * rotData.speedFactor);
        if (!Number.isFinite(duration) || duration <= 0){
          rotData.rafId = rafFn(step);
          return;
        }
        rotData.progress = (rotData.progress + (delta / duration)) % 1;
        const angle = rotData.offset + (rotData.direction * rotData.degreesPerCycle * rotData.progress);
        setTransformPart(el, 'spin', `rotate(${angle}deg)`);
        rotData.rafId = rafFn(step);
      };
      rotData.stop = ()=>{
        if (!rotData.running) return;
        rotData.running = false;
        if (rotData.rafId !== null) cafFn(rotData.rafId);
        setTransformPart(el, 'spin', '');
      };
      el.__rotationData = rotData;
      rotData.rafId = rafFn(step);
    }catch(e){ console.warn('setupRotation failed', e); }
  }

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
  wrap.classList.add('vn-dialog-wrap');
  wrap.style.position = 'absolute';
  wrap.style.inset = '0';
  wrap.style.zIndex = '10';
  wrap.style.pointerEvents = 'none';
  wrap.style.fontFamily = 'Segoe UI, Arial, sans-serif';

  const bubbleGroup = document.createElement('div');
  bubbleGroup.classList.add('vn-dialog-group');
  bubbleGroup.style.position = 'absolute';
  bubbleGroup.style.pointerEvents = 'auto';
  bubbleGroup.style.left = '50%';
  bubbleGroup.style.top = '55%';

  const textBox = document.createElement('div');
  textBox.classList.add('vn-textbox');
  textBox.style.position = 'relative';
  textBox.style.maxWidth = '480px';
  textBox.style.background = '#ffffff';
  textBox.style.color = '#131313';
  textBox.style.padding = '22px 28px';
  textBox.style.borderRadius = '28px';
  textBox.style.border = '4px solid #121417';
  textBox.style.boxShadow = '12px 14px 0 rgba(18, 20, 23, 0.35)';
  textBox.style.fontSize = '20px';
  textBox.style.lineHeight = '1.5';
  textBox.style.fontWeight = '600';
  textBox.style.letterSpacing = '0.3px';
  textBox.style.pointerEvents = 'auto';
  textBox.style.transformOrigin = '50% 100%';
  textBox.style.transition = 'opacity 200ms ease, transform 240ms cubic-bezier(0.2, 1.2, 0.36, 1)';

  const bubbleText = document.createElement('div');
  bubbleText.classList.add('vn-textbox-content');
  bubbleText.style.position = 'relative';
  bubbleText.style.zIndex = '2';
  bubbleText.style.textShadow = '3px 3px 0 rgba(0,0,0,0.12)';
  textBox.appendChild(bubbleText);

  const bubbleTail = document.createElement('div');
  bubbleTail.classList.add('vn-textbox-tail');
  bubbleTail.style.position = 'absolute';
  bubbleTail.style.width = '72px';
  bubbleTail.style.height = '72px';
  bubbleTail.style.pointerEvents = 'none';
  bubbleTail.style.transformOrigin = '50% 0%';
  bubbleTail.style.transform = 'rotate(0deg)';
  bubbleTail.style.zIndex = '0';

  [28, 20, 14].forEach((size, index)=>{
    const dot = document.createElement('div');
    dot.classList.add('vn-textbox-tail-dot');
    dot.style.position = 'absolute';
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.left = '50%';
    dot.style.transform = 'translateX(-50%)';
    dot.style.top = `${index * 22}px`;
    dot.style.background = '#ffffff';
    dot.style.border = '4px solid #121417';
    dot.style.borderRadius = '50%';
    dot.style.boxShadow = '6px 6px 0 rgba(18, 20, 23, 0.2)';
    bubbleTail.appendChild(dot);
  });
  textBox.appendChild(bubbleTail);

  const choicesDiv = document.createElement('div');
  choicesDiv.style.display = 'none';

  bubbleGroup.appendChild(textBox);
  wrap.appendChild(bubbleGroup);
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

  const bubbleElements = [textBox];
  let bubbleSwapTimer = null;
  let autoAdvanceTimer = null;
  let bubbleHasContent = false;
  const speakerTargets = new Map();
  let activeSpeakerKey = null;

  const captionBubble = document.createElement('div');
  captionBubble.classList.add('vn-caption');
  captionBubble.style.position = 'absolute';
  captionBubble.style.left = '50%';
  captionBubble.style.top = '5%';
  captionBubble.style.transform = 'translateX(-50%)';
  captionBubble.style.maxWidth = '70%';
  captionBubble.style.padding = '14px 22px';
  captionBubble.style.background = 'rgba(254, 247, 232, 0.92)';
  captionBubble.style.border = '2px solid rgba(56, 38, 6, 0.45)';
  captionBubble.style.borderRadius = '28px';
  captionBubble.style.boxShadow = '0 16px 32px rgba(0,0,0,0.25)';
  captionBubble.style.fontFamily = 'Segoe UI, Arial, sans-serif';
  captionBubble.style.fontSize = '20px';
  captionBubble.style.fontWeight = '600';
  captionBubble.style.letterSpacing = '0.25px';
  captionBubble.style.color = '#2b1a07';
  captionBubble.style.textAlign = 'center';
  captionBubble.style.pointerEvents = 'none';
  captionBubble.style.opacity = '0';
  captionBubble.style.display = 'none';
  captionBubble.style.transition = 'opacity 220ms ease, transform 240ms ease';
  captionBubble.style.whiteSpace = 'pre-line';

  const captionText = document.createElement('div');
  captionText.style.position = 'relative';
  captionText.style.zIndex = '2';
  captionText.style.textShadow = '0 2px 0 rgba(255,255,255,0.55)';
  captionBubble.appendChild(captionText);

  wrap.appendChild(captionBubble);
  let captionVisible = false;
  let captionCurrent = '';
  let captionHideTimer = null;

  function scheduleCaptionHide(){
    if (captionHideTimer){
      clearTimeout(captionHideTimer);
      captionHideTimer = null;
    }
    captionHideTimer = setTimeout(()=>{
      captionHideTimer = null;
      hideSceneCaption(false);
    }, 4800);
  }

  function normalizeSpeakerKey(value){
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    return str ? str.toLowerCase() : null;
  }

  function registerSpeakerKeys(keys, el){
    if (!el || !keys || !keys.length) return;
    keys.forEach(key=>{
      const normal = normalizeSpeakerKey(key);
      if (!normal) return;
      speakerTargets.set(normal, el);
    });
  }

  function setActiveSpeaker(targetKey){
    activeSpeakerKey = normalizeSpeakerKey(targetKey);
    requestAnimationFrame(()=> positionDialogueBubble());
  }

  function getActiveSpeakerElement(){
    if (activeSpeakerKey){
      const el = speakerTargets.get(activeSpeakerKey);
      if (el) return el;
    }
    for (const el of speakerTargets.values()){
      if (el) return el;
    }
    return charLayer.firstElementChild || null;
  }

  function setDialogText(value){
    bubbleText.textContent = value || '';
  }

  function getDialogText(){
    return bubbleText.textContent || '';
  }

  function setSpeakerText(){
    // Names intentionally hidden for comic-style delivery.
  }

  function bubbleTransitionIn(updateFn){
    if (bubbleSwapTimer){ clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null; }
    if (updateFn) updateFn();
    if (!bubbleHasVisibleContent()){
      hideBubbleImmediate();
      return;
    }
    bubbleGroup.style.pointerEvents = 'auto';
    bubbleTail.style.display = 'block';
    bubbleElements.forEach(el=>{
      if (!el) return;
      el.style.transition = 'none';
      el.style.visibility = 'visible';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.9)';
    });
    requestAnimationFrame(()=>{
      bubbleElements.forEach(el=>{
        if (!el) return;
        el.style.transition = 'opacity 240ms ease, transform 280ms cubic-bezier(0.18,1.4,0.36,1)';
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      });
      setTimeout(positionDialogueBubble, 20);
    });
    bubbleHasContent = true;
  }

  function bubbleSwap(updateFn){
    if (!bubbleHasContent){
      bubbleTransitionIn(updateFn);
      return;
    }
    if (bubbleSwapTimer){ clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null; }
    bubbleElements.forEach(el=>{
      if (!el) return;
      el.style.transition = 'opacity 140ms ease, transform 180ms cubic-bezier(0.45,-0.1,0.8,0.25)';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.94)';
    });
    bubbleSwapTimer = setTimeout(()=>{
      if (updateFn) updateFn();
      if (!bubbleHasVisibleContent()){
        hideBubbleImmediate();
        return;
      }
      bubbleGroup.style.pointerEvents = 'auto';
      bubbleTail.style.display = 'block';
      positionDialogueBubble();
      requestAnimationFrame(()=>{
        bubbleElements.forEach(el=>{
          if (!el) return;
          el.style.transition = 'opacity 220ms ease, transform 260ms cubic-bezier(0.18,1.4,0.36,1)';
          el.style.opacity = '1';
          el.style.transform = 'scale(1)';
        });
      });
    }, 150);
  }

  function bubbleHasVisibleContent(){
    const text = bubbleText.textContent || '';
    const hasText = text.trim().length > 0;
    const hasChoices = choicesDiv && choicesDiv.style.display !== 'none' && choicesDiv.childElementCount > 0;
    return hasText || hasChoices;
  }

  function hideBubbleImmediate(){
    if (bubbleSwapTimer){ clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null; }
    bubbleHasContent = false;
    bubbleElements.forEach(el=>{
      if (!el) return;
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.transform = 'scale(0.94)';
    });
    bubbleTail.style.display = 'none';
    bubbleGroup.style.pointerEvents = 'none';
  }

  function showSceneCaption(text){
    const content = (text || '').trim();
    if (!content){
      hideSceneCaption(true);
      return;
    }
    if (content === captionCurrent && captionVisible){
      scheduleCaptionHide();
      return;
    }
    captionCurrent = content;
    captionText.textContent = content;
    captionBubble.style.display = 'block';
    captionBubble.style.opacity = '0';
    captionBubble.style.transform = 'translateX(-50%) translateY(-6px)';
    requestAnimationFrame(()=>{
      captionBubble.style.transition = 'opacity 220ms ease, transform 260ms ease';
      captionBubble.style.opacity = '1';
      captionBubble.style.transform = 'translateX(-50%) translateY(0)';
    });
    captionVisible = true;
    scheduleCaptionHide();
  }

  function hideSceneCaption(immediate){
    captionCurrent = '';
    if (captionHideTimer){
      clearTimeout(captionHideTimer);
      captionHideTimer = null;
    }
    if (!captionVisible){
      captionBubble.style.display = 'none';
      return;
    }
    if (immediate){
      captionBubble.style.transition = 'none';
      captionBubble.style.opacity = '0';
      captionBubble.style.display = 'none';
      captionBubble.style.transform = 'translateX(-50%) translateY(-6px)';
      captionVisible = false;
      return;
    }
    captionBubble.style.transition = 'opacity 180ms ease, transform 220ms ease';
    captionBubble.style.opacity = '0';
    captionBubble.style.transform = 'translateX(-50%) translateY(-6px)';
    captionVisible = false;
    setTimeout(()=>{
      if (!captionVisible) captionBubble.style.display = 'none';
    }, 220);
  }

  function positionDialogueBubble(){
    try{
      if (!bubbleGroup || !textBox) return;
      if (!bubbleHasVisibleContent()){
        bubbleTail.style.display = 'none';
        return;
      }
    const containerRect = container.getBoundingClientRect();
    const bubbleWidth = textBox.offsetWidth || 340;
    const groupHeight = bubbleGroup.offsetHeight || textBox.offsetHeight || 180;
    const tailWidth = bubbleTail.offsetWidth || 72;
    const tailHeight = bubbleTail.offsetHeight || 72;
    const tailHalfWidth = tailWidth * 0.5;
    const tailHalfHeight = tailHeight * 0.5;
    const clamp = (value, min, max)=> Math.max(min, Math.min(max, value));
    bubbleTail.style.display = 'block';
    bubbleTail.style.opacity = '1';
    bubbleTail.style.right = 'auto';
    bubbleTail.style.transform = 'rotate(0deg)';
    bubbleTail.style.transformOrigin = '50% 0%';
      let targetLeft = containerRect.width * 0.5 - bubbleWidth * 0.5;
      let targetTop = containerRect.height * 0.32 - groupHeight * 0.5;

  const characterEl = getActiveSpeakerElement();
      if (characterEl){
        const charRect = characterEl.getBoundingClientRect();
        const charLeft = charRect.left - containerRect.left;
        const charTop = charRect.top - containerRect.top;
        const charRight = charLeft + charRect.width;
        const charBottom = charTop + charRect.height;
        const charCenterX = charLeft + charRect.width * 0.5;
        const charCenterY = charTop + charRect.height * 0.5;
        const margin = 32;
        const canPlaceAbove = (charTop - groupHeight - margin) >= 24;
        const canPlaceRight = (charRight + margin + bubbleWidth) <= (containerRect.width - 24);
        const canPlaceLeft = (charLeft - margin - bubbleWidth) >= 24;
        const canPlaceBelow = (charBottom + margin + groupHeight) <= (containerRect.height - 24);
        let placement = 'top';
        if (canPlaceAbove){
          placement = 'top';
          targetTop = charTop - groupHeight - margin;
          targetLeft = Math.max(24, Math.min(containerRect.width - bubbleWidth - 24, charCenterX - bubbleWidth * 0.5));
        } else if (canPlaceRight){
          placement = 'right';
          targetLeft = charRight + margin;
          targetTop = Math.max(24, Math.min(containerRect.height - groupHeight - 24, charCenterY - groupHeight * 0.5));
        } else if (canPlaceLeft){
          placement = 'left';
          targetLeft = charLeft - bubbleWidth - margin;
          targetTop = Math.max(24, Math.min(containerRect.height - groupHeight - 24, charCenterY - groupHeight * 0.5));
        } else if (canPlaceBelow){
          placement = 'bottom';
          targetTop = charBottom + margin;
          targetLeft = Math.max(24, Math.min(containerRect.width - bubbleWidth - 24, charCenterX - bubbleWidth * 0.5));
        } else {
          placement = 'overlay';
          targetLeft = Math.max(24, Math.min(containerRect.width - bubbleWidth - 24, charCenterX - bubbleWidth * 0.5));
          targetTop = Math.max(24, Math.min(containerRect.height - groupHeight - 24, charTop - groupHeight + 16));
        }

        if (placement === 'top'){
          const tailOffset = clamp((charCenterX - targetLeft) - tailHalfWidth, 32, bubbleWidth - tailWidth - 32);
          bubbleTail.style.left = `${tailOffset}px`;
          bubbleTail.style.top = 'auto';
          bubbleTail.style.bottom = `${-tailHeight + 12}px`;
          bubbleTail.style.transformOrigin = '50% 0%';
          bubbleTail.style.transform = 'rotate(0deg)';
        } else if (placement === 'bottom'){
          const tailOffset = clamp((charCenterX - targetLeft) - tailHalfWidth, 32, bubbleWidth - tailWidth - 32);
          bubbleTail.style.left = `${tailOffset}px`;
          bubbleTail.style.bottom = 'auto';
          bubbleTail.style.top = `${-tailHeight + 12}px`;
          bubbleTail.style.transformOrigin = '50% 100%';
          bubbleTail.style.transform = 'rotate(180deg)';
        } else if (placement === 'right'){
          const tailOffset = clamp((charCenterY - targetTop) - tailHalfHeight, 24, groupHeight - tailHeight - 24);
          bubbleTail.style.top = `${tailOffset}px`;
          bubbleTail.style.bottom = 'auto';
          bubbleTail.style.left = `${-tailWidth + 12}px`;
          bubbleTail.style.transformOrigin = '100% 50%';
          bubbleTail.style.transform = 'rotate(-90deg)';
        } else if (placement === 'left'){
          const tailOffset = clamp((charCenterY - targetTop) - tailHalfHeight, 24, groupHeight - tailHeight - 24);
          bubbleTail.style.top = `${tailOffset}px`;
          bubbleTail.style.bottom = 'auto';
          bubbleTail.style.left = `${bubbleWidth - 12}px`;
          bubbleTail.style.transformOrigin = '0% 50%';
          bubbleTail.style.transform = 'rotate(90deg)';
        } else {
          const tailOffset = clamp((charCenterX - targetLeft) - tailHalfWidth, 32, bubbleWidth - tailWidth - 32);
          bubbleTail.style.left = `${tailOffset}px`;
          bubbleTail.style.top = 'auto';
          bubbleTail.style.bottom = `${-tailHeight + 12}px`;
          bubbleTail.style.transformOrigin = '50% 0%';
          bubbleTail.style.transform = 'rotate(0deg)';
        }
      } else {
  bubbleTail.style.left = `${(bubbleWidth * 0.5) - tailHalfWidth}px`;
        bubbleTail.style.bottom = `${-tailHeight + 12}px`;
        bubbleTail.style.top = 'auto';
        bubbleTail.style.transformOrigin = '50% 0%';
        bubbleTail.style.transform = 'rotate(0deg)';
        if (targetLeft + bubbleWidth > containerRect.width - 24){
          targetLeft = containerRect.width - bubbleWidth - 24;
        }
        if (targetTop < 24) targetTop = 24;
        if (targetTop + groupHeight > containerRect.height - 24){
          targetTop = containerRect.height - groupHeight - 24;
        }
      }

      bubbleGroup.style.left = `${targetLeft}px`;
      bubbleGroup.style.top = `${targetTop}px`;
    }catch(err){ console.warn('positionDialogueBubble failed', err); }
  }

  window.addEventListener('resize', positionDialogueBubble);

  function resolveAutoAdvanceDelay(node){
    if (!node) return 520;
    const rawDelay = node.autoNextDelay !== undefined ? Number(node.autoNextDelay) : Number(node.autoAdvanceDelay);
    if (Number.isFinite(rawDelay)) return Math.max(0, rawDelay);
    return 520;
  }

  if (!scene || !scene.nodes){
    setSpeakerText('');
    setDialogText('No scene found — fallback renderer. Přidej scenes/scene1.json.');
    bubbleTransitionIn(()=>{});
    return;
  }

  let current = 'start';
  let dialogueState = null;

  const skipTarget = (()=>{
    if (!scene || !scene.nodes) return null;
    if (scene.nodes.vchod_do_skoly_tom_odchazi) return 'vchod_do_skoly_tom_odchazi';
    const keys = Object.keys(scene.nodes).filter(id => id && id !== 'start');
    return keys.length ? keys[keys.length - 1] : null;
  })();
  if (skipTarget){
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip scény';
    skipBtn.title = 'Dočasně přeskočit na cílovou scénu';
    skipBtn.style.position = 'absolute';
    skipBtn.style.left = '10px';
    skipBtn.style.top = '52px';
    skipBtn.style.zIndex = '60';
    skipBtn.style.padding = '6px 12px';
    skipBtn.style.background = 'rgba(0,0,0,0.35)';
    skipBtn.style.border = '1px solid rgba(255,255,255,0.25)';
    skipBtn.style.borderRadius = '6px';
    skipBtn.style.color = '#fff';
    skipBtn.style.cursor = 'pointer';
    skipBtn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      current = skipTarget;
      navigateTo(skipTarget);
    });
    container.appendChild(skipBtn);
  }

  container.addEventListener('click', (ev)=>{
    if (!dialogueState || dialogueState.done) return;
    if (ev.defaultPrevented) return;
    if (typeof ev.button === 'number' && ev.button !== 0) return;
    if (dialogueState && typeof dialogueState.advance === 'function'){
      dialogueState.advance();
    }
  });

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
        setTransformPart(n, 'effect', 'scale(0.3)');
        n.style.opacity = '0';
        setTimeout(()=>{
          setTransformPart(n, 'effect', '');
          try{ n.remove(); }catch(e){}
        }, 300);
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
  // renderCharacter optionally accepts one or many specs from the node
  // spec fields: visible (bool), img (string), clothes (string), x, y, anchor, width, height, z
  let currentNodeCharSpec = null;
  // map logical clothes values to image files (easy to extend)
  const CLOTHES_MAP = {
    'pyjamas': 'assets/images/mc_pyzamo.png',
    'backpack': 'assets/images/mc_batoh.png',
    'dressed': 'assets/images/mc.png'
  };

  function resolveCharacterSource(spec){
    // determine source: priority - spec.img -> spec.clothes -> state.vars.clothes -> default
    const stateCloth = state.vars.clothes;
    const specCloth = spec && spec.clothes;
    const nodeClothesMap = spec && spec.clothesMap;
    const nodeDefault = spec && spec.defaultClothes;
    if (nodeClothesMap){
      if (stateCloth && nodeClothesMap[stateCloth]) return nodeClothesMap[stateCloth];
      if (specCloth && nodeClothesMap[specCloth]) return nodeClothesMap[specCloth];
      if (nodeDefault && nodeClothesMap[nodeDefault]) return nodeClothesMap[nodeDefault];
    }
    if (spec && spec.img) return spec.img;
    if (stateCloth && CLOTHES_MAP[stateCloth]) return CLOTHES_MAP[stateCloth];
    if (specCloth && CLOTHES_MAP[specCloth]) return CLOTHES_MAP[specCloth];
    if (nodeDefault && CLOTHES_MAP[nodeDefault]) return CLOTHES_MAP[nodeDefault];
    return CLOTHES_MAP['dressed'];
  }

  function renderCharacter(spec){
    currentNodeCharSpec = spec || null;
    charLayer.innerHTML = '';
    speakerTargets.clear();
    if (!spec){
      activeSpeakerKey = null;
      return;
    }
    const specs = Array.isArray(spec) ? spec : [spec];
    specs.forEach((entry)=>{
      if (!entry || entry.visible === false) return;
      const src = resolveCharacterSource(entry);
      if (!src) return;
      const el = document.createElement('img');
      el.src = src;
      el.style.position = 'absolute';
      // position
      if (entry && entry.x !== undefined) el.style.left = parseCoord(entry.x, false);
      else el.style.left = '50%';
      if (entry && entry.y !== undefined) el.style.top = parseCoord(entry.y, true);
      else el.style.bottom = '6%';
      // sizing
      if (entry && entry.width) el.style.width = (typeof entry.width === 'number' ? entry.width + 'px' : entry.width);
      else el.style.width = '28%';
      if (entry && entry.height) el.style.height = (typeof entry.height === 'number' ? entry.height + 'px' : entry.height);
      el.style.maxWidth = '360px';
      el.style.zIndex = (entry && entry.z) ? String(entry.z) : '6';
      el.style.pointerEvents = 'none';
      el.style.transition = 'opacity 240ms ease, transform 240ms ease';
      if (entry && entry.className) el.className = entry.className;
      if (entry && entry.dataset){
        Object.entries(entry.dataset).forEach(([key, value])=>{
          if (value !== undefined) el.dataset[key] = String(value);
        });
      }
      if (entry && entry.id) el.id = entry.id;
      if (entry && entry.opacity !== undefined) el.style.opacity = String(entry.opacity);
      if (entry && entry.filter) el.style.filter = entry.filter;
      if (entry && entry.transform) setTransformPart(el, 'custom', entry.transform);
      // anchor
      if (entry && entry.anchor) applyAnchor(el, entry.anchor);
      else applyAnchor(el, '50% 100%');
      const speakerKeys = [];
      if (entry && entry.bubbleId) speakerKeys.push(entry.bubbleId);
      if (entry && entry.speakerId) speakerKeys.push(entry.speakerId);
      if (entry && entry.speaker) speakerKeys.push(entry.speaker);
      if (entry && entry.name) speakerKeys.push(entry.name);
      if (entry && entry.id) speakerKeys.push(entry.id);
      if (entry && entry.aliases && Array.isArray(entry.aliases)) speakerKeys.push(...entry.aliases);
      if (entry && entry.bubbleTarget) speakerKeys.push(entry.bubbleTarget);
      if (speakerKeys.length){
        registerSpeakerKeys(speakerKeys, el);
        el.dataset.speakerKeys = speakerKeys.map(v=>String(v)).join(' ');
      }
      charLayer.appendChild(el);
      if (el.complete){
        setTimeout(positionDialogueBubble, 20);
      } else {
        el.addEventListener('load', ()=>{ setTimeout(positionDialogueBubble, 10); }, { once: true });
      }
    });
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
    // check inventory for an item id or name
    hasItem: (itemId) => !!(state.inventory && state.inventory.some(i => (i.id === itemId || i.name === itemId))),
    not: (cond) => !evaluateCondition(cond),
    and: (...conds) => conds.every(c => evaluateCondition(c)),
    or: (...conds) => conds.some(c => evaluateCondition(c))
  };

  function evaluateCondition(cond){
    // treat undefined/null as "no condition" (true), but preserve boolean values
    if (cond === undefined || cond === null) return true;
    if (typeof cond === 'boolean') return cond;
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
    if (!el) return;
    if (!anchor){
      setTransformPart(el, 'base', '');
      el.style.transformOrigin = '';
      return;
    }
    const parts = String(anchor).split(/\s+/);
    const ax = parts[0] || '0%';
    const ay = parts[1] || '0%';
    // convert "50% 100%" => translate(-50%,-100%)
    setTransformPart(el, 'base', `translate(-${ax}, -${ay})`);
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
          if (action.failText){
            // show failText in the main dialog box temporarily (better UX than toast)
            try{
              const prevText = getDialogText();
              bubbleSwap(()=>{
                setSpeakerText('');
                setDialogText(action.failText);
              });
              const timeout = (action.failTimeout && Number(action.failTimeout)) ? Number(action.failTimeout) : 1400;
              setTimeout(()=>{
                // restore the node text if we're still on the same node
                if (current && scene && scene.nodes && scene.nodes[current]){
                  const node = scene.nodes[current];
                  bubbleSwap(()=>{
                    setSpeakerText('');
                    setDialogText(node.text || '');
                  });
                } else {
                  bubbleSwap(()=>{
                    setSpeakerText('');
                    setDialogText(prevText);
                  });
                }
              }, timeout);
            }catch(e){
              // fallback to toast if DOM update fails
              if (action.failText) showToast(action.failText);
            }
          } else {
            // intentionally silent on generic failures — prefer no intrusive toast.
            console.log('Action blocked: condition failed and no failText provided');
          }
        }
        return;
      } else {
        // condition passed: if action defines an actions array, run it as a sequence
        if (action.actions && Array.isArray(action.actions)){
          action.actions.forEach(a=>{ try{ handleAction(a, obj); }catch(e){ console.warn('nested action failed', e); } });
          return;
        }
      }
    }
    // support a simple remove flag: remove the clicked object from the scene without adding to inventory
    if (action.remove && obj){
      try{ removeObject(obj); }catch(e){ console.warn('removeObject failed', e); }
    }
    switch(action.type){
       case 'remove':
      if (obj) removeObject(obj);
      if (action.goto){
        const target = action.goto;
        if (target.includes('#')) {
          const [scenePath, nodeName] = target.split('#');
          loadExternalScene(scenePath, nodeName);
          return;
        } else if (target.includes('.json')) {
          loadExternalScene(target, null);
          return;
        } else {
          const gotoOpts = (action.gotoMs !== undefined || action.transition) ? { ms: action.gotoMs, transition: action.transition } : undefined;
          navigateTo(action.goto, gotoOpts);
        }
      }
      if (action.playSFX) playSFX(action.playSFX);
      break;
      // Tady je tvůj switch, proměnná se pravděpodobně jmenuje 'action' nebo 'act'
// POKUD SE TVOJE PROMĚNNÁ JMENUJE JINAK, PŘEPIŠ SI SLOVO 'action' NA SVŮJ NÁZEV!

case 'minigame_iframe':
      console.log("Spouštím minihru:", action.source);
      
      // 1. Vytvoření IFRAME
      const iframe = document.createElement('iframe');
      iframe.src = action.source;
      
      // Styly (černé pozadí, full screen, nejvyšší vrstva)
      Object.assign(iframe.style, {
          position: 'fixed', 
          top: '0', left: '0', 
          width: '100%', height: '100%', 
          border: 'none', 
          zIndex: '99999', 
          background: 'black' 
      });
      
      document.body.appendChild(iframe);

      // 2. Posluchač zpráv z minihry
      const minigameListener = (event) => {
          
          // Pokud hráč vyhrál
          if (event.data === 'minigame_win') {
              
              // Úklid: odstraníme iframe a posluchače
              if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
              }
              window.removeEventListener('message', minigameListener);

              // >>> ZPRACOVÁNÍ VÍTĚZNÉ AKCE (Podle tvé logiky goto) <<<
              // Vezmeme data z "onWinAction" v JSONu
              if (action.onWinAction && action.onWinAction.type === 'goto') {
                  const winTarget = action.onWinAction.target;

                  if (winTarget) {
                      // 1. Logika pro externí scény (# nebo .json)
                      if (winTarget.includes('#')) {
                          const [scenePath, nodeName] = winTarget.split('#');
                          loadExternalScene(scenePath, nodeName);
                          return;
                      } else if (winTarget.includes('.json')) {
                          loadExternalScene(winTarget, null);
                          return;
                      }

                      // 2. Logika pro vnitřní přechod (options)
                      const winGotoOpts = (action.onWinAction.gotoMs !== undefined || action.onWinAction.transition) 
                          ? { ms: action.onWinAction.gotoMs, transition: action.onWinAction.transition } 
                          : undefined;
                      
                      // 3. Zavolání tvé navigační funkce
                      navigateTo(winTarget, winGotoOpts);
                  }
              }
          }
          
          // Volitelně: Pokud bys někdy posílal 'minigame_lose'
          if (event.data === 'minigame_lose') {
              // Restart hry (volitelné)
              iframe.src = iframe.src;
          }
      };

      window.addEventListener('message', minigameListener);
      break;
      case 'goto':
      if (action.target){
        const target = action.target;
        if (target.includes('#')) {
          const [scenePath, nodeName] = target.split('#');
          loadExternalScene(scenePath, nodeName);
          return;
        } else if (target.includes('.json')) {
          loadExternalScene(target, null);
          return;
        }
        const gotoOpts = (action.gotoMs !== undefined || action.transition) ? { ms: action.gotoMs, transition: action.transition } : undefined;
        navigateTo(action.target, gotoOpts);
      }
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
            setTransformPart(el, 'effect', 'scale(0.3)');
            el.style.opacity = '0';
            setTimeout(()=>{
              setTransformPart(el, 'effect', '');
              try{ el.remove(); }catch(e){}
            }, 300);
          }
          // also remove any hitbox with same data-obj-id
          const hb = objectLayer.querySelectorAll(`[data-obj-id="${obj.id}"]`);
          hb.forEach(n=>{ try{ n.remove(); }catch(e){} });
          if (action.goto){
            const gotoOpts = (action.gotoMs !== undefined || action.transition) ? { ms: action.gotoMs, transition: action.transition } : undefined;
            navigateTo(action.goto, gotoOpts);
          }
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
      case 'accelerate':
        try{
          const baseId = action.targetId || (obj && obj.id) || action.id;
          const includeSelf = action.includeSelf !== false;
          const baseOpts = {
            speed: (action.speed !== undefined ? action.speed : 0.25),
            ms: action.ms,
            restoreSequence: action.restoreSequence,
            finalSpeed: action.finalSpeed,
            follow: action.alignWith || baseId
          };
          let targetList = action.targets;
          if (!targetList){
            targetList = includeSelf && baseId ? [baseId] : [];
          } else if (includeSelf && baseId){
            const includesBase = (Array.isArray(targetList) ? targetList : [targetList]).some(entry=>{
              if (typeof entry === 'string') return entry === baseId;
              return entry && typeof entry === 'object' && (entry.id === baseId || entry.target === baseId || entry.objId === baseId);
            });
            if (!includesBase) targetList = Array.isArray(targetList) ? targetList.concat(baseId) : [targetList, baseId];
          }
          accelerateTargets(targetList, baseOpts);
          if (action.playSFX) playSFX(action.playSFX);
        }catch(e){ console.warn('accelerate action failed', e); }
        break;
      case 'inspect':
        // simple inspection: show a temporary modal text
        alert(action.text || obj.name || 'Inspect');
        break;
      case 'say':
        // temporarily show text in the dialog box
        try{
          const prevText = getDialogText();
          const applySay = ()=>{
            setSpeakerText('');
            setDialogText(action.text || '');
          };
          bubbleSwap(applySay);
          if (action.sfx) playSFX(action.sfx);
          const timeout = (action.timeout && Number(action.timeout)) ? Number(action.timeout) : 1400;
          if (action.wait) {
            // if wait is true, don't auto-restore (caller will navigate)
          } else {
            setTimeout(()=>{
              if (current && scene && scene.nodes && scene.nodes[current]){
                const node = scene.nodes[current];
                bubbleSwap(()=>{
                  setSpeakerText('');
                  setDialogText(node.text || '');
                });
              } else {
                bubbleSwap(()=>{
                  setSpeakerText('');
                  setDialogText(prevText);
                });
              }
            }, timeout);
          }
        }catch(e){ console.warn('say action failed', e); }
        break;
      default:
        console.log('Unknown action', action);
    }
  }

  function adjustElementSpeed(targetEl, targetId, factorOrOpts){
    let rotationData = null;
    try{
      const el = targetEl || (targetId ? objectLayer.querySelector(`[data-obj-id="${targetId}"]`) : null);
      if (!el) return false;
      const animData = el.__animData;
      rotationData = el.__rotationData;
      if (!animData && !rotationData) return false;
      let factor = factorOrOpts;
      let alignFraction = null;
      if (factorOrOpts && typeof factorOrOpts === 'object'){
        if (factorOrOpts.factor !== undefined) factor = factorOrOpts.factor;
        if (factorOrOpts.alignFraction !== undefined && factorOrOpts.alignFraction !== null){
          const af = Number(factorOrOpts.alignFraction);
          if (Number.isFinite(af)) alignFraction = Math.min(1, Math.max(0, af));
        }
      }
      const safeFactor = (factor && Number.isFinite(factor) && factor > 0) ? Number(factor) : 1;
      if (animData && animData.usedTransform){
        const parentRect = (animData.parentRect && animData.parentRect.width)
          ? animData.parentRect
          : ((el.offsetParent && typeof el.offsetParent.getBoundingClientRect === 'function')
            ? el.offsetParent.getBoundingClientRect()
            : objectLayer.getBoundingClientRect());
        const currentRect = el.getBoundingClientRect();
        const endRect = animData.endRect;
        if (!endRect || !currentRect || !parentRect) return false;
        const targetX = endRect.left - parentRect.left;
        const targetY = endRect.top - parentRect.top;
        const currentX = currentRect.left - parentRect.left;
        const currentY = currentRect.top - parentRect.top;
        const deltaX = currentX - targetX;
        const deltaY = currentY - targetY;
        const totalX = (animData.startRect.left - parentRect.left) - targetX;
        const totalY = (animData.startRect.top - parentRect.top) - targetY;
  const remainingDist = Math.hypot(deltaX, deltaY);
  const totalDist = Math.max(1e-5, Math.hypot(totalX, totalY));
  const computedFraction = Math.min(1, Math.max(0, remainingDist / totalDist));
  const fraction = (alignFraction !== null) ? Math.min(1, Math.max(0, alignFraction)) : computedFraction;
        const baseDuration = animData.baseDuration || animData.duration || 1000;
        const remainingDuration = Math.max(0, baseDuration * fraction);
        const targetDuration = Math.max(50, remainingDuration * safeFactor);
        setTransformPart(el, 'animation', `translate3d(${deltaX}px, ${deltaY}px, 0)`);
        void el.offsetWidth;
        el.style.transition = composeTransition(el.dataset.baseTransition || '', `${targetDuration}ms linear`);
        el.style.willChange = 'transform';
        requestAnimationFrame(()=>{ setTransformPart(el, 'animation', 'translate3d(0, 0, 0)'); });
        animData.parentRect = parentRect;
        if (rotationData) rotationData.speedFactor = safeFactor;
        return true;
      } else if (animData){
        if (typeof window === 'undefined' || !window.getComputedStyle) return false;
        const parentRect = (animData.parentRect && animData.parentRect.width)
          ? animData.parentRect
          : ((el.offsetParent && typeof el.offsetParent.getBoundingClientRect === 'function')
            ? el.offsetParent.getBoundingClientRect()
            : objectLayer.getBoundingClientRect());
        const endRect = animData.endRect;
        if (!endRect) return false;
        const computedStyle = window.getComputedStyle(el);
        const currentLeft = parseFloat(computedStyle.left);
        const currentTop = parseFloat(computedStyle.top);
        const targetLeft = endRect.left - parentRect.left;
        const targetTop = endRect.top - parentRect.top;
        el.style.transition = 'none';
        if (!Number.isNaN(currentLeft)) el.style.left = `${currentLeft}px`;
        if (!Number.isNaN(currentTop)) el.style.top = `${currentTop}px`;
        void el.offsetWidth;
        const baseDuration = animData.baseDuration || animData.duration || 1000;
        const totalLeft = animData.startRect.left - endRect.left;
        const totalTop = animData.startRect.top - endRect.top;
        const remainingLeft = Number.isNaN(currentLeft) ? 0 : Math.abs(currentLeft - targetLeft);
        const remainingTop = Number.isNaN(currentTop) ? 0 : Math.abs(currentTop - targetTop);
  const totalDist = Math.max(1e-5, Math.hypot(totalLeft, totalTop));
  const remainingDist = Math.hypot(remainingLeft, remainingTop);
  const computedFraction = Math.min(1, Math.max(0, remainingDist / totalDist));
  const fraction = (alignFraction !== null) ? Math.min(1, Math.max(0, alignFraction)) : computedFraction;
        const targetDuration = Math.max(50, (baseDuration * fraction) * safeFactor);
        el.style.transition = [`left ${targetDuration}ms linear`, `top ${targetDuration}ms linear`].join(', ');
        requestAnimationFrame(()=>{
          el.style.left = `${targetLeft}px`;
          el.style.top = `${targetTop}px`;
        });
        animData.parentRect = parentRect;
        if (rotationData) rotationData.speedFactor = safeFactor;
        return true;
      }
      if (rotationData){
        rotationData.speedFactor = safeFactor;
        return true;
      }
    }catch(err){ console.warn('adjustElementSpeed failed', err); }
    return !!(rotationData);
  }

  // accelerate an element mid-animation and optionally schedule smooth restoration
  function accelerateObject(targetEl, objId, opts){
    try{
      const id = objId || (targetEl && targetEl.dataset && targetEl.dataset.objId);
      if (!id) return;
      const key = 'speed_' + id;
      const rawSpeed = (opts && opts.speed !== undefined) ? Number(opts.speed) : 0.25;
      const speed = (Number.isFinite(rawSpeed) && rawSpeed > 0) ? rawSpeed : 0.25;
      const restoreAfter = (opts && opts.ms !== undefined) ? Number(opts.ms) : 2200;
      const restoreSeqRaw = (opts && opts.restoreSequence);
      const restoreSequence = Array.isArray(restoreSeqRaw)
        ? restoreSeqRaw.filter(step => step && (step.ms !== undefined || step.speed !== undefined))
        : [];
      const finalSpeedRaw = (opts && opts.finalSpeed !== undefined) ? Number(opts.finalSpeed) : 1;
      const finalSpeed = (Number.isFinite(finalSpeedRaw) && finalSpeedRaw > 0) ? finalSpeedRaw : 1;
    const followId = opts && opts.follow;

    if (!accelerateObject._timers) accelerateObject._timers = {};
    if (!accelerateObject._finalSpeeds) accelerateObject._finalSpeeds = {};
    accelerateObject._finalSpeeds[key] = finalSpeed;
    const timers = accelerateObject._timers;
      if (timers[key]){ clearTimeout(timers[key]); delete timers[key]; }

      const applySpeed = (value)=>{
        const val = (Number.isFinite(value) && value > 0) ? value : 1;
        if (!state.vars) state.vars = {};
        state.vars[key] = val;
        let alignFraction = null;
        if (followId){
          const followEl = objectLayer.querySelector(`[data-obj-id="${followId}"]`);
          const progress = getAnimationProgress(followEl);
          if (progress && progress.fraction !== undefined) alignFraction = progress.fraction;
        }
        const applied = adjustElementSpeed(targetEl, id, { factor: val, alignFraction })
          || adjustElementSpeed(null, id, { factor: val, alignFraction });
        if (!applied && typeof requestAnimationFrame === 'function'){
          requestAnimationFrame(()=>{
            adjustElementSpeed(null, id, { factor: val, alignFraction });
          });
        }
      };

      applySpeed(speed);

      if (restoreSequence.length){
        const runStep = (idx)=>{
          if (idx >= restoreSequence.length){
            applySpeed(finalSpeed);
            delete timers[key];
            return;
          }
          const step = restoreSequence[idx];
          const delay = Number(step.ms);
          const nextSpeedRaw = (step && step.speed !== undefined) ? Number(step.speed) : finalSpeed;
          const nextSpeed = (Number.isFinite(nextSpeedRaw) && nextSpeedRaw > 0) ? nextSpeedRaw : finalSpeed;
          timers[key] = setTimeout(()=>{
            applySpeed(nextSpeed);
            runStep(idx + 1);
          }, Number.isFinite(delay) && delay >= 0 ? delay : 0);
        };
        runStep(0);
      } else if (Number.isFinite(restoreAfter) && restoreAfter > 0){
        timers[key] = setTimeout(()=>{
          applySpeed(finalSpeed);
          delete timers[key];
        }, restoreAfter);
      } else {
        applySpeed(finalSpeed);
      }
    }catch(e){ console.warn('accelerateObject failed', e); }
  }

  function accelerateTargets(targets, baseOpts){
    if (!targets) return;
    const list = Array.isArray(targets) ? targets.slice() : [targets];
    const seen = new Set();
    list.forEach(entry=>{
      let id = null;
      const opts = Object.assign({}, baseOpts);
      if (typeof entry === 'string'){
        id = entry;
      } else if (entry && typeof entry === 'object'){
        id = entry.id || entry.target || entry.objId || entry.obj || null;
        if (entry.speed !== undefined) opts.speed = entry.speed;
        if (entry.ms !== undefined) opts.ms = entry.ms;
        if (entry.restoreSequence) opts.restoreSequence = entry.restoreSequence;
        if (entry.finalSpeed !== undefined) opts.finalSpeed = entry.finalSpeed;
        if (entry.follow === false) delete opts.follow;
        else if (entry.follow) opts.follow = entry.follow;
      }
      if (!id || seen.has(id)) return;
      seen.add(id);
      const el = objectLayer.querySelector(`[data-obj-id="${id}"]`);
      accelerateObject(el, id, opts);
    });
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
    if (autoAdvanceTimer){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
    if (id) current = id;
  const node = scene.nodes[id];
    if (!node){
      bubbleSwap(()=>{
        setSpeakerText('');
        setDialogText('Node "'+id+'" not found.');
      });
      return;
    }
  bubbleHasContent = false;
  if (bubbleSwapTimer){ clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null; }
    const captionValue = (node.sceneCaption !== undefined) ? node.sceneCaption
      : (node.caption !== undefined ? node.caption : '');
    showSceneCaption(captionValue);
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
      const baseTransition = 'transform 160ms ease, filter 160ms ease, opacity 220ms ease';
      el.style.transition = baseTransition;
      el.dataset.baseTransition = baseTransition;
      if (obj.interactive) {
        el.style.cursor = 'pointer';
        const allowHoverScale = !obj.animate;
        el.addEventListener('mouseenter', ()=>{
          if (allowHoverScale) setTransformPart(el, 'hover', 'scale(1.06)');
          el.style.filter = 'drop-shadow(0 10px 18px rgba(0,0,0,.6))';
        });
        el.addEventListener('mouseleave', ()=>{
          if (allowHoverScale) setTransformPart(el, 'hover', '');
          el.style.filter = '';
        });
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
      
      // support simple animation instructions on objects (e.g. move across screen)
      if (obj.animate && obj.animate.type === 'move'){
        try{
          const baseDur = (obj.animate.duration && Number(obj.animate.duration)) ? Number(obj.animate.duration) : 3000;
          const speedKey = 'speed_' + (obj.id || '');
          const dur = baseDur * ((state.vars && state.vars[speedKey] !== undefined) ? Number(state.vars[speedKey]) : 1);
          const baseTransition = el.dataset.baseTransition || '';
          const restoreTransition = ()=>{
            if (el.dataset && Object.prototype.hasOwnProperty.call(el.dataset, 'baseTransition')){
              el.style.transition = el.dataset.baseTransition;
            } else {
              el.style.transition = '';
            }
          };

          const cssValue = (val, isY)=>{
            if (val === undefined || val === null) return null;
            return (typeof val === 'string') ? val : parseCoord(val, isY);
          };

          const defaultX = parseCoord(obj.x, false);
          const defaultY = parseCoord(obj.y, true);

          const fromRaw = (obj.animate.from && typeof obj.animate.from === 'object') ? obj.animate.from : {};
          const toRaw = (obj.animate.to && typeof obj.animate.to === 'object') ? obj.animate.to : {};

          const fromCssX = cssValue(Object.prototype.hasOwnProperty.call(fromRaw, 'x') ? fromRaw.x : obj.x, false) || defaultX;
          const fromCssY = cssValue(Object.prototype.hasOwnProperty.call(fromRaw, 'y') ? fromRaw.y : obj.y, true) || defaultY;
          const toCssX = cssValue(Object.prototype.hasOwnProperty.call(toRaw, 'x') ? toRaw.x : obj.x, false) || defaultX;
          const toCssY = cssValue(Object.prototype.hasOwnProperty.call(toRaw, 'y') ? toRaw.y : obj.y, true) || defaultY;

          const baseParts = (baseTransition || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .filter(s => !s.toLowerCase().startsWith('transform'));

          const fallbackPositionAnimation = ()=>{
            setTransformPart(el, 'animation', '');
            el.style.willChange = '';
            el.style.transition = 'none';
            // position at start and measure both start/end so we can compute remaining progress on click
            el.style.left = fromCssX;
            el.style.top = fromCssY;
            void el.offsetWidth;
            const startRectFB = el.getBoundingClientRect();
            // measure end rect by placing it at the target (no transition)
            el.style.left = toCssX;
            el.style.top = toCssY;
            void el.offsetWidth;
            const endRectFB = el.getBoundingClientRect();
            // revert to start
            el.style.left = fromCssX;
            el.style.top = fromCssY;
            void el.offsetWidth;
            const transitions = [`left ${dur}ms linear`, `top ${dur}ms linear`].concat(baseParts);
            el.style.transition = transitions.join(', ');
            const fallbackParentRect = (el.offsetParent && typeof el.offsetParent.getBoundingClientRect === 'function')
              ? el.offsetParent.getBoundingClientRect()
              : objectLayer.getBoundingClientRect();
            try{ el.__animData = {
              usedTransform: false,
              startRect: startRectFB,
              endRect: endRectFB,
              duration: dur,
              baseDuration: baseDur,
              parentRect: fallbackParentRect
            }; }catch(e){}
            requestAnimationFrame(()=>{
              el.style.left = toCssX;
              el.style.top = toCssY;
            });
            const onEnd = (evt)=>{
              if (!evt || (evt.propertyName !== 'left' && evt.propertyName !== 'top')) return;
              el.removeEventListener('transitionend', onEnd);
              try{ el.__animData = null; }catch(e){}
              restoreTransition();
              try{
                const objId = obj && obj.id ? obj.id : null;
                if (objId){
                  const sk = 'speed_' + objId;
                  if (accelerateObject && accelerateObject._timers && accelerateObject._timers[sk]){
                    clearTimeout(accelerateObject._timers[sk]);
                    delete accelerateObject._timers[sk];
                  }
                  const finalMap = accelerateObject && accelerateObject._finalSpeeds;
                  if (finalMap && finalMap[sk] !== undefined){
                    if (state && state.vars) state.vars[sk] = finalMap[sk];
                    delete finalMap[sk];
                  } else if (state && state.vars && state.vars[sk] === undefined){
                    state.vars[sk] = 1;
                  }
                }
              }catch(e){}
              if (obj.animate && obj.animate.onEnd){
                try{ handleAction(obj.animate.onEnd, obj); }catch(e){ console.warn('animate onEnd failed', e); }
              }
            };
            el.addEventListener('transitionend', onEnd);
          };

          let usedTransform = false;
          try{
            const parentRect = (el.offsetParent && typeof el.offsetParent.getBoundingClientRect === 'function')
              ? el.offsetParent.getBoundingClientRect()
              : objectLayer.getBoundingClientRect();

            if (parentRect.width || parentRect.height){
              el.style.transition = 'none';
              setTransformPart(el, 'animation', '');
              el.style.left = fromCssX;
              el.style.top = fromCssY;
              void el.offsetWidth;
              const startRect = el.getBoundingClientRect();
              el.style.left = toCssX;
              el.style.top = toCssY;
              void el.offsetWidth;
              const endRect = el.getBoundingClientRect();

              const deltaX = (startRect.left - parentRect.left) - (endRect.left - parentRect.left);
              const deltaY = (startRect.top - parentRect.top) - (endRect.top - parentRect.top);

              if (Number.isFinite(deltaX) && Number.isFinite(deltaY)){
                try{ el.__animData = {
                  usedTransform: true,
                  startRect: startRect,
                  endRect: endRect,
                  duration: dur,
                  baseDuration: baseDur,
                  parentRect: parentRect
                }; }catch(e){}
                setTransformPart(el, 'animation', `translate3d(${deltaX}px, ${deltaY}px, 0)`);
                void el.offsetWidth;
                el.style.transition = composeTransition(baseTransition, `${dur}ms linear`);
                el.style.willChange = 'transform';
                requestAnimationFrame(()=>{
                  setTransformPart(el, 'animation', 'translate3d(0, 0, 0)');
                });
                const onEnd = (evt)=>{
                  if (evt && evt.propertyName && evt.propertyName !== 'transform') return;
                  el.removeEventListener('transitionend', onEnd);
                  setTransformPart(el, 'animation', '');
                  el.style.willChange = '';
                  try{ el.__animData = null; }catch(e){}
                  restoreTransition();
                  try{
                    const objId = obj && obj.id ? obj.id : null;
                    if (objId){
                      const sk = 'speed_' + objId;
                      if (accelerateObject && accelerateObject._timers && accelerateObject._timers[sk]){
                        clearTimeout(accelerateObject._timers[sk]);
                        delete accelerateObject._timers[sk];
                      }
                      const finalMap = accelerateObject && accelerateObject._finalSpeeds;
                      if (finalMap && finalMap[sk] !== undefined){
                        if (state && state.vars) state.vars[sk] = finalMap[sk];
                        delete finalMap[sk];
                      } else if (state && state.vars && state.vars[sk] === undefined){
                        state.vars[sk] = 1;
                      }
                    }
                  }catch(e){}
                  if (obj.animate && obj.animate.onEnd){
                    try{ handleAction(obj.animate.onEnd, obj); }catch(err){ console.warn('animate onEnd failed', err); }
                  }
                };
                el.addEventListener('transitionend', onEnd);
                usedTransform = true;
              }
            }
          }catch(measureErr){
            console.warn('transform animation measurement failed', measureErr);
          }

          if (!usedTransform){
            fallbackPositionAnimation();
          }
        }catch(e){ console.warn('animate failed', e); }
      }

      const rotateCfg = (obj.animate && obj.animate.rotate) || obj.rotate;
      if (rotateCfg){
        setupRotation(el, obj, rotateCfg);
      }
    });
    const showChoicesOrNext = (animate = false)=>{
      dialogueState = null;
      choicesDiv.innerHTML = '';
      if (node.choices && node.choices.length){
        const choiceText = node.choices.map((c, idx)=>`• ${c.text}`).join('\n');
        const target = node.choices[0].target;
        const applyChoices = ()=>{
          setDialogText(choiceText);
        };
        if (animate && bubbleHasContent) bubbleSwap(applyChoices);
        else bubbleTransitionIn(applyChoices);
        dialogueState = { done: false, advance: null };
        dialogueState.advance = ()=>{
          if (!dialogueState || dialogueState.done) return;
          dialogueState.done = true;
          if (autoAdvanceTimer){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
          navigateTo(target);
        };
        return;
      }
      const resolveNextTarget = (value)=>{
        if (value === undefined || value === null) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'object'){
          if (typeof value.target === 'string') return value.target;
          if (typeof value.id === 'string') return value.id;
        }
        return null;
      };
      const pendingNext = (node.autoNext !== undefined) ? node.autoNext : node.next;
      const nextTarget = resolveNextTarget(pendingNext);
      if (nextTarget){
        const delay = resolveAutoAdvanceDelay(node);
        const activeNodeId = current;
          const advanceFn = ()=>{
          if (dialogueState && dialogueState.done) return;
          if (dialogueState) dialogueState.done = true;
          if (autoAdvanceTimer){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
          navigateTo(nextTarget);
        };
        dialogueState = {
          done: false,
          advance: ()=>{
            advanceFn();
          }
        };
        if (autoAdvanceTimer){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
        autoAdvanceTimer = setTimeout(()=>{
          if (current !== activeNodeId) return;
          advanceFn();
        }, delay);
      }
      positionDialogueBubble();
    };

    const dialogueEntries = Array.isArray(node.dialogue)
      ? node.dialogue.filter(entry => entry && (entry.text || entry.text === ''))
      : [];

    if (dialogueEntries.length){
      let lastSpeaker = node.speaker || '';
      const state = {
        entries: dialogueEntries,
        idx: 0,
        done: false,
        advance: null
      };
      const applyEntryContent = ()=>{
        const entry = state.entries[state.idx];
        const speaker = entry.speaker !== undefined ? entry.speaker
          : (entry.name !== undefined ? entry.name
            : (entry.character !== undefined ? entry.character : lastSpeaker));
        const text = entry.text !== undefined ? entry.text : '';
        lastSpeaker = speaker || '';
        const focusCandidates = [entry.bubbleTarget, entry.speakerId, entry.character, speaker];
        let focusKey = null;
        for (const candidate of focusCandidates){
          if (candidate !== undefined && candidate !== null) { focusKey = candidate; break; }
        }
        if (focusKey && typeof focusKey === 'object'){
          focusKey = focusKey.id || focusKey.name || null;
        }
        if (focusKey !== undefined && focusKey !== null) setActiveSpeaker(focusKey);
        setSpeakerText('');
        setDialogText(text);
        if (entry.sfx) playSFX(entry.sfx);
      };
      const showEntry = (animate)=>{
        if (!bubbleHasContent || !animate){
          bubbleTransitionIn(applyEntryContent);
        } else {
          bubbleSwap(applyEntryContent);
        }
      };
      const finishDialogue = ()=>{
        if (state.done) return;
        state.done = true;
        const autoTarget = (!node.choices || !node.choices.length)
          ? (node.autoNext !== undefined ? node.autoNext : node.next)
          : null;
        const delay = resolveAutoAdvanceDelay(node);
        bubbleSwap(()=>{
          hideBubbleImmediate();
          if (node.choices && node.choices.length){
            showChoicesOrNext(false);
            return;
          }
          const autoFn = node.onDialogueComplete;
          if (autoFn && Array.isArray(autoFn)){
            autoFn.forEach(action=>{ try{ handleAction(action); }catch(e){ console.warn('onDialogueComplete action failed', e); } });
          } else if (autoFn){
            try{ handleAction(autoFn); }catch(e){ console.warn('onDialogueComplete action failed', e); }
          }
          if (autoTarget){
            const advanceFn = ()=>{
              if (!dialogueState || dialogueState.done) return;
              dialogueState.done = true;
              if (autoAdvanceTimer){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
              navigateTo(autoTarget);
            };
            dialogueState = { done: false, advance: advanceFn };
            if (autoAdvanceTimer){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
            autoAdvanceTimer = setTimeout(()=>{ advanceFn(); }, delay);
          } else {
            dialogueState = null;
          }
        });
      };
      const advanceDialogue = ()=>{
        if (state.done) return;
        if (state.idx < state.entries.length - 1){
          state.idx += 1;
          showEntry(true);
        } else {
          finishDialogue();
        }
      };
      state.advance = advanceDialogue;
      dialogueState = state;
      bubbleHasContent = false;
      showEntry(false);
    } else {
      dialogueState = null;
      const applyStaticContent = ()=>{
        setSpeakerText('');
        setDialogText(node.text || '');
        const focusCandidates = [node.bubbleTarget, node.speaker];
        let focusKey = null;
        for (const candidate of focusCandidates){
          if (candidate !== undefined && candidate !== null){ focusKey = candidate; break; }
        }
        if (focusKey && typeof focusKey === 'object'){ focusKey = focusKey.id || focusKey.name || null; }
        if (focusKey !== undefined && focusKey !== null) setActiveSpeaker(focusKey);
      };
      if (bubbleHasContent){
        bubbleSwap(applyStaticContent);
      } else {
        bubbleTransitionIn(applyStaticContent);
      }
      showChoicesOrNext(false);
    }
    // determine character spec(s) for this node (not treated as objects)
    const charSpec = (node.characters && node.characters.length) ? node.characters
      : (node.character || null);
  try{ renderCharacter(charSpec); }catch(e){ console.warn('renderCharacter failed', e); }
  setTimeout(positionDialogueBubble, 20);
  }

  function loadExternalScene(scenePath, nodeName) {
  fetch(scenePath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load scene: ${scenePath}`);
      }
      return response.json();
    })
    .then(sceneData => {
      // Merge nodes do current scene
      if (sceneData.nodes) {
        scene.nodes = { ...scene.nodes, ...sceneData.nodes };
      }
      
      // Jump to the target node
      if (nodeName && scene.nodes[nodeName]) {
        current = nodeName;
        renderNode(nodeName);
      }
    })
    .catch(error => {
      console.error('Error loading external scene:', error);
      showToast('Chyba při načítání scény: ' + scenePath);
    });
}



  renderNode(current);
}
