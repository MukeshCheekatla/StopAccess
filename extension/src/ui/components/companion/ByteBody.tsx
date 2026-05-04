import React from 'react';
import { COLORS } from '../../../ui/theme/designTokens';
import { CompanionMood, CompanionState, ProceduralAngles } from './types';
import { ByteSign } from './ByteSign';

/**
 * NOTE: DESIGN SYSTEM AUDIT
 * ONLY use COLORS tokens for colors. No hardcoded hex/rgba strings.
 */

export interface ByteBodyProps {
  mood?: CompanionMood;
  state?: CompanionState;
  facing?: 'left' | 'right';
  angles: ProceduralAngles;
  iconUrl?: string; // Used in old design, ignored in fafa design, kept for compat
  message?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  onFlareClick?: () => void;
  scale?: number;
  isFiring?: boolean;
  flareFired?: boolean;
  theme?: 'light' | 'dark';
  isNightTime?: boolean;
}

export const ByteBody: React.FC<ByteBodyProps> = ({
  mood = 'happy',
  state = 'idle',
  facing = 'right',
  angles,
  message,
  ctaLabel,
  onCtaClick,
  onFlareClick,
  scale = 1,
  isFiring = false,
  flareFired = false,
  theme = 'light',
  isNightTime: propIsNightTime,
}) => {
  const currentHour = new Date().getHours();
  const isNightTime = propIsNightTime ?? (currentHour >= 22 || currentHour < 6);
  const isSleeping = state === 'sleeping';
  const isSitting = ['sitting', 'sleeping'].includes(state);

  const accentGlow =
    mood === 'victory' || mood === 'excited'
      ? COLORS.green
      : mood === 'sad' || mood === 'scared'
      ? COLORS.indigo
      : mood === 'judging' || mood === 'shame'
      ? COLORS.red
      : COLORS.accent;

  // Use high-contrast design tokens
  const fillCol = COLORS.botFill;
  const strokeCol = COLORS.botStroke;

  // Face left by flipping the X scale
  const flip = facing === 'left' ? -1 : 1;

  return (
    <div
      style={{
        position: 'relative',
        width: 150 * scale,
        height: 120 * scale,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        transformOrigin: 'bottom center',
      }}
    >
      <style>{`
        @keyframes byteFloatZ { 
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); } 
          20% { opacity: 1; } 
          80% { opacity: 0.8; } 
          100% { opacity: 0; transform: translate(15px, -30px) scale(1.5); } 
        }
        .byte-zzz-particle { font-family: monospace; font-weight: bold; fill: ${COLORS.muted}; }

        @keyframes flareShoot {
          0% { transform: translateY(0px); opacity: 1; }
          25% { transform: translateY(220px); opacity: 1; }
          26% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes flareBurstGroup {
          0%, 25% { opacity: 0; transform: translateY(220px) scale(0.1); }       
          30% { opacity: 1; transform: translateY(220px) scale(2.5); }
          60% { opacity: 0; transform: translateY(220px) scale(5); }
          100% { opacity: 0; }
        }
        .flare-projectile { animation: flareShoot 2.5s forwards ease-out; }      
        .flare-burst { animation: flareBurstGroup 2.5s forwards ease-out; }
      `}</style>

      <svg
        viewBox="0 0 100 135"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        {/* Shadow - Dynamic based on bobbing */}
        <ellipse
          cx="50"
          cy="132"
          rx={25 * (1 - Math.max(0, -angles.bodyBob / 60))}
          ry={5 * (1 - Math.max(0, -angles.bodyBob / 60))}
          fill={COLORS.shadow}
          style={{ filter: 'blur(3px)', transition: 'all 0.1s ease-out' }}
        />

        {/* ROOT BODY */}
        <g
          style={{
            transform: `translateY(${angles.bodyBob}px) rotate(${
              angles.bodyTilt * flip
            }deg) scaleY(${angles.scaleY}) scaleX(${angles.scaleX * flip})`,
            transformOrigin: '50px 135px',
          }}
        >
          {/* Zzz Particles - Correction for flip */}
          {isSleeping && (
            <g
              style={{
                transform: `scaleX(${flip})`,
                transformOrigin: '50px 40px',
              }}
            >
              <text
                x="75"
                y="40"
                className="byte-zzz-particle"
                style={{ animation: 'byteFloatZ 2.5s infinite linear' }}
              >
                z
              </text>
              <text
                x="80"
                y="30"
                className="byte-zzz-particle"
                style={{
                  animation: 'byteFloatZ 2.5s infinite linear 0.8s',
                  fontSize: '1.2em',
                }}
              >
                Z
              </text>
              <text
                x="85"
                y="20"
                className="byte-zzz-particle"
                style={{
                  animation: 'byteFloatZ 2.5s infinite linear 1.6s',
                  fontSize: '1.4em',
                }}
              >
                Z
              </text>
            </g>
          )}

          {/* LEGS */}
          {!isSitting ? (
            <>
              <g style={{ transform: `translateY(${angles.leftLegY}px)` }}>
                <g
                  style={{
                    transform: `rotate(${angles.leftLeg}deg)`,
                    transformOrigin: '36px 115px',
                  }}
                >
                  <rect
                    x="30"
                    y="115"
                    width="12"
                    height="20"
                    rx="6"
                    fill={fillCol}
                    stroke={strokeCol}
                    strokeWidth="2"
                  />
                </g>
              </g>
              <g style={{ transform: `translateY(${angles.rightLegY}px)` }}>
                <g
                  style={{
                    transform: `rotate(${angles.rightLeg}deg)`,
                    transformOrigin: '64px 115px',
                  }}
                >
                  <rect
                    x="58"
                    y="115"
                    width="12"
                    height="20"
                    rx="6"
                    fill={fillCol}
                    stroke={strokeCol}
                    strokeWidth="2"
                  />
                </g>
              </g>
            </>
          ) : (
            <>
              <rect
                x="25"
                y="120"
                width="20"
                height="12"
                rx="6"
                fill={fillCol}
                stroke={strokeCol}
                strokeWidth="2"
              />
              <rect
                x="55"
                y="120"
                width="20"
                height="12"
                rx="6"
                fill={fillCol}
                stroke={strokeCol}
                strokeWidth="2"
              />
            </>
          )}

          {/* TORSO */}
          <rect
            x="25"
            y="65"
            width="50"
            height="55"
            rx="15"
            fill={fillCol}
            stroke={strokeCol}
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="92"
            r="8"
            fill={accentGlow}
            opacity={isSleeping ? 0.3 : 0.8}
            onClick={(e) => {
              e.stopPropagation();
              onFlareClick?.();
            }}
            style={{
              cursor: 'pointer',
              pointerEvents: 'auto',
              filter: isSleeping
                ? 'none'
                : `drop-shadow(0 0 6px ${accentGlow})`,
            }}
          />

          {/* HEAD */}
          <g
            style={{
              transform: `rotate(${angles.headTilt * flip}deg)`,
              transformOrigin: '50px 60px',
            }}
          >
            <rect
              x="15"
              y="10"
              width="70"
              height="50"
              rx="20"
              fill={fillCol}
              stroke={strokeCol}
              strokeWidth="2"
            />

            {/* 🛌 SIMPLE NIGHTCAP */}
            {isNightTime && (
              <g style={{ transform: 'translate(50px, 10px)' }}>
                {/* Simple Drooping Cone */}
                <path
                  d="M -20 -2 Q -5 -35 25 -15 L 20 -2 Z"
                  fill={COLORS.indigo}
                  stroke={strokeCol}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                {/* Pom Pom */}
                <circle
                  cx="25"
                  cy="-15"
                  r="6"
                  fill={COLORS.white}
                  stroke={strokeCol}
                  strokeWidth="2"
                />
                {/* Simple Rim */}
                <rect
                  x="-24"
                  y="-6"
                  width="48"
                  height="10"
                  rx="5"
                  fill={COLORS.white}
                  stroke={strokeCol}
                  strokeWidth="2"
                />
              </g>
            )}

            {isSleeping ? (
              <g
                stroke={COLORS.muted}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              >
                <path d="M 28 35 Q 35 40 42 35" />
                <path d="M 58 35 Q 65 40 72 35" />
                <ellipse
                  cx="50"
                  cy="48"
                  rx="3"
                  ry="4"
                  fill={COLORS.muted}
                  stroke="none"
                />
              </g>
            ) : mood === 'aiming' ? (
              <>
                <path
                  d="M 30 35 L 40 35"
                  stroke={accentGlow}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle
                  cx={65 + angles.eyeX * flip}
                  cy={35 + angles.eyeY}
                  r={5.5 * angles.pupilScale}
                  fill={accentGlow}
                />
                <path
                  d={'M 45 45 Q 50 43 55 45'}
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <circle
                  cx={35 + angles.eyeX * flip}
                  cy={35 + angles.eyeY}
                  r={5 * angles.pupilScale}
                  fill={accentGlow}
                />
                <circle
                  cx={65 + angles.eyeX * flip}
                  cy={35 + angles.eyeY}
                  r={5 * angles.pupilScale}
                  fill={accentGlow}
                />
                <path
                  d={`M 45 45 Q 50 ${45 + angles.mouthOpen * 12} 55 45`}
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill={angles.mouthOpen > 0.5 ? COLORS.overlaySubtle : 'none'}
                  strokeLinecap="round"
                />
              </>
            )}
          </g>

          {/* RIGHT ARM & FLARE GUN */}
          <g
            style={{
              transform: `rotate(${angles.rightArm}deg)`,
              transformOrigin: '79px 76px',
            }}
          >
            <rect
              x="73"
              y="70"
              width="12"
              height="30"
              rx="6"
              fill={fillCol}
              stroke={strokeCol}
              strokeWidth="2"
            />
            {isFiring && (
              <g style={{ transform: 'translate(79px, 94px)' }}>
                <g transform="rotate(90) scale(0.5) translate(-4, 0)">
                  <path
                    d="M -2 -11 Q 8 -5 4 12 L -4 8 Q 2 -5 -5 -15 Z"
                    fill="#334155"
                  />
                  <circle cx="0" cy="9" r="2" fill="#1E293B" />

                  <rect
                    x="-5"
                    y="-20"
                    width="18"
                    height="13"
                    rx="2"
                    fill="#EF4444"
                  />
                  <rect
                    x="13"
                    y="-19"
                    width="22"
                    height="11"
                    rx="1"
                    fill="#EF4444"
                  />
                  <rect
                    x="11"
                    y="-20"
                    width="3"
                    height="13"
                    rx="1"
                    fill="#E2E8F0"
                  />

                  <path
                    d="M 5 -7 Q 14 -7 12 3 L 5 0"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="2"
                  />
                  <line
                    x1="8"
                    y1="-7"
                    x2="9"
                    y2="-3"
                    stroke="#334155"
                    strokeWidth="2.5"
                  />
                  <line
                    x1="-5"
                    y1="-18"
                    x2="-9"
                    y2="-22"
                    stroke="#334155"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>

                {flareFired && (
                  <g style={{ transform: 'translate(0px, 18px)' }}>
                    <circle
                      cx="0"
                      cy="0"
                      r="4"
                      fill={COLORS.yellow}
                      className="flare-projectile"
                      style={{
                        filter: `drop-shadow(0 0 10px ${COLORS.yellow})`,
                      }}
                    />
                    <g className="flare-burst">
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                        <line
                          key={a}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="25"
                          stroke={COLORS.yellow}
                          strokeWidth="3"
                          strokeLinecap="round"
                          transform={`rotate(${a}, 0, 0)`}
                          style={{
                            filter: `drop-shadow(0 0 5px ${COLORS.yellow})`,
                          }}
                        />
                      ))}
                      {[
                        22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5,
                      ].map((a) => (
                        <line
                          key={a}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="15"
                          stroke={COLORS.green}
                          strokeWidth="2"
                          strokeLinecap="round"
                          transform={`rotate(${a}, 0, 0)`}
                        />
                      ))}
                      <circle
                        cx="0"
                        cy="0"
                        r="8"
                        fill={COLORS.white}
                        style={{
                          filter: `drop-shadow(0 0 15px ${COLORS.white})`,
                        }}
                      />
                    </g>
                  </g>
                )}
              </g>
            )}
          </g>

          {/* LEFT ARM & SIGN */}
          <g
            style={{
              transform: `rotate(${angles.leftArm}deg)`,
              transformOrigin: '21px 76px',
            }}
          >
            <rect
              x="15"
              y="70"
              width="12"
              height="30"
              rx="6"
              fill={fillCol}
              stroke={strokeCol}
              strokeWidth="2"
            />

            {!isFiring && (
              <g
                style={{
                  transform: `translate(21px, 94px) rotate(${-angles.leftArm}deg) scaleX(${flip})`,
                }}
              >
                <foreignObject
                  x="-100"
                  y="-180"
                  width="200"
                  height="180"
                  style={{ overflow: 'visible' }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                    }}
                  >
                    <ByteSign
                      message={message}
                      ctaLabel={ctaLabel}
                      onCtaClick={onCtaClick}
                      theme={theme}
                    />
                  </div>
                </foreignObject>
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};
