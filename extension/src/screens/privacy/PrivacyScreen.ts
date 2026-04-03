/**
 * PrivacyScreen — Router
 */

import { renderPrivacyPage } from './PrivacyPage';

export async function renderPrivacyScreen(
  container: HTMLElement,
  _context: 'page' | 'popup' = 'page',
): Promise<void> {
  return renderPrivacyPage(container);
}
