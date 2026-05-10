import { UI_ICONS, UI_TOKENS } from '@/ui/theme/uiTokens';

/**
 * Dense Operational Workspace Monitor.
 * Redesigned to remove "fake intelligence" in favor of grounded operational telemetry.
 * Layout: [ Load Ring ] | [ 2x2 Grid of Metrics ]
 */
let lastTabQueryTime = 0;
let cachedHtml = '';

export async function renderBrowserActivity(container: HTMLElement) {
  if (!container) {
    return;
  }

  const now = Date.now();
  if (now - lastTabQueryTime < 15000 && cachedHtml) {
    container.innerHTML = cachedHtml;
    return;
  }

  try {
    lastTabQueryTime = now;
    const rawTabs = await chrome.tabs.query({});
    const totalTabs = rawTabs.length;

    let sleepingCount = 0;
    let inactiveCount = 0;
    const INACTIVE_THRESHOLD = 2 * 60 * 60 * 1000;

    for (const t of rawTabs) {
      const lastAccessed = (t as any).lastAccessed || now;
      if (t.discarded) {
        sleepingCount++;
      } else {
        if (now - lastAccessed > INACTIVE_THRESHOLD && !t.active) {
          inactiveCount++;
        }
      }
    }

    let memoryUsageNum = 0;
    try {
      const mem = await (chrome as any).system.memory.getInfo();
      memoryUsageNum = Math.round(
        ((mem.capacity - mem.availableCapacity) / mem.capacity) * 100,
      );
    } catch (e) {}

    // --- Circle Calculations ---
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (memoryUsageNum / 100) * circumference;

    const html = `
      <div class="fg-flex fg-flex-col fg-gap-3">
        <div class="section-label" style="${
          UI_TOKENS.TEXT.LABEL
        }">Workspace Monitor</div>
        
        <div class="fg-panel fg-p-6 fg-rounded-[24px] fg-border fg-border-[var(--fg-glass-border)] fg-bg-[var(--fg-glass-bg)]">
          <div class="fg-grid fg-grid-cols-[auto_1fr] fg-items-center fg-gap-12">
            
            <!-- Column 1: Visual State (Ring) -->
            <div class="fg-flex fg-flex-col fg-items-center fg-gap-3">
              <div class="fg-relative fg-flex fg-items-center fg-justify-center" style="width: 80px; height: 80px;">
                <svg width="80" height="80" viewBox="0 0 80 80" class="fg--rotate-90">
                  <circle cx="40" cy="40" r="${radius}" fill="transparent" stroke="var(--fg-white-wash)" stroke-width="8" />
                  <circle cx="40" cy="40" r="${radius}" fill="transparent" 
                          stroke="var(--fg-indigo)" stroke-width="8" stroke-linecap="round"
                          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                          style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0.85;" />
                </svg>
                <div class="fg-absolute fg-flex fg-flex-col fg-items-center">
                  <span style="${
                    UI_TOKENS.TEXT.STAT
                  }; font-size: 18px;">${memoryUsageNum}%</span>
                </div>
              </div>
              <span style="${
                UI_TOKENS.TEXT.LABEL
              }; font-size: 9px; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.05em;">Browser Load</span>
            </div>

            <!-- Column 2: Grounded Telemetry (2x2 Grid) -->
            <div class="fg-grid fg-grid-cols-2 fg-gap-x-12 fg-gap-y-6">
              
              <!-- Metric: Open Tabs -->
              <div class="fg-flex fg-flex-col fg-gap-1">
                <span style="${
                  UI_TOKENS.TEXT.LABEL
                }; font-size: 10px; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.02em;">Open Tabs</span>
                <div class="fg-flex fg-items-baseline fg-gap-2">
                  <span style="${
                    UI_TOKENS.TEXT.STAT
                  }; font-size: 24px;">${totalTabs}</span>
                  <div class="fg-text-[var(--fg-muted)] fg-opacity-40">
                    ${UI_ICONS.LAYERS.replace(
                      'width="24"',
                      'width="14"',
                    ).replace('height="24"', 'height="14"')}
                  </div>
                </div>
              </div>

              <!-- Metric: Sleeping Tabs -->
              <div class="fg-flex fg-flex-col fg-gap-1">
                <span style="${
                  UI_TOKENS.TEXT.LABEL
                }; font-size: 10px; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.02em;">Sleeping</span>
                <div class="fg-flex fg-items-baseline fg-gap-2">
                  <span style="${
                    UI_TOKENS.TEXT.STAT
                  }; font-size: 24px; color: var(--fg-blue);">${sleepingCount}</span>
                  <div class="fg-text-[var(--fg-blue)] fg-opacity-40">
                    ${UI_ICONS.CLOCK.replace(
                      'width="24"',
                      'width="14"',
                    ).replace('height="24"', 'height="14"')}
                  </div>
                </div>
              </div>

              <!-- Metric: Inactive Tabs -->
              <div class="fg-flex fg-flex-col fg-gap-1">
                <span style="${
                  UI_TOKENS.TEXT.LABEL
                }; font-size: 10px; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.02em;">Inactive</span>
                <div class="fg-flex fg-items-baseline fg-gap-2">
                  <span style="${
                    UI_TOKENS.TEXT.STAT
                  }; font-size: 24px;">${inactiveCount}</span>
                  <div class="fg-text-[var(--fg-muted)] fg-opacity-40">
                    ${UI_ICONS.EYE_OFF.replace(
                      'width="24"',
                      'width="14"',
                    ).replace('height="24"', 'height="14"')}
                  </div>
                </div>
              </div>

              <!-- Metric: Total Memory -->
              <div class="fg-flex fg-flex-col fg-gap-1">
                <span style="${
                  UI_TOKENS.TEXT.LABEL
                }; font-size: 10px; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.02em;">Memory Used</span>
                <div class="fg-flex fg-items-baseline fg-gap-2">
                  <span style="${
                    UI_TOKENS.TEXT.STAT
                  }; font-size: 24px;">${memoryUsageNum}%</span>
                  <div class="fg-text-[var(--fg-muted)] fg-opacity-40">
                    ${UI_ICONS.ACTIVITY.replace(
                      'width="24"',
                      'width="14"',
                    ).replace('height="24"', 'height="14"')}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    `;

    cachedHtml = html;
    if (container.innerHTML !== html) {
      container.innerHTML = html;
    }
  } catch (err) {
    container.innerHTML = '';
  }
}
