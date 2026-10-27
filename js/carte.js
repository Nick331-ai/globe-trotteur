// Carte du monde interactive (d3 + TopoJSON) : affichage, zoom, états visuels.
const Carte = (() => {
  const W = 1000, H = 520;
  const REGIONS = {
    AN: [[-168, 7], [-12, 83]],
    AS: [[-92, -56], [-34, 13]],
    EU: [[-25, 34], [48, 71]],
    AF: [[-26, -35], [58, 37]],
    AI: [[26, -10], [146, 55]],
    OC: [[112, -48], [190, 0]]
  };

  let svg, svgNode, gRoot, gEffets, zoom, projection, chemin;
  let k = 1, transfo = d3.zoomIdentity;
  let surClic = () => {}, surSurvol = () => {};
  let marges = { haut: 0, bas: 0, gauche: 0, droite: 0 };
  const elements = {};   // id -> [éléments SVG]
  const geo = {};        // id -> { centre:[x,y], bornes, petit }
  const marqueurs = [];
  let etiquettes = [];   // noms affichés sur la carte (taille constante à l'écran)

  function init(conteneur) {
    projection = d3.geoNaturalEarth1().rotate([-11, 0]).fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" });
    chemin = d3.geoPath(projection);

    svg = d3.select(conteneur).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet");
    svgNode = svg.node();
    gRoot = svg.append("g");
    gRoot.append("path").datum({ type: "Sphere" }).attr("class", "sphere").attr("d", chemin);
    gRoot.append("path").datum(d3.geoGraticule10()).attr("class", "graticule").attr("d", chemin);

    const geoms = CARTE_TOPO.objects.countries.geometries;
    const formes = topojson.feature(CARTE_TOPO, CARTE_TOPO.objects.countries).features;
    const couleurs = colorier(geoms);

    const gFormes = gRoot.append("g");
    formes.forEach(f => {
      const id = f.id;
      const p = gFormes.append("path").attr("d", chemin(f)).attr("data-id", id)
        .attr("class", `forme c${couleurs[id] || 0} ${Pays.parId[id] ? "pays" : "territoire"}`);
      (elements[id] = elements[id] || []).push(p.node());
      // Garder la plus grande partie pour centrer et zoomer
      const principal = plusGrandPolygone(f);
      const aire = chemin.area(principal);
      if (!geo[id] || aire > geo[id].aire) {
        geo[id] = { aire, centre: projection(d3.geoCentroid(principal)), bornes: chemin.bounds(principal) };
      }
    });

    // Petits pays (ou absents de la carte) : un cercle cliquable
    const gMarq = gRoot.append("g");
    for (const p of Pays.liste) {
      if (p.pt) {
        const c = projection(p.pt);
        geo[p.id] = { aire: 0, centre: c, bornes: [[c[0] - 1, c[1] - 1], [c[0] + 1, c[1] + 1]] };
      }
      if (!geo[p.id]) continue;
      if (p.pt || geo[p.id].aire < 6) {
        const [x, y] = geo[p.id].centre;
        const m = gMarq.append("circle").attr("cx", x).attr("cy", y).attr("r", 4)
          .attr("data-id", p.id).attr("class", "marqueur pays");
        (elements[p.id] = elements[p.id] || []).push(m.node());
        marqueurs.push(m.node());
      }
    }
    gEffets = gRoot.append("g");

    zoom = d3.zoom().scaleExtent([1, 60])
      .translateExtent([[-W, -H], [2 * W, 2 * H]])
      .on("zoom", e => {
        transfo = e.transform; k = transfo.k;
        gRoot.attr("transform", transfo);
        majMarqueurs();
      });
    svg.call(zoom).on("dblclick.zoom", null);
    majMarqueurs();

    svg.on("click", e => {
      const id = e.target.getAttribute && e.target.getAttribute("data-id");
      if (id) surClic(id, e);
    });
    // Survol : seulement à la souris (au doigt, l'infobulle resterait collée)
    svg.on("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const id = e.target.getAttribute && e.target.getAttribute("data-id");
      surSurvol(id || null, e);
    });
    svg.on("pointerdown", e => { if (e.pointerType !== "mouse") surSurvol(null); });
    svg.on("mouseleave", () => surSurvol(null));
    addEventListener("resize", () => { majMarqueurs(); if (derniereVue) derniereVue(0); });
  }

  // Les cercles gardent la même taille à l'écran, peu importe le zoom (plus gros au doigt)
  const tactile = matchMedia("(pointer: coarse)");
  function majMarqueurs() {
    const u = 1 / (zone().s * k);   // 1 pixel écran, en unités de la carte
    const r = (tactile.matches ? 9 : 7) * u;
    for (const m of marqueurs) m.setAttribute("r", r);
    for (const { el, x, y, petit } of etiquettes) {
      el.setAttribute("font-size", 24 * u);
      el.setAttribute("stroke-width", 5 * u);
      el.setAttribute("x", x);
      el.setAttribute("y", y - (petit ? 20 : 0) * u);
    }
  }

  function plusGrandPolygone(f) {
    if (f.geometry.type !== "MultiPolygon") return f;
    let best = null, max = -1;
    for (const coords of f.geometry.coordinates) {
      const poly = { type: "Polygon", coordinates: coords };
      const a = d3.geoArea(poly);
      if (a > max) { max = a; best = poly; }
    }
    return { type: "Feature", geometry: best };
  }

  // Coloriage : des pays voisins n'ont pas la même couleur
  function colorier(geoms) {
    const voisins = topojson.neighbors(geoms);
    const parId = {};
    geoms.forEach((g, i) => (parId[g.id] = parId[g.id] || []).push(i));
    const couleurs = {};
    const ids = Object.keys(parId).sort((a, b) =>
      parId[b].reduce((s, i) => s + voisins[i].length, 0) - parId[a].reduce((s, i) => s + voisins[i].length, 0));
    for (const id of ids) {
      const prises = new Set();
      parId[id].forEach(i => voisins[i].forEach(j => { const c = couleurs[geoms[j].id]; if (c !== undefined) prises.add(c); }));
      let c = 0;
      while (prises.has(c)) c++;
      couleurs[id] = c % 6;
    }
    return couleurs;
  }

  // ----- Vue et zoom -----
  function zone() {
    const r = svgNode.getBoundingClientRect();
    const s = Math.min(r.width / W, r.height / H);
    const ox = (r.width - W * s) / 2, oy = (r.height - H * s) / 2;
    return {
      x: (-ox + marges.gauche) / s, y: (-oy + marges.haut) / s,
      w: Math.max(50, r.width - marges.gauche - marges.droite) / s,
      h: Math.max(50, r.height - marges.haut - marges.bas) / s,
      s, ox, oy, r
    };
  }

  let derniereVue = null;
  function cadrer([[x0, y0], [x1, y1]], duree = 750, maxK = 14) {
    const z = zone();
    const bw = Math.max(x1 - x0, 1), bh = Math.max(y1 - y0, 1);
    const kk = Math.max(1, Math.min(maxK, 0.92 * Math.min(z.w / bw, z.h / bh)));
    const t = d3.zoomIdentity.translate(z.x + z.w / 2, z.y + z.h / 2).scale(kk).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    (duree ? svg.transition().duration(duree).ease(d3.easeCubicInOut) : svg).call(zoom.transform, t);
  }

  function bornesRegion(code) {
    if (!REGIONS[code]) return chemin.bounds({ type: "Sphere" });
    const [[a, b], [c, d]] = REGIONS[code];
    const pts = [];
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) pts.push(projection([a + (c - a) * i / 10, b + (d - b) * j / 10]));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
  }

  function vueRegion(code, duree = 750) {
    derniereVue = d => cadrer(bornesRegion(code), d, 14);
    derniereVue(duree);
  }

  // Zoom sur un pays, avec du contexte autour (facteur)
  function vuePays(id, facteur = 3.5, duree = 750, tailleMin = 70) {
    const g = geo[id];
    if (!g) return;
    const [[x0, y0], [x1, y1]] = g.bornes;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const w = Math.max((x1 - x0) * facteur, tailleMin), h = Math.max((y1 - y0) * facteur, tailleMin * 0.6);
    derniereVue = d => cadrer([[cx - w / 2, cy - h / 2], [cx + w / 2, cy + h / 2]], d, 30);
    derniereVue(duree);
  }

  // Vue sur tout le continent d'un pays (en incluant tout le pays, ex. la Russie)
  function vueContinent(id, duree = 900) {
    const g = geo[id], p = Pays.parId[id];
    if (!g || !p) return;
    const code = p.continents.find(c => REGIONS[c]);
    const [[a, b], [c, d]] = code ? bornesRegion(code) : g.bornes;
    const [[e, f], [h, i]] = g.bornes;
    const bornes = [[Math.min(a, e), Math.min(b, f)], [Math.max(c, h), Math.max(d, i)]];
    derniereVue = t => cadrer(bornes, t, 14);
    derniereVue(duree);
  }

  function recadrer() { if (derniereVue) derniereVue(600); }
  function zoomer(f) { svg.transition().duration(300).call(zoom.scaleBy, f); }

  // Position à l'écran du centre d'un pays (pour les effets)
  function positionEcran(id) {
    const g = geo[id];
    if (!g) return { x: innerWidth / 2, y: innerHeight / 2 };
    const z = zone();
    const [x, y] = transfo.apply(g.centre);
    return { x: z.r.left + z.ox + x * z.s, y: z.r.top + z.oy + y * z.s };
  }

  // ----- États visuels -----
  function etat(id, classe, ajouter = true) {
    (elements[id] || []).forEach(el => el.classList.toggle(classe, ajouter));
  }
  function effacer(...classes) {
    const sel = classes.map(c => "." + c).join(",");
    svgNode.querySelectorAll(sel).forEach(el => el.classList.remove(...classes));
    gEffets.selectAll("*").remove();
    etiquettes = [];
  }

  // Nom d'un pays écrit sur la carte, par-dessus le pays
  function etiquette(id, texte) {
    const g = geo[id];
    if (!g) return;
    const el = gEffets.append("text").attr("class", "etiquette-pays").attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle").text(texte).node();
    etiquettes.push({ el, x: g.centre[0], y: g.centre[1], petit: g.aire < 6 });
    majMarqueurs();
  }
  // Passer un pays par-dessus ses voisins (pour que son contour soit bien visible)
  function devant(id) { (elements[id] || []).forEach(el => el.parentNode.appendChild(el)); }
  function flash(id, classe, duree = 1200) {
    etat(id, classe, true);
    setTimeout(() => etat(id, classe, false), duree);
  }
  function anneau(id, rayonEcran = 110) {
    const g = geo[id];
    if (!g) return;
    gEffets.selectAll("*").remove();
    etiquettes = [];
    // Centre décalé au hasard pour ne pas donner la réponse exacte
    const z = zone();
    const r = rayonEcran / (z.s * k);
    const a = Math.random() * Math.PI * 2, dec = r * 0.45;
    gEffets.append("circle").attr("class", "anneau-indice")
      .attr("cx", g.centre[0] + Math.cos(a) * dec).attr("cy", g.centre[1] + Math.sin(a) * dec).attr("r", r);
  }

  function appliquerActifs(actifs) {
    for (const p of Pays.liste) {
      const a = actifs.has(p.id);
      etat(p.id, "actif", a);
      etat(p.id, "inactif", !a);
    }
  }
  function maitrise(active) {
    svgNode.classList.toggle("maitrise", active);
    for (const p of Pays.liste) {
      const m = Prog.maitrise(p.id);
      for (let i = 0; i < 4; i++) etat(p.id, "m" + i, active && i === m);
    }
  }
  function cliquable(v) { svgNode.classList.toggle("clic-ok", v); }
  function toutVoir(v) { svgNode.classList.toggle("tout-voir", v); }
  function griser(v) { svgNode.classList.toggle("sans-gris", !v); }

  function centreGeo(id) {
    const g = geo[id];
    return g ? projection.invert(g.centre) : null;
  }

  return {
    init, vueRegion, vuePays, vueContinent, etiquette, recadrer, zoomer, positionEcran, etat, effacer, flash, anneau, devant,
    appliquerActifs, maitrise, cliquable, toutVoir, griser, centreGeo,
    setClic(f) { surClic = f; }, setSurvol(f) { surSurvol = f; },
    setMarges(m) { marges = { ...marges, ...m }; },
    existe: id => !!geo[id],
    aire: id => (geo[id] ? geo[id].aire : 0)
  };
})();
