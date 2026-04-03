import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import {
  fmtTime,
  resolveFaviconUrl,
  findServiceIdByDomain,
} from '@focusgate/core';
import { loadDashboardData } from '../../../../packages/viewmodels/src/useDashboardVM';
import { appsController } from '../../lib/appsController';

export const DashboardReact: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);
  const [now, setNow] = useState(Date.now());

  const refreshData = async () => {
    const dashboardData = await loadDashboardData();
    setData(dashboardData);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      setNow(Date.now());
      // Every 15 seconds, refresh the data from storage
      if (Math.floor(Date.now() / 1000) % 15 === 0) {
        refreshData();
      }
    }, 1000);

    const storageListener = (changes: any) => {
      if (changes.usage || changes.focus_mode_end_time || changes.rules) {
        refreshData();
      }
    };
    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      clearInterval(interval);
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  useEffect(() => {
    if (data && chartRef.current && data.domainList.length > 0) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.domainList.map((d: any) => d.domain),
            datasets: [
              {
                data: data.domainList.map((d: any) =>
                  Math.floor(d.timeMs / 60000),
                ),
                backgroundColor: '#3F3F46',
                borderRadius: 6,
                barThickness: 20,
              },
            ],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                beginAtZero: true,
                grid: { display: false },
                ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
              },
              y: {
                grid: { display: false },
                ticks: {
                  color: '#FFFFFF',
                  font: { size: 12, weight: '800' as any },
                },
              },
            },
          },
        });
      }
    }
  }, [data]);

  if (loading || !data) {
    return (
      <div className="loader-container">
        <div className="loader" />
      </div>
    );
  }

  const {
    rules,
    allTotalMs,
    domainList,
    syncStatus,
    syncMode,
    isNew,
    cloudBlockedQueries,
    avgFocusMins,
    focusEnd,
  } = data;

  const isFocusing = focusEnd > now;
  let timerDisplay = '25:00';
  let timerStatusText = 'READY';
  let timerDotColor = 'var(--muted)';
  let timerTextColor = 'var(--text)';

  if (isFocusing) {
    const remainingMs = Math.max(0, focusEnd - now);
    const m = Math.floor(remainingMs / 60000);
    const s = Math.floor((remainingMs % 60000) / 1000);
    timerDisplay = `${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
    timerStatusText = 'ACTIVE';
    timerDotColor = 'var(--accent)';
    timerTextColor = 'var(--accent)';
  }

  const focusGoalMs = 120 * 60000;
  const focusPercent = Math.min(
    100,
    Math.round(((allTotalMs as number) / focusGoalMs) * 100),
  );
  const circleOffset = 201 - (201 * focusPercent) / 100;

  const handleQuickBlock = async (domain: string) => {
    try {
      await appsController.addDomainRule(domain);
      chrome.runtime.sendMessage({ action: 'manualSync' });
      refreshData();
    } catch (err) {
      console.error('[FocusGate] Quick-block failed:', err);
    }
  };

  return (
    <div id="dashboardReact">
      <div
        className="page-intro"
        style={{
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: 'var(--accent)',
              letterSpacing: '2px',
              marginBottom: '12px',
            }}
          >
            OVERVIEW
          </div>
          <div
            style={{
              fontSize: '40px',
              fontWeight: 900,
              letterSpacing: '-1.8px',
              lineHeight: 1,
            }}
          >
            USAGE DATA
          </div>
          <div
            style={{
              fontSize: '14px',
              color: 'var(--muted)',
              marginTop: '12px',
              fontWeight: 500,
            }}
          >
            Direct monitoring of your digital activity.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-1px' }}
          >
            {new Date().toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            TODAY
          </div>
        </div>
      </div>

      {isNew && (
        <div
          className="glass-card"
          style={{
            padding: '40px',
            background: 'rgba(0,0,0,0.1)',
            marginBottom: '32px',
            textAlign: 'center',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: '24px',
              color: 'var(--muted)',
              opacity: 0.1,
              marginBottom: '12px',
              letterSpacing: '-2px',
            }}
          >
            FG
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 800,
              marginBottom: '12px',
              color: 'var(--text)',
            }}
          >
            Setup Required
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              maxWidth: '400px',
              margin: '0 auto 32px auto',
              lineHeight: 1.6,
            }}
          >
            No block rules detected. Add a domain or link a profile to begin.
          </div>
          <div
            style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}
          >
            <button
              className="btn btn-premium"
              style={{ minWidth: '180px', justifyContent: 'center' }}
              onClick={() => {
                const url = chrome.runtime.getURL(
                  '/settings.html?tab=settings',
                );
                chrome.tabs.create({ url });
              }}
            >
              Link Profile
            </button>
            <button
              className="btn btn-premium"
              style={{
                background: 'rgba(255,255,255,0.02)',
                color: 'var(--text)',
                borderColor: 'var(--glass-border)',
                boxShadow: 'none',
                minWidth: '180px',
                justifyContent: 'center',
              }}
              onClick={() => {
                // In extension context, we trigger navigation via shell or parent
                document
                  .querySelector<HTMLElement>('.nav-item[data-tab="apps"]')
                  ?.click();
              }}
            >
              Add Rules
            </button>
          </div>
        </div>
      )}

      <div className="widget-grid" style={{ marginBottom: '32px' }}>
        <div className="glass-card widget-card" style={{ padding: '16px' }}>
          <div className="widget-title">Engagement Today</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="stat-circle-container">
              <svg className="stat-circle-svg" width="64" height="64">
                <circle className="stat-circle-bg" cx="32" cy="32" r="30" />
                <circle
                  className="stat-circle-val"
                  cx="32"
                  cy="32"
                  r="30"
                  style={{
                    strokeDasharray: 201,
                    strokeDashoffset: circleOffset,
                    stroke: 'var(--accent)',
                  }}
                />
              </svg>
              <div className="stat-circle-text" style={{ fontSize: '14px' }}>
                {focusPercent}%
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  letterSpacing: '-0.5px',
                }}
              >
                {fmtTime(allTotalMs as number)}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '2px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--muted)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Today
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--accent)',
                    fontWeight: 800,
                  }}
                >
                  (Avg: {fmtTime(avgFocusMins * 60000)})
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="glass-card widget-card"
          style={{ position: 'relative', overflow: 'hidden', padding: '16px' }}
        >
          <div className="widget-title">Timer Status</div>
          <div
            className="timer-display"
            style={{
              fontSize: '36px',
              letterSpacing: '-2px',
              color: timerTextColor,
              fontVariantNumeric: 'tabular-nums' as any,
            }}
          >
            {timerDisplay}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: timerDotColor,
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {timerStatusText}
            </span>
          </div>
        </div>

        <div className="glass-card widget-card" style={{ padding: '16px' }}>
          <div className="widget-title">Connection</div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: syncStatus === 'connected' ? '#FFFFFF' : 'var(--muted)',
              opacity: 0.9,
            }}
          >
            {syncStatus === 'connected' ? 'READY' : 'OFFLINE'}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            Mode: {(syncMode as string).toUpperCase()}
          </div>
        </div>

        <div className="glass-card widget-card" style={{ padding: '16px' }}>
          <div className="widget-title">Blocked Attempts</div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: 'var(--text)',
              opacity: 0.8,
            }}
          >
            {cloudBlockedQueries.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Verifiable Blocks Today
          </div>
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px' }}
      >
        <div>
          <div
            className="section-label"
            style={{
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '1px',
              marginBottom: '20px',
            }}
          >
            CURRENT ACTIVITY
          </div>
          <div
            className="service-grid"
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {domainList.length === 0 ? (
              <div
                className="glass-card"
                style={{
                  textAlign: 'center',
                  padding: '60px',
                  color: 'var(--muted)',
                  fontSize: '13px',
                  borderStyle: 'dashed',
                  background: 'transparent',
                }}
              >
                No activity recorded in this session.
              </div>
            ) : (
              domainList.map((d: any) => {
                const isBlocked = rules.some((r: any) => {
                  const active = r.blockedToday || r.mode === 'block';
                  if (!active) {
                    return false;
                  }
                  if ((r.customDomain || r.packageName) === d.domain) {
                    return true;
                  }
                  if (r.type === 'service') {
                    const svcId = findServiceIdByDomain(d.domain);
                    if (svcId === r.packageName) {
                      return true;
                    }
                  }
                  return false;
                });
                const iconUrl = resolveFaviconUrl(d.domain);
                const timeColor = isBlocked
                  ? 'rgba(255,255,255,0.3)'
                  : 'var(--text)';

                return (
                  <div
                    key={d.domain}
                    className="rule-item"
                    style={{
                      padding: '14px 20px',
                      background: 'rgba(255,255,255,0.01)',
                      borderLeft: `3px solid ${
                        isBlocked ? 'var(--red)' : 'transparent'
                      }`,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid rgba(255,255,255,0.05)',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={iconUrl}
                          style={{
                            width: '20px',
                            height: '20px',
                            objectFit: 'contain',
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {d.domain}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: isBlocked ? 'var(--red)' : 'var(--muted)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            marginTop: '2px',
                          }}
                        >
                          {isBlocked ? '🔴 BLOCKED' : 'Monitoring'}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 900,
                            color: timeColor,
                          }}
                        >
                          {fmtTime(d.timeMs)}
                        </div>
                        <div>
                          {isBlocked ? (
                            <div
                              style={{
                                fontSize: '9px',
                                fontWeight: 900,
                                color: 'var(--red)',
                                background: 'rgba(255,71,87,0.1)',
                                border: '1px solid rgba(255,71,87,0.2)',
                                borderRadius: '6px',
                                padding: '3px 7px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              BLOCKED
                            </div>
                          ) : (
                            <button
                              className="quick-block-btn"
                              title={`Block ${d.domain}`}
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '8px',
                                background: 'rgba(108,71,255,0.1)',
                                border: '1px solid rgba(108,71,255,0.3)',
                                color: 'var(--accent)',
                                fontSize: '16px',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                lineHeight: 1,
                                flexShrink: 0,
                              }}
                              onClick={() => handleQuickBlock(d.domain)}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div>
          <div
            className="section-label"
            style={{
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '1px',
              marginBottom: '20px',
            }}
          >
            USAGE BREAKDOWN
          </div>
          <div
            className="glass-card"
            style={{
              padding: '24px',
              borderRadius: '20px',
              background: 'rgba(0,0,0,0.1)',
              height: '260px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <canvas
              ref={chartRef}
              style={{ width: '100% !important', height: '210px !important' }}
            />
            {domainList.length === 0 && (
              <div
                className="chart-empty"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--muted)',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                No activity found.
              </div>
            )}
          </div>
          <div
            style={{
              marginTop: '20px',
              fontSize: '12px',
              color: 'var(--muted)',
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            Real-time monitoring enabled. Data represents actual time recorded
            by the browser gate.
          </div>
        </div>
      </div>
    </div>
  );
};
