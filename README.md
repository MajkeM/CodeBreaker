RenJS Visual Novel - demo

Rychlé starty (PowerShell):

Development (Vite dev server)

```powershell
npm install    # nainstaluje vite (dev dependency)
npm run dev
```

Build + preview

```powershell
npm run build
npm run preview
```

Legacy / jednoduché otevření

```powershell
npm run start
```

O RenJS bundle

- Projekt výchoze obsahuje v `index.html` CDN odkaz na `https://renjs.net/downloads/releases/renjs.js`.
- Pokud chceš stáhnout lokální kopii (doporučeno pro stabilní vývoj), spusť:

```powershell
npm run fetch-renjs
```

To stáhne `renjs.js` do `vendor/renjs.js` (vytvoří adresář `vendor/`). Pak můžeš `index.html` upravit tak, aby načítal lokální soubor místo CDN.

Fallback renderer

Pokud oficiální engine nebude dostupný, skript `src/main.js` automaticky spustí jednoduchý DOM fallback (`src/game.js`) a vykreslí `scenes/scene1.json`.

Další kroky doporučené:

- Přidat assets do `assets/` a upravit scény.
- Upravit `index.html` k použití lokální `vendor/renjs.js` po stažení.
- Přidat TypeScript/Vite nastavení a testy podle potřeby.

