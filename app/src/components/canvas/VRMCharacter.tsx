"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { VRM } from "@pixiv/three-vrm";
import {
  loadVRM,
  ExpressionAnimator,
  LipSyncService,
  LivelyIdleAnimationService,
  GestureAnimationService,
  type BasicExpression,
  type GestureType,
} from "@/services";

interface VRMCharacterProps {
  url: string;
  expression?: BasicExpression;
  isSpeaking?: boolean;
  speakingText?: string;
  onLoad?: (vrm: VRM) => void;
  onError?: (error: Error) => void;
  onLoadProgress?: (progress: number) => void;
}

export interface VRMCharacterHandle {
  playGesture: (gesture: GestureType) => void;
  isPlayingGesture: () => boolean;
}

export const VRMCharacter = forwardRef<VRMCharacterHandle, VRMCharacterProps>(
  function VRMCharacter(
    {
      url,
      expression = "neutral",
      isSpeaking = false,
      speakingText = "",
      onLoad,
      onError,
      onLoadProgress,
    },
    ref
  ) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const expressionAnimator = useRef(new ExpressionAnimator());
  const lipSyncService = useRef(new LipSyncService());
  const livelyAnimation = useRef(new LivelyIdleAnimationService());
  const gestureAnimation = useRef(new GestureAnimationService());
  const { scene } = useThree();

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    playGesture: (gesture: GestureType) => {
      gestureAnimation.current.playGesture(gesture);
    },
    isPlayingGesture: () => {
      return gestureAnimation.current.isPlaying();
    },
  }));

  // Load VRM
  useEffect(() => {
    setIsLoading(true);

    console.log("Loading VRM from:", url);
    loadVRM(url, {
      onProgress: (p) => {
        console.log("VRM load progress:", p);
        onLoadProgress?.(p);
      },
      onError: (e) => {
        console.error("VRM load error:", e);
        onError?.(e);
      },
    })
      .then((loadedVrm) => {
        console.log("VRM loaded successfully:", loadedVrm);
        setVrm(loadedVrm);
        scene.add(loadedVrm.scene);

        // Initialize services
        expressionAnimator.current.setVRM(loadedVrm);
        lipSyncService.current.setVRM(loadedVrm);
        livelyAnimation.current.setVRM(loadedVrm);
        gestureAnimation.current.setVRM(loadedVrm);

        onLoad?.(loadedVrm);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("VRM catch error:", error);
        setIsLoading(false);
        onError?.(error);
      });

    return () => {
      if (vrm) {
        scene.remove(vrm.scene);
      }
    };
  }, [url, scene, onLoad, onError, onLoadProgress]);

  // Update expression
  useEffect(() => {
    expressionAnimator.current.setExpression(expression);
  }, [expression]);

  // Handle speaking
  useEffect(() => {
    if (isSpeaking && speakingText) {
      const frames = lipSyncService.current.generateFromText(speakingText);
      lipSyncService.current.playFrames(frames);
    } else {
      lipSyncService.current.stop();
    }
  }, [isSpeaking, speakingText]);

  // Animation frame
  useFrame((_, delta) => {
    if (!vrm) return;

    // Update VRM
    vrm.update(delta);

    // Update animations
    expressionAnimator.current.update(delta);
    lipSyncService.current.update(delta);

    // Only run lively idle animation when not playing a gesture
    if (!gestureAnimation.current.isPlaying()) {
      livelyAnimation.current.update(delta);
    }

    // Always update gesture animation
    gestureAnimation.current.update(delta);
  });

  if (isLoading) {
    return null;
  }

  return null; // VRM is added directly to scene
});
