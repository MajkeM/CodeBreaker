import { initFallback } from './game.js';

const CONFIG = {
  name: 'renjs-vn-demo'
};

async function boot(){
  let scene = null;
  try{
    const resp = await fetch('./scenes/objects_demo.json');
    scene = await resp.json();
  }catch(e){
    console.error('Cannot load scene JSON:', e);
  }

  function fallback(){
    if (typeof initFallback === 'function'){
      initFallback(scene);
      return true;
    }
    console.warn('No fallback renderer available.');
    return false;
  }

  const R = window.RenJS;
  if (!R){
    // try wait a bit in case script is still loading
    await new Promise(r=>setTimeout(r, 200));
  }

  if (!window.RenJS){
    console.info('RenJS not found on window — using fallback renderer');
    fallback();
    return;
  }

  try{
    const Ren = window.RenJS;

    // 1) direct constructor function (new RenJS(...))
    if (typeof Ren === 'function'){
      const inst = new Ren(Object.assign({}, CONFIG, { scene }));
      if (inst && typeof inst.launch === 'function') { inst.launch(); return; }
      if (inst && typeof inst.start === 'function') { inst.start(); return; }
    }

    // 2) namespace/default export
    const Candidate = Ren.default || Ren.RenJS || null;
    if (Candidate){
      if (typeof Candidate === 'function'){
        const inst = new Candidate(Object.assign({}, CONFIG, { scene }));
        if (inst && typeof inst.launch === 'function') { inst.launch(); return; }
        if (inst && typeof inst.start === 'function') { inst.start(); return; }
      }
      if (typeof Candidate.start === 'function'){
        Candidate.start({ scene, container: '#game', ...CONFIG });
        return;
      }
    }

    // 3) static start
    if (typeof Ren.start === 'function'){
      Ren.start({ scene, container: '#game', ...CONFIG });
      return;
    }

    // 4) fallback: try to construct from known props
    if (typeof Ren === 'object'){
      const maybeCtor = Ren.RenJS || Ren.default || null;
      if (typeof maybeCtor === 'function'){
        const inst = new maybeCtor(Object.assign({}, CONFIG, { scene }));
        if (inst && typeof inst.launch === 'function') { inst.launch(); return; }
        if (inst && typeof inst.start === 'function') { inst.start(); return; }
      }
    }

    console.warn('RenJS present but no recognized init method — falling back to DOM renderer.');
    fallback();
  }catch(err){
    console.error('Error initializing RenJS, falling back:', err);
    fallback();
  }
}

boot();
