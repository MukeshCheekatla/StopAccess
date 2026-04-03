export interface StatusBadgeProps {
  text: string;
  variant?: 'active' | 'warning' | 'error' | 'muted' | 'success';
  pulse?: boolean;
}

export function renderStatusBadge(props: StatusBadgeProps): string {
  const { text, variant = 'active', pulse = false } = props;

  return `
    <div class="status-badge ${variant} ${
    pulse ? 'pulse' : ''
  }" style="font-size: 10px; font-weight: 850; letter-spacing: 0.5px; border-radius: 8px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 8px;">
      ${pulse ? '<span class="status-dot"></span>' : ''}
      ${text.toUpperCase()}
    </div>
  `;
}
