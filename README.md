# PLANETA 🪐

Joc original d'un sol toc fet amb **three.js**. Llances roques contra un planeta que gira. Cada roca s'hi enganxa on cau i desplaça el centre de massa. Si el costat pesant (vermell) creix massa, el planeta bolca i es trenca. L'objectiu: el planeta més gran possible.

## Mecànica

- Una roca orbita el planeta en sentit contrari al gir. **Toca** per llançar-la cap al centre.
- La roca s'enganxa al primer que toca (nucli o altres roques) i suma la seva massa.
- El **punt verd** és l'antípoda del centre de massa: llançar-hi la roca corregeix l'equilibri. El **punt vermell** és el costat pesant.
- La barra d'**equilibri** mostra com de lluny és el centre de massa del límit. Al 100% el planeta es trenca.
- **Perfecte**: reduir molt el desequilibri d'un sol cop. Els perfectes encadenats fan combo.
- El planeta creix de veritat (radi ∝ ∛massa): a 25 roques guanya **atmosfera**, a 60 **anells**, a 100 **lluna**.
- Cada partida acaba amb un diàmetre en km, pensat per ser compartit.

## Per què pot ser viral

- Mecànica nova (no és cap clon), però s'entén en 3 segons.
- Partides de 30–90 s, "una més i ja", fracàs espectacular (explosió del planeta).
- **Repte diari** amb un únic intent i ratxa, mateixa seqüència per a tothom.
- **Compartir**: graella d'emojis 🟩🟨🟥, targeta PNG amb el teu planeta i enllaç de repte (`?beat=47`).
- Temes desbloquejables, so sintetitzat, vibració, PWA sense connexió, ca/es/en.

## Executar en local

Cal servir-lo per HTTP (els mòduls ES no funcionen amb `file://`).

```bash
python -m http.server 5173
```

o `npm run dev`. Després obre <http://localhost:5173>.

## Publicar

Lloc estàtic: puja la carpeta (sense `skystack-old/`) a GitHub Pages, Netlify, Vercel o Cloudflare Pages. Cal HTTPS per al service worker i per compartir amb imatge al mòbil. Canvia `og:image` per un PNG absolut de 1200×630 i ajusta `EPOCH` a `js/rng.js` al dia de llançament.

## Estructura

| Fitxer | Què fa |
| --- | --- |
| `index.html` | Pantalles i importmap de three.js |
| `js/game.js` | Escena 3D, física del centre de massa, col·lisions, càmera, efectes |
| `js/main.js` | Interfície, modes, compartir, persistència |
| `js/themes.js` | Paletes i nebulosa per etapes |
| `js/audio.js` | Sons sintetitzats amb Web Audio |
| `js/share.js` | Graella d'emojis, Web Share, targeta PNG |
| `js/rng.js` | PRNG determinista i calendari del repte diari |
| `js/i18n.js` | Textos ca/es/en |
| `sw.js`, `manifest.webmanifest` | PWA |
| `skystack-old/` | Prototip anterior (clon de Stack), conservat com a referència |

## Controls

Toc, clic o **espai** per llançar. **Enter** per tornar-hi a la pantalla final.

## Publicació i app Android

- **Web / PWA**: https://puji07git.github.io/planeta/ (repositori públic `puji07Git/planeta`, GitHub Pages). Codi font al repositori privat `puji07Git/planeta-src`.
- **App Android (APK)**: https://puji07git.github.io/planeta/planeta.apk. És una *Trusted Web Activity* que mostra aquesta web a pantalla completa; s'actualitza sola quan es publica una versió nova (el *service worker* la baixa en segon pla i recarrega quan no s'està jugant).
- **Publicar**: `python deploy.py "missatge"` (copia la web a `../planeta-site`, canvia la versió de la cau i fa *push*).
- **Reconstruir l'app** (només si canvia icona, nom o paquet): `powershell -ExecutionPolicy Bypass -File build_app.ps1`. Puja `appVersionCode` a `app/twa-manifest.json` abans.
- **Fes còpia de `keystore/`** (fora de git): és la clau de signatura de l'app.

