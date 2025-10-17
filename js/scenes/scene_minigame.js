// js/scenes/scene_minigame.js

// --- MINI-HRA: ANALÝZA LOGŮ ---
k.scene("log_minigame", () => {
  k.add([k.rect(k.width(), k.height()), k.color(PALETTE.background)]);
  k.add([
    k.text("NAJDI ZÁZNAM Z UČEBNY E:02", { size: 32, font: "RobotoMono" }),
    k.pos(k.center().x, k.height() * 0.1),
    k.anchor("center"),
    k.color(PALETTE.accent),
  ]);
  const logs = [
    {
      log: "[..] [AUTH] Login failed from 192.168.1.10 (PC_RECEPCE)",
      correct: false,
    },
    { log: "[..] [SYSTEM] Temp OK: CPU @ 55C", correct: false },
    {
      log: "[..] [NETWORK] Anomaly detected from 10.10.34.56 (Ucebna:E:02)",
      correct: true,
    },
    { log: "[..] [AUTH] Admin login from 127.0.0.1", correct: false },
    {
      log: "[..] [FIREWALL] Port 80 traffic spike from 10.10.15.12 (Ucebna:A:11)",
      correct: false,
    },
  ];
  let yPos = k.height() * 0.25;
  for (const log of logs) {
    const logLine = k.add([
      k.text(log.log, { size: 22, font: "RobotoMono" }),
      k.pos(k.center().x, yPos),
      k.anchor("center"),
      k.area({ scale: 1.1 }),
      k.color(PALETTE.text),
    ]);
    logLine.onClick(() => k.go(log.correct ? "win" : "lose"));
    logLine.onHover(
      () => (logLine.color = PALETTE.accent_light),
      () => (logLine.color = PALETTE.text)
    );
    yPos += 60;
  }
});

// --- NOVÁ MINI-HRA 1: OPRAVA KÓDU ---
k.scene("fix_code_puzzle", () => {
  buildScene(k, {
    sceneText:
      'Na obrazovce vidíš část škodlivého kódu, který se snaží smazat sám sebe, ale obsahuje chybu.\n\nfunction remove_virus(path) {\n  if (path == "/local/virus.exe") {\n    system.delete(file); \n  }\n}',
    choices: [
      {
        text: "Opravit 'system.delete(file)' na 'system.delete(path)'",
        nextScene: "ending_reset",
      },
      {
        text: "Smazat celý řádek 'system.delete(file)'",
        nextScene: "ending_system_crash",
      },
      { text: "Nic neměnit a spustit", nextScene: "ending_system_crash" },
    ],
  });
});

// --- NOVÁ MINI-HRA 2: DEBUG SKRIPTU ---
k.scene("debug_script_puzzle", () => {
  buildScene(k, {
    sceneText:
      'Podařilo se ti zachytit smyčku, která neustále odesílá data na cizí server.\n\nwhile(network.online) {\n  network.send_data_to("123.45.67.89");\n}',
    choices: [
      {
        text: "Přidat na konec smyčky 'wait(5)' pro zpomalení",
        nextScene: "ending_system_crash",
      },
      {
        text: "Nahradit IP adresu za '127.0.0.1' (localhost)",
        nextScene: "ending_reset",
      },
      { text: "Ukončit proces", nextScene: "ending_reset" },
    ],
  });
});

// --- FUNKCE PRO KONCOVÉ OBRAZOVKY ---
function createEndScene(k, title, message, titleColor) {
  k.add([k.rect(k.width(), k.height()), k.color(PALETTE.background)]);
  k.add([
    k.text(title, { size: 60, font: "PoppinsBold" }),
    k.pos(k.center()),
    k.anchor("center"),
    k.color(titleColor),
  ]);
  k.add([
    k.text(message, {
      size: 24,
      width: k.width() * 0.8,
      align: "center",
      font: "Poppins",
    }),
    k.pos(k.width() / 2, k.height() / 2 + 80),
    k.anchor("center"),
  ]);
  const restartBtn = k.add([
    k.text("> Zkusit znovu <", { size: 30, font: "RobotoMono" }),
    k.pos(k.width() / 2, k.height() - 80),
    k.anchor("center"),
    k.area(),
  ]);
  restartBtn.onClick(() => k.go("start"));
  restartBtn.onHover(
    () => (restartBtn.color = PALETTE.accent_light),
    () => (restartBtn.color = PALETTE.text)
  );
}

// --- DEFINICE KONCŮ HRY ---
k.scene("win", () =>
  createEndScene(
    k,
    "ÚSPĚCH!",
    "Našel jsi správnou IP! Zachránil jsi síť.\nENDING 1: Spasitel",
    PALETTE.accent_light
  )
);
k.scene("lose", () =>
  createEndScene(
    k,
    "CHYBA!",
    "To nebyl správný záznam. Systém se zhroutil.\nENDING 5: Débrá",
    k.rgb(255, 80, 80)
  )
);
k.scene("ending_reset", () =>
  createEndScene(
    k,
    "SYSTÉM OBNOVEN",
    "Podařilo se ti zastavit a opravit škodlivý kód! Síť se restartuje do normálu.\nENDING 9: Reset",
    PALETTE.accent_light
  )
);
k.scene("ending_system_crash", () =>
  createEndScene(
    k,
    "HAVÁRIE SYSTÉMU",
    "Tvoje akce způsobila nevratné poškození. Všechna data jsou ztracena.\nENDING 10: Havárie",
    k.rgb(255, 80, 80)
  )
);

// FINÁLNÍ SPUŠTĚNÍ HRY
k.go("loading");
