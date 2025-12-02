# 🎮 CodeBreaker

**CodeBreaker** je interaktivní vizuální novela vytvořená v enginu RenJS. Hra sleduje příběh studenta Nea, který odhaluje, že jeho škola (a možná i celý svět) není tím, čím se zdá být.

Projekt je koncipován jako kolaborativní dílo, kde tři vývojáři pracují na třech odlišných dějových liniích, které vycházejí ze společného úvodu.

---

## 📂 Struktura Příběhu

Hra je rozdělena do logických bloků uložených ve formátu JSON:

### 1. Společný Úvod (`pribeh1.json`)
Tato část je pro všechny větve stejná.
*   **Děj:** Neo se ráno probouzí, nestíhá do školy a dobíhá autobus. Před školou potkává svého kamaráda Toma.
*   **Zápletka:** Tom se chová podivně. Ptá se na starý dějepisný projekt a zmizí uvnitř školy dřív, než mu Neo stihne pořádně odpovědět.
*   **Rozcestí:** V momentě, kdy Neo s Tomem domluví, realita se štěpí na tři různé verze podle toho, kdo příběh píše.

### 2. Větve Příběhu
*   **🟢 Větev 1 (Kuba):** `pribeh1-kuba.json` - Simulace, Hacking
*   **🔵 Větev 2 (Michael):** `???`
*   **🔴 Větev 3 (Matyáš):** `???`

---

## 🛠️ Technické Informace

*   **Engine:** RenJS (JavaScript Visual Novel Engine)
*   **Jazyk:** Čeština
*   **Assets:**
    *   Pozadí a postavy jsou generovány pomocí AI a uloženy v `assets/images`.
    *   Minihry jsou řešeny jako samostatné HTML soubory v `assets/minigames` a načítány přes iframe.

---

## 🚀 Jak spustit projekt

1.  Naklonujte repozitář.
2.  Otevřete složku ve VS Code.
3.  # 🎮 CodeBreaker
