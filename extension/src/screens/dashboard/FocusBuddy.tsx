import React from 'react';

export type BuddyStage = 'seed' | 'sprout' | 'plant' | 'flower' | 'tree';

interface FocusBuddyProps {
  xp: number;
  wiltUntil?: number;
}

export function FocusBuddy({ xp, wiltUntil }: FocusBuddyProps) {
  const isWilted = wiltUntil ? wiltUntil > Date.now() : false;
  const level = Math.floor(xp / 100);

  let stage: BuddyStage = 'seed';
  if (level >= 4) {
    stage = 'tree';
  } else if (level === 3) {
    stage = 'flower';
  } else if (level === 2) {
    stage = 'plant';
  } else if (level === 1) {
    stage = 'sprout';
  }

  const mainColor = isWilted ? '#8B7355' : '#4CAF50'; // Brownish vs Green
  const leafColor = isWilted ? '#696969' : '#81C784'; // Grey vs Light Green
  const flowerColor = isWilted ? '#A9A9A9' : '#FF4081'; // Grey vs Pink

  const renderStage = () => {
    switch (stage) {
      case 'seed':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60">
            <ellipse cx="30" cy="50" rx="8" ry="5" fill="#8B4513" />
          </svg>
        );
      case 'sprout':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60">
            <path
              d="M30,55 L30,45 Q30,40 35,35"
              stroke={mainColor}
              strokeWidth="3"
              fill="none"
            />
            <ellipse
              cx="35"
              cy="35"
              rx="5"
              ry="3"
              fill={leafColor}
              transform="rotate(-30 35 35)"
            />
            <ellipse
              cx="30"
              cy="52"
              rx="10"
              ry="4"
              fill="#8B4513"
              opacity="0.3"
            />
          </svg>
        );
      case 'plant':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60">
            <path
              d="M30,55 L30,30"
              stroke={mainColor}
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M30,45 Q20,40 15,45"
              stroke={mainColor}
              strokeWidth="2"
              fill="none"
            />
            <ellipse
              cx="15"
              cy="45"
              rx="6"
              ry="3"
              fill={leafColor}
              transform="rotate(30 15 45)"
            />
            <path
              d="M30,35 Q40,30 45,35"
              stroke={mainColor}
              strokeWidth="2"
              fill="none"
            />
            <ellipse
              cx="45"
              cy="35"
              rx="6"
              ry="3"
              fill={leafColor}
              transform="rotate(-30 45 35)"
            />
            <ellipse
              cx="30"
              cy="52"
              rx="12"
              ry="5"
              fill="#8B4513"
              opacity="0.3"
            />
          </svg>
        );
      case 'flower':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60">
            <path
              d="M30,55 L30,25"
              stroke={mainColor}
              strokeWidth="3"
              fill="none"
            />
            <circle cx="30" cy="20" r="8" fill={flowerColor} />
            <circle cx="30" cy="20" r="3" fill="#FFD54F" />
            <path
              d="M30,40 Q40,35 45,40"
              stroke={mainColor}
              strokeWidth="2"
              fill="none"
            />
            <ellipse
              cx="45"
              cy="40"
              rx="6"
              ry="3"
              fill={leafColor}
              transform="rotate(-30 45 40)"
            />
            <ellipse
              cx="30"
              cy="52"
              rx="12"
              ry="5"
              fill="#8B4513"
              opacity="0.3"
            />
          </svg>
        );
      case 'tree':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60">
            <rect x="26" y="30" width="8" height="25" fill="#5D4037" />
            <circle cx="30" cy="25" r="15" fill={mainColor} />
            <circle cx="20" cy="20" r="10" fill={mainColor} />
            <circle cx="40" cy="20" r="10" fill={mainColor} />
            {isWilted && (
              <circle cx="30" cy="25" r="15" fill="#000" opacity="0.1" />
            )}
            <ellipse
              cx="30"
              cy="55"
              rx="15"
              ry="5"
              fill="#8B4513"
              opacity="0.3"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fg-flex fg-flex-col fg-items-center fg-gap-1">
      <div className="fg-flex fg-h-16 fg-w-16 fg-items-center fg-justify-center fg-rounded-full fg-bg-slate-100/50">
        {renderStage()}
      </div>
      <div className="fg-text-[10px] fg-font-bold fg-uppercase fg-tracking-wider fg-text-slate-500">
        Level {level} {isWilted ? '(Wilted)' : ''}
      </div>
      <div className="fg-h-1 fg-w-12 fg-overflow-hidden fg-rounded-full fg-bg-slate-200">
        <div
          className={`fg-h-full ${
            isWilted ? 'fg-bg-slate-400' : 'fg-bg-green-500'
          }`}
          style={{ width: `${xp % 100}%` }}
        />
      </div>
    </div>
  );
}
