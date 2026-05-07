import React from 'react';
import { COLORS } from './designTokens';

export interface ByteFaceProps {
  size?: number;
  mood?: 'happy' | 'focused' | 'judging';
  className?: string;
  style?: React.CSSProperties;
}

export const ByteFace: React.FC<ByteFaceProps> = ({
  size = 40,
  mood = 'happy',
  className,
  style,
}) => {
  const fillCol = COLORS.botFill;
  const strokeCol = COLORS.botStroke;
  const eyeCol = mood === 'judging' ? COLORS.red : COLORS.accent;

  return (
    <svg
      width={size}
      height={size * 0.8}
      viewBox="0 0 70 55"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      {/* Head Shape */}
      <rect
        x="0"
        y="0"
        width="70"
        height="50"
        rx="20"
        fill={fillCol}
        stroke={strokeCol}
        strokeWidth="2.5"
      />

      {mood === 'happy' && (
        <>
          <circle cx="20" cy="25" r="5" fill={eyeCol} />
          <circle cx="50" cy="25" r="5" fill={eyeCol} />
          <path
            d="M 30 35 Q 35 40 40 35"
            stroke={eyeCol}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {mood === 'focused' && (
        <>
          <circle cx="20" cy="25" r="3" fill={eyeCol} />
          <circle cx="50" cy="25" r="3" fill={eyeCol} />
          <path
            d="M 28 35 L 42 35"
            stroke={eyeCol}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}

      {mood === 'judging' && (
        <>
          <path d="M 15 22 Q 20 28 25 22 Z" fill={eyeCol} />
          <path d="M 45 22 Q 50 28 55 22 Z" fill={eyeCol} />
          <path
            d="M 30 35 L 40 35"
            stroke={eyeCol}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
};
