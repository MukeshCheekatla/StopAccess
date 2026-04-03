import { escapeHtml } from '@focusgate/core';

export interface ToggleProps {
  id: string;
  checked?: boolean;
  disabled?: boolean;
  dataKind?: string;
  dataId?: string;
  dataName?: string;
}

export function renderToggle(props: ToggleProps): string {
  const {
    id,
    checked = false,
    disabled = false,
    dataKind,
    dataId,
    dataName,
  } = props;

  return `
    <label class="switch ${disabled ? 'disabled' : ''}" style="zoom: 0.8;">
      <input type="checkbox" 
             id="${id}"
             ${checked ? 'checked' : ''} 
             ${disabled ? 'disabled' : ''}
             ${dataKind ? `data-kind="${escapeHtml(dataKind)}"` : ''}
             ${dataId ? `data-id="${escapeHtml(dataId)}"` : ''}
             ${dataName ? `data-name="${escapeHtml(dataName)}"` : ''}>
      <span class="slider"></span>
    </label>
  `;
}
