// Pays, liste active, progression du joueur (XP, niveaux, badges, maîtrise) — sauvegardé localement.

// ---------- Pays ----------
const Pays = (() => {
  const liste = PAYS_BRUTS.map(([id, a2, nom, capitale, cont, fait, opt = {}]) => ({
    id, a2, nom, capitale, continents: cont.split(" "), fait,
    pt: opt.pt || null, noCap: !!opt.noCap, note: opt.note || "",
    drapeau: a2.toUpperCase().replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)))
  }));
  const parId = Object.fromEntries(liste.map(p => [p.id, p]));

  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[’'`\-_.(),]/g, " ").replace(/\s+/g, " ").trim()
    .replace(/^(l|le|la|les) /, "");

  const ALIAS = {
    "vietnam": "704", "etats unis d amerique": "840", "usa": "840", "eua": "840", "e u": "840",
    "rdc": "180", "congo kinshasa": "180", "rd congo": "180", "republique democratique congo": "180",
    "congo brazzaville": "178", "republique du congo": "178",
    "birmanie": "104", "bielorussie": "112", "republique tcheque": "203", "swaziland": "748",
    "cabo verde": "132", "macedoine": "807", "timor leste": "626", "salvador": "222", "moldova": "498",
    "grande bretagne": "826", "angleterre": "826", "hollande": "528", "emirats": "784",
    "cote divoire": "384", "centrafrique": "140", "saint christophe et nieves": "659", "palau": "585",
    "turkiye": "792", "guyane": "254", "kirghizstan": "417", "sao tome et principe": "678",
    "coree": "410", "coree sud": "410", "coree nord": "408", "tchad": "148", "chypre": "196",
    "nouvelle zelande": "554", "congo republique democratique du": "180", "congo republique du": "178",
    "coree republique de": "410", "coree republique populaire democratique de": "408", "iran republique islamique d": "364",
    "viet nam": "704", "russie federation de": "643", "syrie republique arabe": "760", "tanzanie republique unie de": "834", "papouasie nouvelle guinee": "598", "arabie saoudite": "682"
  };
  const index = {};
  for (const p of liste) index[norm(p.nom)] = p.id;
  for (const [k, v] of Object.entries(ALIAS)) index[norm(k)] = v;

  function trouver(texte) {
    const t = (texte || "").trim();
    if (!t) return null;
    if (/^[a-z]{2}$/i.test(t)) {
      const p = liste.find(x => x.a2 === t.toUpperCase());
      if (p) return p.id;
    }
    if (parId[t]) return t; // code numérique
    return index[norm(t)] || null;
  }

  // Petit lecteur CSV (gère les guillemets, les virgules, points-virgules et tabulations)
  function lireCSV(texte) {
    const lignes = [];
    let cell = "", ligne = [], guill = false;
    texte = texte.replace(/^﻿/, "");
    for (let i = 0; i < texte.length; i++) {
      const ch = texte[i];
      if (guill) {
        if (ch === '"' && texte[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') guill = false;
        else cell += ch;
      } else if (ch === '"') guill = true;
      else if (ch === "," || ch === ";" || ch === "\t") { ligne.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && texte[i + 1] === "\n") i++;
        ligne.push(cell); lignes.push(ligne); ligne = []; cell = "";
      } else cell += ch;
    }
    ligne.push(cell); lignes.push(ligne);
    return lignes.map(l => l.map(c => c.trim())).filter(l => l.some(c => c));
  }

  const ENTETES = new Set(["pays", "country", "countries", "nom", "name", "code", "actif", "id"]);

  // Retourne { ids: [...], inconnus: [...], tous: bool }
  function analyserListe(texte) {
    const lignes = lireCSV(texte || "");
    if (lignes.some(l => /^(tous|tout|all|\*)$/i.test(l[0]))) return { ids: liste.map(p => p.id), inconnus: [], tous: true };
    const ids = new Set(), inconnus = [];
    for (const l of lignes) {
      l.forEach((c, i) => {
        const id = trouver(c);
        if (id) ids.add(id);
        else if (i === 0 && c && !ENTETES.has(norm(c))) inconnus.push(c);
      });
    }
    return { ids: [...ids], inconnus, tous: false };
  }

  function versCSV(ids) {
    return "﻿Pays\n" + liste.filter(p => ids.has(p.id)).map(p => p.nom.includes(",") ? `"${p.nom}"` : p.nom).join("\n") + "\n";
  }

  return { liste, parId, trouver, analyserListe, versCSV, norm };
})();

// ---------- Progression ----------
const Prog = (() => {
  const CLE = "globeTrotteur.v1";
  const defaut = () => ({
    nom: "", xp: 0, sons: true, actifs: null, pays: {}, badges: {}, records: {},
    jours: { dernier: null, serie: 0 },
    stats: { parties: 0, parfaites: 0, comboMax: 0, explores: [] },
    prefs: { region: "MONDE", difficulte: "apprenti", defi: false, griser: true, pauseApprenti: 3 }
  });

  let d = charger();
  function charger() {
    try {
      const s = localStorage.getItem(CLE);
      if (s) {
        const o = JSON.parse(s), base = defaut();
        const r = { ...base, ...o, stats: { ...base.stats, ...o.stats }, prefs: { ...base.prefs, ...o.prefs }, jours: { ...base.jours, ...o.jours } };
        if (r.prefs.difficulte === "debutant") r.prefs.difficulte = "apprenti";   // ancien mode Débutant
        return r;
      }
    } catch (e) { /* stockage indisponible : on joue quand même */ }
    return defaut();
  }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(d)); } catch (e) { } }

  // ----- Liste active -----
  const listeDefaut = () => {
    const r = Pays.analyserListe(window.PAYS_ACTIFS_DEFAUT || "TOUS");
    return r.ids.length ? r.ids : Pays.liste.map(p => p.id);
  };
  function actifs() { return new Set(d.actifs || listeDefaut()); }
  function setActifs(ids) { d.actifs = [...ids]; sauver(); }
  function reinitActifs() { d.actifs = null; sauver(); }

  // ----- Niveaux -----
  const TITRES = ["Touriste 🎒", "Randonneur 🥾", "Explorateur 🧭", "Aventurier 🗺️", "Navigateur ⛵", "Pilote ✈️",
    "Globe-trotteur 🌐", "Cartographe 📜", "Astronaute 🚀", "Légende 👑", "Maître du monde 🌟"];
  const seuil = n => 250 * (n - 1) * n; // XP requis pour atteindre le niveau n
  function niveau(xp = d.xp) {
    let n = 1;
    while (xp >= seuil(n + 1)) n++;
    return { n, titre: TITRES[Math.min(n, TITRES.length) - 1], depuis: xp - seuil(n), requis: seuil(n + 1) - seuil(n) };
  }

  // ----- Maîtrise des pays (0 à 3) -----
  const info = id => d.pays[id] || (d.pays[id] = { m: 0, ok: 0, ko: 0, t: 0 });
  function majPays(id, premierCoup, reussi) {
    const p = info(id);
    if (reussi) { p.ok++; if (premierCoup) p.m = Math.min(3, p.m + 1); }
    else { p.ko++; p.m = Math.max(0, p.m - 1); }
    p.t = Date.now();
    sauver();
  }
  const maitrise = id => (d.pays[id] ? d.pays[id].m : 0);
  const decouverts = ids => [...ids].filter(id => d.pays[id] && d.pays[id].ok > 0).length;

  // Choix des questions : les pays moins bien connus reviennent plus souvent
  function choisir(pool, n) {
    const restants = pool.map(p => {
      const s = d.pays[p.id];
      let poids = s ? Math.pow(4 - s.m, 2) + Math.min(s.ko, 4) : 12;
      if (s && Date.now() - s.t < 5 * 60 * 1000) poids *= 0.3; // vu il y a moins de 5 min
      return { p, poids: poids + 0.5 };
    });
    const choisis = [];
    while (choisis.length < n && restants.length) {
      const total = restants.reduce((s, r) => s + r.poids, 0);
      let x = Math.random() * total, i = 0;
      while ((x -= restants[i].poids) > 0 && i < restants.length - 1) i++;
      choisis.push(restants.splice(i, 1)[0].p);
    }
    return choisis;
  }

  // ----- Badges -----
  const contPays = (c, act) => Pays.liste.filter(p => act.has(p.id) && p.continents.includes(c));
  const BADGES = [
    { id: "premiers-pas", e: "🐣", nom: "Premiers pas", desc: "Termine ta première partie", test: () => d.stats.parties >= 1 },
    { id: "accro", e: "🎮", nom: "Accro", desc: "Joue 10 parties", test: () => d.stats.parties >= 10 },
    { id: "en-feu", e: "🔥", nom: "En feu!", desc: "Fais un combo de 5", test: c => c && c.comboMax >= 5 },
    { id: "sans-faute", e: "💯", nom: "Sans faute", desc: "Toutes les bonnes réponses du premier coup", test: c => c && c.total >= 5 && c.premiers === c.total },
    { id: "eclair", e: "⚡", nom: "Éclair", desc: "Bonne réponse en moins de 2 secondes en mode défi", test: c => c && c.eclair },
    { id: "chrono", e: "⏱️", nom: "Pas peur du chrono", desc: "7 bonnes réponses du premier coup en mode défi", test: c => c && c.defi && c.premiers >= 7 },
    { id: "drapeaux", e: "🚩", nom: "Pro des drapeaux", desc: "8 bonnes réponses du premier coup en mode Drapeaux", test: c => c && c.mode === "drapeaux" && c.premiers >= 8 },
    { id: "capitales", e: "🏛️", nom: "As des capitales", desc: "8 bonnes réponses du premier coup en mode Capitales", test: c => c && c.mode === "capitales" && c.premiers >= 8 },
    { id: "decouvreur-10", e: "🧭", nom: "Explorateur", desc: "Trouve 10 pays différents", test: () => decouverts(actifs()) >= 10 },
    { id: "decouvreur-25", e: "🗺️", nom: "Aventurier", desc: "Trouve 25 pays différents", test: () => decouverts(actifs()) >= 25 },
    { id: "decouvreur-50", e: "✈️", nom: "Globe-trotteur", desc: "Trouve 50 pays différents", test: () => decouverts(actifs()) >= 50 },
    { id: "tour-du-monde", e: "🌍", nom: "Tour du monde", desc: "Trouve tous les pays du quiz", test: () => { const a = actifs(); return a.size > 0 && decouverts(a) === a.size; } },
    ...["AN", "AS", "EU", "AF", "AI", "OC"].map(c => ({
      id: "maitre-" + c, e: CONTINENTS[c].emoji,
      nom: { AN: "Maître de l'Amérique du Nord", AS: "Maître de l'Amérique du Sud", EU: "Maître de l'Europe", AF: "Maître de l'Afrique", AI: "Maître de l'Asie", OC: "Maître de l'Océanie" }[c],
      desc: "Maîtrise tous les pays actifs de ce continent (2 étoiles et plus)",
      test: () => { const l = contPays(c, actifs()); return l.length > 0 && l.every(p => maitrise(p.id) >= 2); }
    })),
    { id: "fidele-3", e: "📅", nom: "Fidèle", desc: "Joue 3 jours de suite", test: () => d.jours.serie >= 3 },
    { id: "fidele-7", e: "🏅", nom: "Inarrêtable", desc: "Joue 7 jours de suite", test: () => d.jours.serie >= 7 },
    { id: "curieux", e: "🔍", nom: "Curieux", desc: "Explore 20 pays en mode Explorer", test: () => d.stats.explores.length >= 20 }
  ];
  function verifierBadges(ctx) {
    const nouveaux = [];
    for (const b of BADGES) {
      if (!d.badges[b.id] && b.test(ctx)) { d.badges[b.id] = Date.now(); nouveaux.push(b); }
    }
    if (nouveaux.length) sauver();
    return nouveaux;
  }

  // ----- Fin de partie -----
  const jourLocal = (dt = new Date()) => `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;
  function finPartie(ctx) {
    const avant = niveau().n;
    d.xp += ctx.score;
    d.stats.parties++;
    if (ctx.premiers === ctx.total) d.stats.parfaites++;
    d.stats.comboMax = Math.max(d.stats.comboMax, ctx.comboMax);
    const auj = jourLocal(), hier = jourLocal(new Date(Date.now() - 864e5));
    if (d.jours.dernier !== auj) {
      d.jours.serie = d.jours.dernier === hier ? d.jours.serie + 1 : 1;
      d.jours.dernier = auj;
    }
    const cle = `${ctx.mode}-${ctx.region}`;
    const record = ctx.score > (d.records[cle] || 0);
    if (record) d.records[cle] = ctx.score;
    sauver();
    return { niveauMonte: niveau().n > avant, record, badges: verifierBadges(ctx) };
  }

  function explorer(id) {
    if (!d.stats.explores.includes(id)) { d.stats.explores.push(id); sauver(); }
    return verifierBadges(null);
  }

  // Série affichée : remise à 0 si un jour a été manqué
  function serieActuelle() {
    const auj = jourLocal(), hier = jourLocal(new Date(Date.now() - 864e5));
    return d.jours.dernier === auj || d.jours.dernier === hier ? d.jours.serie : 0;
  }

  return {
    get d() { return d; }, sauver, actifs, setActifs, reinitActifs, listeDefaut,
    niveau, majPays, maitrise, decouverts, choisir, BADGES, verifierBadges, finPartie, explorer, serieActuelle,
    effacer() { const { nom, sons, actifs: a } = d; d = { ...defaut(), nom, sons, actifs: a }; sauver(); }
  };
})();
