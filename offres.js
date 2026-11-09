/* =============================================================================
 * Offres d'emploi : lecture d'un job board GitHub (un README qui liste les
 * offres par ville + une fiche Markdown par entreprise), analyse de chaque
 * fiche, score d'adéquation avec le profil et brouillon de candidature.
 *
 * Réglages dans data/offres.json : dépôt source, compétences et poids,
 * compétences non maîtrisées (écarts), textes du message.
 * Le dépôt est lu via l'API GitHub publique (60 requêtes / heure sans jeton,
 * d'où le cache en mémoire ; GITHUB_TOKEN relève la limite si défini).
 * ===========================================================================*/

const fs = require('fs/promises');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'data', 'offres.json');
const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');

let cache = { at: 0, key: '', data: null };

/* ---------- Lecture GitHub ---------- */

function ghHeaders() {
  const h = { 'User-Agent': 'mourad-dev-portfolio', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function ghJson(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub ${res.status} sur ${url}`);
  return res.json();
}

async function ghRaw(repo, branch, file) {
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/${file}`, { headers: { 'User-Agent': 'mourad-dev-portfolio' } });
  if (!res.ok) throw new Error(`GitHub ${res.status} sur ${file}`);
  return res.text();
}

/* ---------- Analyse du README : offres par ville ---------- */

// Le README liste, sous des titres « ## Ville : », des puces « - [ENTREPRISE](FICHIER.md) »
// suivies de sous-puces avec l'intitulé du poste. « NEW » marque une offre récente, 🏠 le full remote.
function parseReadme(md) {
  const offres = [];
  let ville = '';
  let current = null;
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\t/g, '  ');
    const h = line.match(/^##\s+(.+?)\s*:?\s*$/);
    if (h) { ville = h[1].trim(); current = null; continue; }
    const link = line.match(/^-\s+\[([^\]]+)\]\(([^)]+\.md)\)/);
    if (link) {
      current = { entreprise: link[1].trim(), fichier: link[2].trim(), ville, postes: [], remote: /🏠/.test(line) };
      offres.push(current);
      continue;
    }
    const sub = line.match(/^\s+-\s+(.+)$/);
    if (sub && current) {
      const txt = sub[1].replace(/\*\*/g, '').trim();
      const isNew = /\bNEW\b/i.test(txt);
      current.postes.push({ titre: txt.replace(/\s*\bNEW\b\s*/gi, ' ').replace(/\s+/g, ' ').trim(), nouveau: isNew });
      if (/🏠/.test(txt)) current.remote = true;
    }
  }
  return offres.filter((o) => !/freelance|mission/i.test(o.ville));
}

/* ---------- Analyse d'une fiche entreprise ---------- */

const clean = (s) => s.replace(/\*\*/g, '').replace(/<[^>]+>/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();

function field(md, label) {
  const re = new RegExp(`\\*\\*${label}\\s*:?\\s*\\*\\*\\s*:?\\s*(.+)`, 'i');
  const m = md.match(re);
  return m ? clean(m[1]) : '';
}

// Bloc de texte qui suit un titre (« **Stack** », « ## Missions »…) jusqu'au titre suivant
function block(md, labels) {
  const lines = md.split('\n');
  const isHeading = (l) => /^#{1,6}\s/.test(l) || /^\s*\*\*[^*]+\*\*\s*:?\s*$/.test(l) || /^-{3,}$/.test(l.trim());
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    const head = l.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\s*:$/, '').trim().toLowerCase();
    if (!isHeading(l) || !labels.some((lab) => head === lab || head.startsWith(lab))) continue;
    const out = [];
    for (let j = i + 1; j < lines.length && !isHeading(lines[j].trim()); j++) {
      const t = clean(lines[j].replace(/^\s*[-*]\s+/, '• '));
      if (t) out.push(t);
    }
    return out;
  }
  return [];
}

function parseFiche(md, meta) {
  const h1 = (md.match(/^#\s+(.+)$/m) || [])[1];
  const titres = [...md.matchAll(/^##\s+(.+)$/gm)].map((m) => clean(m[1])).filter((t) => !/^(stack|défis|defis|profil|missions|salaire|pourquoi|comment|facts)/i.test(t));
  return {
    id: meta.fichier.replace(/\.md$/i, '').toLowerCase(),
    entreprise: h1 ? clean(h1) : meta.entreprise,
    poste: meta.postes[0]?.titre || titres[0] || 'Poste non précisé',
    postes: meta.postes.map((p) => p.titre),
    nouveau: meta.postes.some((p) => p.nouveau),
    ville: meta.ville,
    remote: meta.remote,
    domaine: field(md, 'Domaine'),
    lieu: field(md, 'Où'),
    quoi: field(md, 'Quoi'),
    stack: block(md, ['stack']).join(' · ').replace(/• /g, ''),
    missions: block(md, ['missions', 'concrètement', 'vos missions']).map((l) => l.replace(/^• /, '')),
    profil: block(md, ['profil', 'profil recherché']).map((l) => l.replace(/^• /, '')),
    salaire: block(md, ['salaire']).map((l) => l.replace(/^• /, '')).filter((l) => !/pour rappel/i.test(l)).join(' ') || field(md, 'Salaire'),
    url: `https://github.com/${meta.repo}/blob/${meta.branch}/${meta.fichier}`,
    texte: md,
  };
}

/* ---------- Score d'adéquation ---------- */

function analyse(offre, config, profile) {
  const corpus = ` ${offre.texte.toLowerCase()} `;
  const hits = (c) => c.mots.filter((m) => corpus.includes(m.toLowerCase()));

  const atouts = [], manques = [];
  let gagne = 0, total = 0;
  for (const c of config.competences) {
    const h = hits(c);
    if (!h.length) continue;
    total += c.poids;
    gagne += c.poids;
    atouts.push({ label: c.label, poids: c.poids, mots: [...new Set(h.map((m) => m.trim()))] });
  }
  for (const c of config.non_maitrise) {
    const h = hits(c);
    if (!h.length) continue;
    total += c.poids;
    manques.push({ label: c.label, poids: c.poids, mots: [...new Set(h.map((m) => m.trim()))] });
  }

  // Bonus / malus de contexte
  const notes = [];
  let bonus = 0;
  const titre = `${offre.poste} ${offre.postes.join(' ')}`.toLowerCase();
  if (/lead|senior|sénior|architect|staff|principal/.test(titre)) { bonus += 10; notes.push('Intitulé senior / lead : cohérent avec le poste visé.'); }
  if (/junior|stagiaire|alternan/.test(titre)) { bonus -= 25; notes.push('Intitulé junior : en dessous du poste visé.'); }
  if (/fullstack|full-stack|full stack|intégration front/.test(titre)) { bonus -= 8; notes.push('Poste fullstack avec intégration front : mon cœur est le back-end.'); }
  if (/data engineer|data manager|python|fastapi/.test(titre)) { bonus -= 30; notes.push('Poste orienté data ou Python : hors de ma stack principale.'); }
  const lieu = `${offre.ville} ${offre.lieu}`.toLowerCase();
  if (offre.remote || /full remote|100% remote|télétravail complet/.test(lieu)) { bonus += 8; notes.push('Full remote possible.'); }
  else if (config.lieux_ok.some((l) => lieu.includes(l.toLowerCase()))) { bonus += 5; notes.push(`Localisation compatible (${offre.ville}).`); }
  else { bonus -= 15; notes.push(`Localisation ${offre.ville || 'inconnue'} : à vérifier (télétravail ?).`); }
  if (/épargne|retraite|patrimoine|assurance|investissement/.test(corpus)) { bonus += 10; notes.push('Même métier que mes cinq dernières années : épargne, retraite, investissement.'); }

  const base = total ? (gagne / total) * 100 : 50;
  const score = Math.max(0, Math.min(100, Math.round(base * 0.8 + 10 + bonus)));
  const verdict = score >= 75 ? 'Postuler' : score >= 50 ? 'À étudier' : 'Peu adapté';
  return { score, verdict, atouts: atouts.sort((a, b) => b.poids - a.poids), manques: manques.sort((a, b) => b.poids - a.poids), notes };
}

/* ---------- Brouillon de candidature ---------- */

function liste(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

function brouillon(offre, a, config, profile, siteUrl) {
  const m = config.message;
  const atouts = a.atouts.filter((x) => x.label !== 'Séniorité / leadership').slice(0, 4).map((x) => x.label);
  const metier = a.notes.some((n) => n.startsWith('Même métier'));
  const manques = a.manques.filter((x) => x.poids >= 3).map((x) => x.label);

  const p = [];
  p.push(`Objet : Candidature — ${offre.poste} chez ${offre.entreprise}`);
  p.push('');
  p.push(`Bonjour ${config.source.recruteur.split(' ')[0]},`);
  p.push('');
  p.push(`Je vous écris pour le poste de ${offre.poste} chez ${offre.entreprise}${offre.domaine ? ` (${offre.domaine.toLowerCase().replace(/\.$/, '')})` : ''}.` +
    (atouts.length ? ` L'annonce rejoint mon parcours sur ${liste(atouts)}.` : ''));
  p.push('');
  p.push(`Je suis ${profile.role ? profile.role.toLowerCase().replace(/ · .*/, '') : 'lead architecte back-end'} depuis cinq ans sur une même plateforme d'investissement (épargne retraite, défiscalisation, private equity), ` +
    "que j'ai accompagnée du monolithe PHP à une dizaine de microservices Symfony / API Platform. " +
    "J'y porte les décisions de communication entre services : événements fiabilisés par le pattern Outbox / Inbox sur RabbitMQ, appels synchrones sécurisés par un JWT interne et OpenID Connect avec Keycloak, contrats OpenAPI et clients générés. " +
    "Ces décisions, je les transforme en outils : treize bundles Symfony partagés, des recettes Flex privées, et l'environnement Kubernetes local de l'équipe.");
  p.push('');
  if (metier) {
    p.push(`Votre domaine est aussi le mien : je connais les parcours de souscription, les contraintes réglementaires et les produits d'épargne de l'intérieur, et je sais ce que coûte une règle métier mal comprise.`);
  } else if (offre.quoi) {
    p.push(`Ce qui m'attire chez ${offre.entreprise} : une plateforme développée en interne, où la tech pèse dans les décisions. C'est le contexte dans lequel je donne le meilleur : décider, outiller, mesurer, transmettre.`);
  }
  if (manques.length) {
    p.push('');
    p.push(`En toute transparence, ${liste(manques)} n'est pas mon cœur d'expertise aujourd'hui ; je l'aborde avec la même méthode que le reste, contrat d'abord et tests, et j'apprends vite dans un contexte réel.`);
  }
  p.push('');
  p.push(`${m.pieces} ${siteUrl ? `Portfolio : ${siteUrl} · CV : ${siteUrl}/cv` : ''}`.trim());
  p.push('');
  p.push(`Je suis ${m.disponibilite}.`);
  p.push('');
  p.push('Bien à vous,');
  p.push(m.signature);
  return p.join('\n');
}

/* ---------- Point d'entrée ---------- */

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function getOffres({ siteUrl = '', force = false } = {}) {
  const config = await readJson(CONFIG_FILE);
  const profile = await readJson(CONTENT_FILE);
  const { repo, branch } = config.source;
  const key = `${repo}@${branch}`;
  const ttl = (config.source.cache_minutes || 30) * 60 * 1000;

  if (!force && cache.data && cache.key === key && Date.now() - cache.at < ttl) {
    return { ...cache.data, cache: true };
  }

  const readme = await ghRaw(repo, branch, 'README.md');
  const metas = parseReadme(readme).map((m) => ({ ...m, repo, branch }));

  // Date du dernier commit de chaque fiche (une requête par fiche, mise en cache avec le reste)
  const offres = [];
  for (const meta of metas) {
    let md = '';
    try { md = await ghRaw(repo, branch, meta.fichier); } catch (e) { continue; }
    const offre = parseFiche(md, meta);
    try {
      const commits = await ghJson(`https://api.github.com/repos/${repo}/commits?path=${encodeURIComponent(meta.fichier)}&sha=${branch}&per_page=1`);
      offre.maj = commits[0]?.commit?.committer?.date || null;
    } catch (e) { offre.maj = null; }
    const a = analyse(offre, config, profile);
    offre.analyse = a;
    offre.message = brouillon(offre, a, config, profile, siteUrl);
    delete offre.texte;
    offres.push(offre);
  }
  offres.sort((x, y) => y.analyse.score - x.analyse.score);

  const data = {
    source: { repo, branch, url: `https://github.com/${repo}/tree/${branch}`, email: config.source.email, recruteur: config.source.recruteur },
    lu_le: new Date().toISOString(),
    offres,
  };
  cache = { at: Date.now(), key, data };
  return { ...data, cache: false };
}

module.exports = { getOffres, parseReadme, parseFiche, analyse, brouillon };
