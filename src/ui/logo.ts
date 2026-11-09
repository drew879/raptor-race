/** Raptor Race wordmark: heavy Fraunces in an amber gradient with an ink outline and a sickle-claw slash. */
export function logoSVG(opts: { glow?: boolean } = {}) {
  const id = Math.random().toString(36).slice(2, 7);
  return `
<svg class="rr-logo" viewBox="0 0 620 330" role="img" aria-label="Raptor Race">
  <defs>
    <linearGradient id="amb-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF3C4"/>
      <stop offset="0.28" stop-color="#FFE08A"/>
      <stop offset="0.58" stop-color="#FFB21E"/>
      <stop offset="1" stop-color="#C8620A"/>
    </linearGradient>
    <linearGradient id="claw-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3A2A1E" stop-opacity="0"/>
      <stop offset="0.18" stop-color="#3A2A1E"/>
      <stop offset="1" stop-color="#3A2A1E"/>
    </linearGradient>
    <filter id="glow-${id}" x="-20%" y="-30%" width="140%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="b"/>
      <feFlood flood-color="#FFB21E" flood-opacity="${opts.glow === false ? 0 : 0.55}"/>
      <feComposite in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#glow-${id})">
    <path d="M58 182 C 190 214, 380 222, 560 168 C 420 236, 196 238, 58 182 Z" fill="url(#claw-${id})"/>
    <path d="M300 205 C 410 203, 500 190, 560 168 C 520 196, 430 214, 300 214 Z" fill="#FFB21E" opacity="0.9"/>
    <text x="310" y="146" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="132" letter-spacing="1"
      fill="url(#amb-${id})" stroke="#3A2A1E" stroke-width="11" stroke-linejoin="round" paint-order="stroke">RAPTOR</text>
    <text x="318" y="300" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="124" letter-spacing="10"
      fill="url(#amb-${id})" stroke="#3A2A1E" stroke-width="11" stroke-linejoin="round" paint-order="stroke">RACE</text>
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

export const eggIconSVG = (filled: boolean) => `
<svg class="rr-egg-icon" viewBox="0 0 32 40" aria-hidden="true">
  <path d="M16 2 C 25 2, 30 16, 30 25 C 30 33, 24 38, 16 38 C 8 38, 2 33, 2 25 C 2 16, 7 2, 16 2 Z"
    fill="${filled ? '#F4EAD6' : 'none'}" stroke="#3A2A1E" stroke-width="3" ${filled ? '' : 'stroke-dasharray="4 4"'}/>
  ${filled ? '<circle cx="11" cy="17" r="2" fill="#A98F6C"/><circle cx="19" cy="25" r="2.4" fill="#A98F6C"/><circle cx="21" cy="13" r="1.5" fill="#7D6650"/>' : ''}
</svg>`;
