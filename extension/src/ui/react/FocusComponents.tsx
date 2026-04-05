import React, { type ReactNode } from 'react';

/**
 * Design System Components for FocusGate
 * Enforcing 100% Tailwind and strict visual hierarchy.
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
    'fg-inline-flex fg-items-center fg-justify-center fg-gap-2 fg-font-black fg-tracking-[0.14em] fg-uppercase disabled:fg-opacity-50 disabled:fg-pointer-events-none';

  const variants = {
    primary: 'fg-bg-[var(--accent)] fg-text-white hover:fg-bg-[#3b3b43]',
    secondary:
      'fg-bg-white/5 fg-text-slate-200 fg-border fg-border-[var(--glass-border)] hover:fg-bg-white/10 hover:fg-text-white',
    danger:
      'fg-bg-[var(--red)] fg-text-white fg-border fg-border-[var(--red)] hover:fg-bg-[#991b1b]',
    ghost: 'fg-bg-transparent fg-text-slate-400 hover:fg-text-slate-200',
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

export function Card({
  children,
  className = '',
  hover = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`
      fg-panel fg-rounded-[18px] fg-p-6
      ${
        hover
          ? 'fg-cursor-pointer hover:fg-bg-[rgba(255,255,255,0.03)] hover:fg-border-[#3f3f46]'
          : ''
      }
      ${className}
    `}
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
      <div className="fg-text-[10px] fg-font-black fg-text-slate-400 fg-uppercase fg-tracking-[0.2em]">
        {label}
      </div>
      <div className="fg-flex fg-items-baseline fg-gap-2">
        <div className="fg-text-3xl fg-font-black fg-text-white fg-tracking-tighter fg-tabular-nums">
          {value}
        </div>
        {subvalue && (
          <div className="fg-text-xs fg-font-bold fg-text-slate-400">
            {subvalue}
          </div>
        )}
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
        className="fg-absolute fg-inset-0 fg-bg-black/80 fg-backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fg-panel fg-relative fg-w-full fg-max-w-xl fg-rounded-[16px] fg-p-8">
        <div className="fg-text-center fg-mb-6">
          <div className="fg-text-sm fg-font-black fg-text-white fg-uppercase fg-tracking-[0.24em] fg-mb-2">
            {title}
          </div>
          {description && (
            <div className="fg-text-xs fg-text-slate-400 fg-leading-relaxed">
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
