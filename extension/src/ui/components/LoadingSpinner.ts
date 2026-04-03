export function renderLoadingSpinner(
  message: string = 'Synchronizing...',
): string {
  return `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 240px; gap: 20px;">
      <div class="loader-spinner" style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.05); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <div style="font-size: 11px; font-weight: 850; color: var(--muted); text-transform: uppercase; letter-spacing: 2px;">${message}</div>
    </div>
    
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}
