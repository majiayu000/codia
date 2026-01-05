"use client";

import { type GestureType } from "@/services";

interface GesturePanelProps {
  onGesture: (gesture: GestureType) => void;
  disabled?: boolean;
}

const GESTURES: { type: GestureType; label: string; emoji: string }[] = [
  { type: "wave", label: "挥手", emoji: "👋" },
  { type: "nod", label: "点头", emoji: "😊" },
  { type: "shake_head", label: "摇头", emoji: "🙅" },
  { type: "bow", label: "鞠躬", emoji: "🙇" },
  { type: "thinking", label: "思考", emoji: "🤔" },
  { type: "excited", label: "兴奋", emoji: "🎉" },
  { type: "shrug", label: "耸肩", emoji: "🤷" },
  { type: "clap", label: "拍手", emoji: "👏" },
];

export function GesturePanel({ onGesture, disabled = false }: GesturePanelProps) {
  return (
    <div className="absolute bottom-20 left-4 z-20 flex flex-col gap-2 p-3 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-lg">
      <span className="text-xs font-medium text-[var(--text-muted)] mb-1">动作测试</span>
      <div className="grid grid-cols-4 gap-1.5">
        {GESTURES.map(({ type, label, emoji }) => (
          <button
            key={type}
            onClick={() => onGesture(type)}
            disabled={disabled}
            className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-[var(--secondary-100)] active:bg-[var(--secondary-200)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={label}
          >
            <span className="text-xl">{emoji}</span>
            <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
