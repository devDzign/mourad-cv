/* =============================================================================
 * Schéma d'architecture animé
 * -----------------------------------------------------------------------------
 * Tout est décrit dans trois tableaux :
 *   NODES     : les briques (services, bases, bus…) et leur position
 *   EDGES     : les liaisons entre briques (tracé point par point)
 *   SCENARIOS : des histoires jouées étape par étape ; à chaque étape, des
 *               « paquets » (requête HTTP, requête SQL, événement) parcourent
 *               les liaisons pendant qu'une légende explique ce qui se passe.
 * Le moteur en bas du fichier dessine le SVG et joue les scénarios.
 * ===========================================================================*/

(function () {
  const svg = document.getElementById('archi');
  if (!svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Couleur de chaque type de brique
  const TYPES = {
    front: { color: '#0ea5e9', tag: 'CLIENT' },
    gateway: { color: '#ca8a04', tag: 'GATEWAY' },
    auth: { color: '#e11d48', tag: 'IDENTITÉ' },
    service: { color: '#7c3aed', tag: 'MICROSERVICE' },
    engine: { color: '#16a34a', tag: 'MICROSERVICE' },
    db: { color: '#2563eb', tag: 'BASE' },
    cache: { color: '#dc2626', tag: 'CACHE' },
    bus: { color: '#ea580c', tag: 'EXCHANGE' },
    obs: { color: '#0d9488', tag: 'OBSERVABILITÉ' },
    legacy: { color: '#64748b', tag: 'LEGACY' },
    tool: { color: '#db2777', tag: 'OUTIL' },
    notif: { color: '#9333ea', tag: 'MICROSERVICE' },
  };

  /* ---------- 1. Les briques ---------- */
  const NODES = [
    { id: 'front', type: 'front', x: 380, y: 28, w: 440, h: 56, title: 'Fronts investisseur & partenaire', sub: 'React · navigateur' },
    { id: 'kong', type: 'gateway', x: 420, y: 142, w: 360, h: 56, title: 'Kong Gateway', sub: 'routage /pe · /dist · /permissions · Swagger /docs' },
    { id: 'keycloak', type: 'auth', x: 880, y: 142, w: 270, h: 56, title: 'Keycloak 26', sub: 'SSO OIDC · token exchange' },
    { id: 'pe', type: 'service', x: 50, y: 262, w: 240, h: 78, title: 'api-ms-pe', sub: 'Private Equity · Symfony 8' },
    { id: 'dist', type: 'service', x: 340, y: 262, w: 240, h: 78, title: 'api-distrib', sub: 'Distribution · API Platform' },
    { id: 'engine', type: 'engine', x: 630, y: 262, w: 240, h: 78, title: 'distrib-engine', sub: 'Workflows · Workflow Core' },
    { id: 'perm', type: 'service', x: 920, y: 262, w: 230, h: 78, title: 'api-permission', sub: 'Référentiel des droits' },
    { id: 'pg-pe', type: 'db', shape: 'cyl', x: 80, y: 384, w: 170, h: 72, title: 'PostgreSQL 16', sub: 'api_pe + outbox' },
    { id: 'pg-dist', type: 'db', shape: 'cyl', x: 335, y: 384, w: 150, h: 72, title: 'PostgreSQL 16', sub: 'api_dist + outbox' },
    { id: 'mercure', type: 'tool', x: 508, y: 392, w: 82, h: 58, title: 'Mercure', sub: 'temps réel', tagless: true },
    { id: 'notifier', type: 'notif', x: 668, y: 390, w: 170, h: 62, title: 'notifier-api', sub: 'email · SMS' },
    { id: 'pg-perm', type: 'db', shape: 'cyl', x: 905, y: 384, w: 125, h: 72, title: 'PostgreSQL', sub: 'droits' },
    { id: 'redis', type: 'cache', shape: 'cyl', x: 1052, y: 384, w: 98, h: 72, title: 'Redis', sub: 'cache' },
    { id: 'ex-pe', type: 'bus', x: 70, y: 540, w: 230, h: 54, title: 'private_equity', sub: 'synchro Domos' },
    { id: 'ex-dist', type: 'bus', x: 340, y: 540, w: 530, h: 54, title: 'dist.events', sub: 'queues dist.api.in · dist.engine.in (quorum)' },
    { id: 'ex-perm', type: 'bus', x: 910, y: 540, w: 220, h: 54, title: 'permission.events', sub: 'queue permission.in' },
    { id: 'clickhouse', type: 'obs', x: 50, y: 664, w: 260, h: 62, title: 'ClickHouse', sub: 'historique Outbox / Inbox' },
    { id: 'viewer', type: 'tool', x: 350, y: 664, w: 220, h: 62, title: 'outbox-viewer', sub: 'React · supervision & rejeu' },
    { id: 'legacy', type: 'legacy', x: 610, y: 664, w: 260, h: 62, title: 'Site legacy (PHP)', sub: "table d'audit → événements" },
    { id: 'sentry', type: 'obs', x: 910, y: 664, w: 220, h: 62, title: 'Sentry', sub: 'erreurs & alertes' },
  ];

  /* ---------- 2. Les liaisons (points du tracé) ---------- */
  const EDGES = [
    { id: 'front-keycloak', kind: 'http', from: 'front', to: 'keycloak', pts: [[820, 56], [1015, 56], [1015, 142]], label: 'OIDC', lp: [920, 46] },
    { id: 'front-kong', kind: 'http', from: 'front', to: 'kong', pts: [[600, 84], [600, 142]], label: 'HTTPS + token', lp: [660, 114] },
    { id: 'kong-pe', kind: 'http', from: 'kong', to: 'pe', pts: [[470, 198], [470, 226], [170, 226], [170, 262]], label: '/pe', lp: [300, 216] },
    { id: 'kong-dist', kind: 'http', from: 'kong', to: 'dist', pts: [[540, 198], [540, 262]], label: '/dist', lp: [520, 234] },
    { id: 'kong-perm', kind: 'http', from: 'kong', to: 'perm', pts: [[740, 198], [740, 226], [1000, 226], [1000, 262]], label: '/permissions', lp: [880, 216] },
    { id: 'perm-keycloak', kind: 'http', from: 'perm', to: 'keycloak', pts: [[1120, 262], [1120, 198]], label: 'JWKS', lp: [1150, 232] },
    { id: 'pe-dist', kind: 'http', from: 'pe', to: 'dist', pts: [[290, 300], [340, 300]], label: 'JWT', lp: [315, 288] },
    { id: 'dist-engine', kind: 'http', from: 'dist', to: 'engine', pts: [[580, 300], [630, 300]], label: 'HTTP', lp: [605, 288] },
    { id: 'engine-perm', kind: 'http', from: 'engine', to: 'perm', pts: [[870, 300], [920, 300]], label: 'HTTP', lp: [895, 288] },
    { id: 'pe-pg', kind: 'sql', from: 'pe', to: 'pg-pe', pts: [[165, 340], [165, 384]] },
    { id: 'dist-pg', kind: 'sql', from: 'dist', to: 'pg-dist', pts: [[410, 340], [410, 384]] },
    { id: 'dist-mercure', kind: 'http', from: 'dist', to: 'mercure', pts: [[549, 340], [549, 392]] },
    { id: 'engine-notifier', kind: 'http', from: 'engine', to: 'notifier', pts: [[753, 340], [753, 390]] },
    { id: 'perm-pg', kind: 'sql', from: 'perm', to: 'pg-perm', pts: [[967, 340], [967, 384]] },
    { id: 'perm-redis', kind: 'sql', from: 'perm', to: 'redis', pts: [[1100, 340], [1100, 384]] },
    { id: 'pe-ex', kind: 'event', from: 'pe', to: 'ex-pe', pts: [[276, 340], [276, 540]] },
    { id: 'dist-ex', kind: 'event', from: 'dist', to: 'ex-dist', pts: [[497, 340], [497, 540]] },
    { id: 'engine-ex', kind: 'event', from: 'engine', to: 'ex-dist', pts: [[650, 340], [650, 540]] },
    { id: 'engine-experm', kind: 'event', from: 'engine', to: 'ex-perm', pts: [[856, 340], [856, 514], [960, 514], [960, 540]] },
    { id: 'experm-perm', kind: 'event', from: 'ex-perm', to: 'perm', pts: [[1041, 540], [1041, 340]] },
    { id: 'legacy-ex', kind: 'event', from: 'legacy', to: 'ex-dist', pts: [[740, 664], [740, 594]] },
    { id: 'bus-clickhouse', kind: 'event', from: 'ex-pe', to: 'clickhouse', pts: [[180, 594], [180, 664]], label: 'trace', lp: [210, 630] },
    { id: 'clickhouse-viewer', kind: 'http', from: 'clickhouse', to: 'viewer', pts: [[310, 695], [350, 695]] },
    { id: 'viewer-ex', kind: 'event', from: 'viewer', to: 'ex-dist', pts: [[460, 664], [460, 594]], label: 'rejeu', lp: [490, 630] },
  ];

  /* ---------- 3. Les scénarios ----------
   * Une étape = une légende + des mouvements joués en parallèle.
   * Un mouvement : { e: liaison, k: type de paquet, l: étiquette, rev: sens inverse,
   *                  back: aller-retour (étiquette du retour), delay: décalage en ms }
   */
  const SCENARIOS = [
    {
      title: 'Un investisseur ouvre son espace',
      steps: [
        { text: "Le front authentifie l'investisseur auprès de Keycloak (OpenID Connect) et récupère un token.", moves: [{ e: 'front-keycloak', k: 'http', l: 'login OIDC', back: 'token' }] },
        { text: 'La requête part avec le token vers Kong, qui la route vers api-distrib.', moves: [{ e: 'front-kong', k: 'http', l: 'GET /dist/souscriptions' }, { e: 'kong-dist', k: 'http', l: '/dist', delay: 650 }] },
        { text: 'api-distrib valide le token avec les clés publiques Keycloak (en cache), puis lit ses données.', moves: [{ e: 'dist-pg', k: 'sql', l: 'SELECT', back: 'lignes' }] },
        { text: 'La réponse JSON remonte jusqu\'au navigateur.', moves: [{ e: 'kong-dist', k: 'http', l: '200 JSON', rev: true }, { e: 'front-kong', k: 'http', l: '200 JSON', rev: true, delay: 650 }] },
      ],
    },
    {
      title: 'Une souscription déclenche un workflow',
      steps: [
        { text: "api-distrib enregistre la souscription et, dans la même transaction, l'événement à publier : c'est le pattern Outbox.", moves: [{ e: 'dist-pg', k: 'sql', l: 'INSERT + outbox', back: 'commit' }] },
        { text: "L'Outbox Bundle publie l'événement sur l'exchange dist.events.", moves: [{ e: 'dist-ex', k: 'event', l: 'dist.api.event.souscription' }] },
        { text: 'distrib-engine le consomme dans sa queue quorum et démarre le workflow ; le message est historisé dans ClickHouse.', moves: [{ e: 'engine-ex', k: 'event', l: '→ dist.engine.in', rev: true }, { e: 'bus-clickhouse', k: 'event', l: 'trace' }] },
        { text: "Le workflow demande l'envoi d'un email de confirmation au notifier.", moves: [{ e: 'engine-notifier', k: 'http', l: 'POST /notifications' }] },
        { text: 'Il publie son résultat sur dist.events…', moves: [{ e: 'engine-ex', k: 'event', l: 'dist.engine.event.distrib' }] },
        { text: '…api-distrib le consomme (dist.api.in), met à jour la souscription et pousse le changement au navigateur via Mercure.', moves: [{ e: 'dist-ex', k: 'event', l: '→ dist.api.in', rev: true }, { e: 'dist-mercure', k: 'http', l: 'update', delay: 900 }] },
      ],
    },
    {
      title: 'Le Private Equity interroge la distribution',
      steps: [
        { text: 'Un partenaire consulte un fonds : Kong route vers api-ms-pe.', moves: [{ e: 'front-kong', k: 'http', l: 'GET /pe/fonds' }, { e: 'kong-pe', k: 'http', l: '/pe', delay: 650 }] },
        { text: 'api-ms-pe appelle api-distrib en HTTP, authentifié par un JWT interne signé RSA (scope INVESTISSEMENT).', moves: [{ e: 'pe-dist', k: 'http', l: 'GET /dist/ · JWT' }] },
        { text: 'api-distrib vérifie les permissions du scope et répond.', moves: [{ e: 'dist-pg', k: 'sql', l: 'SELECT', back: 'lignes' }, { e: 'pe-dist', k: 'http', l: '200', rev: true, delay: 1300 }] },
        { text: "Le fonds est mis à jour : l'événement part sur l'exchange private_equity pour la synchronisation Domos.", moves: [{ e: 'pe-pg', k: 'sql', l: 'UPDATE + outbox', back: 'commit' }, { e: 'pe-ex', k: 'event', l: 'fonds.updated', delay: 1300 }] },
      ],
    },
    {
      title: 'Synchronisation des droits',
      steps: [
        { text: 'Pendant un workflow, distrib-engine consulte api-permission pour connaître les droits du compte.', moves: [{ e: 'engine-perm', k: 'http', l: 'GET /permissions', back: 'droits' }] },
        { text: 'Un changement de droits est publié sur permission.events…', moves: [{ e: 'engine-experm', k: 'event', l: 'permission.event' }] },
        { text: '…consommé par api-permission dans sa queue permission.in.', moves: [{ e: 'experm-perm', k: 'event', l: '→ permission.in' }] },
        { text: 'Le référentiel est mis à jour et le cache Redis invalidé.', moves: [{ e: 'perm-pg', k: 'sql', l: 'UPDATE', back: 'ok' }, { e: 'perm-redis', k: 'sql', l: 'DEL cache' }] },
      ],
    },
    {
      title: 'Le legacy pousse ses changements',
      steps: [
        { text: "Une modification dans le site legacy est captée par la table d'audit et publiée en données brutes.", moves: [{ e: 'legacy-ex', k: 'event', l: 'legacy.api.event.*' }] },
        { text: "distrib-engine fait le mapping vers le nouveau modèle ; api-distrib se synchronise.", moves: [{ e: 'engine-ex', k: 'event', l: 'legacy…distrib', rev: true }, { e: 'dist-ex', k: 'event', l: 'legacy…synced', rev: true }] },
      ],
    },
    {
      title: 'Un message échoue : retry puis rejeu',
      steps: [
        { text: 'distrib-engine reçoit un événement mais son traitement échoue (service tiers indisponible).', moves: [{ e: 'engine-ex', k: 'error', l: 'échec ✗', rev: true }] },
        { text: 'Messenger retente avec un backoff exponentiel : 1 s, 2 s, 4 s…', moves: [{ e: 'engine-ex', k: 'error', l: 'retry 1', rev: true }, { e: 'engine-ex', k: 'error', l: 'retry 2', rev: true, delay: 900 }] },
        { text: 'Après 3 tentatives, le message part dans la queue *.failed ; tout est tracé dans ClickHouse.', moves: [{ e: 'bus-clickhouse', k: 'error', l: '*.failed' }] },
        { text: "L'équipe voit le message en erreur dans outbox-viewer, avec toute sa chaîne de rejeu.", moves: [{ e: 'clickhouse-viewer', k: 'http', l: 'statut : erreur' }] },
        { text: 'Une fois la cause corrigée, le message est rejoué : le traitement réussit, sans doublon.', moves: [{ e: 'viewer-ex', k: 'event', l: 'rejeu' }, { e: 'engine-ex', k: 'event', l: 'succès ✓', rev: true, delay: 900 }] },
      ],
    },
  ];

  /* =========================================================================
   * Moteur : dessin du SVG
   * =======================================================================*/

  const make = (tag, attrs = {}, parent = svg) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    parent.appendChild(node);
    return node;
  };
  const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

  // Zones de fond
  make('text', { x: 380, y: 18, class: 'archi-zone-label' }).textContent = 'INTERNET';
  make('rect', { x: 20, y: 116, width: 1160, height: 630, rx: 22, class: 'archi-zone' });
  make('text', { x: 40, y: 140, class: 'archi-zone-label' }).textContent = 'CLUSTER KUBERNETES · Helm · Tilt en local (2IT LaunchPad)';
  make('rect', { x: 50, y: 500, width: 1100, height: 112, rx: 16, class: 'archi-bus' });
  make('text', { x: 70, y: 524, class: 'archi-bus-label' }).textContent = 'RabbitMQ · Symfony Messenger + Outbox Bundle';
  make('text', { x: 1150, y: 640, class: 'archi-bus-note', 'text-anchor': 'end' }).textContent = 'retry exponentiel · queues *.failed / *.domain.errors';

  // Liaisons (sous les briques)
  const edgeLayer = make('g', { class: 'archi-edges' });
  const edgeEls = {};
  for (const e of EDGES) {
    const d = e.pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
    edgeEls[e.id] = make('path', { d, class: `archi-edge archi-edge--${e.kind}` }, edgeLayer);
    if (e.label) {
      const t = make('text', { x: e.lp[0], y: e.lp[1], class: `archi-edge-label archi-edge-label--${e.kind}`, 'text-anchor': 'middle' }, edgeLayer);
      t.textContent = e.label;
    }
  }

  // Briques
  const nodeEls = {};
  for (const n of NODES) {
    const type = TYPES[n.type];
    const g = make('g', { class: 'archi-node', style: `--c:${type.color}` });
    if (n.shape === 'cyl') {
      const ry = 9;
      make('path', {
        class: 'archi-node-shape',
        d: `M ${n.x} ${n.y + ry} v ${n.h - 2 * ry} a ${n.w / 2} ${ry} 0 0 0 ${n.w} 0 v ${-(n.h - 2 * ry)} a ${n.w / 2} ${ry} 0 0 0 ${-n.w} 0 Z`,
      }, g);
      make('ellipse', { class: 'archi-node-shape archi-node-top', cx: n.x + n.w / 2, cy: n.y + ry, rx: n.w / 2, ry }, g);
      make('text', { x: n.x + n.w / 2, y: n.y + n.h / 2 + 8, class: 'archi-node-title archi-small', 'text-anchor': 'middle' }, g).textContent = n.title;
      make('text', { x: n.x + n.w / 2, y: n.y + n.h / 2 + 25, class: 'archi-node-sub', 'text-anchor': 'middle' }, g).textContent = n.sub;
    } else {
      make('rect', { class: 'archi-node-shape', x: n.x, y: n.y, width: n.w, height: n.h, rx: 12 }, g);
      const compact = n.h < 60;
      if (!compact && !n.tagless) {
        make('text', { x: n.x + 14, y: n.y + 19, class: 'archi-node-tag' }, g).textContent = type.tag;
      }
      const cx = n.tagless ? n.x + n.w / 2 : n.x + 14;
      const anchor = n.tagless ? 'middle' : 'start';
      const ty = compact ? n.y + 24 : n.tagless ? n.y + 26 : n.y + 41;
      make('text', { x: cx, y: ty, class: `archi-node-title${n.tagless ? ' archi-small' : ''}`, 'text-anchor': anchor }, g).textContent = n.title;
      make('text', { x: cx, y: ty + 18, class: 'archi-node-sub', 'text-anchor': anchor }, g).textContent = n.sub;
    }
    nodeEls[n.id] = g;
  }

  const packetLayer = make('g', { class: 'archi-packets' });

  /* =========================================================================
   * Moteur : animation des paquets
   * =======================================================================*/

  let runId = 0; // change à chaque nouvelle lecture : les anciennes s'arrêtent d'elles-mêmes
  const sleep = (ms, run) => new Promise((resolve) => setTimeout(() => resolve(run === runId), ms));

  function createPacket(kind, label) {
    // Créé hors du cadre : il n'apparaît qu'une fois placé sur sa liaison
    const g = make('g', { class: `archi-packet archi-packet--${kind}`, transform: 'translate(-200 -200)' }, packetLayer);
    if (kind === 'event' || kind === 'error') make('rect', { x: -9, y: -6.5, width: 18, height: 13, rx: 3 }, g);
    else make('circle', { r: kind === 'sql' ? 6 : 8 }, g);
    if (label) {
      const bg = make('rect', { class: 'archi-packet-bg', y: -31, height: 19, rx: 9.5 }, g);
      const t = make('text', { y: -17.5, 'text-anchor': 'middle', class: 'archi-packet-label' }, g);
      t.textContent = label;
      const w = t.getComputedTextLength() + 14;
      bg.setAttribute('x', -w / 2);
      bg.setAttribute('width', w);
    }
    return g;
  }

  // Fait parcourir une liaison à un paquet ; renvoie une promesse résolue à l'arrivée
  function travel(edgeId, kind, label, reverse, run) {
    const path = edgeEls[edgeId];
    const length = path.getTotalLength();
    const duration = reduceMotion ? 0 : Math.min(1500, Math.max(650, length * 3.2));
    const packet = createPacket(kind, label);
    const place = (p) => {
      const at = path.getPointAtLength(reverse ? length * (1 - p) : length * p);
      packet.setAttribute('transform', `translate(${at.x} ${at.y})`);
    };
    return new Promise((resolve) => {
      if (!duration) {
        place(1);
        setTimeout(() => { packet.remove(); resolve(); }, 900);
        return;
      }
      const start = performance.now();
      const frame = (now) => {
        if (run !== runId) { packet.remove(); return resolve(); }
        const p = Math.min(1, (now - start) / duration);
        place(p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2); // accélère puis ralentit
        if (p < 1) requestAnimationFrame(frame);
        else setTimeout(() => { packet.remove(); resolve(); }, 120);
      };
      requestAnimationFrame(frame);
    });
  }

  // Sur petit écran, le schéma défile horizontalement : on le recentre sur l'action en cours
  const scroller = svg.parentElement;
  function panTo(edgeId) {
    if (scroller.scrollWidth <= scroller.clientWidth + 4) return;
    const pts = EDGES.find((e) => e.id === edgeId).pts;
    const midX = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
    const scale = svg.clientWidth / 1200;
    scroller.scrollTo({ left: midX * scale - scroller.clientWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  async function playMove(m, run) {
    const edge = EDGES.find((e) => e.id === m.e);
    if (m.delay && !(await sleep(m.delay, run))) return;
    const ends = [edge.from, edge.to];
    edgeEls[m.e].classList.add('is-active');
    ends.forEach((id) => nodeEls[id].classList.add('is-active'));
    await travel(m.e, m.k, m.l, !!m.rev, run);
    if (m.back && run === runId) await travel(m.e, m.k, m.back, !m.rev, run);
  }

  const clearActive = () => {
    svg.querySelectorAll('.is-active').forEach((el) => el.classList.remove('is-active'));
  };

  /* =========================================================================
   * Lecture des scénarios et contrôles
   * =======================================================================*/

  const caption = document.getElementById('archi-caption');
  const stepLabel = document.getElementById('archi-step');
  const scenarioBox = document.getElementById('archi-scenarios');
  const playBtn = document.getElementById('archi-play');
  let current = 0;
  let autoplay = !reduceMotion;
  let visible = false;

  const buttons = SCENARIOS.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filter-btn';
    b.textContent = s.title;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => play(i));
    scenarioBox.appendChild(b);
    return b;
  });

  async function play(index) {
    const run = ++runId;
    current = index;
    const scenario = SCENARIOS[index];
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    packetLayer.replaceChildren();

    for (let s = 0; s < scenario.steps.length; s++) {
      const step = scenario.steps[s];
      clearActive();
      stepLabel.textContent = `${scenario.title} · étape ${s + 1}/${scenario.steps.length}`;
      caption.textContent = step.text;
      panTo(step.moves[0].e);
      await Promise.all(step.moves.map((m) => playMove(m, run)));
      if (!(await sleep(reduceMotion ? 2600 : 1100, run))) return;
    }
    clearActive();
    // Enchaîne sur le scénario suivant si la lecture automatique est active
    if (autoplay && visible && (await sleep(1200, run))) play((index + 1) % SCENARIOS.length);
  }

  function setAutoplay(on) {
    autoplay = on;
    playBtn.setAttribute('aria-pressed', String(on));
    playBtn.textContent = on ? 'Pause' : 'Lecture auto';
    if (on && visible) play(current);
    else if (!on) runId++; // stoppe proprement l'animation en cours
  }

  playBtn.addEventListener('click', () => setAutoplay(!autoplay));
  playBtn.textContent = autoplay ? 'Pause' : 'Lecture auto';
  playBtn.setAttribute('aria-pressed', String(autoplay));

  // Ne joue que lorsque le schéma est visible à l'écran
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && autoplay) play(current);
      else if (!visible) runId++;
    },
    { threshold: 0.25 }
  ).observe(svg);

  /* =========================================================================
   * Export du schéma : SVG (image fixe) ou GIF animé (scénario en cours)
   * Le schéma de la page dépend des styles CSS du site : pour l'exporter, on recopie
   * les styles calculés directement sur chaque élément, puis on ajoute un titre,
   * la légende et les polices du site intégrées au fichier.
   * =======================================================================*/

  const STYLE_PROPS = [
    'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset',
    'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'opacity', 'filter', 'paint-order',
    'font-family', 'font-size', 'font-weight', 'letter-spacing',
  ];
  const HEAD = 96; // hauteur du bandeau de titre
  const FOOT = 48; // hauteur de la légende
  const exportStatus = document.getElementById('archi-export-status');
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Polices du site intégrées (base64) pour que l'image soit identique partout
  let fontCss = null;
  async function embeddedFonts() {
    if (fontCss !== null) return fontCss;
    try {
      const url = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=DM+Sans:wght@500;700&display=swap';
      const css = await (await fetch(url)).text();
      const blocks = css.split('/* ').filter((b) => b.startsWith('latin */'));
      const faces = await Promise.all(
        blocks.map(async (block) => {
          const fontUrl = block.match(/url\((https:[^)]+)\)/)[1];
          const bytes = new Uint8Array(await (await fetch(fontUrl)).arrayBuffer());
          let binary = '';
          bytes.forEach((b) => (binary += String.fromCharCode(b)));
          return block.slice(block.indexOf('@font-face')).replace(fontUrl, `data:font/woff2;base64,${btoa(binary)}`).replace(/unicode-range:[^;]+;/, '');
        })
      );
      fontCss = faces.join('\n');
    } catch (err) {
      fontCss = ''; // hors ligne : polices système
    }
    return fontCss;
  }

  const measure = document.createElement('canvas').getContext('2d');
  function wrapText(text, font, maxWidth) {
    measure.font = font;
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (measure.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  // Photographie du schéma tel qu'il est affiché, sous forme de fichier SVG autonome
  function snapshot(fonts, { title, subtitle }) {
    const clone = svg.cloneNode(true);
    const source = [svg, ...svg.querySelectorAll('*')];
    const copies = [clone, ...clone.querySelectorAll('*')];
    source.forEach((node, i) => {
      const computed = getComputedStyle(node);
      const style = STYLE_PROPS.map((p) => `${p}:${computed.getPropertyValue(p)}`).join(';');
      copies[i].setAttribute('style', style);
      copies[i].removeAttribute('class');
    });
    clone.querySelector('title')?.remove();

    const css = getComputedStyle(document.body);
    const bg = css.backgroundColor;
    const text = css.color;
    const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#6b6280';
    const body = "'DM Sans', 'Helvetica Neue', Arial, sans-serif";
    const display = "'Bricolage Grotesque', 'Helvetica Neue', Arial, sans-serif";
    const subLines = wrapText(subtitle, `500 17px ${body}`, 1120).slice(0, 2);
    const height = 760 + HEAD + FOOT;
    const legend = [
      ['#ea580c', 'circle', 'Requête HTTP (JWT interne)'],
      ['#7c3aed', 'rect', 'Événement RabbitMQ'],
      ['#2563eb', 'circle', 'Requête SQL / cache'],
      ['#dc2626', 'rect', 'Échec / retry'],
    ]
      .map(([color, shape, label], i) => {
        const x = 40 + i * 270;
        const mark = shape === 'circle'
          ? `<circle cx="${x + 7}" cy="${height - 24}" r="7" fill="${color}"/>`
          : `<rect x="${x}" y="${height - 30}" width="15" height="12" rx="3" fill="${color}"/>`;
        return `${mark}<text x="${x + 24}" y="${height - 19}" font-family="${esc(body)}" font-size="15" font-weight="500" fill="${muted}">${esc(label)}</text>`;
      })
      .join('');

    clone.setAttribute('x', '0');
    clone.setAttribute('y', String(HEAD));
    clone.setAttribute('width', '1200');
    clone.setAttribute('height', '760');
    clone.removeAttribute('id');
    clone.style.minWidth = '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">
  <title>${esc(title)}</title>
  <defs><style>${fonts}</style></defs>
  <rect width="1200" height="${height}" fill="${bg}"/>
  <text x="40" y="44" font-family="${esc(display)}" font-size="26" font-weight="700" fill="${text}">${esc(title)}</text>
  ${subLines.map((l, i) => `<text x="40" y="${72 + i * 22}" font-family="${esc(body)}" font-size="17" font-weight="500" fill="${muted}">${esc(l)}</text>`).join('')}
  ${new XMLSerializer().serializeToString(clone)}
  ${legend}
  <text x="1160" y="${height - 19}" text-anchor="end" font-family="${esc(body)}" font-size="14" font-weight="700" fill="${muted}">Mourad Chabour</text>
</svg>`;
  }

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function say(message) {
    if (exportStatus) exportStatus.textContent = message;
  }

  // SVG : image fixe et propre (animation mise en pause, sans paquets en vol)
  async function exportSvg() {
    const wasAuto = autoplay;
    runId++;
    packetLayer.replaceChildren();
    clearActive();
    const fonts = await embeddedFonts();
    const file = snapshot(fonts, {
      title: 'Communication entre microservices',
      subtitle: "Kong, Keycloak, quatre microservices Symfony et leurs bases, RabbitMQ (pattern Outbox / Inbox), ClickHouse et le site historique.",
    });
    downloadBlob(new Blob([file], { type: 'image/svg+xml' }), 'architecture-microservices.svg');
    say('SVG téléchargé.');
    if (wasAuto && visible) play(current);
  }

  // GIF : on joue le scénario sélectionné et on capture l'affichage environ 8 fois par seconde
  async function exportGif(button) {
    const { GIFEncoder, quantize, applyPalette } = await import('/vendor/gifenc/gifenc.esm.js');
    const fonts = await embeddedFonts();
    const GW = 900;
    const GH = Math.round((GW * (760 + HEAD + FOOT)) / 1200);
    const canvas = document.createElement('canvas');
    canvas.width = GW;
    canvas.height = GH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const gif = GIFEncoder();
    const scenario = SCENARIOS[current];

    const wasAuto = autoplay;
    autoplay = false; // pas d'enchaînement sur le scénario suivant pendant l'enregistrement
    let finished = false;
    const done = play(current).then(() => (finished = true));

    function writeGifFrame(frame, delay) {
      gif.writeFrame(frame.pixels, GW, GH, {
        palette: frame.first ? palette : undefined,
        delay,
        transparent: !frame.first,
        transparentIndex: 255,
        dispose: 1, // garde l'image précédente sous les pixels transparents
      });
    }

    // Une seule palette pour tout le GIF (calculée sur la première image) ; l'index 255 sert de
    // « transparent » : chaque image ne contient que les pixels qui ont changé, d'où un fichier léger.
    let palette = null;
    let previous = null;
    let pending = null; // image en attente : sa durée n'est connue qu'à la capture suivante
    let count = 0;
    while (!finished || count === 0) {
      const shot = performance.now();
      const file = snapshot(fonts, { title: stepLabel.textContent || scenario.title, subtitle: caption.textContent });
      const url = URL.createObjectURL(new Blob([file], { type: 'image/svg+xml' }));
      const img = new Image();
      img.src = url;
      await img.decode();
      URL.revokeObjectURL(url);
      ctx.drawImage(img, 0, 0, GW, GH);
      const { data } = ctx.getImageData(0, 0, GW, GH);
      if (!palette) palette = [...quantize(data, 255), [255, 0, 255]];
      const index = applyPalette(data, palette);
      let pixels = index;
      if (previous) {
        pixels = new Uint8Array(index);
        for (let i = 0; i < pixels.length; i++) if (pixels[i] === previous[i]) pixels[i] = 255;
      }
      previous = index;
      const frame = { pixels, first: count === 0, at: shot };
      if (pending) writeGifFrame(pending, Math.round(shot - pending.at));
      pending = frame;
      count++;
      button.textContent = `Enregistrement… ${count} images`;
      const wait = 120 - (performance.now() - shot);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    await done;
    if (pending) writeGifFrame(pending, 1500);
    gif.finish();

    autoplay = wasAuto;
    const slug = scenario.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    downloadBlob(new Blob([gif.bytes()], { type: 'image/gif' }), `architecture-${slug}.gif`);
    say(`GIF du scénario « ${scenario.title} » téléchargé : glissez-le dans Teams.`);
    if (wasAuto && visible) play((current + 1) % SCENARIOS.length);
  }

  async function busy(button, task) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Préparation…';
    try {
      await task();
    } catch (err) {
      console.error(err);
      say("L'export a échoué. Réessayez.");
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  const svgBtn = document.getElementById('archi-svg');
  const gifBtn = document.getElementById('archi-gif');
  svgBtn?.addEventListener('click', () => busy(svgBtn, exportSvg));
  gifBtn?.addEventListener('click', () => busy(gifBtn, () => exportGif(gifBtn)));

  stepLabel.textContent = 'Choisissez un scénario';
  caption.textContent = reduceMotion
    ? 'Animations réduites : cliquez sur un scénario pour le dérouler étape par étape.'
    : 'Les scénarios se jouent automatiquement ; cliquez sur l\'un d\'eux pour le revoir.';
})();
