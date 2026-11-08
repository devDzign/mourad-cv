// CV imprimable : remplit la feuille A4 depuis l'API, puis active le bouton « Enregistrer en PDF ».

const $ = (selector) => document.querySelector(selector);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) node.append(child);
  return node;
}

// Adresse du site : contact.website (content.json) si renseignée, sinon l'adresse actuelle
let site = window.location.origin;
let siteLabel = site.replace(/^https?:\/\//, '');

function render(profile, projects) {
  if (profile.contact?.website) {
    site = profile.contact.website.replace(/\/$/, '');
    siteLabel = site.replace(/^https?:\/\//, '');
  }
  $('#cv-name').textContent = profile.name;
  $('#cv-role').textContent = profile.role;
  $('#cv-tagline').textContent = profile.tagline;

  // Coordonnées : téléphone (si renseigné), LinkedIn, site, ville
  const contact = profile.contact || {};
  const linkedin = (profile.socials || []).find((s) => s.label === 'LinkedIn' && s.url);
  const items = [
    contact.phone && { text: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` },
    contact.email && { text: contact.email, href: `mailto:${contact.email}` },
    linkedin && { text: linkedin.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), href: linkedin.url },
    { text: siteLabel, href: site },
    contact.location && { text: contact.location },
  ].filter(Boolean);
  $('#cv-contact').replaceChildren(
    ...items.map((i) => el('li', {}, i.href ? el('a', { href: i.href, text: i.text }) : i.text))
  );

  $('#cv-about').replaceChildren(...profile.about.map((text) => el('p', { text })));

  $('#cv-roles').replaceChildren(
    ...(profile.team?.items || []).map((r) => el('li', {}, [el('strong', { text: r.title }), el('span', { text: r.text })]))
  );

  $('#cv-projects').replaceChildren(
    ...projects.map((p) =>
      el('li', {}, [
        el('strong', {}, [p.title, el('span', { class: 'cv-cat', text: p.category })]),
        el('span', { class: 'cv-desc', text: p.description }),
      ])
    )
  );

  $('#cv-facts').replaceChildren(...(profile.facts || []).flatMap((f) => [el('dt', { text: f.label }), el('dd', { text: f.value })]));

  $('#cv-domains').replaceChildren(
    ...(profile.domains?.items || []).map((d) => el('li', {}, [el('b', { text: d.short || d.title }), el('small', { text: d.period })]))
  );

  $('#cv-skills').replaceChildren(
    ...profile.skills.map((g) =>
      el('div', { class: 'cv-skill-group' }, [
        el('h3', { text: g.group }),
        el('ul', { class: 'cv-chips' }, g.items.map((i) => el('li', { text: i }))),
      ])
    )
  );

  $('#cv-timeline').replaceChildren(
    ...(profile.timeline || []).map((t) => el('li', {}, [el('b', { text: t.date }), t.title]))
  );

  $('#cv-quotes').replaceChildren(...(profile.philosophy || []).slice(0, 6).map((p) => el('li', { text: p.quote })));

  $('#cv-foot').textContent = `Version interactive, schéma d'architecture animé et carte de visite : ${siteLabel}`;
  document.title = `${profile.name.replace(/\s+/g, '-')}-CV`;
}

async function load() {
  const btn = $('#print-btn');
  try {
    const [profileRes, projectsRes] = await Promise.all([fetch('/api/profile'), fetch('/api/projects')]);
    if (!profileRes.ok || !projectsRes.ok) throw new Error('données indisponibles');
    const profile = await profileRes.json();
    const { projects } = await projectsRes.json();
    render(profile, projects);

    // On attend les polices et le QR code pour que le PDF soit identique à l'écran
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))));

    $('#sheet').setAttribute('aria-busy', 'false');
    btn.disabled = false;
    btn.textContent = 'Enregistrer en PDF';
    btn.addEventListener('click', () => window.print());

    // /cv?print ouvre directement la fenêtre d'impression
    if (new URLSearchParams(location.search).has('print')) window.print();
  } catch (err) {
    btn.textContent = 'Erreur de chargement';
    console.error(err);
  }
}

load();
