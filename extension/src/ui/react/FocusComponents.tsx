import React, { type ReactNode } from 'react';
import { COLOR_CLASSES } from '../../lib/designTokens';
import { UI_TOKENS } from '../../lib/ui';

/**
 * Design System Components for StopAccess.
 * All text styles sourced from UI_TOKENS (lib/ui.ts) — never hardcoded here.
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'fg-inline-flex fg-items-center fg-justify-center fg-gap-2 fg-font-black fg-tracking-[0.14em] fg-border-0 fg-outline-none fg-shadow-none [appearance:none] disabled:fg-opacity-50 disabled:fg-pointer-events-none';

  const variants = {
    primary:
      'fg-bg-[var(--accent)] fg-text-[var(--fg-on-accent)] hover:fg-bg-[var(--fg-surface-hover)]',
    secondary:
      'fg-bg-[var(--fg-white-wash)] fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-white-wash-strong)] hover:fg-text-[var(--fg-text)]',
    danger:
      'fg-bg-[var(--red)] fg-text-[var(--fg-on-accent)] hover:fg-bg-[var(--fg-red)]',
    ghost:
      'fg-bg-transparent fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)]',
  };

  const sizes = {
    sm: 'fg-px-3.5 fg-py-2 fg-text-[10px] fg-rounded-[10px]',
    md: 'fg-px-5 fg-py-3 fg-text-[11px] fg-rounded-[12px]',
    lg: 'fg-px-8 fg-py-4 fg-text-sm fg-rounded-[14px]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function Card({
  children,
  className = '',
  hover = false,
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
      fg-panel fg-rounded-[18px] fg-p-6
      ${
        hover
          ? `fg-cursor-pointer ${COLOR_CLASSES.hover.overlaySubtle} ${COLOR_CLASSES.border.hover}`
          : ''
      }
      ${className}
    `}
      {...props}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  subvalue,
  className = '',
}: {
  label: string;
  value: string | number;
  subvalue?: string;
  className?: string;
}) {
  return (
    <div className={`fg-flex fg-flex-col fg-gap-1 ${className}`}>
      {/* WIDGET_LABEL token: 14px → overridden to 10px badge-scale for stat kickers */}
      <div
        style={{
          ...UI_TOKENS.TEXT.R.BADGE,
          color: 'var(--fg-muted)',
          letterSpacing: '0.2em',
        }}
      >
        {label}
      </div>
      <div className="fg-flex fg-items-baseline fg-gap-2">
        <div style={UI_TOKENS.TEXT.R.STAT_LARGE} className="fg-tabular-nums">
          {value}
        </div>
        {subvalue && <div style={UI_TOKENS.TEXT.R.SUBTEXT}>{subvalue}</div>}
      </div>
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fg-fixed fg-inset-0 fg-z-[10000] fg-flex fg-items-center fg-justify-center fg-p-6">
      <div
        className="fg-absolute fg-inset-0 fg-bg-[var(--fg-overlay-strong)] fg-backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fg-panel fg-relative fg-w-full fg-max-w-xl fg-rounded-[16px] fg-p-8">
        <div className="fg-text-center fg-mb-6">
          <div style={{ ...UI_TOKENS.TEXT.R.HEADING, letterSpacing: '0.24em' }}>
            {title}
          </div>
          {description && (
            <div style={{ ...UI_TOKENS.TEXT.R.FOOTNOTE, marginTop: '8px' }}>
              {description}
            </div>
          )}
        </div>

        {children}

        <div className="fg-mt-8 fg-flex fg-gap-3">
          {footer || (
            <Button variant="secondary" className="fg-flex-1" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
