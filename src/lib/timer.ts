export const TIMER_PRESETS = [
  { label: "10 分钟", seconds: 10 * 60 },
  { label: "15 分钟", seconds: 15 * 60 },
  { label: "30 分钟", seconds: 30 * 60 },
] as const;

export type TimerPreset = (typeof TIMER_PRESETS)[number];

export function formatTime(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = totalSeconds < 0 ? "-" : "";
  return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function calculateProgress(remaining: number, duration: number): number {
  if (duration <= 0) return 0;
  const ratio = remaining / duration;
  return Math.max(0, Math.min(1, ratio));
}

export function calculateStrokeDashoffset(progress: number, radius: number): number {
  const circumference = 2 * Math.PI * radius;
  return circumference * (1 - progress);
}

export function calculateElapsed(duration: number, remaining: number): number {
  return duration - remaining;
}

export interface TimerState {
  duration: number;
  remaining: number;
  running: boolean;
  finished: boolean;
}

export function shouldTriggerFinish(prev: number, next: number): boolean {
  return prev > 0 && next <= 0;
}

export function getNextRemaining(prev: number): { next: number; justFinished: boolean } {
  const next = prev - 1;
  const justFinished = shouldTriggerFinish(prev, next);
  return { next: justFinished ? 0 : next, justFinished };
}

export type TimerPhase = "idle" | "running" | "paused" | "finished" | "overtime";

export function getTimerPhase(state: TimerState): TimerPhase {
  const { duration, remaining, running, finished } = state;
  if (remaining < 0) return "overtime";
  if (finished) return "finished";
  if (running) return "running";
  if (remaining === duration) return "idle";
  return "paused";
}

export function isOvertime(remaining: number): boolean {
  return remaining < 0;
}

export function isWarning(remaining: number): boolean {
  return remaining >= 0 && remaining < 60;
}
