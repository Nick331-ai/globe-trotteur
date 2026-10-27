// Génère data/carte.js à partir de countries-50m.json (world-atlas, Natural Earth).
// Usage : node outils/construire-carte.js
const fs = require("fs");
const path = require("path");
const topo = JSON.parse(fs.readFileSync(path.join(__dirname, "countries-50m.json"), "utf8"));
const corr = { "Kosovo": "XKX", "N. Cyprus": "196", "Somaliland": "706", "Indian Ocean Ter.": "IOT", "Siachen Glacier": "SIA" };
const geos = topo.objects.countries.geometries.filter(g => g.id !== "010"); // pas d'Antarctique
for (const g of geos) {
  if (g.id === undefined) g.id = corr[g.properties.name];
  delete g.properties;
}
// Séparer la Guyane française (254) de la France métropolitaine
const topojson = require("../js/vendor/topojson-client.min.js");
const fr = geos.find(g => g.id === "250");
const estGuyane = arcs => {
  const ring = topojson.feature(topo, { type: "Polygon", arcs }).geometry.coordinates[0];
  const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length, lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return lon > -55 && lon < -51 && lat > 1 && lat < 6.5;
};
const guyane = fr.arcs.filter(estGuyane);
fr.arcs = fr.arcs.filter(a => !estGuyane(a));
geos.push({ type: "MultiPolygon", id: "254", arcs: guyane });
topo.objects.countries.geometries = geos;
delete topo.objects.land;
fs.writeFileSync(path.join(__dirname, "..", "data", "carte.js"),
  "// Données cartographiques : Natural Earth (domaine public) via world-atlas.\nwindow.CARTE_TOPO = " + JSON.stringify(topo) + ";\n");
console.log("OK", geos.length, "formes");
