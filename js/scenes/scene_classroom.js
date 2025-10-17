// js/scenes/scene_classroom.js

k.scene("classroom_stub", () => {
  buildScene(k, {
    sceneText:
      "Rozhodl ses zůstat ve třídě. Spolužáci si šeptají, nejhlasitěji Tomáš, který vypadá nervózně. Počítače ve třídě blikají.",
    objects: [
      {
        name: "Tomáš",
        message: "Vypadá, že se potí, i když je v místnosti chladno.",
        posX: 0.7,
        posY: 0.45,
        scaleX: 150,
        scaleY: 350,
        placeholderColor: k.rgb(200, 50, 50),
      },
      {
        name: "Učitelský PC",
        message: "Na monitoru běží neznámý proces 'skript.exe'.",
        posX: 0.25,
        posY: 0.5,
        scaleX: 120,
        scaleY: 100,
      },
    ],
    choices: [
      { text: "Promluvit s nervózním Tomášem", nextScene: "tom_confront" },
      { text: "Prozkoumat podezřelý proces na PC", nextScene: "examine_pc" },
    ],
  });
});

k.scene("tom_confront", () => {
  buildScene(k, {
    sceneText:
      "Přistoupíš k Tomášovi. 'Tome, jsi v pohodě? Víš něco o tom výpadku?' Tomáš zbledne a začne koktat.",
    characters: [
      { posX: 0.5, posY: 1.0, placeholderColor: k.rgb(200, 50, 50) },
    ],
    choices: [{ text: "Co se stalo?", nextScene: "tom_confession" }],
  });
});

k.scene("tom_confession", () => {
  buildScene(k, {
    sceneText:
      "'Já... já za to můžu,' přizná se Tomáš. 'Stáhnul jsem si... 'vylepšení do hry'. Spustil jsem ho a pak to celé spadlo. Tady je ten soubor, umíš s tím něco udělat?'",
    choices: [{ text: "Podívat se na kód", nextScene: "fix_code_puzzle" }],
  });
});

k.scene("examine_pc", () => {
  buildScene(k, {
    sceneText:
      "Sedneš si k počítači a otevřeš správce úloh. Proces 'skript.exe' vytěžuje síť na 100%. Podaří se ti izolovat část jeho kódu.",
    choices: [{ text: "Analyzovat kód", nextScene: "debug_script_puzzle" }],
  });
});
