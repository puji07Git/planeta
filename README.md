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

## El viatge (v2)

- **Roques especials** a partir de la roca 15 (8% → 30% de probabilitat): *pesada* (doble massa), *gel* (rellisca fins a 45° cap al punt verd; al costat pesat es congela i pesa un 30% més), *or* (fa créixer el planeta el doble i suma combo) i *explosiva* (fa saltar les roques del voltant on cau; l'única manera de treure pes).
- **Trobades**: cada 25 roques (les primeres 25 són de calma) el planeta troba una cosa que aplica una regla durant 25 roques, amb 5 roques de calma entremig on es veu acostar-se la següent. Nou trobades combinables (lluna, anell, planeta X, cometa, pluja de meteorits, estrella, nebulosa, forat negre, cinturó). Les tres primeres són suaus i d'una en una; a partir de la sisena n'hi ha dues alhora, i tres a partir de la dotzena. Cada repetició torna amb més intensitat (Lluna II, III…). La seqüència surt de la llavor de la partida (al repte diari, la mateixa per a tothom). Mai anell i cinturó junts.
- **Millores**: en superar un sector (tres trobades) hi ha un 60% de probabilitat de rebre una millora aleatòria, sense triar i sense cost, que dura 25 roques (gir lent, roques grans, imant, segona oportunitat, òrbita doble, visió, compressió, febre de l'or, glacial). No s'acumulen.
- **Dificultat sense sostre**: la velocitat de gir puja ràpid fins a ~100 roques i després continua pujant lentament per sempre.
- **Música generativa** (`js/music.js`): acords llargs tipus orgue que respiren a través d'un filtre i una reverberació llarga, baix subgreu i campanes esparses; sona al menú i durant tota la partida, i cada trobada canvia els acords, la brillantor i el ritme (forat negre greu i tens, estrella brillant i major, nebulosa filtrada...).
- **Roques especials ben visibles**: halo de color pulsant al voltant de la roca en òrbita i etiqueta a dalt (l'explosiva demana llançar-la al costat vermell i el punt vermell s'engrandeix).
- **Aproximació**: durant les 5 roques de calma l'element es veu venir gran i translúcid, amb l'etiqueta "S'acosta" i un so greu; després es col·loca.
- **Gravetat** de lluna i forat negre: el vol s'alenteix, la roca deixa una estela, i mentre hi ha gravetat es dibuixa la trajectòria corbada que farà la roca des d'on és (línia daurada). Si la corba l'allunya del planeta es perd ("capturada").
- **Millora activa**: aura de color al voltant del planeta i etiqueta amb la millora i les roques restants.
- **Etapes** (nou, i després universos que es repeteixen cada 400 roques amb un altre color), cadascuna amb el seu tret: Asteroide 0 (roca nua i pols orbitant), Planetoide 25 (atmosfera), Planeta 60 (oceans i núvols), Gegant 100 (bandes de gas), Estrella 150 (nucli encès, corona, roques de plasma), Gegant blau 250, Supernova 400 (flaix, nucli que s'encongeix i polsa), Galàxia 600 (braços espirals), Univers 900 (cel negre i galàxies llunyanes). Vegeu `_applyStageLook` a `js/game.js` i `STAGE_SCORES` a `js/themes.js`. El missatge diu "Etapa N · Nom" i la guia les llista. Els dibuixos de la guia són els mateixos que surten al joc (barra de trobades, avisos, etiquetes de roques).
- **Pausa** (botó ⏸): continuar o tornar al menú. **Estadístiques** amb totals de roques especials, trobades superades i targetes.
- **Actualitzacions**: indicador ↻ i avís quan hi ha versió nova (s'instal·la en tornar al menú) i avís "Joc actualitzat" després.
- **Noms inventats**: cada repetició d'una trobada porta un nom propi (Lluna Nyx, Planeta Kairos, Estrella Helios, Cometa Vela, Pluja Arel, Nebulosa Orel, Forat negre Umbra, Cinturó Dast, Barrera Ilse…), amb color propi en el cas dels planetes (`NAMES` a `js/journey.js`).
- **Sense decoració**: el creixement es mostra pel cel de fons, l'halo d'atmosfera subtil i el nom d'etapa; els anells i el satèl·lit de les 60/100 roques s'han tret.
- **Música per trobada**: cada trobada té estil propi (vidre, cordes, arpegis, campanes, bordó…) i quan n'hi ha diverses només sona la de més pes.
- **Explosiva**: esclata en tocar el planeta i desapareix emportant-se les roques del voltant; mai pot trencar el planeta (equilibri màxim 85%).
- **Anells** (la roca que toca un arc rebota i fa una volta més) i **Anells de gel** (la roca llisca fins al forat més proper i continua). Mai coincideixen dos obstacles alhora.
- **Música**: transicions per fosa lenta (mai de cop); amb diverses trobades, els acords vénen de la de més pes i les altres hi afegeixen la seva capa (arpegi, tremolor, filtre, subgreu).
- **Menú**: botó ? (com es juga + guia amb dibuixos com al joc); avisos a la part superior; sense text explicatiu al menú.
- **Guia** al menú amb roques especials, trobades i targetes.
- Codi: `js/journey.js` (generador, roques especials, targetes, noms), `js/encounters.js` (visuals i regles de cada trobada), `js/music.js`, integrat a `js/game.js`.
- **App Android a pantalla completa**: el fitxer `.well-known/assetlinks.json` ha de ser a l'arrel del domini (repositori `puji07Git/puji07git.github.io`), no dins de `/planeta/`; conté les empremtes de PLANETA i PINÇA.

## Publicació i app Android

- **Web / PWA**: https://puji07git.github.io/planeta/ (repositori públic `puji07Git/planeta`, GitHub Pages). Codi font al repositori privat `puji07Git/planeta-src`.
- **App Android (APK)**: https://puji07git.github.io/planeta/planeta.apk. És una *Trusted Web Activity* que mostra aquesta web a pantalla completa; s'actualitza sola quan es publica una versió nova (el *service worker* la baixa en segon pla i recarrega quan no s'està jugant).
- **Publicar**: `python deploy.py "missatge"` (copia la web a `../planeta-site`, canvia la versió de la cau i fa *push*).
- **Reconstruir l'app** (només si canvia icona, nom o paquet): `powershell -ExecutionPolicy Bypass -File build_app.ps1`. Puja `appVersionCode` a `app/twa-manifest.json` abans.
- **Fes còpia de `keystore/`** (fora de git): és la clau de signatura de l'app.

## Temes

Deu temes. Es desbloquegen en arribar per primer cop a una etapa (Lava 25, Gel 60, Neó 100, Terra 150, Or 250, Supernova 400, Galàxia 600, Univers 900) i Aurora amb 7 dies seguits de repte diari. Els desbloquejats amb llindars antics es mantenen. El tema no canvia sol en desbloquejar-lo: només apareix l'avís i queda disponible a la llista. L'últim fons i colors es desen (`planeta.look`) i s'apliquen amb un guió inicial abans del primer pintat perquè el tema triat no aparegui després del de per defecte.

## Universos i sortida avançada (v9)

Després de l'Univers (900 roques) cada 400 roques comença un univers nou amb nom inventat, color i un tret propi que dura tot l'univers (`UNIVERSES` a `js/themes.js`, `applyUniverse` a `js/journey.js`, `_applyUniverse`/`_baseMods` a `js/game.js`): Aeon (l'òrbita respira), Kaal (dues roques orbiten), Vesper (el punt verd parpelleja), Ilun (roques especials ×2), Sarme (roques més pesades), Oriel (el punt verd tremola), Nuvo (l'òrbita canvia de sentit cada 12 roques), Zairo (roques més petites i ràpides). En acabar la llista tornen com Aeon II, Kaal II… Els trets s'apliquen sota qualsevol millora i es reconstrueixen en canviar d'univers. La guia els llista.

Sortida avançada: al menú, sota JUGA, una fila de xips amb totes les etapes que el rècord ha assolit (`store.startStage`, `renderStartRow` a `js/main.js`); la partida comença amb la puntuació de l'etapa i un planeta prefabricat de la mida que té una partida real a aquell punt (`_prefill(n)` a `js/game.js`: massa objectiu `(1 + n/250)^3`, només les ~80 roques més recents es construeixen). A la pantalla de fi de partida, «Torna a sortir des de {etapa}» reinicia des de l'última etapa assolida. El repte diari sempre surt de zero. Compta per a rècord, temes i estadístiques.
