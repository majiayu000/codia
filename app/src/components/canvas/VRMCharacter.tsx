"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { VRM } from "@pixiv/three-vrm";
import {
  loadVRM,
  ExpressionAnimator,
  LipSyncService,
  IdleAnimationService,
  type BasicExpression,
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

export function VRMCharacter({
  url,
  expression = "neutral",
  isSpeaking = false,
  speakingText = "",
  onLoad,
  onError,
  onLoadProgress,
}: VRMCharacterProps) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const expressionAnimator = useRef(new ExpressionAnimator());
  const lipSyncService = useRef(new LipSyncService());
  const idleAnimation = useRef(new IdleAnimationService());
  const { scene } = useThree();

  // Load VRM
  useEffect(() => {
    setIsLoading(true);

    loadVRM(url, {
      onProgress: onLoadProgress,
      onError,
    })
      .then((loadedVrm) => {
        setVrm(loadedVrm);
        scene.add(loadedVrm.scene);

        // Initialize services
        expressionAnimator.current.setVRM(loadedVrm);
        lipSyncService.current.setVRM(loadedVrm);
        idleAnimation.current.setVRM(loadedVrm);

        onLoad?.(loadedVrm);
        setIsLoading(false);
      })
      .catch((error) => {
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
    idleAnimation.current.update(delta);
  });

  if (isLoading) {
    return null;
  }

  return null; // VRM is added directly to scene
}
