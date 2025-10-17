// js/main.js - Hlavní soubor hry

const k = kaboom({ fullscreen: true, background: [0, 0, 0] });
const PALETTE = {
  background: k.rgb(13, 17, 23),
  text: k.rgb(201, 209, 217),
  accent: k.rgb(56, 139, 253),
  accent_light: k.rgb(88, 166, 255),
  hover: k.rgb(255, 255, 255),
  placeholder_char: k.rgb(20, 100, 120),
  placeholder_obj: k.rgb(120, 50, 80),
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
      const components = [
        k.pos(
          k.width() * char.posX,
          k.height() * (1 - bottomBarHeight / k.height())
        ),
        k.anchor("bot"),
      ];
      if (char.sprite) {
        components.push(k.sprite(char.sprite));
      } else {
        components.push(
          k.rect(150, 400),
          k.color(char.placeholderColor || PALETTE.placeholder_char),
          k.opacity(0.7)
        );
      }
      k.add(components);
    });
  }
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
      };
      sceneObjects.push(gameObject);
    });
  }
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
  const messageText = k.add([
    k.text("", { size: 26, width: k.width() * 0.95, font: "Poppins" }),
    k.pos(k.width() * 0.025, k.height() - bottomBarHeight + 20),
    k.color(PALETTE.text),
  ]);

  const showInteractiveElements = (elements) => {
    elements.forEach((obj) =>
      k.tween(obj.opacity, 1, 0.5, (o) => (obj.opacity = o))
    );
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
