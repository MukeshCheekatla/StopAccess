/**
 * FocusGate Toast Notification System
 * Professional, high-density, monochrome notifications.
 */

class ToastManager {
  constructor() {
    this.container = null;
    this._ensureContainer();
  }

  _ensureContainer() {
    if (this.container) {
      return;
    }
    this.container = document.createElement('div');
    this.container.id = 'fg-toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fg-toast-in {
        from { transform: translateX(100%) scale(0.9); opacity: 0; }
        to { transform: translateX(0) scale(1); opacity: 1; }
      }
      @keyframes fg-toast-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(20px); opacity: 0; }
      }
      .fg-toast {
        min-width: 280px;
        max-width: 380px;
        background: rgba(10, 10, 15, 0.9);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        color: #F8FAFC;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 12px 32px rgba(0,0,0,0.4);
        animation: fg-toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        display: flex;
        align-items: center;
        gap: 12px;
        pointer-events: auto;
      }
      .fg-toast.error { border-left: 4px solid #334155; }
      .fg-toast.success { border-left: 4px solid #F8FAFC; }
      .fg-toast .toast-icon { 
        font-weight: 900; 
        font-size: 11px; 
        background: rgba(255,255,255,0.05); 
        width: 24px; height: 24px; 
        display:flex; align-items:center; justify-content:center; 
        border-radius: 6px;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  show(message, type = 'info', duration = 3000) {
    this._ensureContainer();
    const toast = document.createElement('div');
    toast.className = `fg-toast ${type}`;

    const iconChar = type === 'error' ? '!' : 'OK';

    toast.innerHTML = `
      <div class="toast-icon">${iconChar}</div>
      <div style="flex:1;">${message}</div>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fg-toast-out 0.3s ease forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          this.container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  success(msg) {
    this.show(msg, 'success');
  }
  error(msg) {
    this.show(msg, 'error');
  }
  info(msg) {
    this.show(msg, 'info');
  }
}

export const toast = new ToastManager();
