// Mise en cache pour jouer hors ligne (version web seulement).
const CACHE = "globe-trotteur-v1";
const FICHIERS = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "js/vendor/d3.min.js", "js/vendor/topojson-client.min.js",
  "data/carte.js", "data/pays.js", "data/pays-actifs.js",
  "js/sons.js", "js/effets.js", "js/progression.js", "js/carte.js", "js/jeu.js", "js/app.js",
  "icones/icone-192.png", "icones/icone-512.png"
];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
// Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copie = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copie));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
