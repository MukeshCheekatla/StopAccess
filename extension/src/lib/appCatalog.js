import {
  getAppIconUrl,
  getCategoryBadge as getSharedCategoryBadge,
  resolveServiceIcon,
} from '@focusgate/core';

export function getDomainIcon(domain) {
  return getAppIconUrl(domain) || '';
}

export function getServiceIcon(service) {
  return resolveServiceIcon(service);
}

export function getCategoryBadge(category) {
  return getSharedCategoryBadge(category);
}
