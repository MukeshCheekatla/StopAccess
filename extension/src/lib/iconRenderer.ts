import { resolveIconUrl } from '@focusgate/core';
/**
 * THE single shared HTML icon renderer for all browser extension screens.
 *
 * Returns a self-contained HTML string with:
 *  - Consistent container size and border-radius
 *  - onerror fallback to 2-letter initials
 *  - onload fade-in animation
 *
 * Usage: container.innerHTML = renderIconHtml('youtube.com', 36)
 */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderIconHtml(identifier, size = 36) {
  const url = resolveIconUrl(identifier);
  const imgSize = Math.floor(size * 0.65);
  const radius = size >= 40 ? '12px' : '8px';
  const fontSize = Math.floor(size * 0.38);

  const label = String(identifier || '?')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('.')[0]
    .slice(0, 2)
    .toUpperCase();

  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label);

  return `
<div style="position:relative; width:${size}px; height:${size}px; border-radius:${radius}; overflow:hidden; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.07); flex-shrink:0;">
  <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:${fontSize}px; font-weight:900; color:rgba(255,255,255,0.3); z-index:1; opacity:0; transition:opacity 0.2s ease-in;" class="fg-icon-fallback">
    ${safeLabel}
  </div>
  <img src="${safeUrl}" alt="" style="width:${imgSize}px; height:${imgSize}px; object-fit:contain; position:relative; z-index:2; opacity:0; transition:opacity 0.2s ease-in-out;"
    onload="this.style.opacity='1'"
    onerror="this.style.display='none'; const f=this.parentElement.querySelector('.fg-icon-fallback'); if(f) f.style.opacity='1';">
</div>`.trim();
}
