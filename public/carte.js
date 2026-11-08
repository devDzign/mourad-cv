// Carte de visite numérique : remplit la carte depuis /api/profile et gère les actions
// (retourner, envoyer par email, partager, copier une version compatible email).

const $ = (selector) => document.querySelector(selector);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Adresse du site : contact.website (content.json) si renseignée, sinon l'adresse actuelle
let site = window.location.origin;
let cardUrl = `${site}/carte`;

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) node.append(child);
  return node;
}

function setStatus(message) {
  $('#card-status').textContent = message;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => ($('#card-status').textContent = ''), 4000);
}

// Échappe le texte inséré dans le HTML de l'email
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- Remplissage de la carte ---------- */

let profile = null;

function contactLinks() {
  const contact = profile.contact || {};
  const linkedin = (profile.socials || []).find((s) => s.label === 'LinkedIn' && s.url);
  return [
    contact.phone && { label: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` },
    linkedin && { label: 'LinkedIn', href: linkedin.url },
    { label: site.replace(/^https?:\/\//, ''), href: site },
    contact.location && { label: contact.location },
  ].filter(Boolean);
}

function renderCard() {
  const initials = profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  $('#biz-initials').textContent = initials;
  $('#biz-name').textContent = profile.name;
  $('#biz-role').textContent = profile.role;
  $('#biz-tagline').textContent = profile.tagline;
  $('#biz-url').textContent = site.replace(/^https?:\/\//, '');
  document.title = `Carte de visite — ${profile.name}`;

  // Les 4 premiers domaines métier, en version courte (champ « short »)
  const domains = (profile.domains?.items || []).slice(0, 4).map((d) => d.short || d.title);
  $('#biz-domains').replaceChildren(...domains.map((d) => el('li', { text: d })));

  $('#biz-contact').replaceChildren(
    ...contactLinks().map((c) =>
      el('li', {}, c.href ? el('a', { href: c.href, target: c.href.startsWith('http') ? '_blank' : '_self', rel: 'noopener', text: c.label }) : c.label)
    )
  );

  // Lien « Envoyer par email » : ouvre la messagerie avec un message déjà rédigé
  const body = [
    'Bonjour,',
    '',
    `Je vous partage ma carte de visite numérique : ${cardUrl}`,
    `Mon portfolio : ${site}`,
    '',
    `${profile.name}`,
    `${profile.role}`,
  ].join('\n');
  $('#act-mail').href = `mailto:?subject=${encodeURIComponent(`Carte de visite — ${profile.name}`)}&body=${encodeURIComponent(body)}`;

  $('#email-render').innerHTML = emailHtml();
}

/* ---------- Version email : tableau et styles en ligne (seul format fiable dans Gmail / Outlook) ---------- */

function emailHtml() {
  const links = contactLinks()
    .map((c) => (c.href ? `<a href="${esc(c.href)}" style="color:#ffffff;text-decoration:underline;">${esc(c.label)}</a>` : esc(c.label)))
    .join(' &nbsp;·&nbsp; ');
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="width:520px;max-width:100%;border-collapse:separate;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td bgcolor="#7c3aed" style="background:#7c3aed;background-image:linear-gradient(135deg,#6d28d9,#db2777 55%,#f97316);border-radius:18px;padding:24px 26px;color:#ffffff;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td valign="top" style="color:#ffffff;">
            <div style="font-size:22px;font-weight:bold;line-height:1.2;">${esc(profile.name)}</div>
            <div style="font-size:14px;font-weight:bold;margin-top:4px;">${esc(profile.role)}</div>
            <div style="font-size:12px;line-height:1.5;margin-top:8px;opacity:0.9;">${esc(profile.tagline)}</div>
            <div style="font-size:12px;margin-top:14px;">${links}</div>
            <div style="margin-top:16px;">
              <a href="${esc(site)}" style="display:inline-block;background:#ffffff;color:#6d28d9;font-weight:bold;font-size:13px;text-decoration:none;padding:9px 16px;border-radius:20px;">Voir mon portfolio</a>
              &nbsp;
              <a href="${esc(cardUrl)}" style="display:inline-block;color:#ffffff;font-weight:bold;font-size:13px;text-decoration:underline;padding:9px 4px;">Ma carte de visite</a>
            </div>
          </td>
          <td valign="middle" width="110" align="right">
            <img src="${esc(site)}/api/qr.gif?path=/" width="96" height="96" alt="QR code du portfolio" style="display:block;border:0;border-radius:10px;background:#ffffff;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

/* ---------- Actions ---------- */

const biz = $('#biz');

function flip() {
  const flipped = biz.classList.toggle('is-flipped');
  biz.setAttribute('aria-pressed', String(flipped));
}

biz.addEventListener('click', (event) => {
  if (!event.target.closest('a')) flip();
});
biz.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    flip();
  }
});

// Légère inclinaison qui suit la souris
if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  biz.addEventListener('pointermove', (event) => {
    const r = biz.getBoundingClientRect();
    biz.style.setProperty('--ry', `${((event.clientX - r.left) / r.width - 0.5) * 14}deg`);
    biz.style.setProperty('--rx', `${(0.5 - (event.clientY - r.top) / r.height) * 10}deg`);
  });
  biz.addEventListener('pointerleave', () => {
    biz.style.removeProperty('--rx');
    biz.style.removeProperty('--ry');
  });
}

// Partager : feuille de partage du téléphone si disponible, sinon copie du lien
$('#act-share').addEventListener('click', async () => {
  const data = { title: `Carte de visite — ${profile?.name || ''}`, text: profile?.role || '', url: cardUrl };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(cardUrl);
    setStatus('Lien copié : ' + cardUrl);
  } catch (err) {
    if (err.name !== 'AbortError') setStatus("Impossible de partager ; copiez l'adresse de la page.");
  }
});

// Copier la carte « email » en HTML (avec une version texte de secours)
$('#act-copy-html').addEventListener('click', async () => {
  if (!profile) return;
  const html = emailHtml();
  const text = `${profile.name}\n${profile.role}\n${site}\nCarte : ${cardUrl}`;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
    setStatus('Carte copiée ! Collez-la dans votre email (Cmd + V).');
  } catch (err) {
    // Navigateurs sans ClipboardItem : on sélectionne l'aperçu et on le copie
    const preview = $('#email-render');
    preview.closest('details').open = true;
    const range = document.createRange();
    range.selectNodeContents(preview);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const ok = document.execCommand('copy');
    selection.removeAllRanges();
    setStatus(ok ? 'Carte copiée ! Collez-la dans votre email.' : "Sélectionnez l'aperçu ci-dessous et copiez-le.");
  }
});

/* ---------- Export de la carte en image (SVG / PNG) ---------- */
// L'image est dessinée en SVG (1200 × 750 px), avec les polices du site intégrées au fichier
// pour qu'elle s'affiche à l'identique partout (Teams, Word, PowerPoint…).

const W = 1200;
const H = 750;
const DISPLAY = "'Bricolage Grotesque', 'Helvetica Neue', Arial, sans-serif";
const BODY = "'DM Sans', 'Helvetica Neue', Arial, sans-serif";

// Mesure la largeur d'un texte avec les polices déjà chargées par la page
const measureCtx = document.createElement('canvas').getContext('2d');
function textWidth(text, font) {
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

// Coupe un texte en lignes qui tiennent dans une largeur donnée
function wrap(text, font, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (textWidth(test, font) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Récupère les polices Google du site et les transforme en données intégrables (base64).
// En cas d'échec (hors ligne), l'image utilisera des polices système proches.
let embeddedFonts = null;
async function fontFaces() {
  if (embeddedFonts !== null) return embeddedFonts;
  try {
    const cssUrl = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@500;700&display=swap';
    const css = await (await fetch(cssUrl)).text();
    // Seuls les blocs « latin » suffisent pour le français
    const blocks = css.split('/* ').filter((b) => b.startsWith('latin */'));
    const faces = await Promise.all(
      blocks.map(async (block) => {
        const url = block.match(/url\((https:[^)]+)\)/)[1];
        const buffer = await (await fetch(url)).arrayBuffer();
        let binary = '';
        new Uint8Array(buffer).forEach((b) => (binary += String.fromCharCode(b)));
        const face = block.slice(block.indexOf('@font-face')).replace(url, `data:font/woff2;base64,${btoa(binary)}`);
        return face.replace(/unicode-range:[^;]+;/, '');
      })
    );
    embeddedFonts = faces.join('\n');
  } catch (err) {
    embeddedFonts = '';
  }
  return embeddedFonts;
}

// anim (facultatif) = { t } avec t entre 0 et 1 : position dans la boucle de l'animation GIF.
// Sans anim, on obtient l'image fixe (SVG / PNG).
async function cardSvg(anim = null) {
  await document.fonts.ready;
  const fonts = await fontFaces();
  const qrSvg = await (await fetch('/api/qr.svg?path=/')).text();
  const qrInner = qrSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const qrViewBox = (qrSvg.match(/viewBox="([^"]+)"/) || [, '0 0 100 100'])[1];

  const initials = profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  // Effets de l'animation : ondulation des cercles, reflet qui balaie, petites étincelles
  const wave = (amplitude, phase = 0) => (anim ? (amplitude * Math.sin((anim.t + phase) * 2 * Math.PI)).toFixed(1) : 0);
  const shine = () => {
    const x = -500 + anim.t * 2300;
    return `<rect x="${x.toFixed(0)}" y="-200" width="160" height="1200" fill="#ffffff" fill-opacity="0.18" transform="rotate(20 ${x.toFixed(0)} 375)"/>`;
  };
  const sparkles = () =>
    [[620, 120, 0], [1150, 560, 0.33], [520, 700, 0.66], [830, 60, 0.15]]
      .map(([x, y, phase]) => {
        const k = 0.5 + 0.5 * Math.sin((anim.t + phase) * 2 * Math.PI);
        const r = (3 + 5 * k).toFixed(1);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity="${(0.3 + 0.6 * k).toFixed(2)}"/>`;
      })
      .join('');

  const tagFont = `500 24px ${BODY}`;
  const tagLines = wrap(profile.tagline, tagFont, 760).slice(0, 4);

  // Pastilles des domaines, placées les unes après les autres
  const chipFont = `700 20px ${BODY}`;
  let chipX = 64;
  const chips = (profile.domains?.items || []).slice(0, 4).map((d) => {
    const label = d.short || d.title;
    const w = textWidth(label, chipFont) + 36;
    const chip = `<rect x="${chipX}" y="520" width="${w}" height="40" rx="20" fill="#ffffff" fill-opacity="0.2"/>
      <text x="${chipX + 18}" y="547" font-family="${esc(BODY)}" font-weight="700" font-size="20" fill="#ffffff">${esc(label)}</text>`;
    chipX += w + 10;
    return chip;
  });

  // Dans une image, les liens ne sont pas cliquables : on écrit les adresses en entier
  const contactLine = contactLinks()
    .map((c) => (c.href && c.href.includes('linkedin.com') ? c.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : c.label))
    .join('   ·   ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>Carte de visite — ${esc(profile.name)}</title>
  <defs>
    <style>${fonts}</style>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6d28d9"/>
      <stop offset="0.55" stop-color="#db2777"/>
      <stop offset="1" stop-color="#f97316"/>
    </linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="48"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="${1090 + wave(18)}" cy="${-40 + wave(14, 0.25)}" r="330" fill="#ffffff" fill-opacity="0.12"/>
    <circle cx="${760 + wave(-22, 0.5)}" cy="${790 + wave(12)}" r="150" fill="#ffffff" fill-opacity="0.08"/>
    ${anim ? sparkles() + shine() : ''}
  </g>

  <rect x="64" y="64" width="96" height="96" rx="26" fill="#ffffff"/>
  <text x="112" y="126" text-anchor="middle" font-family="${esc(DISPLAY)}" font-weight="800" font-size="40" fill="#6d28d9">${esc(initials)}</text>
  <rect x="184" y="94" width="214" height="36" rx="18" fill="#000000" fill-opacity="0.18"/>
  <text x="291" y="118" text-anchor="middle" font-family="${esc(BODY)}" font-weight="700" font-size="15" letter-spacing="2" fill="#ffffff">CARTE DE VISITE</text>

  <text x="64" y="262" font-family="${esc(DISPLAY)}" font-weight="800" font-size="76" letter-spacing="-1.5" fill="#ffffff">${esc(profile.name)}</text>
  <text x="64" y="312" font-family="${esc(BODY)}" font-weight="700" font-size="30" fill="#ffffff">${esc(profile.role)}</text>
  ${tagLines.map((l, i) => `<text x="64" y="${366 + i * 34}" font-family="${esc(BODY)}" font-weight="500" font-size="24" fill="#ffffff" fill-opacity="0.9">${esc(l)}</text>`).join('\n  ')}

  ${chips.join('\n  ')}

  <line x1="64" y1="600" x2="${W - 64}" y2="600" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
  <text x="64" y="660" font-family="${esc(BODY)}" font-weight="700" font-size="24" fill="#ffffff">${esc(contactLine)}</text>

  ${anim ? `<rect x="868" y="198" width="280" height="280" rx="36" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="${(0.15 + 0.5 * (0.5 + 0.5 * Math.sin(anim.t * 2 * Math.PI))).toFixed(2)}"/>` : ''}
  <rect x="880" y="210" width="256" height="256" rx="28" fill="#ffffff"/>
  <svg x="896" y="226" width="224" height="224" viewBox="${qrViewBox}">${qrInner}</svg>
  <text x="1008" y="508" text-anchor="middle" font-family="${esc(BODY)}" font-weight="700" font-size="20" fill="#ffffff">Scannez : mon portfolio</text>
</svg>`;
}

const fileBase = () => `carte-${profile.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').toLowerCase()}`;

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Convertit le SVG en PNG haute définition (2×) via un canvas
async function cardPng() {
  const svg = await cardSvg();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function withBusy(button, task) {
  if (!profile) return;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Préparation…';
  try {
    await task();
  } catch (err) {
    console.error(err);
    setStatus("L'export a échoué. Réessayez.");
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

$('#act-svg').addEventListener('click', (e) =>
  withBusy(e.currentTarget, async () => {
    download(new Blob([await cardSvg()], { type: 'image/svg+xml' }), `${fileBase()}.svg`);
    setStatus('SVG téléchargé.');
  })
);

$('#act-png').addEventListener('click', (e) =>
  withBusy(e.currentTarget, async () => {
    download(await cardPng(), `${fileBase()}.png`);
    setStatus('PNG téléchargé : prêt à être envoyé sur Teams.');
  })
);

// Copie l'image dans le presse-papiers : il suffit ensuite de la coller dans Teams
$('#act-copy-img').addEventListener('click', (e) =>
  withBusy(e.currentTarget, async () => {
    if (!window.ClipboardItem) {
      download(await cardPng(), `${fileBase()}.png`);
      setStatus("Copie d'image non prise en charge par ce navigateur : le PNG a été téléchargé.");
      return;
    }
    // Safari exige de passer une promesse directement à ClipboardItem
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': cardPng() })]);
    setStatus('Image copiée ! Collez-la dans Teams (Cmd + V).');
  })
);

// GIF animé : on dessine 30 images de la boucle puis on les assemble avec la librairie gifenc.
// Les navigateurs ne savent pas copier un GIF animé dans le presse-papiers : on le télécharge,
// puis on le glisse dans la conversation Teams (où il s'anime).
async function cardGif() {
  const { GIFEncoder, quantize, applyPalette } = await import('/vendor/gifenc/gifenc.esm.js');
  const FRAMES = 30;
  const GW = 720;
  const GH = 450;
  const canvas = document.createElement('canvas');
  canvas.width = GW;
  canvas.height = GH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const gif = GIFEncoder();

  for (let i = 0; i < FRAMES; i++) {
    const svg = await cardSvg({ t: i / FRAMES });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    // Fond blanc sous les coins arrondis (le GIF ne gère pas la semi-transparence)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, GW, GH);
    ctx.drawImage(img, 0, 0, GW, GH);
    const { data } = ctx.getImageData(0, 0, GW, GH);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), GW, GH, { palette, delay: 80 });
    $('#act-gif').textContent = `Création… ${Math.round(((i + 1) / FRAMES) * 100)} %`;
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

$('#act-gif').addEventListener('click', (e) =>
  withBusy(e.currentTarget, async () => {
    download(await cardGif(), `${fileBase()}.gif`);
    setStatus('GIF animé téléchargé : glissez-le dans votre conversation Teams.');
  })
);

/* ---------- Chargement ---------- */

fetch('/api/profile')
  .then((res) => {
    if (!res.ok) throw new Error('profil indisponible');
    return res.json();
  })
  .then((data) => {
    profile = data;
    if (data.contact?.website) {
      site = data.contact.website.replace(/\/$/, '');
      cardUrl = `${site}/carte`;
    }
    renderCard();
  })
  .catch(() => setStatus('Impossible de charger la carte. Rechargez la page.'));
