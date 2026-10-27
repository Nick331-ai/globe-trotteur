// Déroulement d'une partie : questions, réponses, pointage, indices, minuterie.
const Jeu = (() => {
  const NB_QUESTIONS = 10;
  const BRAVO = ["Bravo!", "Super!", "Excellent!", "Malade!", "Wow!", "Bien joué!", "T'es bon!", "Solide!", "Écoeurant!", "Parfait!", "Tiguidou!", "En plein dans le mille!", "Champion!"];
  const OUPS = ["Presque!", "Pas grave!", "Lâche pas!", "Oups!", "Ce sera pour la prochaine!"];
  const MODES_CARTE = ["trouve", "drapeaux"];
  // Apprenti : délais de retour d'un pays, en nombre de questions (méthode à rappels espacés).
  // Raté → revient après 1 autre pays, puis après 3, puis 7, 15… Trouvé du premier coup → revient après 7.
  const INTERVALLES = [2, 4, 8, 16, 32, 64];
  const NIVEAU_ANCRE = 3;   // à partir de ce niveau, le pays est « bien ancré »
  const $ = id => document.getElementById(id);
  const hasard = t => t[(Math.random() * t.length) | 0];
  const melanger = t => { for (let i = t.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [t[i], t[j]] = [t[j], t[i]]; } return t; };

  let s = null;          // état de la partie
  let rafMinuterie = 0;

  // ---------- Choix des pays ----------
  function pool(region, difficulte, mode) {
    const act = Prog.actifs();
    let l = Pays.liste.filter(p => act.has(p.id) && Carte.existe(p.id) && (region === "MONDE" || p.continents.includes(region)));
    if (mode === "capitales") l = l.filter(p => !p.noCap);
    return l;
  }
  function compter(region, difficulte, mode) { return pool(region, difficulte, mode).length; }

  // ---------- Démarrage ----------
  function demarrer(opts) {
    const liste = pool(opts.region, opts.difficulte, opts.mode);
    if (!liste.length) return false;
    const apprenti = opts.difficulte === "apprenti";
    s = {
      ...opts, apprenti, questions: apprenti ? [] : Prog.choisir(liste, NB_QUESTIONS), pool: liste, i: -1,
      score: 0, combo: 0, comboMax: 0, premiers: 0, bonnes: 0, resultats: [], eclair: false,
      suivi: new Map(), tousAncres: false, minuteurPause: 0
    };
    const carte = MODES_CARTE.includes(s.mode);
    Carte.effacer("bon", "mauvais", "cible", "revele", "decouvert");
    Carte.maitrise(false);
    Carte.cliquable(carte);
    Carte.setMarges({ haut: 170, bas: 90, gauche: 0, droite: 70 });
    $("btn-indice").classList.toggle("cache", false);
    $("legende").classList.add("cache");
    $("choix").classList.add("cache");
    $("combo").classList.add("cache");
    $("score").textContent = "0";
    $("points-progression").innerHTML = apprenti
      ? '<span class="info-apprenti">🎓 <b id="nb-ancres">0</b> / ' + liste.length + ' pays ancrés</span>'
      : s.questions.map(() => '<span class="point"></span>').join("");
    $("points-progression").classList.remove("cache");
    $("score").parentElement.classList.remove("cache");
    Carte.vueRegion(s.region);
    suivante();
    return true;
  }

  // ---------- Question suivante ----------
  function suivante() {
    if (!s || s.mode === "explorer" || s.mode === "macarte") { masquerFiche(); return; }
    masquerFiche();
    cacherBulle();
    clearTimeout(s.minuteurPause);
    $("anneau-pause").classList.add("cache");
    $("btn-continuer").classList.add("cache");
    Carte.effacer("bon", "mauvais", "cible", "revele", "vedette");
    s.i++;
    if (s.apprenti) s.questions[s.i] = prochainApprenti();
    else if (s.i >= s.questions.length) return fin();
    const q = s.questions[s.i];
    const revision = s.apprenti && s.suivi.has(q.id);
    Object.assign(s, { q, essais: 0, indice: false, verrou: false, debut: performance.now() });
    majPoints();
    $("btn-indice").disabled = false;
    $("btn-indice").classList.remove("cache");

    const question = $("question");
    question.classList.remove("nouvelle"); void question.offsetWidth; question.classList.add("nouvelle");

    if (MODES_CARTE.includes(s.mode)) {
      $("choix").classList.add("cache");
      question.innerHTML = (revision ? '<span class="q-revision" title="On revient sur ce pays">🔁</span>' : "") + (s.mode === "trouve"
        ? `<span class="q-petit">Trouve</span> <b class="q-cible">${q.nom}</b>`
        : `<span class="q-petit">Trouve le pays de ce drapeau</span> <span class="q-drapeau">${q.drapeau}</span>`);
      Carte.setMarges({ bas: 90 });
      $("btn-indice").style.bottom = "";
      if (s.vueChangee) { Carte.vueRegion(s.region); s.vueChangee = false; }
    } else {
      question.innerHTML = (revision ? '<span class="q-revision" title="On revient sur ce pays">🔁</span>' : "") + (s.mode === "quel"
        ? `<span class="q-petit">C'est quel pays?</span> 🤔`
        : `<span class="q-petit">Quelle est la capitale de</span> <b class="q-cible">${q.nom}</b>?`);
      Carte.etat(q.id, "cible");
      afficherChoix(q);
      const haut = $("choix").getBoundingClientRect().top;
      Carte.setMarges({ bas: innerHeight - haut + 10 });
      $("btn-indice").style.bottom = (innerHeight - haut + 14) + "px";
      Carte.vuePays(q.id, s.apprenti ? 5 : 3.5);
    }
    if (s.defi) demarrerMinuterie(MODES_CARTE.includes(s.mode) ? 20 : 12);
    else $("minuterie").classList.add("cache");
  }

  // ---------- Apprenti : rappels espacés ----------
  // Prochain pays : d'abord un pays « dû » (le plus en retard), sinon un nouveau pays, sinon le plus proche d'être dû.
  function prochainApprenti() {
    const dernier = s.questions[s.i - 1];
    const vus = [...s.suivi.entries()].filter(([id]) => !dernier || id !== dernier.id || s.pool.length === 1);
    const parDu = (a, b) => a[1].du - b[1].du || Math.random() - 0.5;
    const dus = vus.filter(([, v]) => v.du <= s.i).sort(parDu);
    if (dus.length) return Pays.parId[dus[0][0]];
    const nouveaux = s.pool.filter(p => !s.suivi.has(p.id));
    if (nouveaux.length) return hasard(nouveaux);   // nouveau pays au hasard (chaque partie repart à zéro)
    return Pays.parId[vus.sort(parDu)[0][0]];
  }

  function planifier(id, premierCoup) {
    const v = s.suivi.get(id);
    const n = !premierCoup ? 0 : !v ? 2 : Math.min(v.niveau + 1, INTERVALLES.length - 1);
    s.suivi.set(id, { niveau: n, du: s.i + INTERVALLES[n] });
    const ancres = nbAncres();
    if (!s.tousAncres && ancres === s.pool.length) {
      s.tousAncres = true;
      setTimeout(() => { Effets.messageGeant("Tous les pays sont ancrés! 🎓"); Effets.pluie(); Sons.niveau(); }, 600);
    }
  }
  const nbAncres = () => [...s.suivi.values()].filter(v => v.niveau >= NIVEAU_ANCRE).length;

  // Pause (3 à 10 s, voir Réglages) : vue du continent, pays en évidence avec son nom, anneau qui se vide.
  // Ensuite, le bouton « Suivant » apparaît : le joueur continue quand il est prêt.
  function pauseApprenti(titre) {
    const q = s.q;
    $("choix").classList.add("cache");
    $("btn-indice").classList.add("cache");
    $("question").innerHTML = `<b>${titre}</b>`;
    Carte.setMarges({ bas: 110 });
    Carte.vueContinent(q.id);
    Carte.etat(q.id, "vedette");
    Carte.devant(q.id);
    Carte.etiquette(q.id, `${q.drapeau} ${q.nom}${s.mode === "capitales" ? " · " + q.capitale : ""}`);
    s.vueChangee = true;
    const a = $("anneau-pause");
    a.classList.remove("cache");
    const duree = (Prog.d.prefs.pauseApprenti || 3) * 1000;
    a.style.setProperty("--duree", duree + "ms");
    const c = a.querySelector(".progres");
    c.style.animation = "none"; void c.getBoundingClientRect(); c.style.animation = "";
    s.minuteurPause = setTimeout(() => {
      if (!s) return;
      a.classList.add("cache");
      const b = $("btn-continuer");
      b.classList.remove("cache");
      setTimeout(() => b.focus({ preventScroll: true }), 50);
    }, duree);
  }

  // ---------- Choix de réponses ----------
  function distance(a, b) {
    const ca = Carte.centreGeo(a), cb = Carte.centreGeo(b);
    return ca && cb ? d3.geoDistance(ca, cb) : 9;
  }
  function afficherChoix(q) {
    const cap = s.mode === "capitales";
    const val = p => cap ? p.capitale : p.nom;
    // Distracteurs : d'abord les pays actifs de la même région, puis les autres pays du même continent
    let cands = s.pool.filter(p => p.id !== q.id);
    const extra = Pays.liste.filter(p => p.id !== q.id && !cands.includes(p) && p.continents.some(c => q.continents.includes(c)) && !(cap && p.noCap));
    if (cands.length < 6) cands = cands.concat(extra);
    const vus = new Set([val(q)]);
    cands = cands.filter(p => !vus.has(val(p)) && vus.add(val(p)));
    // Expert : des voisins proches (plus difficile)
    if (s.difficulte === "expert") cands = cands.sort((a, b) => distance(q.id, a.id) - distance(q.id, b.id)).slice(0, 7);
    const choix = melanger([q, ...melanger(cands).slice(0, 3)]);
    const el = $("choix");
    el.innerHTML = "";
    choix.forEach((p, i) => {
      const b = document.createElement("button");
      b.dataset.id = p.id;
      b.innerHTML = `<span class="touche">${i + 1}</span>${val(p)}`;
      b.onclick = () => repondreChoix(b);
      el.appendChild(b);
    });
    el.classList.remove("cache");
  }

  function repondreChoix(btn) {
    if (!s || s.verrou || btn.disabled) return;
    const boutons = [...$("choix").children];
    boutons.forEach(b => (b.disabled = true));
    const r = btn.getBoundingClientRect();
    if (btn.dataset.id === s.q.id) {
      btn.classList.add("bon");
      succes(r.left + r.width / 2, r.top);
    } else {
      btn.classList.add("mauvais");
      boutons.find(b => b.dataset.id === s.q.id).classList.add("bon");
      const titre = s.mode === "capitales" ? `${hasard(OUPS)} La bonne réponse : ${s.q.capitale}` : `${hasard(OUPS)} La bonne réponse : ${s.q.nom}`;
      echec(titre, false);
    }
  }

  // ---------- Clic sur la carte ----------
  function clicCarte(id, e) {
    if (!s) return;
    if (s.mode === "explorer" || s.mode === "macarte") return App.clicExploration(id, e);
    if (s.verrou || !MODES_CARTE.includes(s.mode)) return;
    if (id === s.q.id) return succes(e.clientX, e.clientY);

    const p = Pays.parId[id];
    if (!p || !Prog.actifs().has(id)) {
      if (p) bulle(e.clientX, e.clientY, `Tu as cliqué sur : <b>${p.drapeau} ${p.nom}</b>`, "Ce pays n'est pas dans le quiz. Essaie encore!");
      else bulle(e.clientX, e.clientY, `Ça, c'est ${TERRITOIRES[id] || "un territoire"}.`, "Ce n'est pas un pays du quiz. Essaie encore!");
      Sons.territoire();
      return;
    }
    s.essais++;
    s.combo = 0;
    majCombo();
    Sons.mauvais();
    Carte.flash(id, "mauvais", 1300);
    const ind = direction(id, s.q.id);
    bulle(e.clientX, e.clientY, `Oups! Ça, c'est : <b>${p.drapeau} ${p.nom}</b>`, `${ind.chaleur} Va vers ${ind.dir}`);
    if (s.essais === 2) Carte.anneau(s.q.id);
    if (s.essais >= 3) echec("Oh non! C'était ici 👇", true);
  }

  function direction(de, vers) {
    const a = Carte.centreGeo(de), b = Carte.centreGeo(vers);
    let dx = b[0] - a[0];
    if (dx > 180) dx -= 360;
    if (dx < -180) dx += 360;
    const dy = b[1] - a[1];
    const km = d3.geoDistance(a, b) * 6371;
    const angle = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    const dirs = ["le nord ⬆️", "le nord-est ↗️", "l'est ➡️", "le sud-est ↘️", "le sud ⬇️", "le sud-ouest ↙️", "l'ouest ⬅️", "le nord-ouest ↖️"];
    return {
      dir: dirs[Math.round(angle / 45) % 8],
      chaleur: km < 800 ? "🔥 Tu brûles!" : km < 2000 ? "🌡️ Tu chauffes!" : km < 5000 ? "😐 Tiède…" : "🥶 Tu gèles!"
    };
  }

  // ---------- Résultats ----------
  function succes(x, y) {
    s.verrou = true;
    arreterMinuterie();
    cacherBulle();
    const premier = s.essais === 0;
    const temps = performance.now() - s.debut;
    s.combo = premier ? s.combo + 1 : 0;
    s.comboMax = Math.max(s.comboMax, s.combo);
    let pts = [100, 50, 25][Math.min(s.essais, 2)];
    if (s.indice) pts = Math.round(pts / 2);
    if (premier) pts += Math.min(5, s.combo - 1) * 20;
    if (s.defi) pts += Math.round(50 * Math.max(0, 1 - temps / (s.dureeMinuterie * 1000)));
    if (s.defi && premier && temps < 2000) s.eclair = true;
    s.score += pts;
    s.bonnes++;
    if (premier) s.premiers++;
    s.resultats[s.i] = premier ? "bon" : "moyen";
    Prog.majPays(s.q.id, premier && !s.indice, true);
    if (s.apprenti) planifier(s.q.id, premier && !s.indice);

    Carte.effacer("cible");
    Carte.etat(s.q.id, "bon");
    Sons.bon(Math.max(1, s.combo));
    Effets.confettis(x, y, 35 + Math.min(s.combo, 6) * 12, s.combo >= 3 ? 1.3 : 1);
    Effets.pointsFlottants(x, y, "+" + pts);
    if (s.combo >= 3) Effets.messageGeant(`Combo x${s.combo} 🔥`);
    majScore();
    majCombo();
    majPoints();
    const titre = `${hasard(BRAVO)} ${premier ? "🎉" : "👍"}`;
    setTimeout(() => {
      if (!s) return;
      if (s.apprenti) pauseApprenti(titre);
      else montrerFiche(s.q, "bon", titre);
    }, MODES_CARTE.includes(s.mode) ? 350 : 700);
  }

  function echec(titre, zoomer) {
    s.verrou = true;
    arreterMinuterie();
    s.combo = 0;
    s.resultats[s.i] = "mauvais";
    Prog.majPays(s.q.id, false, false);
    if (s.apprenti) planifier(s.q.id, false);
    Sons.revele();
    majCombo();
    majPoints();
    Carte.effacer("cible");
    Carte.etat(s.q.id, "revele");
    setTimeout(() => {
      if (!s) return;
      if (s.apprenti) return pauseApprenti(zoomer ? `${titre.startsWith("Temps") ? "Temps écoulé! ⏰" : "Pas grave!"} Le voici 👇` : titre);
      montrerFiche(s.q, "mauvais", titre);
      if (zoomer) {
        Carte.setMarges({ bas: innerHeight - $("fiche").getBoundingClientRect().top + 10 });
        Carte.vuePays(s.q.id, 4);
        s.vueChangee = true;
      }
    }, zoomer ? 500 : 900);
  }

  // ---------- Indice ----------
  function indice() {
    if (!s || s.verrou || s.indice || !s.q) return;
    s.indice = true;
    $("btn-indice").disabled = true;
    Sons.indice();
    if (MODES_CARTE.includes(s.mode)) {
      Carte.anneau(s.q.id);
    } else {
      // 50/50 : on retire deux mauvaises réponses
      const mauvais = [...$("choix").children].filter(b => b.dataset.id !== s.q.id);
      melanger(mauvais).slice(0, 2).forEach(b => { b.disabled = true; b.style.opacity = ".3"; });
    }
  }

  // ---------- Minuterie (mode défi) ----------
  function demarrerMinuterie(sec) {
    s.dureeMinuterie = sec;
    const el = $("minuterie"), rempli = $("minuterie-rempli");
    el.classList.remove("cache", "urgent");
    const debut = performance.now();
    let dernierTic = sec;
    cancelAnimationFrame(rafMinuterie);
    const tick = () => {
      if (!s || s.verrou) return;
      const reste = sec - (performance.now() - debut) / 1000;
      rempli.style.width = Math.max(0, reste / sec * 100) + "%";
      if (reste <= 3) {
        el.classList.add("urgent");
        if (Math.ceil(reste) < dernierTic) { dernierTic = Math.ceil(reste); Sons.tic(); }
      }
      if (reste <= 0) {
        if (MODES_CARTE.includes(s.mode)) echec("Temps écoulé! ⏰ C'était ici.", true);
        else {
          [...$("choix").children].forEach(b => { b.disabled = true; if (b.dataset.id === s.q.id) b.classList.add("bon"); });
          echec("Temps écoulé! ⏰", false);
        }
        return;
      }
      rafMinuterie = requestAnimationFrame(tick);
    };
    rafMinuterie = requestAnimationFrame(tick);
  }
  function arreterMinuterie() {
    cancelAnimationFrame(rafMinuterie);
    $("minuterie").classList.remove("urgent");
  }

  // ---------- Fiche pays ----------
  function montrerFiche(p, type, titre, boutonTexte) {
    const t = $("fiche-titre");
    t.textContent = titre;
    t.className = "fiche-titre " + type;
    $("fiche-drapeau").textContent = p.drapeau;
    $("fiche-nom").textContent = p.nom;
    $("fiche-capitale").textContent = `🏛️ Capitale : ${p.capitale}${p.note ? " (" + p.note + ")" : ""}`;
    $("fiche-fait").textContent = p.fait;
    const dernier = s && s.questions && s.i === s.questions.length - 1;
    $("btn-suivant").textContent = boutonTexte || (dernier ? "Voir mon résultat 🏁" : "Suivant ➜");
    $("choix").classList.add("cache");
    $("fiche").classList.remove("cache");
    const f = $("fiche"); f.style.animation = "none"; void f.offsetWidth; f.style.animation = "";
    setTimeout(() => $("btn-suivant").focus({ preventScroll: true }), 50);
  }
  function masquerFiche() { $("fiche").classList.add("cache"); }
  // Vrai quand on attend que le joueur passe à la suite (fiche ou bouton « Suivant » de l'Apprenti)
  const ficheVisible = () => !$("fiche").classList.contains("cache") || !$("btn-continuer").classList.contains("cache");

  // ---------- Bulle sur la carte ----------
  let minuteurBulle = null;
  function bulle(x, y, html, petit) {
    const b = $("bulle");
    b.innerHTML = html + (petit ? `<span class="petit">${petit}</span>` : "");
    b.style.left = Math.min(Math.max(x, 180), innerWidth - 180) + "px";
    b.style.top = Math.max(y, 110) + "px";
    b.classList.remove("cache");
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    clearTimeout(minuteurBulle);
    minuteurBulle = setTimeout(cacherBulle, 2600);
  }
  function cacherBulle() { $("bulle").classList.add("cache"); }

  // ---------- Affichage du pointage ----------
  function majScore() {
    const el = $("score");
    el.textContent = s.score;
    el.parentElement.classList.remove("saute"); void el.offsetWidth; el.parentElement.classList.add("saute");
  }
  function majCombo() {
    const c = $("combo");
    if (s.combo >= 2) {
      c.textContent = `🔥 x${s.combo}`;
      c.classList.remove("cache");
      c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
    } else c.classList.add("cache");
  }
  function majPoints() {
    if (s.apprenti) { const el = $("nb-ancres"); if (el) el.textContent = nbAncres(); return; }
    [...$("points-progression").children].forEach((el, i) => {
      el.className = "point " + (s.resultats[i] || (i === s.i ? "courant" : ""));
    });
  }

  // ---------- Fin ----------
  function fin() {
    arreterMinuterie();
    clearTimeout(s.minuteurPause);
    $("anneau-pause").classList.add("cache");
    $("btn-continuer").classList.add("cache");
    Carte.effacer("vedette");
    $("question").innerHTML = "";
    $("choix").classList.add("cache");
    $("minuterie").classList.add("cache");
    Carte.cliquable(false);
    const total = s.apprenti ? s.resultats.filter(Boolean).length : s.questions.length;
    const ctx = {
      mode: s.mode, region: s.region, score: s.score, total, premiers: s.premiers, bonnes: s.bonnes,
      comboMax: s.comboMax, eclair: s.eclair, defi: s.defi,
      apprenti: s.apprenti, ancres: s.apprenti ? nbAncres() : 0, taillePool: s.pool.length
    };
    ctx.etoiles = s.premiers >= total * 0.9 ? 3 : s.premiers >= total * 0.6 ? 2 : 1;
    const res = Prog.finPartie(ctx);
    const opts = { mode: s.mode, region: s.region, difficulte: s.difficulte, defi: s.defi };
    s = null;
    App.montrerFin(ctx, res, opts);
  }

  // Apprenti : la partie n'a pas de fin; quitter montre le bilan (si au moins une réponse)
  function terminer() {
    if (!s || !s.apprenti || !s.resultats.some(Boolean)) return false;
    fin();
    return true;
  }

  function quitter() {
    arreterMinuterie();
    if (s) clearTimeout(s.minuteurPause);
    $("anneau-pause").classList.add("cache");
    $("btn-continuer").classList.add("cache");
    cacherBulle();
    masquerFiche();
    s = null;
    $("question").innerHTML = "";
    Carte.effacer("bon", "mauvais", "cible", "revele", "decouvert", "vedette");
    Carte.maitrise(false);
    Carte.cliquable(false);
    Carte.toutVoir(false);
  }

  // Modes libres (Explorer, Ma carte) : la partie n'a pas de questions
  function modeLibre(mode, region) {
    s = { mode, region };
    $("minuterie").classList.add("cache");
    $("choix").classList.add("cache");
    $("btn-indice").classList.add("cache");
    $("combo").classList.add("cache");
    $("points-progression").classList.add("cache");
    $("score").parentElement.classList.add("cache");
    Carte.setMarges({ haut: 150, bas: mode === "macarte" ? 110 : 40, droite: 70 });
    Carte.vueRegion(region);
  }

  return {
    demarrer, suivante, clicCarte, indice, quitter, terminer, compter, modeLibre, montrerFiche, masquerFiche, ficheVisible, bulle,
    repondreTouche(n) { const b = $("choix").children[n]; if (b && !$("choix").classList.contains("cache")) repondreChoix(b); },
    get etat() { return s; }
  };
})();
