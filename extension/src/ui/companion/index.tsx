import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ByteBody } from './ByteBody';
import { CompanionMood, CompanionState, ProceduralAngles } from './types';

export type { CompanionMood, CompanionState };

const lerp = (a: number, b: number, t: number) => (1 - t) * a + t * b;

interface ByteCompanionProps {
  mood?: CompanionMood;
  message?: string;
  icon?: string | null;
  action?: string | null;
  variant?: 'sidebar' | 'popup' | 'dashboard';
  theme?: 'light' | 'dark';
  isNightTime?: boolean;
}

export const ByteCompanion: React.FC<ByteCompanionProps> = ({
  mood: externalMood = 'happy',
  message: externalMsg,
  icon,
  action,
  variant = 'sidebar',
  theme = 'light',
  isNightTime,
}) => {
  const [mood, setMood] = useState<CompanionMood>(externalMood);
  const [state, setBotState] = useState<CompanionState>('idle');
  const [isFiring, setIsFiring] = useState(false);
  const [flareFired, setFlareFired] = useState(false);
  const [flareKey, setFlareKey] = useState(0);
  const [signMessage, setSignMessage] = useState('');
  const displayMsgRef = useRef('');
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
  const signTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const behaviorPhase = useRef<string>('idle');
  const pokeCount = useRef(0);
  const pokeResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signMessageRef = useRef('');
  const externalMsgRef = useRef(externalMsg || '');
  const externalMoodRef = useRef(externalMood);

  useEffect(() => {
    externalMsgRef.current = externalMsg || '';
  }, [externalMsg]);

  // Keep signMessageRef in sync so the loop can read it without stale closure
  useEffect(() => {
    signMessageRef.current = signMessage;
  }, [signMessage]);

  const speak = useCallback(
    (msg: string, duration = 3000) => {
      if (
        behaviorPhase.current === 'aim' ||
        behaviorPhase.current === 'recoil'
      ) {
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
    },
    [setSignMessage],
  );

  const prevExternalMoodRef = useRef(externalMood);
  useEffect(() => {
    externalMoodRef.current = externalMood;

    // Sync visual mood when idle
    if (behaviorPhase.current === 'idle') {
      setMood(externalMood);
    }

    // 3. Focus End/Termination Message
    if (
      externalMood !== 'focused' &&
      prevExternalMoodRef.current === 'focused'
    ) {
      speak('Session ended.\nReturning to normal.', 4000);
      lastInteraction.current = Date.now();
    }

    prevExternalMoodRef.current = externalMood;
  }, [externalMood, speak]);

  useEffect(() => {
    if (externalMsg) {
      speak(externalMsg, 6000);
      lastInteraction.current = Date.now(); // Awake on new message
    }
  }, [externalMsg, speak]);

  const triggerFlare = () => {
    if (behaviorPhase.current !== 'idle') {
      return;
    }
    targets.current.targetX = 0;
    setIsFiring(true);
    setFlareFired(false);
    behaviorPhase.current = 'aim';
    setMood('aiming');
    lastInteraction.current = Date.now();
    setTimeout(() => {
      behaviorPhase.current = 'recoil';
      setFlareKey((k) => k + 1);
      setFlareFired(true);
      lastInteraction.current = Date.now();
    }, 600);
    setTimeout(() => {
      behaviorPhase.current = 'idle';
      setIsFiring(false);
      setFlareFired(false);
      setMood(externalMood);
    }, 2100);
  };

  useEffect(() => {
    if (action === 'fire_flare') {
      triggerFlare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (
      !stageRef.current ||
      behaviorPhase.current === 'aim' ||
      behaviorPhase.current === 'recoil'
    ) {
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

      if (Math.abs(distX) > 2 && behaviorPhase.current === 'idle') {
        isWalking = true;
        const step = Math.min(walkSpeed, Math.abs(distX));
        nextX += Math.sign(distX) * step;
        targets.current.walkPhase += step * 0.06;
        setFacing(distX > 0 ? 'right' : 'left');
      } else {
        nextX = targets.current.targetX;
      }
      xPos = nextX;
      const wp = targets.current.walkPhase;
      const bp = behaviorPhase.current;

      // STATE MACHINE
      if (bp === 'aim' || bp === 'recoil') {
        // 🔫 FLARE GUN
        setBotState('idle');
        targets.current.leftLeg = 0;
        targets.current.rightLeg = 0;
        targets.current.leftLegY = 0;
        targets.current.rightLegY = 0;
        if (bp === 'aim') {
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
      } else if (bp === 'poked_angry') {
        // 😡 ANGRY POKE
        setBotState('idle');
        targets.current.leftLeg = 0;
        targets.current.rightLeg = 0;
        targets.current.leftLegY = 0;
        targets.current.rightLegY = 0;
        targets.current.rightArm = mousePos.current.y * 60 - 90;
        targets.current.leftArm = 45;
        targets.current.headTilt = mousePos.current.x * 30;
        targets.current.bodyBob = 0;
        targets.current.bodyTilt = 0;
        targets.current.eyeX = mousePos.current.x * 10;
        targets.current.eyeY = mousePos.current.y * 10;
        targets.current.mouthOpen = 0;
      } else if (bp === 'poked_annoyed') {
        // 😒 ANNOYED POKE
        setBotState('idle');
        targets.current.leftLeg = 0;
        targets.current.rightLeg = 0;
        targets.current.leftLegY = 0;
        targets.current.rightLegY = 0;
        targets.current.bodyTilt = 10 * Math.sign(mousePos.current.x || 1);
        targets.current.headTilt = 30 * Math.sign(mousePos.current.x || 1);
        targets.current.leftArm = -40;
        targets.current.rightArm = 40;
        targets.current.bodyBob = 5;
        targets.current.mouthOpen = 0;
        targets.current.eyeX = 10 * Math.sign(mousePos.current.x || 1);
      } else if (bp === 'poked_jump') {
        // 💥 JUMP POKE
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
        setMood(externalMoodRef.current === 'focused' ? 'focused' : 'excited');
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
        setMood(externalMoodRef.current);
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
        setMood(
          externalMoodRef.current === 'focused'
            ? 'focused'
            : Math.abs(mousePos.current.x) > 0.6
            ? 'focused'
            : externalMoodRef.current,
        );
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

      if (behaviorPhase.current === 'idle') {
        if (displayMsgRef.current) {
          targets.current.leftArm = 145;
        } else if (!isWalking) {
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
    if (!stageRef.current || behaviorPhase.current !== 'idle') {
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
    if (behaviorPhase.current === 'aim' || behaviorPhase.current === 'recoil') {
      return;
    }

    pokeCount.current++;
    lastInteraction.current = Date.now();
    targets.current.targetX = 0;

    if (pokeResetTimer.current) {
      clearTimeout(pokeResetTimer.current);
    }
    pokeResetTimer.current = setTimeout(() => {
      pokeCount.current = 0;
    }, 5000);

    if (pokeCount.current >= 5) {
      pokeCount.current = 0;
      behaviorPhase.current = 'poked_angry';
      setMood('angry');
      setIsFiring(true);
      speak("ALRIGHT THAT'S IT!", 2500);
      setTimeout(() => {
        setMood(externalMood);
        behaviorPhase.current = 'idle';
        setIsFiring(false);
      }, 2500);
    } else if (pokeCount.current >= 3) {
      behaviorPhase.current = 'poked_annoyed';
      setMood('judging');
      speak('Stop that...', 2000);
      setTimeout(() => {
        behaviorPhase.current = 'idle';
        setMood(externalMood);
      }, 2000);
    } else {
      behaviorPhase.current = 'poked_jump';
      setMood('surprised');
      speak('Oops!', 1500);
      setTimeout(() => {
        behaviorPhase.current = 'idle';
        setMood(externalMood);
      }, 400);
    }
  };

  const isSleeping = state === 'sleeping';
  // Force empty message if externalMsg is empty to ensure immediate board-down
  const displayMsg =
    isSleeping || !externalMsg ? '' : signMessage || externalMsg;

  useEffect(() => {
    displayMsgRef.current = displayMsg;
  }, [displayMsg]);

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
          bottom: '10px',
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
          iconKey={icon}
          onFlareClick={() => triggerFlare()}
          scale={0.8}
          isFiring={isFiring}
          flareFired={flareFired}
          flareKey={flareKey}
          theme={theme}
          isNightTime={isNightTime}
        />
      </div>
    </div>
  );
};
