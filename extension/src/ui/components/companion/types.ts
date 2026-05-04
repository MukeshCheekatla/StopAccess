export type CompanionState =
  | 'idle'
  | 'walking'
  | 'sitting'
  | 'sleeping'
  | 'thinking'
  | 'scratching'
  | 'stretching'
  | 'jumping'
  | 'hiding'
  | 'warning_hold'
  | 'bored_look'
  | 'poked'
  | 'aiming'
  | 'recoil'
  | 'firing';

export type CompanionMood =
  | 'happy'
  | 'focused'
  | 'judging'
  | 'sleepy'
  | 'shame'
  | 'victory'
  | 'thinking'
  | 'surprised'
  | 'sad'
  | 'scared'
  | 'excited'
  | 'aiming';

export type FacingDir = 'left' | 'right';

export interface Position {
  x: number; // viewport % 0-90
  y: number; // viewport % 0-90
}

export interface ProceduralAngles {
  // Limbs
  leftLeg: number;
  rightLeg: number;
  leftArm: number;
  rightArm: number;
  // Head
  headTilt: number;
  headNod: number; // forward/back droop (for sleeping)
  bodyBob: number;
  bodyTilt: number; // side-to-side sway
  // Legs Y offset for stepping
  leftLegY: number;
  rightLegY: number;
  // Eyes — pupils offset within visor (px in SVG space)
  eyeX: number;
  eyeY: number;
  // Blink — 0=open, 1=closed
  blinkT: number;
  // Squash & stretch
  scaleY: number;
  scaleX: number;
  // Mouth openness 0-1
  mouthOpen: number;
  // Pupil dilation 0.6-1.4 (1=normal)
  pupilScale: number;
  // Pixel-based movement (from fafa.tsx)
  xPos: number;
}

/** One piece of context Byte remembers about the page */
export interface PageMemoryItem {
  text: string; // card/heading text extracted
  position: Position; // where on viewport this element lives
  type: 'card' | 'heading' | 'stat' | 'input';
  seenAt: number; // timestamp
  ctaLabel?: string;
  ctaAction?: () => void;
}
