// Effets visuels : confettis, points flottants, gros messages, notifications.
const Effets = (() => {
  const canvas = document.getElementById("confettis");
  const c2d = canvas.getContext("2d");
  const couleurs = ["#ff7a59", "#ffd23f", "#22c55e", "#3d7bff", "#e94bbf", "#8a5cff", "#7be0ff"];
  let particules = [];
  let enCours = false;

  function ajuster() {
    const r = window.devicePixelRatio || 1;
    canvas.width = innerWidth * r;
    canvas.height = innerHeight * r;
    c2d.setTransform(r, 0, 0, r, 0, 0);
  }
  addEventListener("resize", ajuster);
  ajuster();

  function boucle() {
    c2d.clearRect(0, 0, innerWidth, innerHeight);
    particules = particules.filter(p => p.vie > 0);
    for (const p of particules) {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.35;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vie--;
      c2d.save();
      c2d.globalAlpha = Math.min(1, p.vie / 30);
      c2d.translate(p.x, p.y);
      c2d.rotate(p.rot);
      c2d.fillStyle = p.c;
      if (p.rond) { c2d.beginPath(); c2d.arc(0, 0, p.t / 2, 0, 7); c2d.fill(); }
      else c2d.fillRect(-p.t / 2, -p.t / 4, p.t, p.t / 2);
      c2d.restore();
    }
    if (particules.length) requestAnimationFrame(boucle);
    else { enCours = false; c2d.clearRect(0, 0, innerWidth, innerHeight); }
  }

  function confettis(x, y, nombre = 60, force = 1) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (let i = 0; i < nombre; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (4 + Math.random() * 9) * force;
      particules.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6 * force,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        t: 7 + Math.random() * 8, c: couleurs[(Math.random() * couleurs.length) | 0],
        rond: Math.random() < 0.3, vie: 70 + Math.random() * 50
      });
    }
    if (!enCours) { enCours = true; requestAnimationFrame(boucle); }
  }

  function pluie() {
    for (let i = 0; i < 6; i++) setTimeout(() => confettis(Math.random() * innerWidth, innerHeight * 0.3, 40, 1.1), i * 160);
  }

  function pointsFlottants(x, y, texte) {
    const el = document.createElement("div");
    el.className = "points-flottants";
    el.textContent = texte;
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  function messageGeant(texte) {
    const el = document.createElement("div");
    el.className = "message-geant";
    el.textContent = texte;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  let minuteurToast = null;
  function toast(html, duree = 3000) {
    const t = document.getElementById("toast");
    t.innerHTML = html;
    t.classList.remove("cache");
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => t.classList.add("cache"), duree);
  }

  return { confettis, pluie, pointsFlottants, messageGeant, toast };
})();
