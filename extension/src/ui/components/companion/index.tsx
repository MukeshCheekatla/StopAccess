import React, { useState, useEffect, useRef } from 'react';
import { ByteBody } from './ByteBody';
import { CompanionMood, CompanionState, ProceduralAngles } from './types';

export type { CompanionMood, CompanionState };

const lerp = (a: number, b: number, t: number) => (1 - t) * a + t * b;

interface ByteCompanionProps {
  mood?: CompanionMood;
  message?: string;
  action?: string | null;
  variant?: 'sidebar' | 'popup' | 'dashboard';
  theme?: 'light' | 'dark';
  isNightTime?: boolean;
}

export const ByteCompanion: React.FC<ByteCompanionProps> = ({
  mood: externalMood = 'happy',
  message: externalMsg,
  action,
  variant = 'sidebar',
  theme = 'light',
  isNightTime,
}) => {
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

  // stageRef IS the container — same as fafa.tsx
  const stageRef = useRef<HTMLDivElement>(null);

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
  const signMessageRef = useRef('');
  const externalMsgRef = useRef(externalMsg || '');

  useEffect(() => {
    externalMsgRef.current = externalMsg || '';
  }, [externalMsg]);

  useEffect(() => {
    if (firePhase.current === 'idle') {
      setMood(externalMood);
    }
  }, [externalMood]);

  useEffect(() => {
    if (externalMsg) {
      speak(externalMsg, 6000);
      lastInteraction.current = Date.now(); // Awake on new message
    }
  }, [externalMsg]);

  // Keep signMessageRef in sync so the loop can read it without stale closure
  useEffect(() => {
    signMessageRef.current = signMessage;
  }, [signMessage]);

  const speak = (msg: string, duration = 3000) => {
    if (firePhase.current !== 'idle') {
      return;
    }
    setSignMessage(msg);
    signMessageRef.current = msg;
    if (signTimerRef.current) {
      clearTimeout(signTimerRef.current);
    }
    signTimerRef.current = setTimeout(() => {
      setSignMessage('');
      signMessageRef.current = '';
    }, duration);
  };

  const triggerFlare = () => {
    if (firePhase.current !== 'idle') {
      return;
    }
    isPoked.current = false;
    targets.current.targetX = 0;
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
  };

  useEffect(() => {
    if (action === 'fire_flare') {
      triggerFlare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!stageRef.current || firePhase.current !== 'idle') {
      return;
    }
    const rect = stageRef.current.getBoundingClientRect();
    mousePos.current = {
      x: Math.max(
        -1,
        Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1),
      ),
      y: Math.max(
        -1,
        Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1),
      ),
    };
    lastInteraction.current = Date.now();
  };
  const handleMouseLeave = () => {
    mousePos.current = { x: 0, y: 0 };
  };

  // ── ANIMATION LOOP ───────────────────────────────────────────
  // xPos is a LOCAL variable — never stale, no deps restart needed.
  // This is the correct game-loop pattern for React.
  useEffect(() => {
    let frame: number;
    let t = 0;
    let xPos = 0; // local position — updated every frame, always current

    const animate = () => {
      t += 0.05;
      const timeSinceInteraction = Date.now() - lastInteraction.current;
      const sm = signMessageRef.current;

      // WALKING — xPos is local var, always accurate
      const distX = targets.current.targetX - xPos;
      let nextX = xPos;
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
      xPos = nextX; // update local var for next frame
      const wp = targets.current.walkPhase;

      // STATE MACHINE
      if (firePhase.current !== 'idle') {
        setBotState('idle');
        targets.current.leftLeg = 0;
        targets.current.rightLeg = 0;
        targets.current.leftLegY = 0;
        targets.current.rightLegY = 0;
        if (firePhase.current === 'aim') {
          targets.current.rightArm = -165;
          targets.current.leftArm = 0;
          targets.current.headTilt = -15;
          targets.current.bodyBob = 5;
          targets.current.mouthOpen = 0.5;
          targets.current.eyeY = -4;
          targets.current.eyeX = 2;
        } else {
          targets.current.rightArm = -180;
          targets.current.leftArm = 0;
          targets.current.headTilt = -25;
          targets.current.bodyBob = -15;
          targets.current.mouthOpen = 1;
          targets.current.eyeY = -4;
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
        if (sm) {
          setSignMessage('');
          signMessageRef.current = '';
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

      if (firePhase.current === 'idle') {
        if (sm) {
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
        xPos: nextX,
      }));

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []); // EMPTY deps — loop runs once, xPos is local var, never stale

  // handleStageClick — stageRef IS the card, same as fafa.tsx
  const handleStageClick = (e: React.MouseEvent) => {
    if (!stageRef.current || firePhase.current !== 'idle') {
      return;
    }
    if ((e.target as HTMLElement).closest('.bot-hitbox')) {
      return;
    }
    if (variant !== 'sidebar') {
      return;
    }
    const rect = stageRef.current.getBoundingClientRect();
    let clickX = e.clientX - rect.left - rect.width / 2;
    const maxRight = rect.width / 2 - 30;
    const maxLeft = -(rect.width / 2) + 30;
    clickX = Math.max(maxLeft, Math.min(maxRight, clickX));
    targets.current.targetX = clickX;
    lastInteraction.current = Date.now();
  };

  const handlePoke = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (firePhase.current !== 'idle') {
      return;
    }
    isPoked.current = true;
    targets.current.targetX = 0;
    lastInteraction.current = Date.now();
    speak('Oops! 💥', 2000);
    setTimeout(() => {
      isPoked.current = false;
    }, 400);
  };

  const isSleeping = state === 'sleeping';
  const displayMsg = isSleeping ? '' : signMessage;

  return (
    <div
      ref={stageRef}
      onClick={handleStageClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        height: '140px',
        marginBottom: '16px',
        borderRadius: '16px',
        overflow: 'visible',
        background: 'var(--fg-glass-bg)',
        border: '1px solid var(--fg-glass-border)',
        boxShadow: '0 4px 12px var(--fg-shadow-soft)',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        userSelect: 'none',
      }}
    >
      {/* bot-hitbox: position:absolute no left — static flex pos = center */}
      <div
        className="bot-hitbox"
        style={{
          position: 'absolute',
          bottom: '20px',
          transform: `translateX(${angles.xPos}px)`,
        }}
        onClick={handlePoke}
      >
        <ByteBody
          mood={mood}
          state={state}
          facing={facing}
          angles={angles}
          message={displayMsg}
          onFlareClick={() => triggerFlare()}
          scale={0.8}
          isFiring={isFiring}
          flareFired={flareFired}
          theme={theme}
          isNightTime={isNightTime}
        />
      </div>
    </div>
  );
};
