const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const nodemailer = require('nodemailer');
const qrcode = require('qrcode-generator');

const app = express();
const PORT = process.env.PORT || 3000;

const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');
const MESSAGES_FILE = path.join(__dirname, 'data', 'messages.json');
const ENTRETIEN_FILE = path.join(__dirname, 'data', 'entretien.json');

// Render (comme la plupart des hébergeurs) place un proxy devant l'app :
// cette option permet de récupérer la vraie IP du visiteur pour l'anti-spam.
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Encodeur GIF (librairie gifenc) chargé par la carte de visite pour l'export « GIF animé »
app.use('/vendor/gifenc', express.static(path.join(__dirname, 'node_modules', 'gifenc', 'dist')));

/* ---------- Contenu du portfolio ---------- */

// Le fichier est relu à chaque requête : vos modifications de content.json
// sont visibles sans redémarrer le serveur.
async function readContent() {
  const raw = await fs.readFile(CONTENT_FILE, 'utf8');
  return JSON.parse(raw);
}

app.get('/api/profile', async (req, res) => {
  try {
    const { projects, ...profile } = await readContent();
    res.json(profile);
  } catch (err) {
    console.error('Lecture de content.json impossible :', err.message);
    res.status(500).json({ error: 'Contenu indisponible.' });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const { projects = [] } = await readContent();
    // Liste des catégories, sans doublon, dans l'ordre d'apparition
    const categories = [...new Set(projects.map((p) => p.category))];
    res.json({ categories, projects });
  } catch (err) {
    console.error('Lecture de content.json impossible :', err.message);
    res.status(500).json({ error: 'Projets indisponibles.' });
  }
});

// Préparation d'entretien : pitch, histoires STAR, questions. Relu à chaque requête, comme content.json.
app.get('/api/entretien', async (req, res) => {
  try {
    res.json(JSON.parse(await fs.readFile(ENTRETIEN_FILE, 'utf8')));
  } catch (err) {
    console.error('Lecture de entretien.json impossible :', err.message);
    res.status(500).json({ error: 'Contenu indisponible.' });
  }
});

/* ---------- Formulaire de contact ---------- */

// Anti-spam simple : 3 messages maximum par IP toutes les 10 minutes.
// Stocké en mémoire : remis à zéro à chaque redémarrage, suffisant pour un portfolio.
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const recentSubmissions = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (recentSubmissions.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) {
    recentSubmissions.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  recentSubmissions.set(ip, timestamps);
  return false;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateContact({ name, email, message }) {
  const errors = {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    errors.name = 'Indiquez un nom (2 à 80 caractères).';
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.length > 120) {
    errors.email = 'Indiquez une adresse email valide.';
  }
  if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 2000) {
    errors.message = 'Votre message doit faire entre 10 et 2000 caractères.';
  }
  return errors;
}

// Les écritures sont mises en file d'attente pour éviter que deux messages
// simultanés ne s'écrasent dans le fichier.
let writeQueue = Promise.resolve();

function saveMessage(entry) {
  writeQueue = writeQueue.then(async () => {
    let messages = [];
    try {
      messages = JSON.parse(await fs.readFile(MESSAGES_FILE, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('messages.json illisible, il sera recréé.');
    }
    messages.push(entry);
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2));
  });
  return writeQueue;
}

// L'email n'est activé que si toutes les variables SMTP sont définies.
const smtpConfigured = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_TO'].every(
  (key) => process.env[key]
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

function sendEmail(entry) {
  return transporter.sendMail({
    from: `"Portfolio" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_TO,
    replyTo: `"${entry.name}" <${entry.email}>`,
    subject: `Nouveau message de ${entry.name}`,
    text: `De : ${entry.name} <${entry.email}>\nLe : ${entry.date}\n\n${entry.message}`,
  });
}

app.post('/api/contact', async (req, res) => {
  const { name, email, message, website } = req.body || {};

  // Champ piège invisible pour les humains : s'il est rempli, c'est un robot.
  // On répond « OK » sans rien faire pour ne pas l'aider.
  if (website) return res.json({ ok: true });

  const errors = validateContact({ name, email, message });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Certains champs sont invalides.', fields: errors });
  }

  if (isRateLimited(req.ip)) {
    return res
      .status(429)
      .json({ error: 'Trop de messages envoyés. Réessayez dans quelques minutes.' });
  }

  const entry = {
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    date: new Date().toISOString(),
  };

  // On tente les deux canaux ; il suffit qu'un seul fonctionne.
  const [saved, mailed] = await Promise.allSettled([
    saveMessage(entry),
    smtpConfigured ? sendEmail(entry) : Promise.reject(new Error('SMTP non configuré')),
  ]);

  if (saved.status === 'rejected') console.error('Sauvegarde échouée :', saved.reason.message);
  if (mailed.status === 'rejected' && smtpConfigured) {
    console.error('Envoi email échoué :', mailed.reason.message);
  }

  if (saved.status === 'fulfilled' || mailed.status === 'fulfilled') {
    return res.json({ ok: true });
  }
  res.status(500).json({ error: "Le message n'a pas pu être envoyé. Réessayez plus tard." });
});

/* ---------- Carte de visite numérique et CV ---------- */

// Adresse publique du site, par ordre de priorité : variable d'environnement SITE_URL,
// champ contact.website de content.json, sinon adresse de la requête (local, Render…).
async function siteUrl(req) {
  let website = process.env.SITE_URL;
  if (!website) {
    try {
      website = (await readContent()).contact?.website;
    } catch (err) {
      website = '';
    }
  }
  return (website || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

// Pages dédiées, avec une adresse courte : /carte, /cv, /ia et /entretien
app.get('/carte', (req, res) => res.sendFile(path.join(__dirname, 'public', 'carte.html')));
app.get('/cv', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cv.html')));
app.get('/ia', (req, res) => res.sendFile(path.join(__dirname, 'public', 'ia.html')));
app.get('/entretien', (req, res) => res.sendFile(path.join(__dirname, 'public', 'entretien.html')));

// QR code qui pointe vers une page de ce site, ex. /api/qr.svg?path=/carte
// Seuls les chemins internes sont acceptés : impossible de s'en servir pour un autre site.
async function makeQr(req) {
  const page = typeof req.query.path === 'string' && /^\/[\w\-/#]*$/.test(req.query.path) ? req.query.path : '/';
  const qr = qrcode(0, 'M');
  qr.addData((await siteUrl(req)) + page);
  qr.make();
  return qr;
}

// Version SVG (nette à toutes les tailles) pour les pages du site et le PDF
app.get('/api/qr.svg', async (req, res) => {
  res.type('image/svg+xml').send((await makeQr(req)).createSvgTag({ cellSize: 6, margin: 2, scalable: true }));
});

// Version GIF pour les emails : Gmail et Outlook n'affichent pas les images SVG
app.get('/api/qr.gif', async (req, res) => {
  const dataUrl = (await makeQr(req)).createDataURL(6, 12);
  res.type('image/gif').send(Buffer.from(dataUrl.split(',')[1], 'base64'));
});

// Fiche contact (vCard) : un clic l'ajoute au carnet d'adresses du téléphone ou de l'ordinateur
const vEscape = (value = '') => String(value).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');

app.get('/api/vcard', async (req, res) => {
  try {
    const content = await readContent();
    const [firstName, ...rest] = content.name.split(' ');
    const lastName = rest.join(' ');
    const contact = content.contact || {};
    const linkedin = (content.socials || []).find((s) => s.label === 'LinkedIn' && s.url);
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${vEscape(lastName)};${vEscape(firstName)};;;`,
      `FN:${vEscape(content.name)}`,
      `TITLE:${vEscape(content.role)}`,
      contact.phone ? `TEL;TYPE=CELL:${vEscape(contact.phone)}` : '',
      contact.email ? `EMAIL;TYPE=INTERNET:${vEscape(contact.email)}` : '',
      `URL:${await siteUrl(req)}`,
      linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${linkedin.url}` : '',
      contact.location ? `ADR;TYPE=WORK:;;;${vEscape(contact.location)};;;` : '',
      `NOTE:${vEscape(content.tagline)}`,
      'END:VCARD',
    ].filter(Boolean);
    const fileName = content.name.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase();
    res.set('Content-Disposition', `attachment; filename="${fileName}.vcf"`);
    res.type('text/vcard').send(lines.join('\r\n'));
  } catch (err) {
    console.error('vCard impossible :', err.message);
    res.status(500).json({ error: 'Fiche contact indisponible.' });
  }
});

// Toute autre route /api inconnue renvoie une erreur JSON claire
app.use('/api', (req, res) => res.status(404).json({ error: 'Route introuvable.' }));

app.listen(PORT, () => {
  console.log(`Portfolio en ligne sur http://localhost:${PORT}`);
  console.log(smtpConfigured ? 'Email : activé' : 'Email : désactivé (messages enregistrés dans data/messages.json)');
});
