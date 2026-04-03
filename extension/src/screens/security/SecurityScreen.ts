/**
 * SecurityScreen — Router
 * Detects context (popup vs page) and delegates accordingly.
 */

import { renderSecurityPage } from './SecurityPage';
import { renderSecurityPopup } from './SecurityPopup';

export async function renderSecurityScreen(
  container: HTMLElement,
  context: 'page' | 'popup' = 'page',
): Promise<void> {
  if (context === 'popup') {
    return renderSecurityPopup(container);
  }
  return renderSecurityPage(container);
}
