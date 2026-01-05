"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, PerspectiveCamera, Stats } from "@react-three/drei";
import { VRM } from "@pixiv/three-vrm";
import { LoadingSpinner } from "@/components/ui";
import { VRMCharacter, type VRMCharacterHandle } from "./VRMCharacter";
import { cn } from "@/lib/utils";
import type { BasicExpression, GestureType } from "@/services";

export interface GestureController {
  playGesture: (gesture: GestureType) => void;
  isPlaying: () => boolean;
}

interface CanvasContainerProps {
  className?: string;
  vrmUrl?: string;
  expression?: BasicExpression;
  isSpeaking?: boolean;
  speakingText?: string;
  showStats?: boolean;
  onVRMLoad?: (vrm: VRM) => void;
  onVRMError?: (error: Error) => void;
  onGestureReady?: (controller: GestureController) => void;
}

function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-canvas)]">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-[var(--text-secondary)]">
          Loading 3D scene...
        </p>
      </div>
    </div>
  );
}

function DefaultScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshStandardMaterial color="#D946EF" />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#E2E8F0" />
      </mesh>
    </>
  );
}

function Scene({
  vrmUrl,
  expression,
  isSpeaking,
  speakingText,
  showStats,
  onVRMLoad,
  onVRMError,
  onGestureReady,
}: Omit<CanvasContainerProps, "className">) {
  const [loadProgress, setLoadProgress] = useState(0);
  const characterRef = useRef<VRMCharacterHandle>(null);

  // Expose gesture controller when character is loaded
  const handleVRMLoad = useCallback((vrm: VRM) => {
    onVRMLoad?.(vrm);

    // Create gesture controller
    if (characterRef.current && onGestureReady) {
      onGestureReady({
        playGesture: (gesture) => characterRef.current?.playGesture(gesture),
        isPlaying: () => characterRef.current?.isPlayingGesture() ?? false,
      });
    }
  }, [onVRMLoad, onGestureReady]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.2, 2]} fov={35} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={1}
        maxDistance={4}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
        target={[0, 1, 0]}
      />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[3, 5, 2]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-2, 3, -1]} intensity={0.3} />

      <Environment preset="studio" />

      {vrmUrl ? (
        <VRMCharacter
          ref={characterRef}
          url={vrmUrl}
          expression={expression}
          isSpeaking={isSpeaking}
          speakingText={speakingText}
          onLoad={handleVRMLoad}
          onError={onVRMError}
          onLoadProgress={setLoadProgress}
        />
      ) : (
        <DefaultScene />
      )}

      {showStats && <Stats />}
    </>
  );
}

export function CanvasContainer({
  className,
  vrmUrl,
  expression = "neutral",
  isSpeaking = false,
  speakingText = "",
  showStats = false,
  onVRMLoad,
  onVRMError,
  onGestureReady,
}: CanvasContainerProps) {
  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[300px] bg-gradient-to-b from-[var(--bg-canvas)] to-[var(--secondary-100)] rounded-[var(--radius-lg)] overflow-hidden",
        className
      )}
    >
      <Suspense fallback={<CanvasLoader />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
        >
          <Scene
            vrmUrl={vrmUrl}
            expression={expression}
            isSpeaking={isSpeaking}
            speakingText={speakingText}
            showStats={showStats}
            onVRMLoad={onVRMLoad}
            onVRMError={onVRMError}
            onGestureReady={onGestureReady}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
