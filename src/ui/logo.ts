/**
 * Raptor Race wordmark. A stamped cream-and-ink "RAPTOR" with an amber extrusion, over an amber
 * specimen plate reading "RACE", hooked by a sickle claw. textLength keeps it inside the viewBox at any font metrics.
 */
export function logoSVG(opts: { glow?: boolean } = {}) {
  const id = Math.random().toString(36).slice(2, 7);
  const T = (y: number, fill: string, stroke = '') =>
    `<text x="300" y="${y}" text-anchor="middle" textLength="512" lengthAdjust="spacingAndGlyphs" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="124" fill="${fill}" ${stroke}>RAPTOR</text>`;
  const extrude = [
    T(127, '#3A2A1E', 'stroke="#3A2A1E" stroke-width="10" stroke-linejoin="round" paint-order="stroke"'),
    ...[126, 125, 124, 123, 122, 121].map((y, i) => T(y, i < 3 ? '#C8620A' : '#F09A18')),
  ].join('');
  return `
<svg class="rr-logo" viewBox="0 0 600 300" role="img" aria-label="Raptor Race">
  <defs>
    <linearGradient id="plate-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE08A"/><stop offset="0.45" stop-color="#FFB21E"/><stop offset="1" stop-color="#D9730C"/>
    </linearGradient>
    <linearGradient id="paper-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF8E6"/><stop offset="1" stop-color="#EBD8B2"/>
    </linearGradient>
    <filter id="soft-${id}" x="-10%" y="-20%" width="120%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="b"/>
      <feFlood flood-color="#FFB21E" flood-opacity="${opts.glow === false ? 0 : 0.35}"/>
      <feComposite in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#soft-${id})">
    ${extrude}
    <text x="300" y="120" text-anchor="middle" textLength="512" lengthAdjust="spacingAndGlyphs" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="124"
      fill="url(#paper-${id})" stroke="#3A2A1E" stroke-width="10" stroke-linejoin="round" paint-order="stroke">RAPTOR</text>
    <!-- Sickle claw hooking the plate -->
    <path d="M150 214 C 118 188, 112 156, 136 140 C 132 166, 146 192, 176 206 Z" fill="#3A2A1E"/>
    <path d="M141 150 C 136 170, 146 190, 168 203" fill="none" stroke="#FFE08A" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
    <!-- Amber specimen plate -->
    <path d="M168 180 L432 180 L456 210 L432 240 L168 240 L144 210 Z" fill="url(#plate-${id})" stroke="#3A2A1E" stroke-width="7" stroke-linejoin="round"/>
    <path d="M168 180 L432 180 L444 195 L156 195 Z" fill="#FFF3C4" opacity="0.55"/>
    <text x="300" y="228" text-anchor="middle" letter-spacing="10" font-family="'Nunito Sans', system-ui, sans-serif" font-weight="900" font-size="46" fill="#3A2A1E">RACE</text>
  </g>
</svg>`;
}

export const amberIconSVG = `
<svg class="rr-amber-icon" viewBox="0 0 40 52" aria-hidden="true">
  <path d="M20 2 L33 18 L36 32 L20 50 L4 32 L7 18 Z" fill="#FFB21E" stroke="#3A2A1E" stroke-width="3" stroke-linejoin="round"/>
  <path d="M20 2 L33 18 L20 22 Z" fill="#FFE08A"/>
  <path d="M20 2 L7 18 L20 22 Z" fill="#FFF3C4"/>
  <path d="M4 32 L20 50 L20 34 Z" fill="#C8620A"/>
  <path d="M36 32 L20 50 L20 34 Z" fill="#E0800F"/>
</svg>`;

/** HUD/results icon for the rare collectible: amber with a trapped insect (empty slot when not found). */
export const inclusionIconSVG = (filled: boolean) => `
<svg class="rr-egg-icon" viewBox="0 0 32 40" aria-hidden="true">
  <path d="M16 2 L27 14 L29 26 L16 38 L3 26 L5 14 Z" fill="${filled ? '#2FA3C7' : '#EAD9B8'}" stroke="#3A2A1E" stroke-width="3" stroke-linejoin="round" ${filled ? '' : 'stroke-opacity="0.5"'}/>
  ${filled ? '<path d="M16 2 L27 14 L16 17 Z" fill="#BFF4FF"/><path d="M16 2 L5 14 L16 17 Z" fill="#E6FBFF" opacity=".85"/><ellipse cx="16" cy="24" rx="2.2" ry="4" fill="#3A2A1E"/><path d="M14 22 L9 19 M18 22 L23 19 M14 26 L9 29 M18 26 L23 29" stroke="#3A2A1E" stroke-width="1.6" stroke-linecap="round"/>' : ''}
</svg>`;

export const eggIconSVG = (filled: boolean) => `
<svg class="rr-egg-icon" viewBox="0 0 32 40" aria-hidden="true">
  <path d="M16 2 C 25 2, 30 16, 30 25 C 30 33, 24 38, 16 38 C 8 38, 2 33, 2 25 C 2 16, 7 2, 16 2 Z"
    fill="${filled ? '#F6EBD5' : '#EAD9B8'}" stroke="#3A2A1E" stroke-width="3" ${filled ? '' : 'stroke-opacity="0.5" fill-opacity="0.9"'}/>
  ${filled ? '<circle cx="11" cy="17" r="2" fill="#A98F6C"/><circle cx="19" cy="25" r="2.4" fill="#A98F6C"/><circle cx="21" cy="13" r="1.5" fill="#7D6650"/>' : ''}
</svg>`;
