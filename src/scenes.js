// Základní datová struktura pro scény, objekty a úkoly
export const scenes = {
  start: {
    description: "Ráno ve škole. Systém nefunguje, všude panika.",
    objects: [
      { name: "batoh", label: "Prohlédnout batoh", action: "HM batoh, nic zajímavého." },
      { name: "spravceIT", label: "Jít za správcem IT", nextScene: "serverovna" },
      { name: "trida", label: "Zůstat ve třídě", nextScene: "trida" }
    ]
  },
  serverovna: {
    description: "Serverovna. Správce Marek hledá zdroj problému.",
    objects: [
      { name: "logy", label: "Pomoci s logy", nextScene: "analyzaLogu" },
      { name: "restart", label: "Zkusit restart", nextScene: "restartServeru" }
    ]
  },
  trida: {
    description: "Třída. Spolužáci šuškají, že někdo hacknul síť.",
    objects: [
      { name: "mludeherut", label: "Přiznání Toma", nextScene: "priznaniToma" },
      { name: "peookoumat", label: "Spuštění skriptu", nextScene: "spusteniSkriptu" }
    ]
  },
  // ...další scény podle diagramu
};
