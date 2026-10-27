// Effets sonores générés par le navigateur (aucun fichier audio requis).
const Sons = (() => {
  let ctx = null;
  let actif = true;

  function audio() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function note(freq, debut, duree, type = "sine", volume = 0.18) {
    const c = audio();
    if (!c || !actif) return;
    const t = c.currentTime + debut;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + duree + 0.05);
  }

  const demi = (f, n) => f * Math.pow(2, n / 12);

  return {
    setActif(v) { actif = v; },
    estActif() { return actif; },
    // Renvoie vrai quand l'audio joue vraiment (iOS exige un toucher de l'utilisateur)
    debloquer() {
      const c = audio();
      if (!c) return true;
      if (c.state !== "running") return false;
      // Son muet très court : déverrouille l'audio sur iOS
      const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
      return true;
    },
    clic() { note(880, 0, 0.05, "triangle", 0.08); },
    bon(combo = 1) {
      const base = demi(523, Math.min(combo - 1, 10)); // monte avec le combo
      note(base, 0, 0.12, "triangle", 0.2);
      note(demi(base, 4), 0.08, 0.12, "triangle", 0.2);
      note(demi(base, 7), 0.16, 0.25, "triangle", 0.2);
      if (combo >= 3) note(demi(base, 12), 0.26, 0.3, "sine", 0.14);
    },
    mauvais() {
      note(240, 0, 0.16, "square", 0.06);
      note(180, 0.13, 0.25, "square", 0.06);
    },
    territoire() { note(440, 0, 0.1, "sine", 0.1); note(392, 0.09, 0.14, "sine", 0.1); },
    indice() { [784, 988, 1175].forEach((f, i) => note(f, i * 0.06, 0.15, "sine", 0.1)); },
    tic() { note(1200, 0, 0.04, "square", 0.04); },
    revele() { note(330, 0, 0.2, "triangle", 0.12); note(262, 0.18, 0.35, "triangle", 0.12); },
    niveau() {
      [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.12, 0.2, "triangle", 0.2));
      note(1319, 0.5, 0.5, "triangle", 0.18);
    },
    badge() { [1047, 1319, 1568, 2093].forEach((f, i) => note(f, i * 0.07, 0.25, "sine", 0.13)); },
    fin(etoiles) {
      const m = etoiles >= 3 ? [523, 659, 784, 1047, 784, 1047] : etoiles === 2 ? [523, 659, 784, 1047] : [392, 523, 659];
      m.forEach((f, i) => note(f, i * 0.13, 0.22, "triangle", 0.18));
    }
  };
})();
