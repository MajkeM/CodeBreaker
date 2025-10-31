// js/scenes/scene_intro.js

k.scene("start", () => {
  k.add([k.rect(k.width(), k.height()), k.color(PALETTE.background)]);
  k.add([
    k.text("CodeBreaker", { size: 72, font: "RobotoMono" }),
    k.pos(k.center().x, k.height() * 0.4),
    k.anchor("center"),
    k.color(PALETTE.accent),
  ]);
  const startButton = k.add([
    k.text("[ Spustit simulaci ]", { size: 32, font: "RobotoMono" }),
    k.pos(k.center().x, k.height() * 0.6),
    k.anchor("center"),
    k.color(PALETTE.text),
    k.area(),
  ]);
  startButton.onHover(
    () => (startButton.color = PALETTE.accent_light),
    () => (startButton.color = PALETTE.text)
  );
  startButton.onClick(() => k.go("neo_room"));
});

k.scene("neo_room", (state = { hasBag: false, hasClothes: false }) => {
  let sceneText = "Nové ráno. Musím se připravit do školy.";
  if (state.hasBag && !state.hasClothes)
    sceneText = "Batoh mám, ještě se obléct.";
  if (!state.hasBag && state.hasClothes)
    sceneText = "Jsem oblečený, ještě batoh.";
  if (state.hasBag && state.hasClothes)
    sceneText = "Tak, jsem připraven. Můžu vyrazit.";
  // Add a room background and the main character. Use the backpack sprite for the bag.
  buildScene(k, {
    sceneText: sceneText,
    backgroundSprite: "pokoj",
    // make the main character smaller and positioned fully left
    characters: [
      {
        sprite: state.hasClothes ? "mc" : "mc_pyzamo",
        // place fully left and all the way down
        posX: 0.07,
        posY: 1.0,
        scale: 0.9,
        enterAnim: true,
      },
    ],
    // show scene text in a comic-style speech bubble attached to the character
    comicBubble: true,
    objects: [
      {
        name: "Batoh",
        sprite: "backpack",
        message: state.hasBag ? "Tady už mám všechno." : "Sbaleno...",
        // place backpack 20% from the right and 20% from the bottom
        posX: 0.8,
        posY: 0.8,
        scaleX: 50,
        // increase sprite scale slightly so it's visible at new position
        scale: 0.15,
        placeholderColor: k.rgb(200, 50, 50),
        nextScene: "neo_room",
        transparent: state.hasBag ? true : false,
        args: { hasBag: true, hasClothes: state.hasClothes },
      },
      {
        name: "Skříň",
        message: state.hasClothes ? "Už jsem oblečený." : "Oblečeno.",
        posX: 0.32,
        posY: 0.488,
        scaleX: 160,
        scaleY: 350,
        nextScene: "neo_room",
        // transparent interactive wardrobe (invisible hotspot)
        transparent: true,
        args: { hasBag: state.hasBag, hasClothes: true },
      },
      {
        name: "Dveře",
        message:
          state.hasBag && state.hasClothes
            ? "Čas vyrazit..."
            : !state.hasBag
            ? "Nemůžu odejít bez batohu!"
            : "Ještě bych se měl obléct!",
        posX: 0.22,
        posY: 0.48,
        scaleX: 100,
        scaleY: 350,
        nextScene:
          state.hasBag && state.hasClothes ? "going_to_bus_stop" : "neo_room",
        // invisible but clickable door hotspot
        transparent: true,
        args: state,
      },
    ],
  });
});

// polished 2D map animation: A -> B with animated path and a button after ~5s
k.scene("going_to_bus_stop", () => {
  // white map background
  k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.anchor("topleft"),
    k.color(255, 255, 255),
  ]);

  // header / small narration
  k.add([
    k.text("Jdu na autobusovou zastávku...", { size: 20, font: "Poppins" }),
    k.pos(k.width() * 0.5, 28),
    k.anchor("center"),
    k.color(k.rgb(40, 40, 40)),
    k.z(10),
  ]);

  // map padding and positions (relative layout)
  const margin = 48;
  const mapLeft = margin;
  const mapTop = 80;
  const mapRight = k.width() - margin;
  const mapBottom = k.height() - 140;

  // define A (home) and B (bus stop)
  const A = k.vec2(
    mapLeft + (mapRight - mapLeft) * 0.12,
    mapBottom - (mapBottom - mapTop) * 0.1
  );
  const B = k.vec2(
    mapLeft + (mapRight - mapLeft) * 0.82,
    mapTop + (mapBottom - mapTop) * 0.12
  );

  // draw soft map frame
  k.add([
    k.rect(mapRight - mapLeft, mapBottom - mapTop, { radius: 12 }),
    k.pos(mapLeft, mapTop),
    k.anchor("topleft"),
    k.color(k.rgb(245, 245, 245)),
    k.z(5),
  ]);

  // labels for A and B
  const labelA = k.add([
    k.text("A: Domov", { size: 16, font: "Poppins" }),
    k.pos(A.x - 6, A.y + 18),
    k.anchor("center"),
    k.color(k.rgb(30, 30, 30)),
    k.z(20),
  ]);
  const labelB = k.add([
    k.text("B: Autobusová zastávka", { size: 16, font: "Poppins" }),
    k.pos(B.x + 6, B.y - 18),
    k.anchor("center"),
    k.color(k.rgb(30, 30, 30)),
    k.z(20),
  ]);

  // points
  const pointA = k.add([
    k.pos(A),
    k.anchor("center"),
    k.rect(14, 14, { radius: 8 }),
    k.color(PALETTE.accent),
    k.z(21),
  ]);
  const pointB = k.add([
    k.pos(B),
    k.anchor("center"),
    k.rect(14, 14, { radius: 8 }),
    k.color(k.rgb(100, 100, 100)),
    k.z(21),
  ]);

  // prepare path segments that will be revealed over time to simulate a drawn route
  const totalDuration = 5.0; // seconds for the whole animation
  const steps = 60; // more steps => smoother reveal
  const segments = [];
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = A.x + dx * t;
    const py = A.y + dy * t;
    const seg = k.add([
      k.pos(px, py),
      k.anchor("center"),
      k.rect(8, 8, { radius: 4 }),
      k.color(PALETTE.accent_light),
      k.opacity(0),
      k.z(15),
    ]);
    segments.push(seg);
    // stagger their appearance across totalDuration
    k.wait(t * totalDuration, () => {
      // fade-in a few milliseconds for a smooth stroke
      k.tween(seg.opacity, 1, 0.08, (o) => (seg.opacity = o));
    });
  }

  // moving marker (bus icon) that travels along the path
  const bus = k.add([
    k.pos(A.x, A.y),
    k.anchor("center"),
    k.rect(22, 12, { radius: 4 }),
    k.color(PALETTE.accent),
    k.z(30),
  ]);

  // subtle glow under the bus
  const busGlow = k.add([
    k.pos(A.x, A.y + 6),
    k.anchor("center"),
    k.rect(44, 22, { radius: 22 }),
    k.color(PALETTE.accent_light),
    k.opacity(0.18),
    k.z(28),
  ]);

  // animate bus along straight line over totalDuration seconds
  k.tween(0, 1, totalDuration, (v) => {
    bus.pos.x = A.x + dx * v;
    bus.pos.y = A.y + dy * v;
    bus.angle = v * 360;
    busGlow.pos.x = bus.pos.x;
    busGlow.pos.y = bus.pos.y + 6;
    // slowly brighten the glow while moving
    busGlow.opacity = 0.18 + 0.4 * Math.sin(v * Math.PI);
  }).then(() => {
    // After animation finished (~totalDuration), show the 'board bus' button
    const btnW = 360;
    const btnH = 56;
    const btn = k.add([
      k.pos(k.center().x - btnW / 2, k.height() - 96),
      k.anchor("topleft"),
      k.rect(btnW, btnH, { radius: 8 }),
      k.color(PALETTE.accent),
      k.opacity(0),
      k.area(),
      k.z(60),
    ]);
    const btnText = k.add([
      k.text("Nastoupit do autobusu", { size: 20, font: "PoppinsBold" }),
      k.pos(k.center().x, k.height() - 96 + btnH / 2),
      k.anchor("center"),
      k.color(k.rgb(255, 255, 255)),
      k.opacity(0),
      k.z(61),
    ]);
    k.tween(btn.opacity, 1, 0.25, (o) => (btn.opacity = o));
    k.tween(btnText.opacity, 1, 0.28, (o) => (btnText.opacity = o));

    btn.onHover(
      () => {
        btn.color = PALETTE.accent_light;
      },
      () => {
        btn.color = PALETTE.accent;
      }
    );

    btn.onClick(() => {
      k.go("bus_ride");
    });
  });
});
k.scene("bus_ride", () =>
  buildScene(k, {
    sceneText:
      "Na cestě do školy autobusem... Dnešek mi přijde nějaký divný. Mám z něj špatný pocit.",
    characters: [{ sprite: "neo_postava", posX: 0.5 }],
    choices: [{ text: "Vystoupit u školy", nextScene: "hallway" }],
  })
);
k.scene("hallway", () =>
  buildScene(k, {
    sceneText:
      "Školní chodby jsou zatím klidné. Ten divný pocit ale nemizí. Jako klid před bouří.",
    backgroundSprite: "pozadi_chodba",
    characters: [{ sprite: "neo_postava", posX: 0.5 }],
    choices: [{ text: "Vstoupit do třídy", nextScene: "entering_classroom" }],
  })
);
k.scene("entering_classroom", () =>
  buildScene(k, {
    sceneText: "*Vcházím do třídy a zdravím spolužáka Lea.*",
    characters: [{ sprite: "neo_postava", posX: 0.5 }],
    choices: [
      { text: "Posaď se a prohoď pár slov", nextScene: "classroom_calm" },
    ],
  })
);

k.scene("classroom_calm", () => {
  let dialogueIndex = 0;
  const dialogues = [
    {
      speaker: "Leo",
      text: "Čau Neo! Slyšel jsi o tom novém firewallu, co včera instalovali? Prý je to špička.",
    },
    {
      speaker: "Neo",
      text: "Jo, slyšel. Ale víš jak to je... 'neprolomitelné' zabezpečení je jen mýtus, který čeká na vyvrácení.",
    },
    {
      speaker: "Leo",
      text: "No tak, nebuď skeptik. Tentokrát to má být jiné. Dokonce má AI pro detekci anomálií!",
    },
    { speaker: "Neo", text: "To říkají pokaždé, dokud se..." },
  ];

  k.add([k.rect(k.width(), k.height()), k.color(PALETTE.background)]);
  k.add([
    k.sprite("neo_postava"),
    k.pos(k.width() * 0.2, k.height()),
    k.anchor("bot"),
  ]);
  k.add([
    k.rect(150, 400),
    k.pos(k.width() * 0.8, k.height()),
    k.anchor("bot"),
    k.color(PALETTE.placeholder_char),
  ]);
  k.add([
    k.rect(k.width(), k.height() * 0.35),
    k.pos(0, k.height()),
    k.anchor("botleft"),
    k.color(0, 0, 0),
    k.opacity(0.9),
  ]);
  k.add([
    k.rect(k.width(), 3),
    k.pos(0, k.height() - k.height() * 0.35),
    k.color(PALETTE.accent),
  ]);
  const messageText = k.add([
    k.text("", { size: 26, width: k.width() * 0.95, font: "Poppins" }),
    k.pos(k.width() * 0.025, k.height() * 0.67),
    k.color(PALETTE.text),
  ]);
  const continuePrompt = k.add([
    k.text("[...]", { font: "Poppins" }),
    k.pos(k.width() - 50, k.height() - 30),
    k.anchor("center"),
    k.opacity(0),
  ]);

  const triggerAlarm = () => {
    k.add([
      k.text("!!! SYSTÉM NARUŠEN !!!", { size: 50, font: "PoppinsBold" }),
      k.pos(k.center()),
      k.anchor("center"),
      k.color(k.rgb(255, 255, 255)),
      k.z(100),
    ]);
    const redOverlay = k.add([
      k.rect(k.width(), k.height()),
      k.color(PALETTE.alarm_red),
      k.opacity(0),
      k.z(99),
    ]);
    k.loop(0.5, () => {
      k.tween(
        redOverlay.opacity,
        0.3,
        0.25,
        (o) => (redOverlay.opacity = o)
      ).then(() =>
        k.tween(redOverlay.opacity, 0, 0.25, (o) => (redOverlay.opacity = o))
      );
    });
    k.wait(3, () => k.go("school_morning"));
  };

  const playNextDialogue = () => {
    if (dialogueIndex >= dialogues.length) {
      triggerAlarm();
      return;
    }
    continuePrompt.opacity = 0;
    const currentDialogue = dialogues[dialogueIndex];
    const formattedText = `[${currentDialogue.speaker}] ${currentDialogue.text}`;

    typewrite(messageText, formattedText, () => {
      k.tween(
        continuePrompt.opacity,
        1,
        0.5,
        (o) => (continuePrompt.opacity = o)
      );
    });
    dialogueIndex++;
  };

  k.onMousePress("left", () => {
    if (typewriteProcess) {
      const currentDialogue = dialogues[dialogueIndex - 1];
      const formattedText = `[${currentDialogue.speaker}] ${currentDialogue.text}`;
      skipTypewrite(messageText, formattedText);
      k.tween(
        continuePrompt.opacity,
        1,
        0.5,
        (o) => (continuePrompt.opacity = o)
      );
    } else {
      playNextDialogue();
    }
  });

  playNextDialogue();
});

k.scene("school_morning", () => {
  buildScene(k, {
    sceneText:
      "Blikající červená světla a chaos. Hlášení o výpadku sítě se potvrzuje ve velkém stylu.",
    backgroundSprite: "pozadi_chodba",
    characters: [{ sprite: "neo_postava", posX: 0.25 }],
    objects: [
      {
        name: "Terminál",
        message: "Obrazovka zrní. ERROR: SYSTÉM NEDOSTUPNÝ.",
        sprite: "terminal",
        posX: 0.7,
        posY: 0.5,
      },
      {
        name: "Spolužáci",
        message: "V panice pobíhají kolem...",
        posX: 0.8,
        posY: 0.45,
        scaleX: 200,
        scaleY: 300,
        placeholderColor: k.rgb(180, 160, 50),
      },
    ],
    choices: [
      { text: "Jít za správcem IT do serverovny", nextScene: "server_room" },
      { text: "Zůstat ve třídě a zjistit víc", nextScene: "classroom_stub" },
    ],
  });
});
