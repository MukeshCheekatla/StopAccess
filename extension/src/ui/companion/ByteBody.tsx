import React from 'react';
import { COLORS } from '@/ui/theme/designTokens';
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
  iconKey?: string | null;
  message?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  onFlareClick?: () => void;
  scale?: number;
  isFiring?: boolean;
  flareFired?: boolean;
  flareKey?: number;
  theme?: 'light' | 'dark';
  isNightTime?: boolean;
}

export const ByteBody: React.FC<ByteBodyProps> = ({
  mood = 'happy',
  state = 'idle',
  facing = 'right',
  angles,
  message,
  iconKey,
  ctaLabel,
  onCtaClick,
  onFlareClick,
  scale = 1,
  isFiring = false,
  flareFired = false,
  flareKey = 0,
  theme = 'light',
  isNightTime: propIsNightTime,
}) => {
  const currentHour = new Date().getHours();
  const isNightTime = propIsNightTime ?? (currentHour >= 22 || currentHour < 6);
  const isSleeping = state === 'sleeping';
  const isSitting = ['sitting', 'sleeping'].includes(state);

  const accentGlow =
    mood === 'victory' || mood === 'excited' || mood === 'laughing'
      ? COLORS.green
      : mood === 'sad' ||
        mood === 'scared' ||
        mood === 'sleepy' ||
        mood === 'shame'
      ? COLORS.indigo
      : mood === 'judging' || mood === 'annoyed' || mood === 'angry'
      ? COLORS.red
      : mood === 'thinking'
      ? COLORS.yellow
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

            {isSleeping || mood === 'sleepy' ? (
              // 😴 Sleepy
              <>
                <path
                  d="M 28 35 Q 35 38 42 35"
                  stroke={accentGlow}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 58 35 Q 65 38 72 35"
                  stroke={accentGlow}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                <ellipse cx="50" cy="48" rx="3" ry="4" fill={COLORS.muted} />
                <circle
                  cx="62"
                  cy="50"
                  r="5"
                  fill="#BAE6FD"
                  opacity="0.7"
                  stroke="#38BDF8"
                  strokeWidth="1"
                />
              </>
            ) : mood === 'thinking' ? (
              // 🤔 Thinking
              <>
                <circle
                  cx={35 + angles.eyeX * flip + 3}
                  cy={35 + angles.eyeY - 4}
                  r={4 * angles.pupilScale}
                  fill={accentGlow}
                />
                <circle
                  cx={65 + angles.eyeX * flip + 3}
                  cy={35 + angles.eyeY - 4}
                  r={4 * angles.pupilScale}
                  fill={accentGlow}
                />
                <circle cx="50" cy="45" r="2" fill={accentGlow} />
                <circle
                  cx="86"
                  cy="-4"
                  r="6"
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth="2"
                />
                <circle
                  cx="78"
                  cy="6"
                  r="3"
                  fill="none"
                  stroke={strokeCol}
                  strokeWidth="1.5"
                />
                <circle cx="72" cy="14" r="1.5" fill={strokeCol} />
              </>
            ) : mood === 'shame' ? (
              // 😳 Shame
              <>
                <path
                  d={`M ${30 + angles.eyeX * flip} ${38 + angles.eyeY} Q ${
                    35 + angles.eyeX * flip
                  } ${34 + angles.eyeY} ${40 + angles.eyeX * flip} ${
                    38 + angles.eyeY
                  }`}
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${60 + angles.eyeX * flip} ${38 + angles.eyeY} Q ${
                    65 + angles.eyeX * flip
                  } ${34 + angles.eyeY} ${70 + angles.eyeX * flip} ${
                    38 + angles.eyeY
                  }`}
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <g
                  stroke={COLORS.indigo}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.4"
                >
                  <line x1="25" y1="18" x2="25" y2="28" />
                  <line x1="30" y1="15" x2="30" y2="25" />
                  <line x1="70" y1="15" x2="70" y2="25" />
                  <line x1="75" y1="18" x2="75" y2="28" />
                </g>
                <path
                  d="M 45 48 Q 50 45 55 48"
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : mood === 'angry' ? (
              // 💢 Angry
              <>
                <g
                  transform="translate(68, 18) scale(0.6)"
                  stroke={COLORS.red}
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                >
                  <path d="M -4 -4 L 0 0 M 4 -4 L 0 0 M -4 4 L 0 0 M 4 4 L 0 0" />
                </g>
                <path
                  d={`M ${28 + angles.eyeX * flip} ${32 + angles.eyeY} L ${
                    42 + angles.eyeX * flip
                  } ${36 + angles.eyeY}`}
                  stroke={accentGlow}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${58 + angles.eyeX * flip} ${36 + angles.eyeY} L ${
                    72 + angles.eyeX * flip
                  } ${32 + angles.eyeY}`}
                  stroke={accentGlow}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle
                  cx={35 + angles.eyeX * flip}
                  cy={36 + angles.eyeY}
                  r={4 * angles.pupilScale}
                  fill={accentGlow}
                />
                <circle
                  cx={65 + angles.eyeX * flip}
                  cy={36 + angles.eyeY}
                  r={4 * angles.pupilScale}
                  fill={accentGlow}
                />
                <path
                  d="M 45 48 Q 50 42 55 48"
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : mood === 'annoyed' || mood === 'judging' ? (
              // 😒 Judging / Annoyed
              <>
                <path
                  d={`M ${30 + angles.eyeX * flip} ${34 + angles.eyeY} Q ${
                    35 + angles.eyeX * flip
                  } ${40 + angles.eyeY} ${40 + angles.eyeX * flip} ${
                    34 + angles.eyeY
                  } Z`}
                  fill={accentGlow}
                />
                <path
                  d={`M ${60 + angles.eyeX * flip} ${34 + angles.eyeY} Q ${
                    65 + angles.eyeX * flip
                  } ${40 + angles.eyeY} ${70 + angles.eyeX * flip} ${
                    34 + angles.eyeY
                  } Z`}
                  fill={accentGlow}
                />
                <path
                  d="M 44 46 L 56 46"
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : mood === 'sad' ? (
              // 😢 Sad
              <>
                <circle
                  cx={35 + angles.eyeX * flip}
                  cy={35 + angles.eyeY}
                  r={4 * angles.pupilScale}
                  fill={accentGlow}
                />
                <circle
                  cx={65 + angles.eyeX * flip}
                  cy={35 + angles.eyeY}
                  r={4 * angles.pupilScale}
                  fill={accentGlow}
                />
                <path
                  d={`M ${35 + angles.eyeX * flip} ${42 + angles.eyeY} C ${
                    40 + angles.eyeX * flip
                  } ${48 + angles.eyeY}, ${30 + angles.eyeX * flip} ${
                    48 + angles.eyeY
                  }, ${35 + angles.eyeX * flip} ${42 + angles.eyeY} Z`}
                  fill="#38BDF8"
                  opacity="0.8"
                />
                <path
                  d="M 45 48 Q 50 43 55 48"
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : mood === 'scared' ? (
              // 😨 Scared
              <>
                <g
                  stroke={COLORS.indigo}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.5"
                >
                  <line x1="42" y1="12" x2="42" y2="22" />
                  <line x1="50" y1="14" x2="50" y2="24" />
                  <line x1="58" y1="12" x2="58" y2="22" />
                </g>
                <circle
                  cx={35 + angles.eyeX * flip}
                  cy={35 + angles.eyeY}
                  r={6 * angles.pupilScale}
                  fill={accentGlow}
                />
                <circle
                  cx={36 + angles.eyeX * flip}
                  cy={33 + angles.eyeY}
                  r="1.5"
                  fill={fillCol}
                />
                <circle
                  cx={65 + angles.eyeX * flip}
                  cy={35 + angles.eyeY}
                  r={6 * angles.pupilScale}
                  fill={accentGlow}
                />
                <circle
                  cx={66 + angles.eyeX * flip}
                  cy={33 + angles.eyeY}
                  r="1.5"
                  fill={fillCol}
                />
                <path
                  d="M 45 47 L 47 44 L 50 47 L 53 44 L 55 47"
                  stroke={accentGlow}
                  strokeWidth="2"
                  fill="none"
                  strokeLinejoin="round"
                />
              </>
            ) : mood === 'focused' ? (
              // 🧐 Focused (glasses)
              <>
                <rect
                  x="22"
                  y="26"
                  width="24"
                  height="16"
                  rx="4"
                  fill="rgba(148,163,184,0.15)"
                  stroke={strokeCol}
                  strokeWidth="2.5"
                />
                <rect
                  x="54"
                  y="26"
                  width="24"
                  height="16"
                  rx="4"
                  fill="rgba(148,163,184,0.15)"
                  stroke={strokeCol}
                  strokeWidth="2.5"
                />
                <line
                  x1="46"
                  y1="34"
                  x2="54"
                  y2="34"
                  stroke={strokeCol}
                  strokeWidth="2.5"
                />
                <line
                  x1="15"
                  y1="34"
                  x2="22"
                  y2="34"
                  stroke={strokeCol}
                  strokeWidth="2.5"
                />
                <line
                  x1="78"
                  y1="34"
                  x2="85"
                  y2="34"
                  stroke={strokeCol}
                  strokeWidth="2.5"
                />
                <circle
                  cx={35 + angles.eyeX * flip}
                  cy={35 + angles.eyeY}
                  r={2.5 * angles.pupilScale}
                  fill={accentGlow}
                />
                <circle
                  cx={65 + angles.eyeX * flip}
                  cy={35 + angles.eyeY}
                  r={2.5 * angles.pupilScale}
                  fill={accentGlow}
                />
                <path
                  d="M 47 46 L 53 46"
                  stroke={accentGlow}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : mood === 'surprised' ? (
              // 💥 Surprised / Poked
              <>
                <path
                  d={`M ${31 + angles.eyeX * flip} ${31 + angles.eyeY} L ${
                    39 + angles.eyeX * flip
                  } ${39 + angles.eyeY} M ${39 + angles.eyeX * flip} ${
                    31 + angles.eyeY
                  } L ${31 + angles.eyeX * flip} ${39 + angles.eyeY}`}
                  stroke={accentGlow}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${61 + angles.eyeX * flip} ${31 + angles.eyeY} L ${
                    69 + angles.eyeX * flip
                  } ${39 + angles.eyeY} M ${69 + angles.eyeX * flip} ${
                    31 + angles.eyeY
                  } L ${61 + angles.eyeX * flip} ${39 + angles.eyeY}`}
                  stroke={accentGlow}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="46"
                  r="4"
                  fill="none"
                  stroke={accentGlow}
                  strokeWidth="2.5"
                />
              </>
            ) : mood === 'victory' ||
              mood === 'excited' ||
              mood === 'laughing' ? (
              // 🎉 Victory / Excited / Laughing
              <>
                <g stroke={COLORS.yellow} strokeWidth="2" strokeLinecap="round">
                  <line x1="20" y1="2" x2="14" y2="-6" />
                  <line x1="50" y1="-2" x2="50" y2="-12" />
                  <line x1="80" y1="2" x2="86" y2="-6" />
                </g>
                <path
                  d={`M ${28 + angles.eyeX * flip} ${36 + angles.eyeY} Q ${
                    35 + angles.eyeX * flip
                  } ${28 + angles.eyeY} ${42 + angles.eyeX * flip} ${
                    36 + angles.eyeY
                  }`}
                  stroke={accentGlow}
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${58 + angles.eyeX * flip} ${36 + angles.eyeY} Q ${
                    65 + angles.eyeX * flip
                  } ${28 + angles.eyeY} ${72 + angles.eyeX * flip} ${
                    36 + angles.eyeY
                  }`}
                  stroke={accentGlow}
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 42 44 Q 50 56 58 44"
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill={COLORS.overlaySubtle}
                  strokeLinecap="round"
                />
              </>
            ) : mood === 'aiming' ? (
              // 🎯 Aiming
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
                  d="M 45 45 Q 50 43 55 45"
                  stroke={accentGlow}
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : (
              // 😊 Default Happy
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
                  <g
                    key={`flare-${flareKey}`}
                    style={{ transform: 'translate(0px, 18px)' }}
                  >
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
                  transform: `translate(21px, 94px) rotate(${-angles.leftArm}deg) scaleX(${flip}) translateY(${
                    -angles.bodyBob * 0.85
                  }px) rotate(${-angles.bodyTilt * 0.9 * flip}deg) scaleY(${
                    1 / angles.scaleY
                  })`,
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
                      iconKey={iconKey}
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
