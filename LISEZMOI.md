# 🌍 Globe-Trotteur

Un quiz de géographie pour apprendre les pays du monde en s'amusant : des parties courtes, des combos, des badges, des niveaux et un fait amusant après chaque réponse.

Tout fonctionne **sans Internet**. Aucun compte n'est nécessaire. La progression est sauvegardée sur l'ordinateur.

---

## ▶️ Lancer le jeu sur le Mac

**Double-clique sur `Globe-Trotteur.app`.**

- Si Google Chrome est installé, le jeu s'ouvre dans sa propre fenêtre, comme une vraie app.
- Sinon, il s'ouvre dans le navigateur par défaut (Safari).
- Pour l'avoir à portée de main, glisse `Globe-Trotteur.app` dans le Dock.

> ⚠️ Garde `Globe-Trotteur.app` **dans ce dossier**, à côté de `index.html`. Pour le Dock, glisse l'app sans la déplacer : le Dock garde un raccourci.
>
> Tu peux aussi double-cliquer directement sur `index.html`.
>
> La progression est sauvegardée **par navigateur**. Utilise toujours le même navigateur (de préférence l'app) pour garder tes points et tes badges.

---

## 🎮 Les jeux

| Mode | Comment on joue |
|---|---|
| 📍 **Trouve le pays** | Le nom d'un pays s'affiche : clique dessus sur la carte. |
| 🤔 **C'est quel pays?** | Un pays clignote : choisis la bonne réponse parmi 4. |
| 🚩 **Drapeaux** | Un drapeau s'affiche : trouve son pays sur la carte. |
| 🏛️ **Capitales** | Un pays clignote : choisis sa capitale parmi 4. |
| 🔭 **Explorer** | Clique partout pour découvrir les pays, sans pointage. |
| 🗺️ **Ma carte** | Montre les pays que tu connais déjà, selon leur couleur. |

- **Une partie = 10 questions.**
- **Erreur sur la carte :** le jeu dit quel pays tu as cliqué, si tu « chauffes » ou si tu « gèles », et dans quelle direction chercher. Tu as 3 essais.
- **💡 Indice :** sur la carte, un cercle montre la zone où chercher. Avec les 4 choix, deux mauvaises réponses disparaissent. Un indice coûte la moitié des points.
- **🎓 Apprenti :** une partie sans fin pour bien apprendre tous les pays de la liste, comme avec la méthode Pimsleur.
  - Un pays raté revient juste après le pays suivant, puis après 3 autres pays, puis de plus en plus tard.
  - Un pays trouvé du premier coup revient aussi, plus tard, pour bien l'ancrer.
  - Après **chaque** réponse (bonne ou mauvaise), la carte montre le continent, avec le pays en évidence et son nom écrit dessus. Un anneau 👀 montre le temps qui reste (3 secondes par défaut; 3, 5, 8 ou 10 secondes dans ⚙️ Réglages).
  - Ensuite, le bouton **Suivant** apparaît : prends le temps de bien regarder la carte, puis touche Suivant (ou `Entrée`).
  - 🔁 indique un pays qui revient. En haut, le compteur montre combien de pays sont « ancrés » (trouvés du premier coup au moins 2 fois de suite, à quelques questions d'intervalle).
  - Touche ✕ quand tu veux arrêter : le bilan de la partie s'affiche.
  - Chaque nouvelle partie repart à zéro, avec les pays dans un ordre au hasard.
- **🧠 Expert :** des parties de 10 questions sur tous les pays. Avec les 4 choix, les mauvaises réponses sont des pays voisins (plus difficile!).
- **⏱️ Mode défi** (en Expert seulement) : une minuterie par question, avec des points bonus quand on répond vite.
- **Révision intelligente :** les pays ratés reviennent plus souvent, et ceux qu'on connaît bien reviennent moins souvent.

**Raccourcis clavier :**
- `1` à `4` : choisir une réponse
- `Entrée` ou `Espace` : passer à la question suivante
- `I` : demander un indice
- `+` / `-` : zoomer ou dézoomer
- `Échap` : revenir au menu

---

## ✅ Choisir les pays du quiz

Par défaut, le quiz contient les **69 pays** de la liste fournie. Il y a trois façons de changer cette liste.

### 1. Dans l'app (le plus simple)
Clique sur ⚙️ (en haut à droite du menu), puis va à la section **Pays du quiz**. Tu peux :
- cocher ou décocher des pays, un à la fois ou par continent;
- **glisser-déposer un fichier CSV** dans la fenêtre (ou cliquer sur « Choisir un fichier »);
- cliquer sur **Exporter en CSV** pour sauvegarder la liste actuelle;
- cliquer sur **Liste par défaut** pour revenir à la liste de départ.
- décocher **Afficher en gris les pays qui ne sont pas dans le quiz** pour que ces pays gardent leurs couleurs sur la carte.

### 2. Avec un fichier CSV
- Mets un pays par ligne. La première ligne « Pays » est optionnelle.
- Tu peux écrire le nom en français (`Viêt Nam`, `Vietnam`, `États-Unis`, `USA`, `RDC`…) ou le code à 2 lettres (`VN`, `US`, `CD`…).
- Si un nom n'est pas reconnu, le jeu l'affiche après l'import.
- Écris `TOUS` pour activer les 199 pays.

```
Pays
Canada
France
Japon
```

### 3. Changer la liste par défaut
Ouvre `data/pays-actifs.js` dans un éditeur de texte. Remplace la liste entre les deux accents graves (`` ` ``) par le contenu de ton CSV, puis enregistre.

> La liste choisie dans l'app (⚙️) a priorité sur ce fichier. Clique sur **Liste par défaut** dans ⚙️ pour reprendre le contenu du fichier.

---

## 🌐 Mettre le jeu en ligne (plus tard)

Le dossier est déjà un site web complet. Il fonctionne aussi hors ligne une fois visité, et peut s'installer comme une app sur une tablette ou un téléphone.

- **Netlify (le plus rapide) :** va sur <https://app.netlify.com/drop> et glisse le dossier du jeu.
- **GitHub Pages :** mets les fichiers dans un dépôt GitHub, puis active Pages dans les réglages du dépôt.
- **N'importe quel hébergeur web :** copie les fichiers tels quels. Aucun serveur spécial n'est nécessaire.

Fichiers utiles pour le web : tout le dossier, sauf `Globe-Trotteur.app` et `outils/`.

> Note : les drapeaux sont des émojis. Ils s'affichent parfaitement sur Mac, iPhone, iPad et Android. Sous Windows, certains navigateurs montrent des lettres à la place des drapeaux.

---

## 🗂️ Contenu du dossier

```
index.html              Page principale du jeu
Globe-Trotteur.app      Lanceur pour macOS
css/style.css           Apparence
js/                     Code du jeu (carte, jeu, progression, sons, effets)
data/pays.js            Les pays : noms, capitales, continents, faits amusants
data/pays-actifs.js     Liste des pays actifs par défaut  ← à modifier au besoin
data/carte.js           Contours des pays (Natural Earth)
icones/                 Icônes de l'app
manifest.webmanifest, sw.js   Version web installable et hors ligne
outils/                 Scripts pour regénérer la carte et le lanceur (développeurs)
```

**Pour modifier un fait amusant ou une capitale :** ouvre `data/pays.js`. Chaque ligne correspond à un pays.

---

## 📜 Crédits

- Contours des pays : [Natural Earth](https://www.naturalearthdata.com/) (domaine public), via [world-atlas](https://github.com/topojson/world-atlas).
- Bibliothèques : [D3.js](https://d3js.org/) (licence ISC) et [TopoJSON](https://github.com/topojson/topojson-client) (licence ISC).
- Noms des pays selon l'usage québécois (Office québécois de la langue française).
