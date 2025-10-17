// js/scenes/scene_server.js

k.scene("server_room", () => {
  buildScene(k, {
    sceneText:
      "Marek, správce sítě, je v koncích. 'Je to všude! Nemůžu najít zdroj útoku!'",
    characters: [
      {
        sprite: "neo_postava",
        posX: 0.25,
        name: "Marek (IT)",
        posX: 0.75,
        posY: 1.0,
        placeholderColor: k.rgb(200, 50, 50),
      },
    ],
    objects: [
      {
        name: "Hlavní Server",
        message: "Větráky jedou na plné obrátky. Červená dioda zběsile bliká.",
        posX: 0.25,
        posY: 0.4,
        scaleX: 200,
        scaleY: 500,
        placeholderColor: k.rgb(180, 180, 200),
      },
    ],
    choices: [
      {
        text: "Nabídnout pomoc s analýzou logů",
        nextScene: "log_analysis_intro",
      },
      { text: "Navrhnout 'tvrdý restart'", nextScene: "restart_server" },
    ],
  });
});

k.scene("log_analysis_intro", () => {
  buildScene(k, {
    sceneText:
      "Marek se na tebe vděčně podívá. 'Dobře... zkus to. Hledej cokoliv podezřelého z učebny E:02. Tohle jsou logy.'",
    choices: [{ text: "Pustit se do analýzy", nextScene: "log_minigame" }],
  });
});

k.scene("restart_server", () => {
  buildScene(k, {
    sceneText:
      "Marek na tebe křikne: 'Restart?! Jsi se zbláznil? To by mohlo smazat všechna data!' Poslal tě pryč.",
    choices: [
      {
        text: "ENDING: Neohrabaný Asistent (zkusit znovu)",
        nextScene: "start",
      },
    ],
  });
});
