/**
 * Ink drawings for the Field Journal's inclusion pages: the creature inside a blue amber drop. A found page
 * shows the drawing; a missing one shows the drop as a pale outline with a question mark.
 */
const INK = '#3A2A1E';

const DROP = 'M60 6 C 84 30, 104 52, 104 76 C 104 100, 84 116, 60 116 C 36 116, 16 100, 16 76 C 16 52, 36 30, 60 6 Z';

const CREATURES: Record<string, string> = {
  // A downy feather: a short quill with loose, wispy barbs.
  feather: `<path d="M44 96 C 54 80, 64 62, 78 44" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const t = i / 6, x = 48 + t * 28, y = 90 - t * 44;
      return `<path d="M${x} ${y} q -16 -4 -22 -16" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".85"/>
        <path d="M${x} ${y} q 10 8 22 6" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".85"/>`;
    }).join('')}`,
  // A hard tick from above, legs gripping a feather barb.
  tick: `<path d="M30 54 C 50 50, 70 58, 92 52" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".7"/>
    <ellipse cx="60" cy="80" rx="15" ry="19" fill="#6E4B32" stroke="${INK}" stroke-width="2.4"/>
    <ellipse cx="60" cy="74" rx="8" ry="9" fill="#8E6A48" stroke="${INK}" stroke-width="1.4"/>
    <path d="M56 61 L 54 54 M 64 61 L 66 54" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
    ${[-1, 1].map((s) => [0, 1, 2, 3].map((k) => `<path d="M${60 + s * 12} ${70 + k * 7} q ${s * 10} -2 ${s * 16} ${k * 5 - 6}" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`).join('')).join('')}`,
  // A wasp-waisted ant in profile.
  ant: `<ellipse cx="40" cy="78" rx="9" ry="7" fill="#5A3B28" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="60" cy="76" rx="11" ry="6" fill="#5A3B28" stroke="${INK}" stroke-width="2"/>
    <circle cx="70" cy="76" r="2.5" fill="${INK}"/>
    <ellipse cx="84" cy="80" rx="13" ry="9" fill="#5A3B28" stroke="${INK}" stroke-width="2"/>
    <path d="M33 74 q -8 -10 -4 -18 M 35 73 q -2 -12 4 -16" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${[52, 60, 68].map((x, k) => `<path d="M${x} 81 l ${-6 + k * 4} 14 M ${x} 81 l ${4 + k * 2} 13" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`).join('')}`,
  // An orb web, a little lopsided, with a fly caught in it and glue droplets on the threads.
  web: `${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k / 8) * Math.PI * 2 + 0.2; return `<path d="M60 80 L ${(60 + Math.cos(a) * 36).toFixed(1)} ${(80 + Math.sin(a) * 30).toFixed(1)}" stroke="${INK}" stroke-width="1.2" opacity=".8"/>`; }).join('')}
    ${[10, 19, 28].map((r) => `<polygon points="${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = (k / 8) * Math.PI * 2 + 0.2; return `${(60 + Math.cos(a) * r * 1.2).toFixed(1)},${(80 + Math.sin(a) * r).toFixed(1)}`; }).join(' ')}" fill="none" stroke="${INK}" stroke-width="1.1" opacity=".75"/>`).join('')}
    ${[[48, 70], [74, 88], [66, 64], [44, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#FFFFFF" stroke="${INK}" stroke-width=".6"/>`).join('')}
    <ellipse cx="76" cy="72" rx="5" ry="3.4" fill="#4A3426" stroke="${INK}" stroke-width="1.4"/>
    <path d="M73 69 q -3 -6 2 -7 M 79 69 q 3 -6 -2 -7" stroke="${INK}" stroke-width="1.1" fill="#E8F6FA" opacity=".9"/>`,
  // A hatchling bird curled up: round head, beak, a wing with its first flight feathers, tiny clawed feet.
  bird: `<ellipse cx="62" cy="84" rx="20" ry="14" fill="#7A5A40" stroke="${INK}" stroke-width="2.2"/>
    <circle cx="42" cy="72" r="10" fill="#8A6A4E" stroke="${INK}" stroke-width="2.2"/>
    <path d="M33 72 l -8 3 l 8 2" fill="#E0A04A" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="40" cy="70" r="2.2" fill="${INK}"/>
    <path d="M56 78 C 66 72, 78 74, 84 82 C 76 84, 66 86, 58 84 Z" fill="#5E4330" stroke="${INK}" stroke-width="1.6"/>
    ${[0, 1, 2, 3].map((k) => `<path d="M${64 + k * 5} 80 l ${6 + k} 6" stroke="${INK}" stroke-width="1.1"/>`).join('')}
    <path d="M58 97 l -3 6 M 58 97 l 2 6 M 66 97 l -2 6 M 66 97 l 3 6" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`,
  // A short run of tail bones with feathers fanning off both sides.
  tail: `<path d="M30 92 C 46 84, 66 80, 92 62" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M30 92 C 46 84, 66 80, 92 62" stroke="#8E6A48" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-dasharray="5 2.5"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => { const t = i / 6, x = 34 + t * 56, y = 90 - t * 26 - t * t * 4; return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q -4 -14 4 -22" stroke="${INK}" stroke-width="1.3" fill="none" opacity=".85"/><path d="M${x.toFixed(1)} ${y.toFixed(1)} q 6 12 14 14" stroke="${INK}" stroke-width="1.3" fill="none" opacity=".85"/>`; }).join('')}`,
};

export function inclusionArt(kind: string, found: boolean) {
  if (!found) {
    return `<svg viewBox="0 0 120 122" class="incl-art missing" aria-hidden="true">
      <path d="${DROP}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="6 5" opacity=".45"/>
      <text x="60" y="88" text-anchor="middle" font-size="40" font-weight="900" fill="${INK}" opacity=".4">?</text></svg>`;
  }
  return `<svg viewBox="0 0 120 122" class="incl-art" aria-hidden="true">
    <defs><radialGradient id="g-${kind}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#E6FBFF"/><stop offset=".55" stop-color="#7FD4EC"/><stop offset="1" stop-color="#2FA3C7"/></radialGradient></defs>
    <path d="${DROP}" fill="url(#g-${kind})" stroke="${INK}" stroke-width="3"/>
    ${CREATURES[kind] ?? ''}
    <path d="M38 40 C 44 30, 52 22, 58 16" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/></svg>`;
}

/** A small swatch of a plumage: base, the light streak and the accent flash. */
export function plumageSwatch(c: { base: number; light: number; accent: number; dark: number }, locked: boolean) {
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  return `<svg viewBox="0 0 64 40" class="swatch-art" aria-hidden="true">
    <path d="M4 26 C 14 10, 40 6, 60 14 L 58 20 C 40 16, 20 22, 6 32 Z" fill="${hex(c.base)}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M12 24 C 24 16, 40 14, 54 17" stroke="${hex(c.light)}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M44 9 l 6 -6 l 2 8 Z" fill="${hex(c.accent)}" stroke="${INK}" stroke-width="1.2"/>
    ${locked ? `<rect x="0" y="0" width="64" height="40" fill="#F3E6CC" opacity=".6"/><path d="M26 22 h12 v10 h-12 Z M28 22 v-4 a4 4 0 0 1 8 0 v4" fill="none" stroke="${INK}" stroke-width="2"/>` : ''}
  </svg>`;
}
