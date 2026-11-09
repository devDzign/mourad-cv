/* =============================================================================
 * Page « Offres à matcher » : thème, lecture de /api/offres, filtres, cartes
 * avec score, fenêtre de candidature (message modifiable, copie, mailto,
 * statut). Statuts, messages retouchés et offres déjà vues restent dans
 * localStorage, préfixe « off: ».
 * ===========================================================================*/

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ----- Thème clair / sombre (même clé que le portfolio) -----
const isDark = () =>
  document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
$('#theme-toggle').addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) { /* stockage indisponible */ }
});
$('#year').textContent = new Date().getFullYear();

// ----- Stockage local tolérant -----
const store = {
  get(key, fallback) { try { const r = localStorage.getItem(`off:${key}`); return r === null ? fallback : JSON.parse(r); } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(`off:${key}`, JSON.stringify(value)); } catch (e) { /* stockage indisponible */ } },
  del(key) { try { localStorage.removeItem(`off:${key}`); } catch (e) { /* stockage indisponible */ } },
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'date inconnue');
const COLORS = { Postuler: 'var(--green)', 'À étudier': 'var(--orange)', 'Peu adapté': 'var(--error)' };

/* =========================================================================
 * Chargement et rendu de la liste
 * =======================================================================*/

let DATA = null;
const filters = { verdict: '', ville: '', onlyNew: false, hideDone: true };
// Offres déjà vues lors d'une visite précédente : tout ce qui n'y est pas est « nouveau pour moi »
const seenBefore = new Set(store.get('seen', []));

async function load(refresh = false) {
  const summary = $('#off-summary');
  summary.innerHTML = '';
  summary.append(el('span', { class: 'off-pill off-pill-loading', text: refresh ? 'Relecture du dépôt GitHub…' : 'Lecture du dépôt…' }));
  try {
    const res = await fetch(`/api/offres${refresh ? '?refresh=1' : ''}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    DATA = data;
    $('#off-source-link').href = data.source.url;
    buildVilleFilter();
    render();
    store.set('seen', [...new Set([...seenBefore, ...data.offres.map((o) => o.id)])]);
  } catch (err) {
    summary.innerHTML = '';
    summary.append(el('span', { class: 'off-pill off-pill-error', text: `Offres indisponibles : ${err.message}` }));
  }
}

function buildVilleFilter() {
  const root = $('#off-filter-ville');
  root.innerHTML = '';
  const villes = [...new Set(DATA.offres.map((o) => o.ville).filter(Boolean))];
  [['', 'Toutes villes'], ...villes.map((v) => [v, v])].forEach(([val, label]) => {
    root.append(el('button', { type: 'button', text: label, 'aria-pressed': filters.ville === val, onclick: () => { filters.ville = val; render(); } }));
  });
}

function visible(o) {
  const status = store.get(`status:${o.id}`, '');
  if (filters.hideDone && status) return false;
  if (filters.verdict && o.analyse.verdict !== filters.verdict) return false;
  if (filters.ville && o.ville !== filters.ville) return false;
  if (filters.onlyNew && !(o.nouveau || !seenBefore.has(o.id))) return false;
  return true;
}

function render() {
  const list = $('#off-list');
  list.innerHTML = '';
  $$('#off-filter-verdict button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.verdict === filters.verdict));
  $$('#off-filter-ville button').forEach((b) => b.setAttribute('aria-pressed', (b.textContent === 'Toutes villes' ? '' : b.textContent) === filters.ville));

  const all = DATA.offres;
  const shown = all.filter(visible);
  const summary = $('#off-summary');
  summary.innerHTML = '';
  const nNew = all.filter((o) => o.nouveau || !seenBefore.has(o.id)).length;
  const nGo = all.filter((o) => o.analyse.verdict === 'Postuler').length;
  const nSent = all.filter((o) => store.get(`status:${o.id}`, '') === 'envoye').length;
  [
    [`${all.length}`, 'offres lues'],
    [`${nGo}`, 'à postuler'],
    [`${nNew}`, 'nouvelles'],
    [`${nSent}`, 'candidatures envoyées'],
    [dateFr(DATA.lu_le), DATA.cache ? '(cache)' : '(dépôt relu)'],
  ].forEach(([b, t]) => summary.append(el('span', { class: 'off-pill' }, [el('b', { text: b }), ` ${t}`])));

  if (!shown.length) {
    list.append(el('p', { class: 'off-empty', text: 'Aucune offre ne correspond à ces filtres.' }));
    return;
  }
  shown.forEach((o) => list.append(card(o)));
}

function card(o) {
  const a = o.analyse;
  const status = store.get(`status:${o.id}`, '');
  const firstSeen = !seenBefore.has(o.id);
  const badges = [];
  if (o.nouveau) badges.push(el('span', { class: 'off-badge off-badge-new', text: 'New' }));
  if (firstSeen && !o.nouveau) badges.push(el('span', { class: 'off-badge off-badge-first', text: 'Nouvelle pour moi' }));
  if (status === 'envoye') badges.push(el('span', { class: 'off-badge off-badge-status', text: 'Envoyée' }));
  if (status === 'ignore') badges.push(el('span', { class: 'off-badge off-badge-ignore', text: 'Écartée' }));

  const tags = a.atouts.slice(0, 6).map((x) => el('li', { class: 'off-tag', text: x.label }));
  if (a.atouts.length > 6) tags.push(el('li', { class: 'off-tag off-tag-more', text: `+${a.atouts.length - 6}` }));
  a.manques.slice(0, 3).forEach((x) => tags.push(el('li', { class: 'off-tag off-tag-ko', text: x.label })));

  return el('article', { class: 'card off-card', 'data-status': status }, [
    el('div', { class: 'off-score', style: `--p:${a.score};--c:${COLORS[a.verdict]}`, title: `Score ${a.score} / 100` }, [el('b', { text: a.score }), el('small', { text: a.verdict })]),
    el('div', { class: 'off-body' }, [
      el('h2', {}, [el('span', { text: o.poste }), ...badges]),
      el('p', { class: 'off-company', text: `${o.entreprise}${o.domaine ? ' · ' + o.domaine : ''}` }),
      el('ul', { class: 'off-meta' }, [
        el('li', { 'data-ico': '📍', text: o.remote ? `${o.ville} · full remote` : (o.lieu || o.ville) }),
        o.salaire ? el('li', { 'data-ico': '💶', text: o.salaire }) : null,
        el('li', { 'data-ico': '🕒', text: `fiche mise à jour le ${dateFr(o.maj)}` }),
        o.postes.length > 1 ? el('li', { 'data-ico': '👥', text: `${o.postes.length} postes` }) : null,
      ]),
      el('ul', { class: 'off-tags' }, tags),
      o.stack ? el('p', { class: 'off-stack', text: o.stack.length > 160 ? o.stack.slice(0, 157) + '…' : o.stack }) : null,
    ]),
    el('div', { class: 'off-actions' }, [
      el('button', { type: 'button', class: 'btn btn-primary', text: 'Préparer ma candidature', onclick: () => openModal(o) }),
      el('a', { class: 'btn btn-ghost', href: o.url, target: '_blank', rel: 'noopener', text: "Voir l'annonce" }),
    ]),
  ]);
}

/* =========================================================================
 * Fenêtre de candidature
 * =======================================================================*/

const modal = $('#off-modal');
let current = null;

function openModal(o) {
  current = o;
  $('#off-modal-kicker').textContent = `${o.entreprise} · ${o.ville}${o.remote ? ' · full remote' : ''} · score ${o.analyse.score}`;
  $('#off-modal-title').textContent = o.poste;
  const fill = (sel, items) => { const ul = $(sel); ul.innerHTML = ''; items.forEach((t) => ul.append(el('li', { text: t }))); };
  fill('#off-modal-atouts', o.analyse.atouts.map((x) => `${x.label} (${x.mots.join(', ')})`));
  fill('#off-modal-manques', o.analyse.manques.map((x) => `${x.label} (${x.mots.join(', ')})`));
  fill('#off-modal-notes', o.analyse.notes);
  fill('#off-modal-profil', o.profil.length ? o.profil : o.missions);
  const msg = $('#off-msg');
  msg.value = store.get(`msg:${o.id}`, null) ?? o.message;
  $('#off-saved').textContent = store.get(`msg:${o.id}`, null) ? 'Version retouchée' : 'Brouillon généré';
  $('#off-open').href = o.url;
  updateMailto();
  $$('.off-status-btn').forEach((b) => b.setAttribute('aria-pressed', b.dataset.status === store.get(`status:${o.id}`, '')));
  modal.showModal();
}

function updateMailto() {
  const text = $('#off-msg').value;
  const [first, ...rest] = text.split('\n');
  const subject = first.replace(/^Objet\s*:\s*/i, '');
  const body = rest.join('\n').replace(/^\n+/, '');
  $('#off-mailto').href = `mailto:${DATA.source.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

let saveTimer;
$('#off-msg').addEventListener('input', () => {
  if (!current) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { store.set(`msg:${current.id}`, $('#off-msg').value); $('#off-saved').textContent = 'Version retouchée, enregistrée'; }, 400);
  updateMailto();
});

$('#off-msg-reset').addEventListener('click', () => {
  if (!current) return;
  if (store.get(`msg:${current.id}`, null) === null || confirm('Revenir au brouillon généré ? Vos retouches seront perdues.')) {
    store.del(`msg:${current.id}`);
    $('#off-msg').value = current.message;
    $('#off-saved').textContent = 'Brouillon généré';
    updateMailto();
  }
});

$('#off-copy').addEventListener('click', async () => {
  const btn = $('#off-copy');
  try {
    await navigator.clipboard.writeText($('#off-msg').value);
    btn.textContent = 'Copié !';
  } catch (e) {
    $('#off-msg').select();
    document.execCommand('copy');
    btn.textContent = 'Copié !';
  }
  setTimeout(() => { btn.textContent = 'Copier le message'; }, 1600);
});

$$('.off-status-btn').forEach((b) => b.addEventListener('click', () => {
  if (!current) return;
  if (b.dataset.status) store.set(`status:${current.id}`, b.dataset.status); else store.del(`status:${current.id}`);
  $$('.off-status-btn').forEach((x) => x.setAttribute('aria-pressed', x === b));
  render();
}));

$('#off-modal-close').addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

/* ---------- Filtres ---------- */
$$('#off-filter-verdict button').forEach((b) => b.addEventListener('click', () => { filters.verdict = b.dataset.verdict; render(); }));
$('#off-only-new').addEventListener('change', (e) => { filters.onlyNew = e.target.checked; render(); });
$('#off-hide-done').addEventListener('change', (e) => { filters.hideDone = e.target.checked; render(); });
$('#off-refresh').addEventListener('click', () => load(true));

load();
