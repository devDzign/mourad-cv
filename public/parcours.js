/* Parcours complet : frise des postes, formation, certifications, projets, publications.
   Le contenu vient de /api/parcours ; le détail des cinq dernières années
   réutilise la timeline de /api/profile pour ne pas dupliquer le contenu. */

const $ = (sel) => document.querySelector(sel);

/* ----- Thème clair / sombre (même clé localStorage que le reste du site) ----- */
const themeBtn = $('#theme-toggle');
const isDark = () =>
  document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
});

/* ----- Fabrique d'éléments ----- */
function el(tag, { text, cls, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const child of children) if (child) node.append(child);
  return node;
}

/* ----- Un poste de la frise ----- */
function poste(p, timeline) {
  const periode = [p.debut, p.fin].filter(Boolean).join(' – ');

  const entete = [
    el('p', { cls: 'par-periode', text: periode }),
    el('h3', { text: p.titre }),
  ];
  if (p.organisation) {
    entete.push(
      el('p', { cls: 'par-org' }, [
        el('span', { text: p.organisation }),
        p.lieu ? el('span', { cls: 'par-lieu', text: p.lieu }) : null,
      ])
    );
  }
  if (p.resume) entete.push(el('p', { cls: 'par-resume', text: p.resume }));

  const corps = [];
  if (p.faits?.length) {
    corps.push(el('ul', { cls: 'par-faits' }, p.faits.map((f) => el('li', { text: f }))));
  }
  if (p.stack?.length) {
    corps.push(el('ul', { cls: 'par-stack' }, p.stack.map((t) => el('li', { text: t }))));
  }
  if (p.repere) corps.push(el('p', { cls: 'par-repere', text: p.repere }));

  // « detail: "timeline" » déplie les étapes année par année venues de /api/profile
  if (p.detail === 'timeline' && timeline?.length) {
    corps.push(
      el('details', { cls: 'par-etapes' }, [
        el('summary', { text: `Les étapes, année par année (${timeline.length})` }),
        el(
          'ol',
          {},
          timeline.map((t) =>
            el('li', {}, [
              el('b', { text: t.date }),
              el('strong', { text: t.titre || t.title || '' }),
              el('span', { text: t.text || '' }),
            ])
          )
        ),
      ])
    );
  }

  const cls = ['par-poste', p.actuel ? 'est-actuel' : '', p.aCompleter ? 'est-vide' : '']
    .filter(Boolean)
    .join(' ');
  return el('li', { cls }, [el('div', { cls: 'par-poste-in' }, [...entete, ...corps])]);
}

/* ----- Rendu ----- */
function rendre(data, profile) {
  if (data.titre) {
    $('#par-titre').textContent = data.titre;
    document.title = `${data.titre} — ${profile?.name || 'Mourad Chabour'}`;
  }
  $('#par-intro').textContent = data.intro || '';

  $('#par-chiffres').replaceChildren(
    ...(data.chiffres || []).map((c) =>
      el('li', {}, [el('b', { text: c.valeur }), el('span', { text: c.label })])
    )
  );

  $('#par-postes').replaceChildren(
    ...(data.postes || []).map((p) => poste(p, profile?.timeline))
  );

  $('#par-formation').replaceChildren(
    ...(data.formation || []).map((f) =>
      el('li', {}, [
        el('b', { text: f.periode }),
        el('strong', { text: f.titre }),
        f.text ? el('span', { text: f.text }) : null,
      ])
    )
  );

  $('#par-certifs').replaceChildren(
    ...(data.certifications || []).map((c) =>
      el('li', {}, [
        el('b', { text: c.date }),
        el('strong', { text: c.titre }),
        el('span', { text: c.organisme }),
      ])
    )
  );

  $('#par-projets').replaceChildren(
    ...(data.projets || []).map((p) =>
      el('li', {}, [
        el('b', { text: p.periode }),
        el('strong', { text: p.titre }),
        p.text ? el('span', { text: p.text }) : null,
      ])
    )
  );

  const pub = data.publications || {};
  $('#par-publis-intro').textContent = pub.intro || '';
  $('#par-publis').replaceChildren(
    ...(pub.items || []).map((a) =>
      el('li', {}, [
        el('b', { text: a.date }),
        el('a', { text: a.titre, attrs: { href: a.url, target: '_blank', rel: 'noopener' } }),
      ])
    )
  );
  const lienProfil = $('#par-publis-profil');
  if (pub.profil) lienProfil.href = pub.profil; else lienProfil.parentElement.hidden = true;

  $('#par-langues').replaceChildren(
    ...(data.langues || []).map((l) =>
      el('li', {}, [el('strong', { text: l.langue }), el('span', { text: l.niveau })])
    )
  );
}

/* ----- Chargement ----- */
(async function init() {
  try {
    // Le profil sert au détail des cinq dernières années : son absence n'est pas bloquante.
    const [parcoursRes, profileRes] = await Promise.all([
      fetch('/api/parcours'),
      fetch('/api/profile').catch(() => null),
    ]);
    if (!parcoursRes.ok) throw new Error(`HTTP ${parcoursRes.status}`);
    const data = await parcoursRes.json();
    const profile = profileRes?.ok ? await profileRes.json() : null;
    rendre(data, profile);
  } catch (err) {
    console.error('Chargement du parcours impossible :', err);
    $('#par-erreur').hidden = false;
  }
})();
