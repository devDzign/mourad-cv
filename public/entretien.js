/* =============================================================================
 * Page « Préparer mon entretien » : thème, rendu depuis /api/entretien et
 * /api/profile, pitch modifiable et chronométré, histoires STAR avec notes,
 * questions filtrables, mode entraînement noté, checklist, et rubrique
 * « entretien annuel » (réplique modifiable, bilan 2026, objections).
 * Tout ce qui est personnel (pitch réécrit, notes, scores, cases cochées)
 * reste dans localStorage, préfixe « ent: ».
 * ===========================================================================*/

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ----- Thème clair / sombre (même clé que le portfolio) -----
const themeBtn = $('#theme-toggle');
const isDark = () =>
  document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('theme', next, true);
});

// ----- Stockage local tolérant (navigation privée, quota…) -----
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key.startsWith('theme') ? key : `ent:${key}`);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, value, rawKey = false) {
    try { localStorage.setItem(rawKey ? key : `ent:${key}`, rawKey ? value : JSON.stringify(value)); } catch (e) { /* stockage indisponible */ }
  },
  del(key) {
    try { localStorage.removeItem(`ent:${key}`); } catch (e) { /* stockage indisponible */ }
  },
};

// ----- Apparition des sections au défilement -----
const observer = new IntersectionObserver(
  (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visible'); observer.unobserve(en.target); } }),
  { threshold: 0.08 }
);
$$('.reveal').forEach((el) => observer.observe(el));

// ----- Petit utilitaire de création d'éléments -----
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const words = (t) => (t.trim().match(/\S+/g) || []).length;
// Le pitch est écrit en Markdown minimal : **gras** et paragraphes séparés par une ligne vide
const mdToHtml = (t) => t.split(/\n\s*\n/).map((p) => `<p>${p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`).join('');

/* =========================================================================
 * Rendu
 * =======================================================================*/

let DATA = null;

async function init() {
  const [entretien, profile] = await Promise.all([
    fetch('/api/entretien').then((r) => r.json()),
    fetch('/api/profile').then((r) => r.json()),
  ]);
  DATA = entretien;
  $('#year').textContent = new Date().getFullYear();
  $('#footer-name').textContent = profile.name || '';

  renderPostes(entretien.cible.postes);
  renderFilRouge(entretien.cible, profile.stats || []);
  renderPitch(entretien.pitch);
  renderParcours(profile.timeline || [], profile.philosophy || []);
  renderStories(entretien.histoires);
  renderQuestions(entretien.questions);
  renderTraining(entretien.questions);
  renderAsks(entretien.mes_questions);
  renderChecklist(entretien.checklist);
  if (entretien.entretien_annuel) renderAnnuel(entretien.entretien_annuel);
}

// Poste visé : change le titre, mémorisé
function renderPostes(postes) {
  const root = $('#ent-postes');
  const current = store.get('poste', postes[0]);
  const apply = (p) => {
    $('#ent-poste').textContent = p;
    $$('button', root).forEach((b) => b.setAttribute('aria-pressed', b.textContent === p));
    store.set('poste', p);
  };
  postes.forEach((p) => root.append(el('button', { type: 'button', text: p, onclick: () => apply(p) })));
  apply(postes.includes(current) ? current : postes[0]);
}

function renderFilRouge(cible, stats) {
  $('#ent-fil').textContent = cible.fil_rouge;
  const colors = ['var(--violet)', 'var(--pink)', 'var(--orange)'];
  const preuves = $('#ent-preuves');
  cible.trois_preuves.forEach((p, i) => preuves.append(el('div', { class: 'card', style: `--c:${colors[i % 3]}` }, [el('b', { text: p.titre }), el('p', { text: p.texte })])));
  const st = $('#ent-stats');
  stats.forEach((s) => st.append(el('div', { class: 'ent-stat' }, [el('b', { text: s.value }), el('span', { text: s.label })])));
}

/* ---------- Pitch : onglets, édition, jauge, chrono ---------- */
const TARGET = { '30s': 30, '2min': 120, '5min': 300 };

function renderPitch(pitch) {
  const editor = $('#ent-pitch-text');
  const meter = $('#ent-meter');
  let current = store.get('pitch-tab', '30s');

  const load = () => {
    const saved = store.get(`pitch:${current}`, null);
    editor.innerHTML = mdToHtml(saved ?? pitch[current]);
    $$('.ent-tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.pitch === current));
    $('#ent-timer-hint').textContent = `Objectif : ${fmt(TARGET[current])}. Lancez le chrono et lisez à voix haute.`;
    timer.reset();
    updateMeter();
  };

  const updateMeter = () => {
    const n = words(editor.innerText);
    const ideal = Math.round(TARGET[current] * 150 / 60);
    const estimate = Math.round(n / 150 * 60);
    meter.textContent = `${n} mots · ≈ ${fmt(estimate)} à 150 mots/min (cible ≈ ${ideal} mots)`;
    const ratio = n / ideal;
    meter.className = 'ent-meter ' + (ratio > 1.15 || ratio < 0.7 ? 'is-warn' : 'is-ok');
  };

  $$('.ent-tab').forEach((t) => t.addEventListener('click', () => { current = t.dataset.pitch; store.set('pitch-tab', current); load(); }));

  // Sauvegarde du texte modifié (en texte brut, on perd le gras : acceptable)
  let saveTimer;
  editor.addEventListener('input', () => {
    updateMeter();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(`pitch:${current}`, editor.innerText), 400);
  });
  // Collage en texte brut pour ne pas importer de styles
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text'));
  });

  $('#ent-pitch-reset').addEventListener('click', () => {
    if (store.get(`pitch:${current}`, null) === null || confirm('Revenir au texte d\'origine ? Vos modifications de ce pitch seront perdues.')) {
      store.del(`pitch:${current}`);
      load();
    }
  });

  // Chrono circulaire
  const timer = makeTimer({
    valueEl: $('#ent-timer-value'),
    ringEl: $('#ent-ring'),
    target: () => TARGET[current],
    onStop: (elapsed) => {
      const target = TARGET[current];
      const diff = elapsed - target;
      const n = words(editor.innerText);
      // En dessous de 10 s, le débit n'a pas de sens (on a sans doute juste testé le bouton)
      if (elapsed < 10) { $('#ent-timer-result').textContent = `${fmt(elapsed)} · trop court pour mesurer un débit.`; return; }
      const rate = Math.round(n / elapsed * 60);
      let verdict;
      if (Math.abs(diff) <= target * 0.1) verdict = 'Dans les temps.';
      else if (diff > 0) verdict = `${fmt(diff)} de trop : coupez ou accélérez.`;
      else verdict = `${fmt(-diff)} d'avance : respirez, ou ajoutez une preuve.`;
      $('#ent-timer-result').textContent = `${fmt(elapsed)} · ${rate} mots/min · ${verdict}`;
    },
  });
  $('#ent-timer-start').addEventListener('click', timer.start);
  $('#ent-timer-stop').addEventListener('click', timer.stop);
  $('#ent-timer-reset').addEventListener('click', () => { timer.reset(); $('#ent-timer-result').textContent = ''; });

  load();
}

// Chrono réutilisable : compte les secondes, remplit un anneau, signale le dépassement
function makeTimer({ valueEl, ringEl, target, onStop, countdown = false }) {
  let start = 0, raf = 0, elapsed = 0, running = false;
  const startBtn = $('#ent-timer-start'), stopBtn = $('#ent-timer-stop');
  const paint = () => {
    const t = target();
    const shown = countdown ? Math.max(0, t - elapsed) : elapsed;
    valueEl.textContent = fmt(shown);
    if (ringEl) {
      ringEl.style.setProperty('--p', Math.min(100, elapsed / t * 100));
      ringEl.classList.toggle('is-over', elapsed > t);
    }
    valueEl.classList.toggle('is-over', elapsed > t);
  };
  const tick = () => {
    elapsed = Math.floor((performance.now() - start) / 1000);
    paint();
    if (running) raf = requestAnimationFrame(tick);
  };
  const api = {
    start() {
      if (running) return;
      running = true;
      start = performance.now() - elapsed * 1000;
      if (startBtn && ringEl) { startBtn.disabled = true; stopBtn.disabled = false; }
      raf = requestAnimationFrame(tick);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      if (startBtn && ringEl) { startBtn.disabled = false; stopBtn.disabled = true; }
      onStop && onStop(elapsed);
    },
    reset() {
      running = false;
      cancelAnimationFrame(raf);
      elapsed = 0;
      if (startBtn && ringEl) { startBtn.disabled = false; stopBtn.disabled = true; }
      paint();
    },
    get elapsed() { return elapsed; },
  };
  paint();
  return api;
}

/* ---------- Parcours et principes (depuis /api/profile) ---------- */
function renderParcours(timeline, philosophy) {
  const tl = $('#ent-timeline');
  timeline.forEach((t) => tl.append(el('li', {}, [el('time', { text: t.date }), el('div', { class: 'card' }, [el('b', { text: t.title }), el('p', { text: t.text })])])));
  const pr = $('#ent-principes');
  philosophy.forEach((p) => pr.append(el('div', { class: 'card' }, [el('q', { text: p.quote }), el('p', { text: p.text })])));
}

/* ---------- Histoires STAR ---------- */
function renderStories(stories) {
  const root = $('#ent-stories');
  const letters = [['S', 'situation', 'var(--violet)'], ['T', 'tache', '#0ea5e9'], ['A', 'action', 'var(--pink)'], ['R', 'resultat', 'var(--green)']];
  stories.forEach((s) => {
    const note = el('textarea', { class: 'ent-note', placeholder: 'Ma note : chiffre à retenir, phrase d\'accroche, piège à éviter…', 'aria-label': `Note personnelle pour « ${s.titre} »` });
    note.value = store.get(`note:${s.id}`, '');
    note.addEventListener('input', () => store.set(`note:${s.id}`, note.value));
    root.append(el('article', { class: 'card ent-story' }, [
      el('div', { class: 'ent-story-head' }, [el('h3', { text: s.titre }), ...s.tags.map((t) => el('span', { class: 'ent-tag', text: t }))]),
      el('p', { class: 'ent-story-q', text: `« ${s.question} »` }),
      el('dl', { class: 'ent-star' }, letters.map(([l, key, c]) => el('div', { style: `--c:${c}` }, [el('dt', { text: l, title: key }), el('dd', { text: s[key] })]))),
      note,
    ]));
  });
}

/* ---------- Questions probables ---------- */
function renderQuestions(questions) {
  const cats = [...new Set(questions.map((q) => q.cat))];
  const filters = $('#ent-filters');
  const root = $('#ent-questions');
  let active = 'Toutes';
  const draw = () => {
    root.innerHTML = '';
    questions.forEach((q, i) => {
      if (active !== 'Toutes' && q.cat !== active) return;
      const rate = store.get(`rate:${i}`, 0);
      root.append(el('details', { class: 'card ent-q' }, [
        el('summary', {}, [el('span', { class: 'ent-dot', 'data-rate': rate, title: ['Jamais entraînée', 'À retravailler', 'Correct', 'Solide'][rate] }), el('span', { text: q.q }), el('span', { class: 'ent-q-cat', text: q.cat })]),
        el('ul', {}, q.cles.map((c) => el('li', { text: c }))),
      ]));
    });
  };
  ['Toutes', ...cats].forEach((c) => filters.append(el('button', { type: 'button', text: c, 'aria-pressed': c === active, onclick: () => { active = c; $$('button', filters).forEach((b) => b.setAttribute('aria-pressed', b.textContent === c)); draw(); } })));
  draw();
  document.addEventListener('ent:rated', draw);
}

/* ---------- Mode entraînement ---------- */
function renderTraining(questions) {
  const qEl = $('#ent-train-q'), catEl = $('#ent-train-cat'), keys = $('#ent-train-keys'), keysList = $('#ent-train-keys-list');
  const nextBtn = $('#ent-train-next'), goBtn = $('#ent-train-go'), rate = $('#ent-rate'), progress = $('#ent-train-progress');
  const timerEl = $('#ent-train-timer');
  let current = -1, running = false, raf = 0, start = 0;

  const stopTimer = () => { running = false; cancelAnimationFrame(raf); };
  const tick = () => {
    const elapsed = Math.floor((performance.now() - start) / 1000);
    const left = 120 - elapsed;
    timerEl.textContent = fmt(Math.max(0, left));
    timerEl.classList.toggle('is-over', left < 0);
    if (left <= 0) { timerEl.textContent = 'Temps !'; stopTimer(); rate.hidden = false; return; }
    if (running) raf = requestAnimationFrame(tick);
  };

  // Tirage pondéré : une question mal notée (ou jamais vue) revient plus souvent
  const pick = () => {
    const weights = questions.map((_, i) => ({ 0: 3, 1: 4, 2: 2, 3: 1 })[store.get(`rate:${i}`, 0)]);
    if (current >= 0) weights[current] = 0;
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    return weights.findIndex((w) => (r -= w) < 0);
  };

  const showProgress = () => {
    const rated = questions.map((_, i) => store.get(`rate:${i}`, 0));
    const seen = rated.filter(Boolean).length;
    const solid = rated.filter((r) => r === 3).length;
    const weak = rated.filter((r) => r === 1).length;
    progress.textContent = seen
      ? `${seen} / ${questions.length} questions travaillées · ${solid} solides · ${weak} à retravailler`
      : 'Aucune question travaillée pour l\'instant.';
  };

  nextBtn.addEventListener('click', () => {
    stopTimer();
    current = pick();
    const q = questions[current];
    qEl.textContent = q.q;
    catEl.textContent = q.cat;
    keysList.innerHTML = '';
    q.cles.forEach((c) => keysList.append(el('li', { text: c })));
    keys.hidden = false;
    keys.open = false;
    rate.hidden = true;
    timerEl.textContent = '2:00';
    timerEl.classList.remove('is-over');
    goBtn.disabled = false;
    nextBtn.textContent = 'Autre question';
  });

  goBtn.addEventListener('click', () => {
    if (running) { stopTimer(); rate.hidden = false; goBtn.textContent = 'Lancer 2 min'; return; }
    running = true;
    start = performance.now();
    goBtn.textContent = 'J\'ai fini';
    rate.hidden = true;
    raf = requestAnimationFrame(tick);
  });

  $$('.ent-rate-btn').forEach((b) => b.addEventListener('click', () => {
    if (current < 0) return;
    store.set(`rate:${current}`, Number(b.dataset.rate));
    rate.hidden = true;
    goBtn.textContent = 'Lancer 2 min';
    showProgress();
    document.dispatchEvent(new Event('ent:rated'));
  }));

  showProgress();
}

/* ---------- Mes questions ---------- */
function renderAsks(asks) {
  const root = $('#ent-asks');
  asks.forEach((a) => root.append(el('li', {}, el('span', { text: a }))));
}

/* ---------- Checklist ---------- */
function renderChecklist(items) {
  const root = $('#ent-check-list');
  const score = $('#ent-check-score');
  const state = store.get('check', {});
  const update = () => {
    const done = Object.values(state).filter(Boolean).length;
    score.textContent = done === items.length ? `${done} / ${items.length} · prêt.` : `${done} / ${items.length}`;
    store.set('check', state);
  };
  items.forEach((label, i) => {
    const input = el('input', { type: 'checkbox' });
    input.checked = !!state[i];
    input.addEventListener('change', () => { state[i] = input.checked; update(); });
    root.append(el('li', {}, el('label', {}, [input, el('span', { text: label })])));
  });
  $('#ent-check-reset').addEventListener('click', () => {
    Object.keys(state).forEach((k) => { state[k] = false; });
    $$('input', root).forEach((c) => { c.checked = false; });
    update();
  });
  update();
}

/* ---------- Entretien annuel : demande d'augmentation ---------- */
function renderAnnuel(a) {
  $('#ent-annuel-titre').textContent = a.titre;
  $('#ent-annuel-objectif').textContent = a.objectif;
  $('#ent-annuel-demande').textContent = a.demande;

  // Réplique modifiable, gardée dans ce navigateur (même mécanique que le pitch)
  const editor = $('#ent-annuel-text');
  const meter = $('#ent-annuel-meter');
  const updateMeter = () => {
    const n = words(editor.innerText);
    meter.textContent = `${n} mots · ≈ ${fmt(Math.round(n / 150 * 60))} à voix haute`;
    meter.className = 'ent-meter ' + (editor.innerText.includes('[X]') ? 'is-warn' : 'is-ok');
  };
  const load = () => { editor.innerHTML = mdToHtml(store.get('annuel:replique', null) ?? a.replique); updateMeter(); };
  let saveTimer;
  editor.addEventListener('input', () => { updateMeter(); clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set('annuel:replique', editor.innerText), 400); });
  editor.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text')); });
  $('#ent-annuel-reset').addEventListener('click', () => {
    if (store.get('annuel:replique', null) === null || confirm('Revenir au texte d\'origine ? Vos modifications seront perdues.')) { store.del('annuel:replique'); load(); }
  });
  load();

  const chiffres = $('#ent-annuel-chiffres');
  a.chiffres.forEach((c) => chiffres.append(el('div', { class: 'ent-stat' }, [el('b', { text: c.valeur }), el('span', { text: c.label })])));

  const colors = ['var(--violet)', 'var(--pink)', 'var(--orange)', '#0ea5e9', 'var(--green)'];
  const bilan = $('#ent-annuel-bilan');
  a.bilan.forEach((b, i) => bilan.append(el('article', { class: 'card ent-bilan-item', style: `--c:${colors[i % colors.length]}` }, [
    el('span', { class: 'ent-bilan-num', text: String(i + 1).padStart(2, '0') }),
    el('b', { text: b.titre }),
    el('p', { text: b.texte }),
    el('p', { class: 'ent-bilan-preuve', text: b.preuve }),
  ])));

  const args = $('#ent-annuel-args');
  a.arguments.forEach((p, i) => args.append(el('div', { class: 'card', style: `--c:${colors[i % 3]}` }, [el('b', { text: p.titre }), el('p', { text: p.texte })])));

  if (a.marche) {
    $('#ent-annuel-marche-intro').textContent = a.marche.intro;
    $('#ent-annuel-marche-cible').textContent = a.marche.cible;
    const gr = $('#ent-annuel-grilles');
    a.marche.grilles.forEach((g) => gr.append(el('li', {}, [el('b', { text: g.valeur }), el('span', { text: g.source })])));
    const of = $('#ent-annuel-offres');
    a.marche.offres.forEach((o) => of.append(el('li', {}, [
      el('b', { text: o.salaire }),
      el('span', {}, [el('a', { href: o.url, target: '_blank', rel: 'noopener', text: o.poste }), ` · ${o.entreprise}`]),
    ])));
  }

  const obj = $('#ent-annuel-objections');
  a.objections.forEach((o) => obj.append(el('details', { class: 'card ent-q ent-obj' }, [
    el('summary', {}, [el('span', { class: 'ent-dot', 'data-rate': 1 }), el('span', { text: `« ${o.objection} »` }), el('span', { class: 'ent-q-cat', text: 'Réponse' })]),
    el('p', { text: o.reponse }),
  ])));

  const der = $('#ent-annuel-deroule');
  a.deroule.forEach((d) => der.append(el('li', {}, [el('b', { text: d.etape }), el('span', { text: d.texte })])));
  const alt = $('#ent-annuel-alt');
  a.alternatives.forEach((t) => alt.append(el('li', {}, el('span', { text: t }))));

  // Liste de préparation cochable, gardée sous ent:annuel:check
  const root = $('#ent-annuel-check'), score = $('#ent-annuel-check-score');
  const state = store.get('annuel:check', {});
  const update = () => {
    const done = Object.values(state).filter(Boolean).length;
    score.textContent = done === a.preparer.length ? `${done} / ${a.preparer.length} · prêt.` : `${done} / ${a.preparer.length}`;
    store.set('annuel:check', state);
  };
  a.preparer.forEach((label, i) => {
    const input = el('input', { type: 'checkbox' });
    input.checked = !!state[i];
    input.addEventListener('change', () => { state[i] = input.checked; update(); });
    root.append(el('li', {}, el('label', {}, [input, el('span', { text: label })])));
  });
  $('#ent-annuel-check-reset').addEventListener('click', () => { Object.keys(state).forEach((k) => { state[k] = false; }); $$('input', root).forEach((c) => { c.checked = false; }); update(); });
  update();
}

// Impression : on déplie toutes les questions pour l'antisèche, puis on les referme
$('#ent-print').addEventListener('click', () => {
  const closed = $$('.ent-q:not([open])');
  closed.forEach((d) => { d.open = true; });
  window.print();
  closed.forEach((d) => { d.open = false; });
});

init().catch((err) => {
  console.error(err);
  $('#ent-fil').textContent = 'Impossible de charger le contenu. Le serveur est-il lancé ?';
});
