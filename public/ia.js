/* =============================================================================
 * Page « IA · Compétences Claude » : thème, apparition au défilement,
 * checklist, cartes mauvais/bon et quiz.
 * ===========================================================================*/

// ----- Thème clair / sombre (même clé que le portfolio) -----
const themeBtn = document.getElementById('theme-toggle');
const isDark = () =>
  document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;

themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) { /* stockage indisponible */ }
});

// ----- Apparition des sections au défilement -----
const observer = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  }),
  { threshold: 0.08 }
);
document.querySelectorAll('.reveal').forEach((s) => observer.observe(s));

// ----- Checklist : compteur + barre de progression -----
const boxes = document.querySelectorAll('#checklist-list input');
const updateChecklist = () => {
  const done = [...boxes].filter((b) => b.checked).length;
  document.getElementById('check-count').textContent =
    done === boxes.length ? `${done} / ${boxes.length} — prête à envoyer !` : `${done} / ${boxes.length}`;
  document.getElementById('check-bar').style.width = `${(done / boxes.length) * 100}%`;
};
boxes.forEach((b) => b.addEventListener('change', updateChecklist));

// ----- Cartes « mauvais vs bon » : un clic bascule -----
document.querySelectorAll('.ia-flip').forEach((card) => {
  card.addEventListener('click', () => {
    card.setAttribute('aria-pressed', card.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });
});

// ----- Quiz -----
const QUIZ = [
  { q: 'Quel nom de dossier est correct ?',
    a: ['My Cool Skill/', 'my_cool_skill/', 'my-cool-skill/', 'MyCoolSkill/'], ok: 2,
    why: 'Kebab-case : uniquement des minuscules et des tirets.' },
  { q: 'Quel nom de compétence sera refusé ?',
    a: ['sprint-planner', 'claude-sprint-planner', 'ai-sprint-planner', 'linear-sprint-planner'], ok: 1,
    why: '« claude » et « anthropic » sont des mots réservés dans le nom.' },
  { q: 'Où placer une référence d’API de 400 lignes ?',
    a: ['Dans SKILL.md', 'Dans references/', 'Dans un README.md', 'Dans la description'], ok: 1,
    why: 'Les gros documents vont dans references/ : SKILL.md reste sous 500 lignes.' },
  { q: 'Quelles deux questions la description doit-elle couvrir ?',
    a: ['Qui l’a écrite et quand', 'Ce qu’elle fait et quand l’utiliser', 'Comment et pourquoi', 'Où et comment déployer'], ok: 1,
    why: 'QUOI + QUAND : c’est ce qui permet à Claude de faire correspondre la demande.' },
  { q: 'À quoi sert « Ne PAS utiliser pour… » ?',
    a: ['Désactiver la compétence', 'Éviter les déclenchements à tort', 'Réagir à un utilisateur mécontent', 'Couper la compétence à distance'], ok: 1,
    why: 'C’est un déclencheur négatif : il sépare les compétences voisines.' },
  { q: 'Pourquoi mettre les règles critiques en haut du fichier ?',
    a: ['C’est plus professionnel', 'Claude lit de haut en bas et déprioritise ce qui est enfoui', 'Le parseur l’exige', 'Ça charge plus vite'], ok: 1,
    why: 'Une règle cachée en bas d’un long fichier risque d’être ignorée.' },
  { q: 'Un appel MCP échoue. Que doit faire la compétence ?',
    a: ['Réessayer en boucle', 'Ignorer et continuer', 'Montrer l’erreur, sa cause et une solution', 'Arrêter la conversation'], ok: 2,
    why: 'Erreur précise → cause → solution. Jamais d’échec silencieux.' },
  { q: 'La date « 03/04/2025 » est ambiguë. Meilleure réaction ?',
    a: ['Deviner le format courant', 'Demander à l’utilisateur', 'Ignorer la colonne', 'Convertir en timestamp'], ok: 1,
    why: 'Quand la donnée est ambiguë, on demande, on ne devine pas.' },
  { q: 'Quand Claude lit-il un fichier de references/ ?',
    a: ['Dès le chargement', 'Quand une instruction le lui demande', 'Il est toujours en mémoire', 'Jamais'], ok: 1,
    why: 'Chargement progressif : les références sont lues à la demande.' },
  { q: 'Votre compétence publie sur Slack. Règle n°1 ?',
    a: ['Formater en markdown', 'Toujours demander confirmation avant de publier', 'Limiter à 100 caractères', 'Publier dans #general'], ok: 1,
    why: 'Jamais de publication automatique vers un canal externe.' },
];

const quizRoot = document.getElementById('quiz-root');
const scoreEl = document.getElementById('quiz-score');
let answered = 0;
let good = 0;

function renderQuiz() {
  answered = 0; good = 0;
  scoreEl.textContent = '';
  quizRoot.innerHTML = '';
  QUIZ.forEach((item, i) => {
    const box = document.createElement('fieldset');
    box.className = 'ia-q card';
    const legend = document.createElement('legend');
    legend.textContent = `Q${i + 1}. ${item.q}`;
    box.append(legend);

    const opts = document.createElement('div');
    opts.className = 'ia-q-opts';
    item.a.forEach((label, j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ia-opt';
      b.textContent = `${'ABCD'[j]}) ${label}`;
      b.addEventListener('click', () => {
        if (box.dataset.done) return;
        box.dataset.done = '1';
        answered += 1;
        if (j === item.ok) good += 1;
        opts.querySelectorAll('.ia-opt').forEach((o, k) => {
          o.disabled = true;
          if (k === item.ok) o.classList.add('is-ok');
          else if (k === j) o.classList.add('is-ko');
        });
        const why = document.createElement('p');
        why.className = 'ia-why';
        why.textContent = (j === item.ok ? 'Exact. ' : 'Pas tout à fait. ') + item.why;
        box.append(why);
        scoreEl.textContent = answered === QUIZ.length
          ? `Score : ${good} / ${QUIZ.length} — ${good >= 8 ? 'solide, prêt pour le niveau avancé.' : good >= 5 ? 'bon départ, relisez la checklist.' : 'relisez la fiche, puis réessayez.'}`
          : `Score : ${good} / ${answered}`;
      });
      opts.append(b);
    });
    box.append(opts);
    quizRoot.append(box);
  });
}

document.getElementById('quiz-reset').addEventListener('click', renderQuiz);
renderQuiz();
