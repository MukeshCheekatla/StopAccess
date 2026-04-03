export interface SectionCardProps {
  label: string;
  title: string;
  description?: string;
  badge?: {
    text: string;
    variant?: 'active' | 'warning' | 'error' | 'muted' | 'success';
  };
  content: string;
  footer?: string;
}

export function renderSectionCard(props: SectionCardProps): string {
  const { label, title, description, badge, content, footer } = props;

  return `
    <div class="glass-card" style="padding: var(--space-lg); display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="field-label" style="margin-bottom: 2px;">${label}</div>
          <div style="font-size: 16px; font-weight: 850; color: var(--text); letter-spacing: -0.4px;">${title}</div>
          ${
            description
              ? `<div style="font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.4;">${description}</div>`
              : ''
          }
        </div>
        ${
          badge
            ? `<div class="status-pill ${
                badge.variant || 'active'
              }" style="font-size: 9px; padding: 4px 10px;">${badge.text}</div>`
            : ''
        }
      </div>
      
      <div class="card-content-slot" style="margin-top: 4px;">
        ${content}
      </div>
      
      ${
        footer
          ? `<div class="card-footer-slot" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--glass-border);">
        ${footer}
      </div>`
          : ''
      }
    </div>
  `;
}
