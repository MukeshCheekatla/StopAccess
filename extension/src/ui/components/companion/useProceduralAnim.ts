import { useState, useEffect, useRef, useCallback } from 'react';
import { CompanionMood, CompanionState, ProceduralAngles } from './types';

// Linear interpolation — exact copy from fafa.tsx
const lerp = (start: number, end: number, amt: number) =>
  (1 - amt) * start + amt * end;

export interface AnimationEngine {
  angles: ProceduralAngles;
  state: CompanionState;
  mood: CompanionMood;
  facing: 'left' | 'right';
  isFiring: boolean;
  flareFired: boolean;
  signMessage: string;
  walkTo: (x: number) => void;
  speak: (msg: string, duration?: number) => void;
  handlePoke: () => void;
  handleFireFlare: () => void;
}

export function useProceduralAnim(
  externalMood: CompanionMood,
  stageRef: React.RefObject<HTMLDivElement | null>,
): AnimationEngine {
  // --- Exact state shape from fafa.tsx ---
  const [mood, setMood] = useState<CompanionMood>(externalMood);
  const [state, setBotState] = useState<CompanionState>('idle');
  const [isFiring, setIsFiring] = useState(false);
  const [flareFired, setFlareFired] = useState(false);
  const [signMessage, setSignMessage] = useState('');
  const [facing, setFacing] = useState<'left' | 'right'>('right');

  const [angles, setAngles] = useState<ProceduralAngles>({
    bodyBob: 0,
    bodyTilt: 0,
    scaleY: 1,
    scaleX: 1,
    leftArm: 0,
    rightArm: 0,
    headTilt: 0,
    headNod: 0,
    eyeX: 0,
    eyeY: 0,
    pupilScale: 1,
    mouthOpen: 0,
    blinkT: 0,
    leftLeg: 0,
    rightLeg: 0,
    leftLegY: 0,
    rightLegY: 0,
    xPos: 0,
  });

  // --- Exact ref shape from fafa.tsx ---
  const targets = useRef({
    eyeX: 0,
    eyeY: 0,
    headTilt: 0,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0,
    leftLegY: 0,
    rightLegY: 0,
    bodyBob: 0,
    bodyTilt: 0,
    scaleY: 1,
    scaleX: 1,
    mouthOpen: 0,
    pupilScale: 1,
    targetX: 0,
    walkPhase: 0,
  });

  const lastInteraction = useRef(Date.now());
  const mousePos = useRef({ x: 0, y: 0 });
  const isPoked = useRef(false);
  const signTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firePhase = useRef<'idle' | 'aim' | 'recoil'>('idle');

  // xPosRef mirrors angles.xPos — used inside the RAF loop so we don't need
  // angles.xPos in the deps array (avoids infinite restart), but we get the same
  // "current position from last frame" that fafa.tsx gets from its closure.
  const xPosRef = useRef(0);

  // Sync external mood when not firing
  useEffect(() => {
    if (firePhase.current === 'idle') {
      setMood(externalMood);
    }
  }, [externalMood]);

  // --- speak() — exact port from fafa.tsx ---
  const speak = useCallback((msg: string, duration = 3000) => {
    if (firePhase.current !== 'idle') {
      return;
    }
    setSignMessage(msg);
    if (signTimerRef.current) {
      clearTimeout(signTimerRef.current);
    }
    signTimerRef.current = setTimeout(() => setSignMessage(''), duration);
  }, []);

  // --- handleFireFlare() — exact port from fafa.tsx ---
  const handleFireFlare = useCallback(() => {
    isPoked.current = false;
    targets.current.targetX = xPosRef.current;
    setSignMessage('');
    setIsFiring(true);
    setFlareFired(false);
    firePhase.current = 'aim';
    setMood('aiming');
    lastInteraction.current = Date.now();

    setTimeout(() => {
      firePhase.current = 'recoil';
      setFlareFired(true);
      lastInteraction.current = Date.now();
    }, 600);

    setTimeout(() => {
      firePhase.current = 'idle';
      setIsFiring(false);
      setFlareFired(false);
      setMood(externalMood);
    }, 3200);
  }, [externalMood]);

  // --- handlePoke() — exact port from fafa.tsx ---
  const handlePoke = useCallback(() => {
    if (firePhase.current !== 'idle') {
      return;
    }
    isPoked.current = true;
    targets.current.targetX = xPosRef.current;
    lastInteraction.current = Date.now();
    speak('Oops! 💥', 2000);
    setTimeout(() => {
      isPoked.current = false;
    }, 400);
  }, [speak]);

  // --- walkTo() — equivalent to handleStageClick setting targetX in fafa.tsx ---
  const walkTo = useCallback((x: number) => {
    targets.current.targetX = x;
    lastInteraction.current = Date.now();
  }, []);

  // --- Mouse tracking — exact port from fafa.tsx (onMouseMove on stageRef) ---
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const stage = stageRef.current;
      if (!stage || firePhase.current !== 'idle') {
        return;
      }
      const rect = stage.getBoundingClientRect();
      // Only track inside the stage bounds
      const rx = (e.clientX - rect.left) / rect.width;
      const ry = (e.clientY - rect.top) / rect.height;
      if (rx < 0 || rx > 1 || ry < 0 || ry > 1) {
        mousePos.current = { x: 0, y: 0 };
        return;
      }
      mousePos.current = {
        x: Math.max(-1, Math.min(1, rx * 2 - 1)),
        y: Math.max(-1, Math.min(1, ry * 2 - 1)),
      };
      lastInteraction.current = Date.now();
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [stageRef]);

  // --- PRIMARY ANIMATION LOOP — exact port of fafa.tsx useEffect ---
  // Dep: signMessage (same as fafa's [signMessage, angles.xPos])
  // We use xPosRef instead of angles.xPos in closure to avoid re-running every frame.
  useEffect(() => {
    let frame: number;
    let t = 0;

    const animate = () => {
      t += 0.05;
      const timeSinceInteraction = Date.now() - lastInteraction.current;

      // 🚶 WALKING LOGIC — exact port from fafa.tsx lines 324-337
      const distX = targets.current.targetX - xPosRef.current;
      let nextX = xPosRef.current;
      let isWalking = false;
      const walkSpeed = 3.5;

      if (Math.abs(distX) > 2 && firePhase.current === 'idle') {
        isWalking = true;
        const step = Math.min(walkSpeed, Math.abs(distX));
        nextX += Math.sign(distX) * step;
        targets.current.walkPhase += step * 0.06;
        setFacing(distX > 0 ? 'right' : 'left');
      } else {
        nextX = targets.current.targetX;
      }
      const wp = targets.current.walkPhase;

      // Update xPosRef so next frame reads the correct position
      xPosRef.current = nextX;

      // 🧠 BEHAVIOR STATE MACHINE — exact port from fafa.tsx
      if (firePhase.current !== 'idle') {
        setBotState('idle');
        targets.current.leftLeg = 0;
        targets.current.rightLeg = 0;
        targets.current.leftLegY = 0;
        targets.current.rightLegY = 0;
        if (firePhase.current === 'aim') {
          targets.current.rightArm = -165;
          targets.current.leftArm = -150;
          targets.current.headTilt = -15;
          targets.current.bodyBob = 5;
          targets.current.mouthOpen = 0.5;
          targets.current.eyeY = -12;
          targets.current.eyeX = 2;
        } else if (firePhase.current === 'recoil') {
          targets.current.rightArm = -180;
          targets.current.leftArm = -145;
          targets.current.headTilt = -25;
          targets.current.bodyBob = -15;
          targets.current.mouthOpen = 1;
          targets.current.eyeY = -12;
        }
      } else if (isPoked.current) {
        setMood('surprised');
        setBotState('idle');
        targets.current.bodyBob = -15;
        targets.current.bodyTilt = 0;
        targets.current.scaleY = 1.1;
        targets.current.scaleX = 0.9;
        targets.current.headTilt = -10;
        targets.current.leftArm = 45;
        targets.current.rightArm = -45;
        targets.current.leftLeg = 0;
        targets.current.rightLeg = 0;
        targets.current.leftLegY = 0;
        targets.current.rightLegY = 0;
        targets.current.mouthOpen = 1;
      } else if (isWalking) {
        setMood('excited');
        setBotState('idle');
        targets.current.bodyTilt = Math.sin(wp) * 5;
        targets.current.bodyBob = -Math.abs(Math.cos(wp)) * 5;
        targets.current.leftLeg = Math.sin(wp) * 15 * Math.sign(distX);
        targets.current.rightLeg =
          Math.sin(wp + Math.PI) * 15 * Math.sign(distX);
        targets.current.leftLegY = Math.max(0, Math.sin(wp)) * -12;
        targets.current.rightLegY = Math.max(0, -Math.sin(wp)) * -12;
        targets.current.leftArm = 5 + Math.sin(wp) * 8;
        targets.current.rightArm = -5 + Math.sin(wp) * 8;
        targets.current.headTilt = Math.sign(distX) * 10;
        targets.current.eyeX = Math.sign(distX) * 4;
        targets.current.eyeY = 0;
        targets.current.mouthOpen = 0.2;
      } else if (timeSinceInteraction > 15000) {
        setMood('sleepy');
        setBotState('sleeping');
        targets.current.bodyBob = 10;
        targets.current.bodyTilt = 0;
        targets.current.headTilt = 15;
        targets.current.rightArm = 40;
        targets.current.leftLeg = 0;
        targets.current.rightLeg = 0;
        targets.current.leftLegY = 0;
        targets.current.rightLegY = 0;
        targets.current.mouthOpen = 0;
        targets.current.eyeY = 0;
        if (signMessage) {
          setSignMessage('');
        }
      } else if (timeSinceInteraction > 8000) {
        setMood('happy');
        setBotState('sitting');
        targets.current.bodyBob = 10;
        targets.current.bodyTilt = 0;
        targets.current.headTilt = mousePos.current.x * 15;
        targets.current.rightArm = 20;
        targets.current.leftLeg = 0;
        targets.current.rightLeg = 0;
        targets.current.leftLegY = 0;
        targets.current.rightLegY = 0;
        targets.current.mouthOpen = 0;
        targets.current.pupilScale = 1;
        targets.current.eyeX = mousePos.current.x * 4;
        targets.current.eyeY = mousePos.current.y * 3;
      } else {
        setMood(Math.abs(mousePos.current.x) > 0.6 ? 'focused' : 'happy');
        setBotState('idle');
        targets.current.bodyBob = 0;
        targets.current.bodyTilt = 0;
        targets.current.scaleY = 1 + Math.sin(t * 1.5) * 0.015;
        targets.current.scaleX = 1 - Math.sin(t * 1.5) * 0.01;
        targets.current.headTilt = mousePos.current.x * 25;
        targets.current.leftLeg = 0;
        targets.current.rightLeg = 0;
        targets.current.leftLegY = 0;
        targets.current.rightLegY = 0;
        targets.current.rightArm = 0;
        targets.current.mouthOpen =
          Math.abs(mousePos.current.x) > 0.8 ? 0.4 : 0;
        targets.current.eyeX = mousePos.current.x * 8;
        targets.current.eyeY = mousePos.current.y * 6;
      }

      // 🪧 SIGN HOLDING OVERRIDE — exact port from fafa.tsx
      if (firePhase.current === 'idle') {
        if (signMessage) {
          targets.current.leftArm = 145;
        } else if (!isPoked.current && !isWalking) {
          if (timeSinceInteraction > 15000) {
            targets.current.leftArm = -40;
          } else if (timeSinceInteraction > 8000) {
            targets.current.leftArm = -20;
          } else {
            targets.current.leftArm = 0;
          }
        }
      }

      // 🚀 PHYSICS LERP — exact port from fafa.tsx
      setAngles((prev) => ({
        eyeX: lerp(prev.eyeX, targets.current.eyeX, 0.25),
        eyeY: lerp(prev.eyeY, targets.current.eyeY, 0.25),
        headTilt: lerp(prev.headTilt, targets.current.headTilt, 0.15),
        leftArm: lerp(prev.leftArm, targets.current.leftArm, 0.25),
        rightArm: lerp(prev.rightArm, targets.current.rightArm, 0.25),
        leftLeg: lerp(prev.leftLeg, targets.current.leftLeg, 0.3),
        rightLeg: lerp(prev.rightLeg, targets.current.rightLeg, 0.3),
        leftLegY: lerp(prev.leftLegY, targets.current.leftLegY, 0.4),
        rightLegY: lerp(prev.rightLegY, targets.current.rightLegY, 0.4),
        bodyBob: lerp(prev.bodyBob, targets.current.bodyBob, 0.3),
        bodyTilt: lerp(prev.bodyTilt, targets.current.bodyTilt, 0.3),
        scaleY: lerp(prev.scaleY, targets.current.scaleY, 0.2),
        scaleX: lerp(prev.scaleX, targets.current.scaleX, 0.2),
        mouthOpen: lerp(prev.mouthOpen, targets.current.mouthOpen, 0.25),
        pupilScale: lerp(prev.pupilScale, targets.current.pupilScale, 0.2),
        headNod: 0,
        blinkT: 0,
        xPos: nextX, // Linear, no lerp — same as fafa.tsx
      }));

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [signMessage]); // signMessage in deps — same as fafa.tsx [signMessage, angles.xPos]

  return {
    angles,
    state,
    mood,
    facing,
    isFiring,
    flareFired,
    signMessage,
    walkTo,
    speak,
    handlePoke,
    handleFireFlare,
  };
}
