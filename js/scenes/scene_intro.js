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
  buildScene(k, {
    sceneText: sceneText,
    objects: [
      {
        name: "Batoh",
        sprite: "batoh",
        message: state.hasBag ? "Tady už mám všechno." : "Sbaleno...",
        posX: 0.2,
        posY: 0.6,
        scaleX: 50,
        scale: 0.2,
        placeholderColor: k.rgb(200, 50, 50),
        nextScene: "neo_room",
        args: { hasBag: true, hasClothes: state.hasClothes },
      },
      {
        name: "Skříň",
        message: state.hasClothes ? "Už jsem oblečený." : "Oblečeno.",
        posX: 0.8,
        posY: 0.45,
        scaleX: 180,
        scaleY: 400,
        nextScene: "neo_room",
        sprite: "batoh",
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
        posX: 0.5,
        posY: 0.4,
        scaleX: 150,
        scaleY: 450,
        nextScene:
          state.hasBag && state.hasClothes ? "going_to_bus_stop" : "neo_room",
        args: state,
      },
    ],
  });
});

k.scene("going_to_bus_stop", () =>
  buildScene(k, {
    sceneText: "*Jdu na autobusovou zastávku...*",
    characters: [{ sprite: "neo_postava", posX: 0.5 }],
    choices: [{ text: "Nastoupit do autobusu", nextScene: "bus_ride" }],
  })
);
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
