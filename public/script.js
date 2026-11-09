// Petite fonction utilitaire pour créer un élément HTML.
// On utilise textContent (et non innerHTML) : aucun risque d'injection de code.
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) node.append(child);
  return node;
}

const $ = (selector) => document.querySelector(selector);

// Remplit une zone de la page si elle existe. Ainsi, un index.html un peu différent
// du script (ancienne version en cache, par exemple) ne bloque pas tout le reste.
function fill(selector, children) {
  const zone = $(selector);
  if (zone) zone.replaceChildren(...children);
}

/* ---------- Profil ---------- */

function renderProfile(profile) {
  document.title = `${profile.name} — ${profile.role}`;
  $('#logo').textContent = profile.name.split(' ')[0] + '.';
  $('#hero-name').textContent = profile.name;
  $('#hero-role').textContent = profile.role;
  $('#hero-tagline').textContent = profile.tagline;
  $('#availability').hidden = !profile.available;
  $('#footer-name').textContent = profile.name;

  $('#about-text').replaceChildren(...profile.about.map((text) => el('p', { text })));

  // Chiffres clés de l'accueil : ils « comptent » jusqu'à leur valeur (voir countUp plus bas)
  fill('#hero-stats', [
    ...profile.stats.map((s) =>
      el('li', { class: 'hero-stat' }, [
        el('strong', { class: 'gradient-text', 'data-count': s.value, text: s.value }),
        el('span', { text: s.label }),
      ])
    ),
  ]);

  // Fiche « En bref » de la section À propos
  fill('#facts', (profile.facts || []).flatMap((f) => [el('dt', { text: f.label }), el('dd', { text: f.value })]));

  // Bandeau défilant : toutes les compétences, en double pour une boucle sans couture
  const techs = profile.skills.flatMap((g) => g.items);
  const row = () => techs.map((t) => el('span', { class: 'marquee-item', text: t }));
  fill('#marquee', [...row(), ...row()]);

  startRotator(profile.rotating || []);

  $('#skills').replaceChildren(
    ...profile.skills.map((group) =>
      el('article', { class: 'skill-group card' }, [
        el('h3', { text: group.group }),
        el('ul', { class: 'chips' }, group.items.map((item) => el('li', { class: 'chip', text: item }))),
      ])
    )
  );

  // Seuls les réseaux avec une URL renseignée sont affichés
  const socials = profile.socials.filter((s) => s.url);
  $('#socials').replaceChildren(
    ...socials.map((s) => el('li', {}, el('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.label })))
  );
}

/* ---------- Projets ---------- */

let allProjects = [];

const gradient = (project) => {
  const [c1, c2] = project.colors || ['#7c3aed', '#ec4899'];
  return `background: linear-gradient(135deg, ${c1}, ${c2})`;
};

// Liens d'un projet : une ancre interne (#architecture) s'ouvre dans la page, le reste dans un nouvel onglet
function projectLinks(project) {
  const links = [];
  if (project.demo) {
    links.push(
      project.demo.startsWith('#')
        ? el('a', { href: project.demo, text: "Voir le schéma d'architecture →" })
        : el('a', { href: project.demo, target: '_blank', rel: 'noopener', text: 'Voir la démo →' })
    );
  }
  if (project.repo) links.push(el('a', { href: project.repo, target: '_blank', rel: 'noopener', text: 'Code source' }));
  return links;
}

// Illustration animée du projet (dessins définis dans covers.js) ;
// à défaut, on affiche l'initiale du titre en grand.
function coverArt(project) {
  const art = window.COVERS && window.COVERS[project.visual];
  if (!art) return el('span', { class: 'project-initial', 'aria-hidden': 'true', text: project.title.charAt(0) });
  const wrapper = el('div', { class: 'cover-art', 'aria-hidden': 'true' });
  // Le dessin vient de notre propre fichier covers.js (aucun contenu saisi par un visiteur)
  wrapper.innerHTML = `<svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid meet">${art}</svg>`;
  return wrapper;
}

function projectCard(project) {
  const index = allProjects.indexOf(project);
  return el('article', { class: 'project card', 'data-index': index }, [
    el('div', { class: 'project-cover', style: gradient(project) }, [
      el('span', { class: 'project-category', text: project.category }),
      coverArt(project),
    ]),
    el('div', { class: 'project-body' }, [
      el('h3', { text: project.title }),
      el('p', { text: project.description }),
      el('ul', { class: 'project-tags', 'aria-label': 'Technologies' }, project.tags.map((t) => el('li', { text: t }))),
      el('button', { type: 'button', class: 'project-more', 'data-index': index, text: 'Voir le détail →' }),
    ]),
  ]);
}

/* ---------- Fenêtre de détail ---------- */

const modal = $('#project-modal');

function openProject(project) {
  $('#modal-cover').setAttribute('style', gradient(project));
  $('#modal-cover').querySelector('.cover-art, .project-initial')?.remove();
  $('#modal-cover').prepend(coverArt(project));
  $('#modal-category').textContent = project.category;
  $('#modal-title').textContent = project.title;
  $('#modal-role').textContent = project.role || '';
  $('#modal-role').hidden = !project.role;
  $('#modal-context').textContent = project.context || project.description;
  $('#modal-context').classList.remove('is-explain');
  $('#modal-context-title').hidden = true;
  $('#modal-hl-title').textContent = 'Points clés';
  $('#modal-highlights').replaceChildren(...(project.highlights || []).map((h) => el('li', { text: h })));
  $('#modal-hl-title').hidden = !(project.highlights || []).length;
  fill('#modal-sections', []);
  $('#modal-tags').hidden = false;
  $('#modal-tags').replaceChildren(...project.tags.map((t) => el('li', { text: t })));
  $('#modal-links').replaceChildren(...projectLinks(project));
  modal.showModal();
  modal.scrollTop = 0;
}

// Fiche d'un domaine métier : explication, contributions, lexique et questions d'entretien
function openDomain(domain) {
  $('#modal-cover').setAttribute('style', gradient(domain));
  $('#modal-cover').querySelector('.cover-art, .project-initial')?.remove();
  $('#modal-cover').prepend(coverArt(domain));
  $('#modal-category').textContent = 'Domaine métier';
  $('#modal-title').textContent = domain.title;
  $('#modal-role').hidden = false;
  $('#modal-role').textContent = `${domain.period} · ${domain.volume}`;
  $('#modal-context-title').hidden = false;
  $('#modal-context').classList.add('is-explain');
  $('#modal-context').textContent = domain.explain || domain.text;
  $('#modal-hl-title').hidden = false;
  $('#modal-hl-title').textContent = "Ce que j'y ai fait";
  $('#modal-highlights').replaceChildren(...(domain.work || []).map((w) => el('li', { text: w })));

  const glossary = el('dl', { class: 'glossary' }, domain.concepts.flatMap((c) => [el('dt', { text: c.t }), el('dd', { text: c.d })]));
  const faq = (domain.faq || []).map((f, i) =>
    el('details', { class: 'faq' }, [el('summary', { text: f.q }), el('p', { text: f.a })])
  );
  fill('#modal-sections', [
    el('h4', { text: 'Lexique' }),
    glossary,
    faq.length ? el('h4', { text: 'Questions qu\'on peut me poser' }) : '',
    ...faq,
  ]);
  $('#modal-tags').hidden = true;
  $('#modal-links').replaceChildren();
  modal.showModal();
  modal.scrollTop = 0;
}

// Un clic n'importe où sur la carte ouvre le détail ; le bouton le rend accessible au clavier
$('#projects').addEventListener('click', (event) => {
  const card = event.target.closest('.project');
  if (card) openProject(allProjects[Number(card.dataset.index)]);
});

$('#modal-close').addEventListener('click', () => modal.close());
// Clic sur le fond assombri (en dehors du contenu) : on ferme
modal.addEventListener('click', (event) => {
  if (event.target === modal) modal.close();
});
// Un lien interne (#architecture) ferme la fenêtre avant de faire défiler la page
$('#modal-links').addEventListener('click', (event) => {
  if (event.target.getAttribute('href')?.startsWith('#')) modal.close();
});

function showProjects(category) {
  const list = category === 'all' ? allProjects : allProjects.filter((p) => p.category === category);
  const container = $('#projects');
  if (list.length === 0) {
    container.replaceChildren(el('p', { class: 'empty', text: 'Aucun projet dans cette catégorie pour le moment.' }));
    return;
  }
  container.replaceChildren(...list.map(projectCard));
  // Petit décalage d'animation entre les cartes
  container.querySelectorAll('.project').forEach((card, i) => (card.style.animationDelay = `${i * 70}ms`));
}

function renderFilters(categories) {
  const buttons = [{ value: 'all', label: 'Tous' }, ...categories.map((c) => ({ value: c, label: c }))].map((f) =>
    el('button', { type: 'button', class: 'filter-btn', 'data-category': f.value, 'aria-pressed': String(f.value === 'all'), text: f.label })
  );
  $('#filters').replaceChildren(...buttons);

  $('#filters').addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (!button) return;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    showProjects(button.dataset.category);
  });
}

/* ---------- Domaines métier ---------- */

// Petites icônes au trait (24×24) pour chaque domaine
const DOMAIN_ICONS = {
  retirement: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  tax: '<path d="M4 20h16M6 20V10m4 10V10m4 10V10m4 10V10M3 10l9-6 9 6"/><path d="M9.5 15.5l5-3"/>',
  distribution: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4"/>',
  pe: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/><path d="M16 7h4v4"/>',
  realestate: '<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
  compliance: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  identity: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M17 11a3 3 0 1 0 0-6M22 21c0-3-2-5-4-5.5"/>',
};

function renderDomains(domains) {
  if (!domains || !$('#domains')) return;
  $('#domains-intro').textContent = domains.intro;
  fill(
    '#domains',
    domains.items.map((d) => {
      const icon = el('span', { class: 'domain-icon', 'aria-hidden': 'true' });
      // Icône issue de la constante ci-dessus (contenu fixe, pas de saisie utilisateur)
      icon.innerHTML = `<svg viewBox="0 0 24 24">${DOMAIN_ICONS[d.icon] || DOMAIN_ICONS.pe}</svg>`;
      return el('article', { class: 'domain card', 'data-index': domains.items.indexOf(d) }, [
        el('div', { class: 'domain-cover', style: gradient(d) }, [coverArt(d)]),
        el('div', { class: 'domain-head' }, [
          icon,
          el('div', {}, [
            el('h3', { text: d.title }),
            el('p', { class: 'domain-meta', text: `${d.period} · ${d.volume}` }),
          ]),
        ]),
        el('p', { class: 'domain-text', text: d.text }),
        // Survoler une notion affiche sa définition
        el('ul', { class: 'domain-concepts', 'aria-label': 'Notions métier' }, d.concepts.map((c) => el('li', { text: c.t, title: c.d }))),
        el('button', { type: 'button', class: 'project-more', text: 'Comprendre ce métier →' }),
      ]);
    })
  );
  // Un clic sur la carte (ou son bouton) ouvre la fiche explicative
  $('#domains').onclick = (event) => {
    const card = event.target.closest('.domain');
    if (card) openDomain(domains.items[Number(card.dataset.index)]);
  };
}

/* ---------- Rôle, philosophie, parcours ---------- */

function renderTeam(team) {
  if (!team) return;
  $('#team-intro').textContent = team.intro;
  $('#team').replaceChildren(
    ...team.items.map((item, i) =>
      el('li', { class: 'team-item card' }, [
        el('span', { class: 'team-num', 'aria-hidden': 'true', text: String(i + 1).padStart(2, '0') }),
        el('h3', { text: item.title }),
        el('p', { text: item.text }),
        item.proof ? el('p', { class: 'team-proof', text: item.proof }) : '',
      ])
    )
  );
}

function renderPhilosophy(principles) {
  if (!principles) return;
  $('#principles').replaceChildren(
    ...principles.map((p) =>
      el('li', { class: 'principle' }, [el('blockquote', { text: p.quote }), el('p', { text: p.text })])
    )
  );
}

function renderTimeline(steps) {
  if (!steps) return;
  $('#timeline').replaceChildren(
    ...steps.map((s) =>
      el('li', { class: 'step' }, [
        el('span', { class: 'step-date', text: s.date }),
        el('div', { class: 'step-body card' }, [el('h3', { text: s.title }), el('p', { text: s.text })]),
      ])
    )
  );
}

/* ---------- Architecture (le schéma animé est dans architecture.js) ---------- */

function renderArchitecture(architecture) {
  if (architecture) $('#archi-intro').textContent = architecture.intro;
}

/* ---------- Entreprises (même liste que la page Parcours, lue depuis /api/parcours) ---------- */

function logoEntreprise(e) {
  // Logo si disponible, sinon les initiales dans une pastille
  if (e.logo) return el('img', { src: e.logo, alt: e.nom, loading: 'lazy' });
  const initiales = e.nom.split(/\s+/).map((m) => m[0]).join('').slice(0, 3).toUpperCase();
  return el('span', { class: 'logo-init', text: initiales });
}

async function renderEntreprises() {
  const wrap = $('#logos-marquee-wrap');
  if (!wrap) return;
  try {
    const res = await fetch('/api/parcours');
    if (!res.ok) return;
    const items = (await res.json()).entreprises?.items || [];
    if (!items.length) return;
    // La liste est répétée pour remplir au moins deux largeurs d'écran, puis doublée pour la boucle sans couture
    const fois = Math.max(2, Math.ceil(8 / items.length));
    const ligne = () =>
      Array.from({ length: fois }, () => items).flat().map((e) =>
        el('a', { class: 'marquee-item logo-item', href: e.site || 'parcours.html', target: e.site ? '_blank' : '_self', rel: 'noopener', title: `${e.nom} · ${e.periode || ''}` }, [
          logoEntreprise(e),
          el('span', { class: 'logo-nom', text: e.nom }),
        ])
      );
    fill('#logos-marquee', [...ligne(), ...ligne()]);
    wrap.hidden = false;
  } catch (err) {
    // Le bandeau est un complément : sans lui, la page reste complète
    console.warn('Entreprises indisponibles', err);
  }
}

/* ---------- Chargement des données ---------- */

async function loadData() {
  try {
    const [profileRes, projectsRes] = await Promise.all([fetch('/api/profile'), fetch('/api/projects')]);
    if (!profileRes.ok || !projectsRes.ok) throw new Error('Réponse serveur invalide');

    const profile = await profileRes.json();
    renderProfile(profile);
    renderDomains(profile.domains);
    renderTeam(profile.team);
    renderPhilosophy(profile.philosophy);
    renderTimeline(profile.timeline);
    renderEntreprises();
    renderArchitecture(profile.architecture);
    const { categories, projects } = await projectsRes.json();
    allProjects = projects;
    renderFilters(categories);
    showProjects('all');
  } catch (err) {
    console.error(err);
    $('#projects').replaceChildren(
      el('p', { class: 'load-error', text: 'Impossible de charger le contenu. Rechargez la page dans un instant.' })
    );
  }
}

/* ---------- Formulaire de contact ---------- */

const form = $('#contact-form');
const statusEl = $('#form-status');
const submitBtn = $('#submit-btn');

function setFieldError(name, message) {
  form.querySelector(`.field-error[data-for="${name}"]`).textContent = message || '';
  form.elements[name].closest('.field').classList.toggle('invalid', Boolean(message));
}

// Mêmes règles que côté serveur, pour un retour immédiat à l'utilisateur
function validate(data) {
  const errors = {};
  if (data.name.trim().length < 2) errors.name = 'Indiquez votre nom.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) errors.email = 'Adresse email invalide.';
  if (data.message.trim().length < 10) errors.message = 'Votre message doit faire au moins 10 caractères.';
  return errors;
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `form-status ${type || ''}`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  const errors = validate(data);
  ['name', 'email', 'message'].forEach((field) => setFieldError(field, errors[field]));
  if (Object.keys(errors).length) {
    setStatus('Merci de corriger les champs indiqués.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Envoi en cours…';
  setStatus('');

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();

    if (!res.ok) {
      Object.entries(result.fields || {}).forEach(([field, msg]) => setFieldError(field, msg));
      throw new Error(result.error);
    }

    form.reset();
    setStatus('Merci ! Votre message a bien été envoyé. Je vous réponds très vite.', 'success');
  } catch (err) {
    setStatus(err.message || 'Une erreur est survenue. Réessayez plus tard.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Envoyer le message';
  }
});

// Efface l'erreur d'un champ dès que l'utilisateur le corrige
form.addEventListener('input', (event) => {
  if (['name', 'email', 'message'].includes(event.target.name)) setFieldError(event.target.name, '');
});

/* ---------- Menu mobile ---------- */

const toggle = $('#nav-toggle');
const navLinks = $('#nav-links');

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  toggle.setAttribute('aria-label', open ? 'Ouvrir le menu' : 'Fermer le menu');
  navLinks.classList.toggle('open', !open);
});

// Ferme le menu après un clic sur un lien
navLinks.addEventListener('click', (event) => {
  if (event.target.tagName === 'A') {
    toggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('open');
  }
});

/* ---------- Apparition des sections au défilement ---------- */

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((section) => observer.observe(section));

/* =============================================================================
 * Effets visuels. Tous sont désactivés si l'utilisateur a demandé
 * moins d'animations dans les réglages de son système.
 * ===========================================================================*/

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

/* ---------- Thème clair / sombre ---------- */

const themeBtn = $('#theme-toggle');
const isDark = () =>
  document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;

function syncThemeButton() {
  themeBtn?.setAttribute('aria-label', isDark() ? 'Passer en mode clair' : 'Passer en mode sombre');
}

themeBtn?.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) { /* stockage indisponible : tant pis */ }
  syncThemeButton();
});
syncThemeButton();

/* ---------- Barre de progression, en-tête compact, lien actif ---------- */

const progress = $('#progress');
const header = $('#header');

function onScroll() {
  if (!progress || !header) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  header.classList.toggle('scrolled', window.scrollY > 20);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Met en valeur, dans le menu, la section en cours de lecture
const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  },
  { rootMargin: '-45% 0px -50% 0px' }
);
document.querySelectorAll('main section[id]').forEach((section) => spy.observe(section));

/* ---------- Texte qui s'écrit tout seul ---------- */

function startRotator(phrases) {
  const target = $('#rotator');
  if (!target || !phrases.length) return;
  if (reduceMotion) {
    target.textContent = phrases[0];
    return;
  }
  let i = 0;
  let chars = 0;
  let deleting = false;
  const tick = () => {
    const phrase = phrases[i];
    chars += deleting ? -1 : 1;
    target.textContent = phrase.slice(0, chars);
    let delay = deleting ? 28 : 55;
    if (!deleting && chars === phrase.length) {
      deleting = true;
      delay = 1800; // pause sur la phrase complète
    } else if (deleting && chars === 0) {
      deleting = false;
      i = (i + 1) % phrases.length;
      delay = 350;
    }
    setTimeout(tick, delay);
  };
  tick();
}

/* ---------- Terminal « live » de l'accueil ---------- */

const LOG_LINES = [
  ['outbox', '→ dist.api.event.souscription.created', 'publié'],
  ['engine', '← dist.engine.in · workflow #4821', 'démarré'],
  ['http', 'GET /dist/fonds/42 · JWT interne', '200 · 38 ms'],
  ['notif', 'email de confirmation → Brevo', 'envoyé'],
  ['perm', '→ permission.events · compte 1187', 'cache invalidé'],
  ['pe', '→ private_equity · fonds.updated', 'publié'],
  ['retry', 'dist.engine.in · tentative 2/3', 'backoff 2 s'],
  ['outbox', 'rejeu #a91f depuis outbox-viewer', 'traité ✓'],
  ['http', 'POST /ged/documents · RIB-BIS', '201 · 54 ms'],
  ['legacy', '→ legacy.api.event.investisseur.synced', 'mappé'],
];

const logList = $('#terminal-log');
let logIndex = 0;

function addLogLine(animate = true) {
  if (!logList) return;
  const [tag, message, result] = LOG_LINES[logIndex % LOG_LINES.length];
  logIndex++;
  const time = new Date().toLocaleTimeString('fr-FR');
  const line = el('li', { class: `log log--${tag}${animate ? ' log--new' : ''}` }, [
    el('span', { class: 'log-time', text: time }),
    el('span', { class: 'log-tag', text: tag }),
    el('span', { class: 'log-msg', text: message }),
    el('span', { class: 'log-res', text: result }),
  ]);
  logList.append(line);
  while (logList.children.length > 7) logList.firstElementChild.remove();
}

for (let i = 0; i < 5; i++) addLogLine(false);
if (!reduceMotion) setInterval(() => !document.hidden && addLogLine(), 1700);

/* ---------- Chiffres qui comptent ---------- */

// « 6 000+ » → compte jusqu'à 6000 puis réaffiche le texte d'origine
function countUp(node) {
  const original = node.dataset.count;
  const target = parseInt(original.replace(/\s/g, ''), 10);
  if (!target || reduceMotion) return;
  const suffix = original.replace(/^[\d\s]+/, '');
  const start = performance.now();
  const duration = 1400;
  const frame = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const value = Math.round(target * (1 - Math.pow(1 - p, 3)));
    node.textContent = value.toLocaleString('fr-FR') + suffix;
    if (p < 1) requestAnimationFrame(frame);
    else node.textContent = original;
  };
  requestAnimationFrame(frame);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('[data-count]').forEach(countUp);
    countObserver.unobserve(entry.target);
  });
}, { threshold: 0.4 });
if ($('#hero-stats')) countObserver.observe($('#hero-stats'));

/* ---------- Halo qui suit la souris + légère inclinaison 3D des cartes ---------- */

if (finePointer && !reduceMotion) {
  document.addEventListener('pointermove', (event) => {
    const card = event.target.closest('.card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);
    if (card.matches('.project, .team-item')) {
      card.style.setProperty('--ry', `${((x / rect.width) - 0.5) * 6}deg`);
      card.style.setProperty('--rx', `${(0.5 - (y / rect.height)) * 6}deg`);
    }
  });
  document.addEventListener('pointerout', (event) => {
    const card = event.target.closest('.card');
    if (card && !card.contains(event.relatedTarget)) {
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    }
  });
}

$('#year').textContent = new Date().getFullYear();
loadData();
