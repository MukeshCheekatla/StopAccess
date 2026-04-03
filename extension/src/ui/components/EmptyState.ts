export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionHtml?: string;
}

export function renderEmptyState(props: EmptyStateProps): string {
  const { icon = '🛡️', title, description, actionHtml } = props;

  return `
    <div class="empty-state" style="padding: 60px 40px; text-align:center; opacity: 0.5;">
      <div style="font-size: 32px; margin-bottom: 16px; opacity: 0.6;">${icon}</div>
      <div style="font-size: 14px; font-weight: 850; color: var(--text); letter-spacing: -0.2px; margin-bottom: 6px;">${title}</div>
      ${
        description
          ? `<div style="font-size: 11px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; line-height: 1.5; max-width: 280px; margin: 0 auto;">${description}</div>`
          : ''
      }
      ${actionHtml ? `<div style="margin-top: 24px;">${actionHtml}</div>` : ''}
    </div>
  `;
}
