/* =============================================================================
 * Illustrations animées des cartes projets
 * -----------------------------------------------------------------------------
 * Chaque projet de content.json peut avoir un champ "visual" (ex. "outbox").
 * Ce fichier associe chaque nom à un petit dessin SVG (blanc, posé sur le dégradé
 * de la carte). Les animations sont des classes CSS « a-… » définies dans style.css :
 *   a-dash   : pointillés qui défilent       a-pulse : battement
 *   a-travel : déplacement horizontal (--dx) a-float : flottement
 *   a-spin   : rotation                      a-grow  : barre qui monte
 *   a-draw   : trait qui se dessine          a-pop   : apparition
 *   a-blink  : clignotement                  a-drop  : chute en place
 * Le délai de chaque élément se règle avec style="--d: 0.4s".
 * ===========================================================================*/

window.COVERS = (() => {
  // Petits raccourcis de dessin
  const doc = (x, y, w = 34, h = 44, extra = '') =>
    `<g ${extra}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" class="f-soft"/>
      <path d="M${x + 8} ${y + 12}h${w - 16}M${x + 8} ${y + 20}h${w - 16}M${x + 8} ${y + 28}h${w - 22}" class="s-line"/></g>`;
  const envelope = (x, y, extra = '') =>
    `<g ${extra}><rect x="${x}" y="${y}" width="26" height="18" rx="3" class="f-solid"/>
      <path d="M${x} ${y + 2}l13 9 13-9" class="s-ink"/></g>`;
  const cylinder = (x, y, w = 46, h = 56) =>
    `<g><path d="M${x} ${y + 8}v${h - 16}a${w / 2} 8 0 0 0 ${w} 0v${-(h - 16)}" class="f-soft"/>
      <ellipse cx="${x + w / 2}" cy="${y + 8}" rx="${w / 2}" ry="8" class="f-solid"/>
      <path d="M${x} ${y + h / 2}a${w / 2} 8 0 0 0 ${w} 0" class="s-line"/></g>`;

  return {
    // Réseau de services qui échangent
    network: `
      <path d="M80 80L160 40L240 80L160 120Z M80 80H240 M160 40V120" class="s-line a-dash"/>
      ${[[80, 80], [160, 40], [240, 80], [160, 120], [160, 80]].map(([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="${i === 4 ? 13 : 10}" class="f-solid a-pulse" style="--d:${i * 0.35}s"/>`).join('')}
      <circle cx="80" cy="80" r="4.5" class="f-ink a-travel" style="--dx:160px;--d:0.2s"/>
      <circle cx="160" cy="40" r="4.5" class="f-ink a-travel-y" style="--dy:80px;--d:1.1s"/>`,

    // Terminal qui se remplit
    dx: `
      <rect x="70" y="26" width="180" height="110" rx="10" class="f-soft"/>
      <circle cx="84" cy="38" r="3.5" class="f-solid"/><circle cx="96" cy="38" r="3.5" class="f-solid"/><circle cx="108" cy="38" r="3.5" class="f-solid"/>
      ${[[58, 120], [72, 90], [86, 140], [100, 70], [114, 110]].map(([y, w], i) =>
        `<rect x="84" y="${y}" width="${w}" height="6" rx="3" class="f-solid a-type" style="--d:${i * 0.45}s"/>`).join('')}
      <rect x="200" y="112" width="8" height="12" class="f-solid a-blink"/>`,

    // Outbox : base → enveloppes → queue
    outbox: `
      ${cylinder(46, 52)}
      <rect x="226" y="54" width="54" height="52" rx="8" class="f-soft"/>
      <path d="M236 70h34M236 80h34M236 90h34" class="s-line"/>
      <path d="M96 80H222" class="s-line a-dash"/>
      ${[0, 1, 2].map((i) => envelope(98, 71, `class="a-travel a-fade" style="--dx:106px;--d:${i * 0.8}s"`)).join('')}`,

    // Étapes de workflow qui s'enchaînent
    workflow: `
      <path d="M70 80H250" class="s-line"/>
      ${[70, 130, 190, 250].map((x, i) => `
        <circle cx="${x}" cy="80" r="17" class="f-soft"/>
        <circle cx="${x}" cy="80" r="17" class="f-solid a-step" style="--d:${i * 0.6}s"/>
        <path d="M${x - 7} 80l5 5 9-10" class="s-ink a-step" style="--d:${i * 0.6}s"/>`).join('')}`,

    // Bouclier, clé et anneau de sécurité
    security: `
      <circle cx="160" cy="80" r="58" class="s-line a-spin" stroke-dasharray="6 9"/>
      <path d="M160 34l38 14v28c0 26-18 42-38 50-20-8-38-24-38-50V48z" class="f-solid a-pulse"/>
      <circle cx="160" cy="74" r="10" class="s-ink-thick"/>
      <path d="M160 84v18M160 94h8" class="s-ink-thick"/>`,

    // Documents qui se déploient en éventail
    'ged-bundle': `
      ${doc(118, 42, 44, 58, 'class="a-fan" style="--r:-14deg;--d:0s"')}
      ${doc(138, 38, 44, 58, 'class="a-fan" style="--r:0deg;--d:0.2s"')}
      ${doc(158, 42, 44, 58, 'class="a-fan" style="--r:14deg;--d:0.4s"')}
      <rect x="132" y="108" width="56" height="16" rx="8" class="f-solid a-pulse"/>`,

    // Document signé, deux fournisseurs qui alternent
    signature: `
      <rect x="96" y="26" width="104" height="112" rx="8" class="f-soft"/>
      <path d="M110 46h76M110 58h76M110 70h50" class="s-line"/>
      <path d="M112 112c10-22 18-22 16-4s14-24 20-10 8 10 14-2 10-8 20 4" class="s-ink-light a-draw"/>
      <rect x="218" y="48" width="64" height="24" rx="12" class="f-solid a-swap"/>
      <rect x="218" y="88" width="64" height="24" rx="12" class="f-solid a-swap" style="--d:1.6s"/>`,

    // Briques qui s'empilent (socle commun)
    blocks: `
      ${[[110, 102, 48], [162, 102, 48], [214, 102, 48], [136, 70, 48], [188, 70, 48], [162, 38, 48]].map(([x, y, w], i) =>
        `<rect x="${x - 20}" y="${y}" width="${w}" height="28" rx="6" class="${i % 2 ? 'f-solid' : 'f-soft'} a-drop" style="--d:${i * 0.25}s"/>`).join('')}`,

    // Envoi de documents vers le stockage
    ged: `
      <path d="M118 104a26 26 0 0 1 4-52 34 34 0 0 1 64-6 28 28 0 0 1 16 58z" class="f-soft"/>
      ${doc(150, 96, 24, 32, 'class="a-upload" style="--d:0s"')}
      ${doc(186, 100, 24, 32, 'class="a-upload" style="--d:1.2s"')}
      <path d="M162 92V68m-8 8 8-8 8 8" class="s-ink-thick a-pulse"/>`,

    // Graphique en barres qui montent
    bars: `
      <path d="M60 128H260" class="s-line"/>
      ${[[80, 46], [116, 70], [152, 38], [188, 84], [224, 96]].map(([x, h], i) =>
        `<rect x="${x}" y="${128 - h}" width="24" height="${h}" rx="5" class="${i === 4 ? 'f-solid' : 'f-soft'} a-grow" style="--d:${i * 0.15}s"/>`).join('')}
      <path d="M92 76L128 62L164 84L200 48L236 36" class="s-ink-light a-draw" style="--d:0.6s"/>`,

    // Anneau (répartition des fonds)
    donut: `
      <g class="a-spin-slow" style="transform-origin:160px 80px">
        <circle cx="160" cy="80" r="44" class="s-ring" stroke-dasharray="110 300"/>
        <circle cx="160" cy="80" r="44" class="s-ring-soft" stroke-dasharray="70 300" stroke-dashoffset="-118"/>
        <circle cx="160" cy="80" r="44" class="s-ring-faint" stroke-dasharray="80 300" stroke-dashoffset="-196"/>
      </g>
      <circle cx="160" cy="80" r="22" class="f-soft a-pulse"/>
      <rect x="226" y="54" width="46" height="8" rx="4" class="f-solid"/><rect x="226" y="72" width="34" height="8" rx="4" class="f-soft"/><rect x="226" y="90" width="40" height="8" rx="4" class="f-soft"/>`,

    // Courbe « live » de supervision
    monitor: `
      <rect x="60" y="30" width="200" height="104" rx="10" class="f-soft"/>
      <path d="M72 104L100 96L122 108L146 70L168 86L192 52L214 64L246 44" class="s-ink-light a-draw-loop"/>
      <circle cx="246" cy="44" r="5" class="f-solid a-pulse"/>
      <rect x="74" y="40" width="40" height="8" rx="4" class="f-solid"/><rect x="120" y="40" width="26" height="8" rx="4" class="f-soft a-blink"/>`,

    // Cloche et messages
    notify: `
      <g class="a-swing" style="transform-origin:120px 44px">
        <path d="M100 98c6-6 6-14 6-30a14 14 0 0 1 28 0c0 16 0 24 6 30z" class="f-solid"/>
        <circle cx="120" cy="104" r="5" class="f-solid"/>
      </g>
      <rect x="160" y="40" width="96" height="26" rx="13" class="f-soft a-pop" style="--d:0s"/>
      <rect x="176" y="76" width="80" height="26" rx="13" class="f-solid a-pop" style="--d:0.7s"/>
      <rect x="160" y="112" width="70" height="20" rx="10" class="f-soft a-pop" style="--d:1.4s"/>`,

    // Migration : ancien bloc → nouveaux services
    legacy: `
      <rect x="54" y="44" width="76" height="72" rx="6" class="f-soft"/>
      <path d="M66 62h52M66 74h52M66 86h36M66 98h44" class="s-line"/>
      <path d="M136 80H190" class="s-line a-dash"/>
      ${[0, 1, 2].map((i) => `<circle cx="138" cy="80" r="5" class="f-solid a-travel a-fade" style="--dx:52px;--d:${i * 0.7}s"/>`).join('')}
      ${[[200, 40], [244, 40], [200, 84], [244, 84]].map(([x, y], i) =>
        `<rect x="${x}" y="${y}" width="36" height="36" rx="9" class="f-solid a-pulse" style="--d:${i * 0.3}s"/>`).join('')}`,

    // Fusée + roue Kubernetes
    rocket: `
      <g class="a-spin-slow" style="transform-origin:236px 84px">
        <circle cx="236" cy="84" r="30" class="s-line"/>
        ${[0, 45, 90, 135].map((deg) => {
          // Rayons de la roue, calculés sans attribut transform (que le CSS réinterpréterait)
          const r = (deg * Math.PI) / 180;
          const dx = (30 * Math.sin(r)).toFixed(1);
          const dy = (30 * Math.cos(r)).toFixed(1);
          return `<path d="M${236 + +dx} ${84 - dy}L${236 - dx} ${84 + +dy}" class="s-line"/>`;
        }).join('')}
        <circle cx="236" cy="84" r="8" class="f-soft"/>
      </g>
      <g class="a-float">
        <path d="M124 34c22 10 30 34 22 62h-24c-8-28 0-52 2-62z" class="f-solid"/>
        <circle cx="134" cy="62" r="7" class="s-ink-thick"/>
        <path d="M122 82l-12 16h14zM146 82l12 16h-14z" class="f-soft"/>
        <path d="M128 100h12l-6 18z" class="f-flame a-blink"/>
      </g>`,

    /* ----- Domaines métier ----- */

    // Épargne retraite : pièces qui tombent dans une tirelire, épargne qui grandit
    'd-retirement': `
      <rect x="104" y="70" width="70" height="56" rx="14" class="f-soft"/>
      <rect x="128" y="64" width="22" height="6" rx="3" class="f-solid"/>
      ${[0, 1, 2].map((i) => `<circle cx="139" cy="30" r="9" class="f-solid a-coin" style="--d:${i * 0.8}s"/>`).join('')}
      ${[[196, 30], [216, 46], [236, 62], [256, 80]].map(([x, h], i) =>
        `<rect x="${x}" y="${126 - h}" width="14" height="${h}" rx="4" class="f-solid a-grow" style="--d:${i * 0.2}s"/>`).join('')}
      <path d="M190 120H276" class="s-line"/>`,

    // Défiscalisation outre-mer : soleil, mer, bateau / matériel productif
    'd-tax': `
      <g class="a-spin-slow" style="transform-origin:236px 46px">
        <circle cx="236" cy="46" r="16" class="f-solid"/>
        ${[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = (deg * Math.PI) / 180;
          return `<path d="M${(236 + 22 * Math.cos(r)).toFixed(1)} ${(46 + 22 * Math.sin(r)).toFixed(1)}L${(236 + 30 * Math.cos(r)).toFixed(1)} ${(46 + 30 * Math.sin(r)).toFixed(1)}" class="s-ink-light"/>`;
        }).join('')}
      </g>
      <g class="a-float">
        <path d="M100 98h86l-12 18h-62z" class="f-solid"/>
        <rect x="118" y="74" width="26" height="24" rx="3" class="f-soft"/>
        <rect x="148" y="66" width="22" height="32" rx="3" class="f-solid"/>
        <path d="M159 66V48l12 6" class="s-ink-light"/>
      </g>
      <path d="M70 124q12-8 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0" class="s-line a-dash"/>
      <path d="M82 138q12-8 24 0t24 0 24 0 24 0 24 0 24 0 24 0" class="s-line a-dash" style="opacity:.5"/>`,

    // Distribution : un produit, des cabinets, des investisseurs
    'd-distribution': `
      ${[[96, 42], [96, 118], [236, 42], [236, 118], [270, 80]].map(([x, y]) => `<path d="M166 80L${x} ${y}" class="s-line a-dash"/>`).join('')}
      <rect x="146" y="60" width="40" height="40" rx="10" class="f-solid a-pulse"/>
      <path d="M156 80h20M166 70v20" class="s-ink-thick"/>
      ${[[96, 42], [96, 118], [236, 42], [236, 118], [270, 80]].map(([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="12" class="f-soft"/><circle cx="${x}" cy="${y - 3}" r="4" class="f-solid"/><path d="M${x - 7} ${y + 8}a7 6 0 0 1 14 0" class="f-solid a-pop" style="--d:${i * 0.4}s"/>`).join('')}
      <circle cx="166" cy="80" r="4" class="f-ink a-travel" style="--dx:70px;--d:0.3s"/>`,

    // Private Equity : entreprises qui grandissent, flèche de croissance
    'd-pe': `
      ${[[86, 22], [128, 40], [170, 62], [212, 88]].map(([x, h], i) => `
        <rect x="${x}" y="${128 - h}" width="30" height="${h}" rx="5" class="${i === 3 ? 'f-solid' : 'f-soft'} a-grow" style="--d:${i * 0.25}s"/>
        <rect x="${x + 8}" y="${134 - h}" width="5" height="5" class="f-solid a-blink" style="animation-delay:${i * 0.3}s"/>`).join('')}
      <path d="M84 96L132 78L176 62L250 30" class="s-ink-light a-draw" style="--d:0.8s"/>
      <path d="M236 28l16 0-2 15" class="s-ink-light a-draw" style="--d:1.2s"/>`,

    // Immobilier : immeubles aux fenêtres allumées, loyers qui circulent
    'd-realestate': `
      <rect x="92" y="44" width="56" height="88" rx="4" class="f-soft"/>
      <rect x="156" y="24" width="52" height="108" rx="4" class="f-solid"/>
      <rect x="216" y="64" width="46" height="68" rx="4" class="f-soft"/>
      ${[[102, 56], [124, 56], [102, 78], [124, 100], [102, 100]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="12" height="12" rx="2" class="f-solid a-swap" style="--d:${i * 0.5}s"/>`).join('')}
      ${[[166, 36], [186, 36], [166, 60], [186, 84], [166, 108]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="12" height="12" rx="2" class="f-soft a-swap" style="--d:${0.3 + i * 0.5}s"/>`).join('')}
      ${[[226, 76], [244, 98]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="10" height="10" rx="2" class="f-solid a-swap" style="--d:${0.6 + i * 0.7}s"/>`).join('')}
      <path d="M80 132H276" class="s-line"/>`,

    // Conformité : checklist qui se coche, bouclier
    'd-compliance': `
      <rect x="92" y="24" width="112" height="116" rx="10" class="f-soft"/>
      ${[0, 1, 2, 3].map((i) => `
        <rect x="106" y="${42 + i * 24}" width="14" height="14" rx="3" class="f-solid"/>
        <path d="M109 ${49 + i * 24}l3 3 6-7" class="s-ink a-step" style="--d:${i * 0.5}s"/>
        <rect x="128" y="${45 + i * 24}" width="${[60, 46, 54, 38][i]}" height="7" rx="3.5" class="f-solid"/>`).join('')}
      <path d="M244 42l26 10v20c0 18-12 30-26 36-14-6-26-18-26-36V52z" class="f-solid a-pulse"/>
      <path d="M234 74l7 7 13-14" class="s-ink-thick"/>`,

    // Comptes & droits : utilisateurs, clé qui circule entre eux
    'd-identity': `
      ${[[110, 70], [170, 52], [230, 70]].map(([x, y], i) => `
        <circle cx="${x}" cy="${y}" r="15" class="${i === 1 ? 'f-solid' : 'f-soft'} a-pulse" style="--d:${i * 0.4}s"/>
        <path d="M${x - 24} ${y + 50}a24 22 0 0 1 48 0z" class="${i === 1 ? 'f-solid' : 'f-soft'}"/>`).join('')}
      <g class="a-travel" style="--dx:120px">
        <circle cx="104" cy="138" r="7" class="s-ink-light"/>
        <path d="M111 138h14m-5 0v5m-5-5v4" class="s-ink-light"/>
      </g>`,
  };
})();
