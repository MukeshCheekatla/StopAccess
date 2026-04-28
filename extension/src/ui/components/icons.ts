import {
  resolveServiceIcon,
  resolveIconUrl,
  resolveFaviconUrl,
} from '@stopaccess/core';
import { saveIconToCache, getCachedIconSync } from '../../lib/iconCache';

/** Resolves any domain/identifier to a favicon URL via the core iconography engine. */
export function getBrandLogoUrl(domain: string, _sz = 128): string {
  return resolveFaviconUrl(domain);
}

/** Resolves a service ID or domain to its canonical icon domain. */
export function resolveIconDomain(id: string, name?: string): string {
  if (id.includes('.')) {
    return id; // Already a domain — preserve subdomains like mail.google.com
  }
  const info = resolveServiceIcon({ id, name });
  return info.domain || resolveIconUrl(id) || id;
}

export function renderBrandLogo(
  identifier: string,
  name?: string,
  size = 44,
  cachedUrl?: string,
) {
  const targetDomain = resolveIconDomain(identifier, name);
  const iconFromCache = getCachedIconSync(targetDomain);
  const primaryIconUrl =
    cachedUrl || iconFromCache || getBrandLogoUrl(targetDomain, 128);
  const hasCache = !!(cachedUrl || iconFromCache);
  const iconSize = Math.floor(size * 0.9);

  return `
    <div class="global-brand-logo fg-shrink-0 fg-relative fg-flex fg-items-center fg-justify-center" 
         data-domain="${targetDomain}"
         style="width: ${size}px; height: ${size}px;">
       <div class="logo-fallback fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center" 
            style="font-size: ${Math.floor(
              size * 0.45,
            )}px; font-weight: 700; color: var(--fg-text); opacity: ${
    hasCache ? '0' : '0.3'
  }; z-index: 1;">
         ${(name || identifier).slice(0, 2).toUpperCase()}
       </div>
       <img src="${primaryIconUrl}" 
            data-domain="${targetDomain}"
            class="brand-logo-image"
            style="width: ${iconSize}px; height: ${iconSize}px; object-fit: contain; z-index: 2; border-radius: 20%; opacity: ${
    hasCache ? '1' : '0'
  }; position: relative;" 
            alt="">
    </div>
  `;
}

export function attachGlobalIconListeners(container: HTMLElement) {
  if ((container as any).__iconListenersAttached) {
    return;
  }

  container.addEventListener(
    'load',
    (e) => {
      const target = e.target as HTMLImageElement;
      if (
        target.tagName === 'IMG' &&
        target.classList.contains('brand-logo-image')
      ) {
        const fallback = target.previousElementSibling as HTMLElement;
        if (target.naturalWidth > 1) {
          target.style.opacity = '1';
          target.style.display = 'block';
          if (fallback) {
            fallback.style.opacity = '0';
          }

          const domain = target.dataset.domain;
          if (domain) {
            saveIconToCache(domain, target.src);
          }
        } else {
          target.dispatchEvent(new Event('error'));
        }
      }
    },
    true,
  );

  container.addEventListener(
    'error',
    (e) => {
      const target = e.target as HTMLImageElement;
      if (
        target.tagName === 'IMG' &&
        target.classList.contains('brand-logo-image')
      ) {
        const fallback = target.previousElementSibling as HTMLElement;
        target.style.display = 'none';
        if (fallback) {
          fallback.style.opacity = '1';
        }
      }
    },
    true,
  );

  (container as any).__iconListenersAttached = true;
}

export function renderAppIcon(
  domain: string,
  name?: string,
  cachedUrl?: string,
) {
  return renderBrandLogo(domain, name, 44, cachedUrl);
}
