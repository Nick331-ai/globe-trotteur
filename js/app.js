// Écrans, menus et interactions générales.
const App = (() => {
  const $ = id => document.getElementById(id);
  const ECRANS = ["ecran-bienvenue", "ecran-accueil", "ecran-jeu", "ecran-fin", "ecran-badges", "ecran-reglages"];
  const echapper = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let derniersOpts = null;

  function montrer(id, garder = []) {
    for (const e of ECRANS) $(e).classList.toggle("cache", e !== id && !garder.includes(e));
  }

  // ---------- Accueil ----------
  function accueil() {
    Jeu.quitter();
    const d = Prog.d;
    $("salut").textContent = `Salut, ${d.nom || "toi"}! 👋`;
    const nv = Prog.niveau();
    $("niveau-titre").textContent = `Niv. ${nv.n} · ${nv.titre}`;
    $("barre-xp-rempli").style.width = "0";
    requestAnimationFrame(() => ($("barre-xp-rempli").style.width = Math.round(nv.depuis / nv.requis * 100) + "%"));
    $("xp-texte").textContent = `${nv.depuis} / ${nv.requis} XP pour le prochain niveau`;
    const serie = Prog.serieActuelle();
    $("serie-jours").textContent = serie ? `🔥 ${serie} jour${serie > 1 ? "s" : ""} de suite` : "🔥 Joue aujourd'hui!";
    $("btn-son").textContent = d.sons ? "🔊" : "🔇";

    // Régions
    const act = Prog.actifs();
    const zone = $("choix-region");
    zone.innerHTML = "";
    if (!Object.keys(CONTINENTS).some(c => c === d.prefs.region)) d.prefs.region = "MONDE";
    for (const [code, c] of Object.entries(CONTINENTS)) {
      const nb = Pays.liste.filter(p => act.has(p.id) && (code === "MONDE" || p.continents.includes(code))).length;
      const b = document.createElement("button");
      b.className = "puce" + (d.prefs.region === code ? " actif" : "");
      b.innerHTML = `${c.emoji} ${c.nom}<span class="nb">${nb}</span>`;
      b.disabled = nb === 0;
      if (nb === 0 && d.prefs.region === code) d.prefs.region = "MONDE";
      b.onclick = () => { d.prefs.region = code; Prog.sauver(); Sons.clic(); accueil(); Carte.vueRegion(code); };
      zone.appendChild(b);
    }
    document.querySelectorAll("#choix-difficulte button").forEach(b => b.classList.toggle("actif", b.dataset.val === d.prefs.difficulte));
    $("btn-defi").classList.toggle("cache", d.prefs.difficulte !== "expert");   // Défi : seulement en Expert
    $("btn-defi").setAttribute("aria-pressed", d.prefs.defi);
    $("btn-defi").innerHTML = `⏱️ Mode défi : <b>${d.prefs.defi ? "oui" : "non"}</b>`;

    $("compte-badges").textContent = `${Object.keys(d.badges).length}/${Prog.BADGES.length}`;
    $("compte-pays").textContent = `${Prog.decouverts(act)}/${act.size}`;
    Carte.appliquerActifs(act);
    Carte.griser(d.prefs.griser);
    Carte.vueRegion(d.prefs.region, 900);
    montrer("ecran-accueil");
  }

  function lancer(mode) {
    Sons.clic();
    const p = Prog.d.prefs;
    if (mode === "explorer") return explorer();
    const opts = { mode, region: p.region, difficulte: p.difficulte, defi: p.difficulte === "expert" && p.defi };
    demarrer(opts);
  }

  function demarrer(opts) {
    montrer("ecran-jeu");
    derniersOpts = opts;
    if (!Jeu.demarrer(opts)) {
      Effets.toast("😕 Aucun pays actif pour ce choix. Change de région ou ajoute des pays dans ⚙️ Réglages.");
      accueil();
    }
  }

  function explorer() {
    montrer("ecran-jeu");
    Jeu.modeLibre("explorer", Prog.d.prefs.region);
    Carte.cliquable(true);
    Carte.toutVoir(true);
    $("question").innerHTML = `<span class="q-petit">🔭 Clique sur un pays pour le découvrir!</span>`;
  }

  function maCarte() {
    montrer("ecran-jeu");
    Jeu.modeLibre("macarte", "MONDE");
    Carte.maitrise(true);
    Carte.cliquable(true);
    Carte.toutVoir(true);
    const act = Prog.actifs();
    const n = [0, 0, 0, 0];
    act.forEach(id => n[Prog.maitrise(id)]++);
    $("question").innerHTML = `<span class="q-petit">🗺️ Ma carte : ${Prog.decouverts(act)} pays trouvés sur ${act.size}</span>`;
    const l = $("legende");
    l.innerHTML = `<span><i class="pastille" style="background:#e6edf5"></i>À apprendre (${n[0]})</span>
      <span><i class="pastille" style="background:#ffd28a"></i>Ça vient (${n[1]})</span>
      <span><i class="pastille" style="background:#8fdc8a"></i>Bien connu (${n[2]})</span>
      <span><i class="pastille" style="background:#ffcf1f"></i>Maîtrisé ⭐ (${n[3]})</span>`;
    l.classList.remove("cache");
  }

  function clicExploration(id, e) {
    const p = Pays.parId[id];
    if (!p) {
      Jeu.bulle(e.clientX, e.clientY, `Ça, c'est ${TERRITOIRES[id] || "un territoire"}.`);
      Sons.territoire();
      return;
    }
    Sons.clic();
    if (Jeu.etat.mode === "explorer") {
      Carte.etat(id, "decouvert");
      Jeu.montrerFiche(p, "info", "🔍 Découverte!", "OK ✓");
      Prog.explorer(id).forEach(annoncerBadge);
    } else {
      const m = Prog.maitrise(id);
      const titre = Prog.actifs().has(id) ? `Maîtrise : ${"⭐".repeat(m)}${"☆".repeat(3 - m)}` : "Pas dans le quiz pour l'instant";
      Jeu.montrerFiche(p, "info", titre, "OK ✓");
    }
  }

  function annoncerBadge(b) {
    Sons.badge();
    Effets.toast(`<span style="font-size:32px">${b.e}</span> Nouveau badge : <b>${b.nom}</b>!`, 3500);
  }

  // ---------- Fin de partie ----------
  function montrerFin(ctx, res, opts) {
    derniersOpts = opts;
    Jeu.masquerFiche();
    $("fin-etoiles").innerHTML = [1, 2, 3].map(i => `<span class="${i <= ctx.etoiles ? "" : "vide"}" style="animation-delay:${i * 0.25}s">⭐</span>`).join("");
    $("fin-titre").textContent = ctx.etoiles === 3 ? "Incroyable! 🤩" : ctx.etoiles === 2 ? "Bravo! 😎" : "Bon effort! 💪";
    $("fin-score").textContent = `${ctx.score} points`;
    $("fin-details").innerHTML =
      `✅ ${ctx.premiers} sur ${ctx.total} du premier coup<br>` +
      (ctx.apprenti ? `🎓 ${ctx.ancres} pays bien ancrés sur ${ctx.taillePool}<br>` : "") +
      `🔥 Meilleur combo : ${ctx.comboMax}` +
      (res.record ? `<br>🏆 <b>Nouveau record!</b>` : "");
    const nv = Prog.niveau();
    $("fin-niveau").classList.toggle("cache", !res.niveauMonte);
    $("fin-niveau").textContent = `⬆️ Niveau ${nv.n} atteint : ${nv.titre}!`;
    $("fin-badges").innerHTML = res.badges.map((b, i) =>
      `<div class="nouveau-badge" style="animation-delay:${0.8 + i * 0.2}s"><span class="b-emoji">${b.e}</span><div><b>Nouveau badge : ${b.nom}</b><br><small>${b.desc}</small></div></div>`).join("");
    montrer("ecran-fin", ["ecran-jeu"]);
    Sons.fin(ctx.etoiles);
    if (ctx.etoiles >= 2) Effets.pluie();
    if (res.niveauMonte) setTimeout(() => Sons.niveau(), 900);
    if (res.badges.length) setTimeout(() => Sons.badge(), 1500);
    setTimeout(() => $("btn-rejouer").focus({ preventScroll: true }), 100);
  }

  // ---------- Badges ----------
  function badges() {
    const d = Prog.d;
    $("grille-badges").innerHTML = Prog.BADGES.map(b => {
      const ok = !!d.badges[b.id];
      return `<div class="badge ${ok ? "obtenu" : "verrouille"}"><span class="b-emoji">${ok ? b.e : "🔒"}</span>
        <span class="b-nom">${b.nom}</span><span class="b-desc">${b.desc}</span></div>`;
    }).join("");
    montrer("ecran-badges");
  }

  // ---------- Réglages ----------
  let actifsEdition = null;
  function reglages() {
    $("reglage-nom").value = Prog.d.nom;
    $("reglage-griser").checked = Prog.d.prefs.griser;
    majChoixPause();
    $("resultat-import").classList.add("cache");
    $("filtre-pays").value = "";
    actifsEdition = Prog.actifs();
    dessinerListe();
    montrer("ecran-reglages");
  }

  function majChoixPause() {
    document.querySelectorAll("#choix-pause button").forEach(b => b.classList.toggle("actif", +b.dataset.val === (Prog.d.prefs.pauseApprenti || 3)));
  }

  function dessinerListe() {
    const filtre = Pays.norm($("filtre-pays").value || "");
    const conteneur = $("liste-pays");
    conteneur.innerHTML = "";
    for (const [code, c] of Object.entries(CONTINENTS)) {
      if (code === "MONDE") continue;
      const liste = Pays.liste.filter(p => p.continents[0] === code && (!filtre || Pays.norm(p.nom).includes(filtre)))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      if (!liste.length) continue;
      const g = document.createElement("div");
      g.className = "groupe-pays";
      const tous = liste.every(p => actifsEdition.has(p.id));
      g.innerHTML = `<h3>${c.emoji} ${c.nom} <small>(${liste.filter(p => actifsEdition.has(p.id)).length}/${liste.length})</small>
        <button class="btn btn-secondaire petit-btn">${tous ? "Tout décocher" : "Tout cocher"}</button></h3><div class="cases"></div>`;
      g.querySelector("button").onclick = () => { liste.forEach(p => tous ? actifsEdition.delete(p.id) : actifsEdition.add(p.id)); enregistrerActifs(); };
      const cases = g.querySelector(".cases");
      for (const p of liste) {
        const l = document.createElement("label");
        l.className = "case";
        l.innerHTML = `<input type="checkbox" ${actifsEdition.has(p.id) ? "checked" : ""}> ${p.drapeau} ${echapper(p.nom)}`;
        l.querySelector("input").onchange = ev => { ev.target.checked ? actifsEdition.add(p.id) : actifsEdition.delete(p.id); enregistrerActifs(false); };
        cases.appendChild(l);
      }
      conteneur.appendChild(g);
    }
    $("compte-actifs").textContent = `— ${actifsEdition.size} actifs sur ${Pays.liste.length}`;
  }

  function enregistrerActifs(redessiner = true) {
    Prog.setActifs(actifsEdition);
    Carte.appliquerActifs(actifsEdition);
    if (redessiner) dessinerListe();
    else $("compte-actifs").textContent = `— ${actifsEdition.size} actifs sur ${Pays.liste.length}`;
  }

  function importerTexte(texte, nomFichier) {
    const r = Pays.analyserListe(texte);
    const res = $("resultat-import");
    if (!r.ids.length) {
      res.className = "resultat-import avertissement";
      res.textContent = `Aucun pays reconnu dans « ${nomFichier} ». Mets un nom de pays par ligne.`;
      return;
    }
    actifsEdition = new Set(r.ids);
    enregistrerActifs();
    res.className = "resultat-import" + (r.inconnus.length ? " avertissement" : "");
    res.innerHTML = `✅ ${r.ids.length} pays activés depuis « ${echapper(nomFichier)} ».` +
      (r.inconnus.length ? `<br>⚠️ Pas reconnus : ${r.inconnus.map(echapper).join(", ")}` : "");
  }

  function lireFichier(f) {
    if (!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      if ($("ecran-reglages").classList.contains("cache")) reglages();
      importerTexte(String(lecteur.result), f.name);
    };
    lecteur.readAsText(f, "utf-8");
  }

  function exporter() {
    const blob = new Blob([Pays.versCSV(actifsEdition)], { type: "text/csv;charset=utf-8" });
    // iPad/iPhone : passer par la feuille de partage (Enregistrer dans Fichiers, AirDrop…)
    const fichier = typeof File === "function" ? new File([blob], "pays-du-quiz.csv", { type: "text/csv" }) : null;
    if (matchMedia("(pointer: coarse)").matches && fichier && navigator.canShare && navigator.canShare({ files: [fichier] })) {
      navigator.share({ files: [fichier], title: "Pays du quiz" }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pays-du-quiz.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- Initialisation ----------
  function init() {
    Sons.setActif(Prog.d.sons);
    Carte.init($("carte"));
    Carte.griser(Prog.d.prefs.griser);
    Carte.setClic((id, e) => Jeu.clicCarte(id, e));
    Carte.setSurvol((id, e) => {
      const ib = $("infobulle");
      const st = Jeu.etat;
      if (!id || !st || (st.mode !== "explorer" && st.mode !== "macarte")) return ib.classList.add("cache");
      const p = Pays.parId[id];
      ib.textContent = p ? `${p.drapeau} ${p.nom}` : (TERRITOIRES[id] || "Territoire");
      ib.style.left = e.clientX + "px";
      ib.style.top = e.clientY + "px";
      ib.classList.remove("cache");
    });

    // iPad/iPhone : le son ne démarre qu'après un vrai toucher; on réessaie jusqu'à ce qu'il soit actif
    const debloquerSon = () => { if (Sons.debloquer()) ["pointerup", "touchend", "click", "keydown"].forEach(t => document.removeEventListener(t, debloquerSon, true)); };
    ["pointerup", "touchend", "click", "keydown"].forEach(t => document.addEventListener(t, debloquerSon, true));

    // Bienvenue
    const valider = () => {
      const nom = $("champ-nom").value.trim();
      if (!nom) { $("champ-nom").focus(); return; }
      Prog.d.nom = nom; Prog.sauver();
      Sons.niveau();
      Effets.pluie();
      accueil();
    };
    $("btn-bienvenue").onclick = valider;
    $("champ-nom").onkeydown = e => { if (e.key === "Enter") valider(); };

    // Accueil
    document.querySelectorAll(".mode").forEach(b => (b.onclick = () => lancer(b.dataset.mode)));
    document.querySelectorAll("#choix-difficulte button").forEach(b => (b.onclick = () => {
      Prog.d.prefs.difficulte = b.dataset.val; Prog.sauver(); Sons.clic(); accueil();
    }));
    $("btn-defi").onclick = () => { Prog.d.prefs.defi = !Prog.d.prefs.defi; Prog.sauver(); Sons.clic(); accueil(); };
    $("btn-son").onclick = () => { Prog.d.sons = !Prog.d.sons; Sons.setActif(Prog.d.sons); Prog.sauver(); Sons.clic(); $("btn-son").textContent = Prog.d.sons ? "🔊" : "🔇"; };
    $("btn-badges").onclick = () => { Sons.clic(); badges(); };
    $("btn-macarte").onclick = () => { Sons.clic(); maCarte(); };
    $("btn-reglages").onclick = () => { Sons.clic(); reglages(); };
    document.querySelectorAll("[data-fermer]").forEach(b => (b.onclick = () => { Sons.clic(); accueil(); }));

    // Jeu
    $("btn-quitter").onclick = () => { Sons.clic(); if (!Jeu.terminer()) accueil(); };
    $("btn-suivant").onclick = () => { Sons.clic(); Jeu.suivante(); };
    $("btn-continuer").onclick = () => { Sons.clic(); Jeu.suivante(); };
    document.querySelectorAll("#choix-pause button").forEach(b => (b.onclick = () => {
      Prog.d.prefs.pauseApprenti = +b.dataset.val; Prog.sauver(); Sons.clic(); majChoixPause();
    }));
    $("btn-indice").onclick = () => Jeu.indice();
    $("btn-zoom-plus").onclick = () => Carte.zoomer(1.6);
    $("btn-zoom-moins").onclick = () => Carte.zoomer(1 / 1.6);
    $("btn-zoom-region").onclick = () => Carte.recadrer();

    // Fin
    $("btn-rejouer").onclick = () => { Sons.clic(); demarrer(derniersOpts); };
    $("btn-menu").onclick = () => { Sons.clic(); accueil(); };

    // Réglages
    $("btn-sauver-nom").onclick = () => {
      const nom = $("reglage-nom").value.trim();
      if (nom) { Prog.d.nom = nom; Prog.sauver(); Effets.toast("✅ Nom enregistré!"); }
    };
    $("filtre-pays").oninput = dessinerListe;
    $("btn-tout-cocher").onclick = () => { actifsEdition = new Set(Pays.liste.map(p => p.id)); enregistrerActifs(); };
    $("btn-tout-decocher").onclick = () => { actifsEdition = new Set(); enregistrerActifs(); };
    $("btn-liste-defaut").onclick = () => { Prog.reinitActifs(); actifsEdition = Prog.actifs(); Carte.appliquerActifs(actifsEdition); dessinerListe(); Effets.toast("↩️ Liste par défaut rétablie"); };
    $("btn-exporter").onclick = exporter;
    $("reglage-griser").onchange = e => { Prog.d.prefs.griser = e.target.checked; Prog.sauver(); Carte.griser(e.target.checked); };
    $("fichier-csv").onchange = e => { lireFichier(e.target.files[0]); e.target.value = ""; };
    // Confirmation en deux touchers (confirm() ne s'affiche pas dans certaines apps iPad)
    let attenteEffacer = null;
    $("btn-reinitialiser").onclick = () => {
      const b = $("btn-reinitialiser");
      if (!attenteEffacer) {
        b.textContent = "⚠️ Touche encore pour tout effacer";
        attenteEffacer = setTimeout(() => { attenteEffacer = null; b.textContent = "Effacer ma progression"; }, 4000);
        return;
      }
      clearTimeout(attenteEffacer); attenteEffacer = null;
      b.textContent = "Effacer ma progression";
      Prog.effacer(); Effets.toast("🧹 Progression effacée"); accueil();
    };

    // Glisser-déposer un CSV n'importe où dans l'app
    let compteurDepot = 0;
    addEventListener("dragenter", e => { e.preventDefault(); compteurDepot++; document.body.classList.add("depot-actif"); });
    addEventListener("dragleave", () => { if (--compteurDepot <= 0) { compteurDepot = 0; document.body.classList.remove("depot-actif"); } });
    addEventListener("dragover", e => e.preventDefault());
    addEventListener("drop", e => {
      e.preventDefault();
      compteurDepot = 0;
      document.body.classList.remove("depot-actif");
      lireFichier(e.dataTransfer.files[0]);
    });

    // Clavier
    addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT") return;
      const st = Jeu.etat;
      if ((e.key === "Enter" || e.key === " ") && Jeu.ficheVisible()) { e.preventDefault(); Jeu.suivante(); return; }
      if (e.key === "Escape") { if (!$("ecran-accueil").classList.contains("cache")) return; if (!Jeu.terminer()) accueil(); return; }
      if (!st) return;
      if (/^[1-4]$/.test(e.key)) Jeu.repondreTouche(+e.key - 1);
      else if (e.key === "i" || e.key === "I") Jeu.indice();
      else if (e.key === "+" || e.key === "=") Carte.zoomer(1.6);
      else if (e.key === "-") Carte.zoomer(1 / 1.6);
    });

    // Version web : fonctionne hors ligne une fois installée
    if (location.protocol.startsWith("http") && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }

    if (Prog.d.nom) accueil();
    else {
      Carte.appliquerActifs(Prog.actifs());
      Carte.vueRegion("MONDE", 0);
      montrer("ecran-bienvenue");
      setTimeout(() => $("champ-nom").focus(), 300);
    }
  }

  return { init, montrerFin, clicExploration };
})();

App.init();
