// js/main.js - Hlavní soubor hry

const k = kaboom({ fullscreen: true, background: [0, 0, 0] });
const PALETTE = {
  background: k.rgb(13, 17, 23),
  text: k.rgb(201, 209, 217),
  accent: k.rgb(56, 139, 253),
  accent_light: k.rgb(88, 166, 255),
  hover: k.rgb(255, 255, 255),
  placeholder_char: k.rgb(20, 100, 120),
  alarm_red: k.rgb(200, 30, 30),
};
let typewriteProcess = null;

k.scene("loading", () => {
  k.add([
    k.text("Načítání...", { size: 32, font: "sans-serif" }),
    k.pos(k.center()),
    k.anchor("center"),
  ]);
  k.loadFont("Poppins", "../fonts/Poppins-Regular.ttf");
  k.loadFont("PoppinsBold", "../fonts/Poppins-Bold.ttf");
  k.loadFont("RobotoMono", "../fonts/RobotoMono-VariableFont_wght.ttf");
  // Ujistěte se, že tyto cesty odpovídají vaší struktuře
  k.loadSprite("pozadi_chodba", "../assets/room.png");
  k.loadSprite("terminal", "../assets/mac.png");
  k.loadSprite("neo_postava", "../assets/main-char.png");
  // Ujistěte se, že tyto cesty odpovídají vaší struktuře
  k.loadSprite("pozadi_chodba", "../assets/room.png");
  k.loadSprite("terminal", "../assets/mac.png");
  // character / object sprites
  k.loadSprite("neo_postava", "../assets/main-char.png");
  // main character versions: pyžamo (undressed) and dressed
  k.loadSprite("mc_pyzamo", "../assets/mc_pyzamo.png");
  k.loadSprite("mc", "../assets/mc.png");
  // backpack and room background
  k.loadSprite("batoh", "../assets/backpack.png");
  k.loadSprite("backpack", "../assets/backpack.png");
  k.loadSprite("pokoj", "../assets/pokoj.png");
  k.onLoad(() => {
    k.go("start");
  });
});

function typewrite(textObject, content, onFinished) {
  if (typewriteProcess) {
    typewriteProcess.cancel();
  }
  let index = 0;
  textObject.text = "";
  typewriteProcess = k.loop(0.02, () => {
    textObject.text += content[index] || "";
    index++;
    if (index >= content.length) {
      typewriteProcess.cancel();
      typewriteProcess = null;
      if (onFinished) onFinished();
    }
  });
}

function skipTypewrite(textObject, content) {
  if (typewriteProcess) {
    typewriteProcess.cancel();
    typewriteProcess = null;
    textObject.text = content;
    return true;
  }
  return false;
}

// animate a pickup: glow, scale up, fade out — then call onFinished
function animatePickup(ent, opts = {}, onFinished) {
  // ent: entity to animate
  const accent = opts.color || PALETTE.accent;
  const duration = opts.duration || 0.18;
  // compute sizes (handle numeric or vec2 scale)
  const w =
    (ent.width || 80) *
    (typeof ent.scale === "number"
      ? ent.scale
      : (ent.scale && ent.scale.x) || 1);
  const h =
    (ent.height || 80) *
    (typeof ent.scale === "number"
      ? ent.scale
      : (ent.scale && ent.scale.y) || 1);

  // create main glow behind the entity
  const glow = k.add([
    k.pos(ent.pos.x, ent.pos.y - (h * 0.12 || 8)),
    k.anchor("center"),
    k.rect(Math.max(w, h) * 1.2, Math.max(w, h) * 1.2, { radius: 200 }),
    k.color(accent),
    k.opacity(0),
    k.z(80),
  ]);

  // layered outer glows to emulate a blurred edge (soft ring)
  const outerGlows = [];
  for (let gi = 0; gi < 3; gi++) {
    // slightly smaller rings since overall effect is reduced
    const factor = 1.1 + gi * 0.4;
    const og = k.add([
      k.pos(ent.pos.x, ent.pos.y - (h * 0.12 || 8)),
      k.anchor("center"),
      k.rect(Math.max(w, h) * factor, Math.max(w, h) * factor, { radius: 300 }),
      k.color(accent),
      k.opacity(0),
      k.z(79 - gi),
    ]);
    outerGlows.push(og);
  }

  // bring entity to front while animating
  const origZ = ent.z || 0;
  ent.z = 95;

  // scale up then fade
  const scaleUpFactor = opts.scaleUp || 1.3;

  const doScaleTween = () => {
    if (typeof ent.scale === "number") {
      const orig = ent.scale;
      return k.tween(
        orig,
        orig * scaleUpFactor,
        duration,
        (s) => (ent.scale = s)
      );
    } else if (ent.scale && ent.scale.x !== undefined) {
      const orig = k.vec2(ent.scale.x, ent.scale.y);
      const target = k.vec2(orig.x * scaleUpFactor, orig.y * scaleUpFactor);
      return k.tween(orig, target, duration, (s) => (ent.scale = s));
    }
    return Promise.resolve();
  };

  // Glow in
  // make the center glow more subtle / transparent
  k.tween(glow.opacity, 0.6, 0.12, (o) => (glow.opacity = o)).then(() => {
    // main pulse
    glow.scale = 1;
    k.tween(glow.scale, 1.18, 0.12, (s) => (glow.scale = s)).then(() =>
      k.tween(glow.scale, 1.02, 0.18, (s) => (glow.scale = s))
    );

    // animate outer glows softly to give blurred halo
    outerGlows.forEach((og, idx) => {
      // stagger and give decreasing opacity (reduced)
      k.wait(idx * 0.025, () => {
        k.tween(og.opacity, 0.14 / (idx + 1), 0.1, (o) => (og.opacity = o));
        k.tween(og.scale || 1, 1.04 + idx * 0.04, 0.14, (s) => (og.scale = s));
      });
    });

    // spawn a subtler particle burst (reduced)
    const parts = opts.particles || 18;
    for (let i = 0; i < parts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(w, h) * (0.6 + Math.random() * 1.0);
      const sx = ent.pos.x;
      const sy = ent.pos.y;
      const px = sx + Math.cos(angle) * (3 + Math.random() * 4);
      const py = sy + Math.sin(angle) * (3 + Math.random() * 4);
      const useAccent = Math.random() > 0.7;
      const col = useAccent ? PALETTE.accent : k.rgb(255, 255, 255);
      // smaller particles
      const size = 2 + Math.random() * 4;
      const p = k.add([
        k.pos(px, py),
        k.anchor("center"),
        k.rect(size, size, { radius: Math.max(1, size / 2) }),
        k.color(col),
        k.opacity(1),
        k.z(82),
      ]);

      const tx = sx + Math.cos(angle) * dist;
      const ty = sy + Math.sin(angle) * dist - (6 + Math.random() * 12);
      k.tween(
        p.pos.x,
        tx,
        duration + Math.random() * 0.18,
        (v) => (p.pos.x = v)
      );
      k.tween(
        p.pos.y,
        ty,
        duration + Math.random() * 0.18,
        (v) => (p.pos.y = v)
      );
      k.tween(
        p.opacity,
        0,
        duration + 0.14 + Math.random() * 0.2,
        (o) => (p.opacity = o)
      ).then(() => {
        try {
          k.destroy(p);
        } catch (e) {}
      });

      // subtle rotation for a more organic feel
      const startAng = Math.random() * 360;
      const endAng =
        startAng +
        (Math.random() > 0.5 ? 360 : -360) * (0.3 + Math.random() * 0.6);
      k.tween(
        startAng,
        endAng,
        duration + 0.14 + Math.random() * 0.22,
        (a) => (p.angle = a)
      );
    }

    // a few extra spark overlays (reduced)
    for (let i = 0; i < 5; i++) {
      const sx = ent.pos.x + (Math.random() - 0.5) * w * 0.45;
      const sy = ent.pos.y + (Math.random() - 0.5) * h * 0.45;
      const s = k.add([
        k.pos(sx, sy),
        k.anchor("center"),
        k.rect(12, 5, { radius: 4 }),
        k.color(255, 255, 255),
        k.opacity(0.85),
        k.z(83),
      ]);
      k.tween(
        s.pos.y,
        s.pos.y - 12 - Math.random() * 18,
        0.28,
        (v) => (s.pos.y = v)
      );
      k.tween(s.opacity, 0, 0.32, (o) => (s.opacity = o)).then(() => {
        try {
          k.destroy(s);
        } catch (e) {}
      });
    }

    // final scale and fade
    doScaleTween().then(() => {
      const fadeDur = 0.2;
      k.tween(ent.opacity, 0, fadeDur, (o) => (ent.opacity = o));
      k.tween(glow.opacity, 0, fadeDur, (o) => (glow.opacity = o)).then(() => {
        // cleanup glows
        try {
          k.destroy(glow);
        } catch (e) {}
        outerGlows.forEach((og) => {
          try {
            k.destroy(og);
          } catch (e) {}
        });
        // remove entity and restore z
        try {
          k.destroy(ent);
        } catch (e) {}
        if (onFinished) onFinished();
      });
    });
  });
}

function buildScene(k, config) {
  const bottomBarHeight = k.height() * 0.35;
  if (config.backgroundSprite) {
    const bg = k.add([
      k.sprite(config.backgroundSprite),
      k.pos(k.center()),
      k.anchor("center"),
    ]);
    const scaleFactor = Math.max(k.width() / bg.width, k.height() / bg.height);
    bg.scale = k.vec2(scaleFactor);
  } else {
    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(PALETTE.background),
    ]);
  }
  const sceneObjects = [];
  if (config.characters) {
    config.characters.forEach((char) => {
      const xPos = k.width() * (char.posX !== undefined ? char.posX : 0.5);
      const yPos =
        char.posY !== undefined
          ? k.height() * char.posY
          : k.height() * (1 - bottomBarHeight / k.height());

      const components = [k.pos(xPos, yPos), k.anchor("bot")];
      if (char.sprite) {
        components.push(k.sprite(char.sprite));
        if (char.scale !== undefined) components.push(k.scale(char.scale));
      } else {
        components.push(
          k.rect(150, 400),
          k.color(char.placeholderColor || PALETTE.placeholder_char),
          k.opacity(0.7)
        );
        if (char.scale !== undefined) components.push(k.scale(char.scale));
      }
      // tag character so it's findable for animations / sprite swaps
      components.push("sceneCharacter");
      const ent = k.add(components);
      ent.data = { config: char };
    });
  }
  // run entrance animations for characters that requested it
  k.get("sceneCharacter").forEach((ent) => {
    const c = ent.data && ent.data.config;
    if (c && c.enterAnim) {
      // slide in from left with a pop
      const targetX = ent.pos.x;
      ent.pos.x = -Math.max(120, ent.width || 120);
      ent.opacity = 0;
      k.tween(ent.pos.x, targetX, 0.6, (v) => (ent.pos.x = v));
      k.tween(ent.opacity, 1, 0.5, (o) => (ent.opacity = o));
      // small pop after landing
      k.wait(0.6, () => {
        if (ent.scale !== undefined) {
          // handle numeric or vec2 scales
          if (typeof ent.scale === "number") {
            const orig = ent.scale;
            k.tween(orig, orig * 1.08, 0.12, (s) => (ent.scale = s)).then(() =>
              k.tween(orig * 1.08, orig, 0.18, (s) => (ent.scale = s))
            );
          } else if (
            ent.scale &&
            ent.scale.x !== undefined &&
            ent.scale.y !== undefined
          ) {
            const orig = k.vec2(ent.scale.x, ent.scale.y);
            const target = k.vec2(orig.x * 1.08, orig.y * 1.08);
            k.tween(orig, target, 0.12, (s) => (ent.scale = s)).then(() =>
              k.tween(target, orig, 0.18, (s) => (ent.scale = s))
            );
          }
        }
      });
    }
  });
  if (config.objects) {
    config.objects.forEach((obj) => {
      const components = [
        k.pos(k.width() * obj.posX, k.height() * obj.posY),
        k.anchor("center"),
        k.area(),
        "interactiveObject",
        k.opacity(0),
      ];
      if (obj.sprite) {
        components.push(k.sprite(obj.sprite));
        // support numeric scale for sprite objects
        if (obj.scale !== undefined) {
          components.push(k.scale(obj.scale));
        }
      } else {
        components.push(
          k.rect(obj.scaleX || 100, obj.scaleY || 100),
          k.color(obj.placeholderColor || PALETTE.placeholder_obj)
        );
      }
      const gameObject = k.add(components);
      gameObject.data = {
        name: obj.name,
        message: obj.message,
        nextScene: obj.nextScene,
        args: obj.args,
        // forward-transparent flag so UI can keep it invisible but interactive
        transparent: !!obj.transparent,
      };
      sceneObjects.push(gameObject);
    });
  }
  // Dialog area: either a bottom bar (default) or a comic-style speech bubble
  let messageText;
  if (config.comicBubble && config.characters && config.characters.length > 0) {
    const char = config.characters[0];
    const charX = k.width() * (char.posX !== undefined ? char.posX : 0.5);
    const charY =
      char.posY !== undefined
        ? k.height() * char.posY
        : k.height() * (1 - bottomBarHeight / k.height());

    const bubbleWidth = Math.min(k.width() * 0.6, 400);
    // increase height a bit to allow multiple lines comfortably
    const bubbleHeight = 140;
    const bubbleX = Math.max(
      16,
      Math.min(k.width() - bubbleWidth - 16, charX - bubbleWidth * 0.25)
    );
    // compute an offset so the bubble appears above the character's head
    const headOffset = char.scale !== undefined ? char.scale * 140 : 80;
    const bubbleY = Math.max(12, charY - bubbleHeight - headOffset);

    // border behind bubble for comic outline
    k.add([
      k.rect(bubbleWidth + 8, bubbleHeight + 8, { radius: 20 }),
      k.pos(bubbleX + 50, bubbleY - 450),
      k.anchor("topleft"),
      k.color(PALETTE.accent),
      k.opacity(1),
      k.z(48),
    ]);

    k.add([
      k.rect(bubbleWidth, bubbleHeight, { radius: 16 }),
      k.pos(bubbleX + 50, bubbleY - 450),
      k.anchor("topleft"),
      k.color(255, 255, 255),
      k.opacity(1),
      k.z(49),
    ]);

    // tail: a border rectangle and an inner rectangle to simulate a pointing tail
    const tailX = Math.max(12, charX - 18);
    k.add([
      k.rect(36, 20, { radius: 4 }),
      k.pos(tailX + 50, bubbleY - 450 + bubbleHeight - 2),
      k.anchor("topleft"),
      k.color(PALETTE.accent),
      k.opacity(1),
      k.z(47),
    ]);
    k.add([
      k.rect(30, 14, { radius: 3 }),
      k.pos(tailX + 50, bubbleY - 450 + bubbleHeight - 6),
      k.anchor("topleft"),
      k.color(255, 255, 255),
      k.opacity(1),
      k.z(48),
    ]);

    messageText = k.add([
      k.text("", { size: 18, width: bubbleWidth - 28, font: "Poppins" }),
      k.pos(bubbleX + 65, bubbleY - 450 + 12),
      k.anchor("topleft"),
      k.color(k.rgb(12, 12, 12)),
      k.z(50),
    ]);
  } else {
    k.add([
      k.rect(k.width(), bottomBarHeight),
      k.pos(0, k.height()),
      k.anchor("botleft"),
      k.color(0, 0, 0),
      k.opacity(0.9),
    ]);
    k.add([
      k.rect(k.width(), 3),
      k.pos(0, k.height() - bottomBarHeight),
      k.color(PALETTE.accent),
    ]);
    messageText = k.add([
      k.text("", { size: 26, width: k.width() * 0.95, font: "Poppins" }),
      k.pos(k.width() * 0.025, k.height() - bottomBarHeight + 20),
      k.color(PALETTE.text),
    ]);
  }

  const showInteractiveElements = (elements) => {
    elements.forEach((obj) => {
      // skip making objects visible if they requested to remain transparent
      if (obj.data && obj.data.transparent) return;
      k.tween(obj.opacity, 1, 0.5, (o) => (obj.opacity = o));
    });

    // Note: transparent interactive objects are still clickable (area component)
    if (config.choices) {
      let yPos = k.height() - bottomBarHeight + 110;
      config.choices.forEach((choice) => {
        const btn = k.add([
          k.pos(k.width() * 0.5, yPos),
          k.anchor("center"),
          k.rect(k.width() * 0.9, 50, { radius: 4 }),
          k.color(PALETTE.accent),
          k.opacity(0),
          k.area(),
          "choiceButton",
        ]);
        k.tween(btn.opacity, 0.8, 0.3, (o) => (btn.opacity = o));
        btn.add([
          k.text("> " + choice.text, { font: "RobotoMono", size: 20 }),
          k.anchor("center"),
          k.color(PALETTE.text),
        ]);
        btn.onClick(() => k.go(choice.nextScene, choice.args));
        yPos += 65;
      });
    }
  };

  typewrite(messageText, config.sceneText || "", () =>
    showInteractiveElements(sceneObjects)
  );

  k.onMousePress("left", () => {
    const skipped = skipTypewrite(messageText, config.sceneText);
    if (skipped) showInteractiveElements(sceneObjects);
  });

  k.onClick("interactiveObject", (obj) => {
    // Pickup animation for backpack
    if (obj.data.name === "Batoh") {
      // play a loud pickup animation then mark bag as taken and reload scene
      animatePickup(
        obj,
        { color: PALETTE.accent, scaleUp: 1.3, duration: 0.18 },
        () => {
          const args = Object.assign({}, obj.data.args || {}, { hasBag: true });
          if (obj.data.nextScene) k.go(obj.data.nextScene, args);
        }
      );
      typewrite(messageText, `[Batoh]\n${obj.data.message}`, () => {});
      return;
    }
    // Wardrobe click -> play animation, swap sprite/state, then reload scene
    if (obj.data.name === "Skříň") {
      const chars = k.get("sceneCharacter");
      const mainChar = chars && chars[0];
      if (mainChar) {
        const origY = mainChar.pos.y;
        const jumpUp = 40;
        // small jump
        k.tween(
          mainChar.pos.y,
          origY - jumpUp,
          0.12,
          (v) => (mainChar.pos.y = v)
        ).then(() =>
          k.tween(mainChar.pos.y, origY, 0.12, (v) => (mainChar.pos.y = v))
        );
        // quick pulse via opacity if available
        if (mainChar.opacity !== undefined) {
          const origO = mainChar.opacity;
          k.tween(origO, 0.6, 0.12, (o) => (mainChar.opacity = o)).then(() =>
            k.tween(0.6, origO, 0.18, (o) => (mainChar.opacity = o))
          );
        }
      }
      // show wardrobe text then reload scene with hasClothes = true
      typewrite(messageText, `[Skříň]\n${obj.data.message}`, () => {});
      k.wait(0.5, () => {
        if (obj.data.nextScene) k.go(obj.data.nextScene, obj.data.args);
      });
      return;
    }

    if (obj.data.nextScene) {
      k.go(obj.data.nextScene, obj.data.args);
    } else {
      typewrite(
        messageText,
        `[${obj.data.name}]\n${obj.data.message}`,
        () => {}
      );
    }
  });
  k.onHover("choiceButton", (btn) => {
    btn.opacity = 1;
    if (btn.children[0]) btn.children[0].color = PALETTE.hover;
  });
  k.onHoverEnd("choiceButton", (btn) => {
    btn.opacity = 0.8;
    if (btn.children[0]) btn.children[0].color = PALETTE.text;
  });
}
