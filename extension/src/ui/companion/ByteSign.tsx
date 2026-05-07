import React, { useState, useEffect } from 'react';
import { COLORS } from '@/ui/theme/designTokens';
import { UI_ICONS, UI_TOKENS } from '@/ui/theme/uiTokens';
import { getCachedIconSync } from '@/lib/iconCache';
import { resolveFaviconUrl } from '@stopaccess/core';

export interface ByteSignProps {
  message?: string;
  iconKey?: string | null;
  ctaLabel?: string;
  onCtaClick?: () => void;
  theme?: 'light' | 'dark';
}

export const ByteSign: React.FC<ByteSignProps> = ({
  message,
  iconKey,
  ctaLabel,
  onCtaClick,
  theme = 'light',
}) => {
  const [visible, setVisible] = useState(false);
  const [displayMsg, setDisplayMsg] = useState('');

  useEffect(() => {
    let timeouts: any[] = [];

    if (message) {
      if (visible && displayMsg && displayMsg !== message) {
        setVisible(false);
        timeouts.push(
          setTimeout(() => {
            setDisplayMsg(message);
            setVisible(true);
          }, 250),
        );
      } else {
        setDisplayMsg(message);
        timeouts.push(setTimeout(() => setVisible(true), 60));
      }
    } else {
      setVisible(false);
      timeouts.push(setTimeout(() => setDisplayMsg(''), 400));
    }

    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!displayMsg) {
    return null;
  }

  // Design tokens from COLORS (High Contrast)
  const signBg = COLORS.botSignBg;
  const signBorder = COLORS.botSignBorder;
  const signText = COLORS.botSignText;
  const stickColor = COLORS.botStroke;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '0px',
        left: '50%',
        transform: 'translateX(-50%)',
        perspective: '400px',
        pointerEvents: 'none',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          transformStyle: 'preserve-3d',
          transform: visible ? 'rotateY(0deg)' : 'rotateY(90deg)',
          transition: visible
            ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'transform 0.25s ease-in',
          transformOrigin: 'bottom center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Board */}
        <div
          style={{
            background: signBg,
            border: `2.5px solid ${signBorder}`,
            borderRadius: 8,
            padding: '12px 16px',
            minWidth: 130,
            maxWidth: 280,
            width: 'max-content',
            boxShadow: `0 10px 20px ${
              COLORS.shadow
            }, inset 0 2px 4px rgba(255,255,255,${
              theme === 'dark' ? '0.05' : '0.5'
            })`,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Wood Grain */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 6,
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 6px)',
              pointerEvents: 'none',
            }}
          />
          {/* Nails */}
          {[
            { top: 6, left: 8 },
            { top: 6, right: 8 },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                ...s,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: COLORS.muted,
                boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.3)',
              }}
            />
          ))}
          {/* Content Container */}
          <div
            style={{
              padding: '0 12px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            {/* Line 1: Icon + Title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                color: signText,
              }}
            >
              {iconKey && (
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {UI_ICONS[iconKey as keyof typeof UI_ICONS] ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        color: signText,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: UI_ICONS[iconKey as keyof typeof UI_ICONS],
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: signText,
                          color: signBg,
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '900',
                          opacity: 0.8,
                        }}
                      >
                        {iconKey.slice(0, 1).toUpperCase()}
                      </div>
                      <img
                        src={
                          getCachedIconSync(iconKey) ||
                          resolveFaviconUrl(iconKey)
                        }
                        style={{
                          position: 'relative',
                          zIndex: 2,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          borderRadius: '20%',
                          background: 'white',
                          padding: '1px',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                        }}
                        onLoad={(e) => {
                          (e.currentTarget as HTMLImageElement).style.opacity =
                            '1';
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            'none';
                        }}
                        alt=""
                      />
                    </div>
                  )}
                </div>
              )}
              <span
                style={{
                  ...UI_TOKENS.TEXT.R.SIGN_TITLE,
                  color: signText,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textShadow:
                    theme === 'dark'
                      ? '0 1px 2px rgba(0,0,0,0.5)'
                      : '0 1px 1px rgba(255,255,255,0.3)',
                }}
              >
                {displayMsg.split('/n')[0]}
              </span>
            </div>

            {/* Line 2: Detail */}
            {displayMsg.includes('/n') && (
              <div
                style={{
                  ...UI_TOKENS.TEXT.R.SIGN_VALUE,
                  color: signText,
                  width: '100%',
                  textAlign: 'center',
                  padding: '0 4px',
                  textShadow:
                    theme === 'dark'
                      ? '0 1px 2px rgba(0,0,0,0.4)'
                      : '0 1px 1px rgba(255,255,255,0.2)',
                }}
              >
                {displayMsg.split('/n')[1]}
              </div>
            )}
          </div>

          {/* CTA Button */}
          {ctaLabel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCtaClick?.();
              }}
              style={{
                marginTop: 10,
                padding: '6px 14px',
                background: COLORS.accent,
                border: `1.5px solid ${COLORS.botSignBorder}`,
                borderRadius: 6,
                color: COLORS.onAccent,
                fontSize: 11,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                cursor: 'pointer',
                boxShadow: `0 3px 0 ${COLORS.botSignBorder}, 0 4px 10px rgba(0,0,0,0.3)`,
                pointerEvents: 'auto',
                fontFamily: 'monospace',
                position: 'relative',
                zIndex: 2,
                transition: 'all 0.1s active:scale-95',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter =
                  'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = 'none';
              }}
            >
              {ctaLabel}
            </button>
          )}
        </div>

        {/* Post Stick */}
        <div
          style={{
            width: 6,
            height: 65,
            background: stickColor,
            margin: '0 auto',
            borderRadius: 3,
            border: `1px solid ${signBorder}`,
            borderTop: 'none',
          }}
        />
      </div>
    </div>
  );
};
