# Outils (développeurs)

- `node outils/construire-carte.js` : regénère `data/carte.js` à partir de `countries-50m.json` (world-atlas 2.0.2).
  Il retire l'Antarctique, sépare la Guyane française de la France et donne un code au Kosovo.
- `lanceur.applescript` : source de `Globe-Trotteur.app`. Pour le recompiler :
  `osacompile -o Globe-Trotteur.app outils/lanceur.applescript`, puis remplacer
  `Contents/Resources/applet.icns` par l'icône (voir `icones/icone-1024.png`) et retirer `Assets.car`.
