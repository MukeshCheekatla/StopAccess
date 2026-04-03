import React, { useEffect, useRef, useState } from 'react';
import {
  UI_EXAMPLES,
  NEXTDNS_SERVICES,
  NEXTDNS_CATEGORIES,
  getCategoryBadge,
} from '@focusgate/core';
import { loadAppsScreenData } from '@viewmodels/src/useAppsScreenVM';
import { appsController } from '../../lib/appsController';
import { getLockedDomains } from '../../background/sessionGuard';
import { DomainRuleCard } from './components/DomainRuleCardReact';

interface AppsScreenProps {
  context?: 'page' | 'popup';
}

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 800,
  letterSpacing: '1px',
  textTransform: 'uppercase',
};

const MUTED_COPY_STYLE: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--muted)',
  lineHeight: 1.6,
  fontWeight: 600,
};

const rowCardStyle: React.CSSProperties = {
  padding: '18px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
};

const pillBaseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '5px 10px',
  borderRadius: '999px',
  fontSize: '10px',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
  >
    <path d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
  </svg>
);

const SummaryCard: React.FC<{
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'danger' | 'accent';
}> = ({ label, value, hint, tone = 'default' }) => {
  const valueColor =
    tone === 'danger'
      ? 'var(--red)'
      : tone === 'accent'
      ? 'var(--accent)'
      : 'var(--text)';

  return (
    <div className="glass-card widget-card" style={{ padding: '16px' }}>
      <div className="widget-title">{label}</div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: valueColor,
        }}
      >
        {value}
      </div>
      <div style={MUTED_COPY_STYLE}>{hint}</div>
    </div>
  );
};

const SectionHeader: React.FC<{
  title: string;
  subtitle: string;
  meta?: React.ReactNode;
}> = ({ title, subtitle, meta }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '16px',
      marginBottom: '18px',
    }}
  >
    <div>
      <div
        style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.03em' }}
      >
        {title}
      </div>
      <div style={{ ...MUTED_COPY_STYLE, marginTop: '6px' }}>{subtitle}</div>
    </div>
    {meta}
  </div>
);

const ModePanel: React.FC<{
  isProfile: boolean;
  isConfigured: boolean;
  activeRules: number;
}> = ({ isProfile, isConfigured, activeRules }) => {
  const title = isProfile
    ? 'Profile-wide control plane'
    : 'Browser-only shield';
  const copy = isProfile
    ? 'Rules sync through your NextDNS profile, so app and category changes apply across linked devices.'
    : 'Rules stay local to this browser. Domains are enforced here without changing your broader profile.';
  const tone =
    isProfile && isConfigured ? 'active' : isProfile ? 'warning' : 'muted';
  const badgeText = isProfile
    ? isConfigured
      ? 'Connected'
      : 'Needs Setup'
    : 'Local';

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px 28px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        borderColor: isProfile
          ? isConfigured
            ? 'rgba(61,61,74,0.45)'
            : 'rgba(161,98,7,0.35)'
          : 'var(--glass-border)',
        background: isProfile
          ? isConfigured
            ? 'rgba(61,61,74,0.08)'
            : 'rgba(161,98,7,0.05)'
          : 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ maxWidth: '720px' }}>
        <div
          style={{
            ...SECTION_LABEL_STYLE,
            color: 'var(--muted)',
            marginBottom: '8px',
          }}
        >
          Protection Mode
        </div>
        <div
          style={{
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            marginBottom: '8px',
          }}
        >
          {title}
        </div>
        <div style={{ ...MUTED_COPY_STYLE, fontSize: '13px' }}>{copy}</div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        <div
          className={`status-pill ${tone}`}
          style={{ fontSize: '11px', padding: '6px 12px' }}
        >
          {badgeText}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 900,
              letterSpacing: '-0.04em',
            }}
          >
            {activeRules}
          </div>
          <div
            style={{
              ...SECTION_LABEL_STYLE,
              color: 'var(--muted)',
              fontSize: '10px',
            }}
          >
            Active Rules
          </div>
        </div>
      </div>
    </div>
  );
};

const ServiceChip: React.FC<{
  id: string;
  name: string;
  active: boolean;
  locked: boolean;
  onToggle: () => void;
}> = ({ id, name, active, locked, onToggle }) => {
  const iconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    id,
  )}&sz=64`;

  return (
    <button
      onClick={locked ? undefined : onToggle}
      disabled={locked}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '999px',
        cursor: locked ? 'not-allowed' : 'pointer',
        background: active ? 'rgba(185,28,28,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${
          active ? 'rgba(185,28,28,0.3)' : 'rgba(255,255,255,0.08)'
        }`,
        color: active ? 'var(--red)' : 'var(--text)',
        fontSize: '12px',
        fontWeight: 800,
        opacity: locked ? 0.45 : 1,
        transition: 'all 0.15s ease',
      }}
      type="button"
    >
      <img
        src={iconUrl}
        alt=""
        width={16}
        height={16}
        style={{ borderRadius: '4px', objectFit: 'contain', flexShrink: 0 }}
        onError={(event) => {
          (event.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span>{name}</span>
      {active ? (
        <span
          style={{
            ...pillBaseStyle,
            padding: '3px 7px',
            background: 'rgba(185,28,28,0.18)',
            color: 'var(--red)',
          }}
        >
          Blocked
        </span>
      ) : null}
    </button>
  );
};

const CategoryChip: React.FC<{
  name: string;
  badge: string;
  active: boolean;
  locked: boolean;
  onToggle: () => void;
}> = ({ name, badge, active, locked, onToggle }) => (
  <button
    onClick={locked ? undefined : onToggle}
    disabled={locked}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 14px',
      borderRadius: '999px',
      cursor: locked ? 'not-allowed' : 'pointer',
      background: active ? 'rgba(61,61,74,0.16)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${
        active ? 'rgba(61,61,74,0.32)' : 'rgba(255,255,255,0.08)'
      }`,
      color: active ? 'var(--text)' : 'var(--text)',
      fontSize: '12px',
      fontWeight: 800,
      opacity: locked ? 0.45 : 1,
      transition: 'all 0.15s ease',
    }}
    type="button"
  >
    <span style={{ fontSize: '14px' }}>{badge}</span>
    <span>{name}</span>
    {active ? (
      <span
        style={{
          ...pillBaseStyle,
          padding: '3px 7px',
          background: 'rgba(61,61,74,0.22)',
          color: 'var(--text)',
        }}
      >
        Active
      </span>
    ) : null}
  </button>
);

const UpgradePanel: React.FC = () => (
  <div
    className="glass-card"
    style={{
      padding: '24px 28px',
      borderColor: 'rgba(61,61,74,0.3)',
      background: 'rgba(61,61,74,0.08)',
      display: 'flex',
      gap: '18px',
      alignItems: 'flex-start',
    }}
  >
    <div
      style={{
        width: '46px',
        height: '46px',
        borderRadius: '14px',
        flexShrink: 0,
        background: 'rgba(61,61,74,0.2)',
        border: '1px solid rgba(61,61,74,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: 900,
      }}
    >
      FG
    </div>
    <div>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          marginBottom: '8px',
          letterSpacing: '-0.03em',
        }}
      >
        Unlock profile-wide controls
      </div>
      <div style={{ ...MUTED_COPY_STYLE, marginBottom: '18px' }}>
        Connect a NextDNS profile to manage apps like YouTube and TikTok, plus
        entire categories like social, streaming, and gambling across all linked
        devices.
      </div>
      <button
        className="btn-premium"
        onClick={() => chrome.runtime.sendMessage({ action: 'openSettings' })}
        type="button"
      >
        Configure NextDNS
      </button>
    </div>
  </div>
);

function EmptySection({ message }: { message: string }) {
  return (
    <div
      className="glass-card"
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        color: 'var(--muted)',
        fontSize: '13px',
        borderStyle: 'dashed',
        background: 'transparent',
      }}
    >
      {message}
    </div>
  );
}

export const AppsScreen: React.FC<AppsScreenProps> = ({ context = 'page' }) => {
  const [data, setData] = useState<any>(null);
  const [lockedDomains, setLockedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [screenData, locked] = await Promise.all([
      loadAppsScreenData(),
      getLockedDomains(),
    ]);
    setData(screenData);
    setLockedDomains(locked);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading || !data) {
    return (
      <div className="loader-container">
        <div className="loader" />
      </div>
    );
  }

  const { rules, isConfigured, syncMode } = data;
  const isProfile = syncMode === 'profile';
  const query = searchTerm.trim().toLowerCase();

  const domainRules = rules.filter(
    (rule: any) => rule.type === 'domain' || !rule.type,
  );
  const serviceRules = rules.filter((rule: any) => rule.type === 'service');
  const categoryRules = rules.filter((rule: any) => rule.type === 'category');

  const matchText = (...parts: Array<string | undefined>) =>
    !query || parts.filter(Boolean).join(' ').toLowerCase().includes(query);

  const visibleDomains = domainRules.filter((rule: any) =>
    matchText(rule.appName, rule.packageName, rule.customDomain),
  );

  const allServices = NEXTDNS_SERVICES.map((service) => ({
    ...service,
    active: serviceRules.some((rule: any) => rule.packageName === service.id),
  })).filter((service) => matchText(service.name, service.id));

  const allCategories = NEXTDNS_CATEGORIES.map((category) => ({
    ...category,
    active: categoryRules.some((rule: any) => rule.packageName === category.id),
  })).filter((category) => matchText(category.name, category.id));

  const activeServiceCount = allServices.filter(
    (service) => service.active,
  ).length;
  const activeCategoryCount = allCategories.filter(
    (category) => category.active,
  ).length;
  const totalRules =
    domainRules.length + serviceRules.length + categoryRules.length;

  const handleAddDomain = async (domainInput?: string) => {
    const value = (domainInput ?? addInputRef.current?.value ?? '')
      .trim()
      .toLowerCase();
    if (!value) {
      return;
    }

    const result = await appsController.addDomainRule(value);
    if (result.ok) {
      if (addInputRef.current) {
        addInputRef.current.value = '';
      }
      setSearchTerm('');
      refresh();
    }
  };

  const handleToggle = async (
    id: string,
    kind: string,
    currentActive: boolean,
  ) => {
    await appsController.toggleRule(kind as any, id, id, !currentActive, rules);
    refresh();
  };

  const handleDelete = async (pkg: string) => {
    const result = await appsController.removeRule(pkg, rules);
    if (result.ok) {
      refresh();
    }
  };

  const handleLimitChange = async (pkg: string, minutes: number) => {
    const rule = rules.find((entry: any) => entry.packageName === pkg);
    if (!rule) {
      return;
    }

    const { updateRule } = await import('@focusgate/state/rules');
    const { extensionAdapter } = await import(
      '../../background/platformAdapter'
    );
    await updateRule(extensionAdapter, {
      ...rule,
      dailyLimitMinutes: minutes,
      mode: minutes > 0 ? 'limit' : rule.mode === 'limit' ? 'allow' : rule.mode,
      blockedToday: minutes > 0 && (rule.usedMinutesToday || 0) >= minutes,
      updatedAt: Date.now(),
    });
    chrome.runtime.sendMessage({ action: 'manualSync' });
    refresh();
  };

  const handleServiceToggle = async (
    id: string,
    name: string,
    active: boolean,
  ) => {
    await appsController.toggleRule('service', id, name, !active, rules);
    refresh();
  };

  const handleCategoryToggle = async (
    id: string,
    name: string,
    active: boolean,
  ) => {
    await appsController.toggleRule('category', id, name, !active, rules);
    refresh();
  };

  return (
    <div id="appsScreenReact">
      {context === 'page' ? (
        <div
          className="page-intro"
          style={{
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '24px',
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
              BLOCK LIST
            </div>
            <div
              style={{
                fontSize: '40px',
                fontWeight: 900,
                letterSpacing: '-1.8px',
                lineHeight: 1,
              }}
            >
              RULES HUB
            </div>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--muted)',
                marginTop: '12px',
                fontWeight: 500,
              }}
            >
              Manage domains, app blocks, and synced category controls from one
              place.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 900,
                letterSpacing: '-0.04em',
              }}
            >
              {isProfile ? 'PROFILE' : 'LOCAL'}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginTop: '4px',
                letterSpacing: '1px',
              }}
            >
              Enforcement Mode
            </div>
          </div>
        </div>
      ) : null}

      <ModePanel
        isConfigured={isConfigured}
        isProfile={isProfile}
        activeRules={totalRules}
      />

      <div className="widget-grid" style={{ marginBottom: '32px' }}>
        <SummaryCard
          label="Custom Domains"
          value={String(domainRules.length)}
          hint="Manual rules added directly in this extension."
          tone="danger"
        />
        <SummaryCard
          label="Blocked Apps"
          value={String(activeServiceCount)}
          hint={
            isProfile
              ? 'App-level controls synced through NextDNS.'
              : 'Available after connecting your profile.'
          }
          tone="accent"
        />
        <SummaryCard
          label="Blocked Categories"
          value={String(activeCategoryCount)}
          hint={
            isProfile
              ? 'Profile-wide category protection currently active.'
              : 'Category controls stay hidden in local mode.'
          }
          tone="accent"
        />
        <SummaryCard
          label="Search Results"
          value={String(visibleDomains.length)}
          hint={
            query
              ? `Filtering domains for "${searchTerm}".`
              : 'Quickly find and update rules from one list.'
          }
        />
      </div>

      <div
        className="glass-card"
        style={{ padding: '24px', marginBottom: '32px' }}
      >
        <SectionHeader
          title="Search and add rules"
          subtitle="Find existing blocks instantly or add a new domain without leaving this page."
          meta={
            searchTerm.includes('.') ? (
              <button
                className="btn-premium"
                onClick={() => handleAddDomain(searchTerm)}
                type="button"
              >
                Block domain
              </button>
            ) : null
          }
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              context === 'page' ? 'minmax(0, 2fr) minmax(260px, 1fr)' : '1fr',
            gap: '16px',
          }}
        >
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              id="blockListSearch"
              placeholder={`Search rules or type a new domain like ${UI_EXAMPLES.DOMAIN}`}
              className="input-premium"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{
                width: '100%',
                height: '56px',
                fontSize: '14px',
                borderRadius: '18px',
                paddingLeft: '18px',
                paddingRight: searchTerm.includes('.') ? '132px' : '18px',
                background: 'rgba(15,15,22,0.45)',
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchTerm.includes('.')) {
                  handleAddDomain(searchTerm);
                }
              }}
            />
            {searchTerm.includes('.') ? (
              <button
                className="btn-premium"
                onClick={() => handleAddDomain(searchTerm)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '8px 14px',
                  fontSize: '11px',
                  borderRadius: '12px',
                }}
                type="button"
              >
                Add rule
              </button>
            ) : null}
          </div>

          {context === 'page' ? (
            <div
              style={{
                border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.01)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <div
                style={{
                  ...SECTION_LABEL_STYLE,
                  fontSize: '10px',
                  color: 'var(--muted)',
                }}
              >
                Quick tip
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>
                Press Enter after typing a domain to create a new block.
              </div>
              <div style={MUTED_COPY_STYLE}>
                Existing services and categories are still searchable from the
                same field.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ marginBottom: '36px' }}>
        <SectionHeader
          title="Custom domain rules"
          subtitle="Direct domain blocks with optional daily limits and scope visibility."
          meta={
            <span
              style={{
                ...pillBaseStyle,
                background: 'rgba(185,28,28,0.12)',
                color: 'var(--red)',
                border: '1px solid rgba(185,28,28,0.2)',
              }}
            >
              {visibleDomains.length} visible
            </span>
          }
        />

        <div
          className="glass-card"
          style={{ ...rowCardStyle, marginBottom: '16px' }}
        >
          <div>
            <div
              style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}
            >
              Add a custom domain
            </div>
            <div style={MUTED_COPY_STYLE}>
              Create a focused rule for a site, subdomain, or browser-only
              distraction.
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              minWidth: '320px',
            }}
          >
            <input
              ref={addInputRef}
              type="text"
              id="addDomainInput"
              placeholder={`e.g. ${UI_EXAMPLES.DOMAIN}`}
              className="input-premium"
              style={{ flex: 1, minHeight: '42px', borderRadius: '12px' }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleAddDomain();
                }
              }}
            />
            <button
              className="btn-premium"
              onClick={() => handleAddDomain()}
              style={{ minHeight: '42px' }}
              type="button"
            >
              Add
            </button>
          </div>
        </div>

        {visibleDomains.length === 0 ? (
          <EmptySection
            message={
              searchTerm
                ? 'No domain rules match your search.'
                : 'No custom rules yet. Add a domain above to start shaping your block list.'
            }
          />
        ) : (
          <div
            className="service-grid"
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {visibleDomains.map((rule: any) => (
              <DomainRuleCard
                key={rule.packageName}
                rule={rule}
                lockedDomains={lockedDomains}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onLimitChange={handleLimitChange}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <button
          id="advancedControlsToggle"
          onClick={() => setShowAdvanced((value) => !value)}
          style={{
            width: '100%',
            border: '1px solid var(--glass-border)',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.02)',
            padding: '18px 20px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
          type="button"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ ...SECTION_LABEL_STYLE, marginBottom: '6px' }}>
                Advanced Controls
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                }}
              >
                Apps and categories
              </div>
              <div style={{ ...MUTED_COPY_STYLE, marginTop: '6px' }}>
                {isProfile
                  ? 'Tune profile-wide app and category blocks from the same interface.'
                  : 'Connect NextDNS to unlock synced app and category blocking.'}
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
              {isProfile ? (
                <span
                  style={{
                    ...pillBaseStyle,
                    background: 'rgba(61,61,74,0.18)',
                    color: 'var(--text)',
                    border: '1px solid rgba(61,61,74,0.28)',
                  }}
                >
                  {activeServiceCount + activeCategoryCount} active
                </span>
              ) : null}
              <span style={{ color: 'var(--muted)' }}>
                <ChevronIcon open={showAdvanced} />
              </span>
            </div>
          </div>
        </button>

        {showAdvanced ? (
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            {!isProfile ? (
              <UpgradePanel />
            ) : (
              <>
                <div className="glass-card" style={{ padding: '24px' }}>
                  <SectionHeader
                    title="Profile-wide apps"
                    subtitle="Block known apps and services everywhere your NextDNS profile is active."
                    meta={
                      <span
                        style={{
                          ...pillBaseStyle,
                          background: 'rgba(185,28,28,0.12)',
                          color: 'var(--red)',
                          border: '1px solid rgba(185,28,28,0.2)',
                        }}
                      >
                        {activeServiceCount} blocked
                      </span>
                    }
                  />

                  {allServices.length === 0 ? (
                    <EmptySection message="No apps match the current filter." />
                  ) : (
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}
                    >
                      {allServices.map((service) => (
                        <ServiceChip
                          key={service.id}
                          id={service.id}
                          name={service.name}
                          active={service.active}
                          locked={lockedDomains.includes(service.id)}
                          onToggle={() =>
                            handleServiceToggle(
                              service.id,
                              service.name,
                              service.active,
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <SectionHeader
                    title="Profile-wide categories"
                    subtitle="Apply broader content controls across your synced browsing profile."
                    meta={
                      <span
                        style={{
                          ...pillBaseStyle,
                          background: 'rgba(61,61,74,0.18)',
                          color: 'var(--text)',
                          border: '1px solid rgba(61,61,74,0.28)',
                        }}
                      >
                        {activeCategoryCount} active
                      </span>
                    }
                  />

                  {allCategories.length === 0 ? (
                    <EmptySection message="No categories match the current filter." />
                  ) : (
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}
                    >
                      {allCategories.map((category) => (
                        <CategoryChip
                          key={category.id}
                          name={category.name}
                          badge={getCategoryBadge(category)}
                          active={category.active}
                          locked={lockedDomains.includes(category.id)}
                          onToggle={() =>
                            handleCategoryToggle(
                              category.id,
                              category.name,
                              category.active,
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
