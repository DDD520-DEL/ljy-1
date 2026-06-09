import { useState, useEffect, useRef, useCallback } from "react";
import {
  Timer,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Volume2,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIMER_PRESETS,
  formatTime,
  calculateProgress,
  calculateStrokeDashoffset,
  calculateElapsed,
  shouldTriggerFinish,
  isOvertime,
  isWarning,
} from "@/lib/timer";

interface TimeMarker {
  id: number;
  elapsed: number;
  label: string;
}

function playBeep() {
  try {
    const AudioCtx =
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };

    playTone(880, 0, 0.25);
    playTone(880, 0.35, 0.25);
    playTone(1100, 0.7, 0.5);

    setTimeout(() => ctx.close(), 2000);
  } catch {
    console.warn("Audio not supported");
  }
}

export default function QuadratTimer() {
  const [collapsed, setCollapsed] = useState(true);
  const [duration, setDuration] = useState(15 * 60);
  const [remaining, setRemaining] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [markers, setMarkers] = useState<TimeMarker[]>([]);
  const [finished, setFinished] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const markerCounter = useRef(0);

  const elapsed = calculateElapsed(duration, remaining);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setRemaining((prev) => {
          const next = prev - 1;
          if (shouldTriggerFinish(prev, next)) {
            setFinished(true);
            playBeep();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return clearTimer;
  }, [running, clearTimer]);

  const handlePreset = (seconds: number) => {
    clearTimer();
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(false);
    setFinished(false);
    setMarkers([]);
  };

  const handleToggle = () => {
    setRunning((r) => !r);
    setFinished(false);
  };

  const handleReset = () => {
    clearTimer();
    setRemaining(duration);
    setRunning(false);
    setFinished(false);
    setMarkers([]);
  };

  const handleMark = () => {
    markerCounter.current += 1;
    setMarkers((prev) => [
      ...prev,
      {
        id: markerCounter.current,
        elapsed,
        label: `节点 ${markerCounter.current}`,
      },
    ]);
  };

  const handleRemoveMarker = (id: number) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const progress = calculateProgress(remaining, duration);
  const strokeDashoffset = calculateStrokeDashoffset(progress, 28);

  const overtime = isOvertime(remaining);
  const warning = isWarning(remaining);

  return (
    <div className="fixed right-4 bottom-4 z-50 print:hidden">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className={cn(
            "card-glass w-14 h-14 flex items-center justify-center relative",
            "hover:ring-2 hover:ring-reef-400/60 transition-all",
            running && "ring-2 ring-reef-400/60 animate-pulse"
          )}
          title="样方调查计时器"
        >
          <Timer className={cn("w-6 h-6", running ? "text-reef-300" : "text-ocean-200")} />
          {running && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-reef-400 animate-ping" />
          )}
        </button>
      ) : (
        <div className="card-glass w-72 overflow-hidden shadow-2xl">
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 border-b border-ocean-700/40",
              finished && "bg-reef-500/20"
            )}
          >
            <div className="flex items-center gap-2">
              <Timer
                className={cn(
                  "w-5 h-5",
                  finished ? "text-reef-400" : running ? "text-reef-300" : "text-ocean-200"
                )}
              />
              <span className="font-semibold text-ocean-100 text-sm">样方计时器</span>
              {running && (
                <span className="w-2 h-2 rounded-full bg-reef-400 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-ocean-400 hover:bg-ocean-700/40 hover:text-white transition-colors"
                title="收起"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-1.5">
              {TIMER_PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => handlePreset(p.seconds)}
                  className={cn(
                    "py-2 px-1 rounded-lg text-xs font-medium transition-all min-h-[36px] border",
                    duration === p.seconds && !running
                      ? "bg-ocean-500/30 border-ocean-400 text-ocean-100"
                      : "bg-ocean-800/30 border-ocean-700/40 text-ocean-300 hover:text-white hover:bg-ocean-700/30"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center py-2">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="rgba(148, 163, 184, 0.15)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={finished ? "#f43f5e" : "#14b8a6"}
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      overtime
                        ? "text-red-400"
                        : finished
                        ? "text-reef-400"
                        : warning
                        ? "text-amber-300"
                        : "text-ocean-100"
                    )}
                  >
                    {formatTime(remaining)}
                  </span>
                  <span className="text-[10px] text-ocean-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {overtime ? "加班" : "已用"} {formatTime(elapsed)}
                  </span>
                </div>
              </div>
            </div>

            {finished && (
              <div className="flex items-center gap-2 bg-reef-500/15 border border-reef-500/40 rounded-lg px-3 py-2">
                <Volume2 className="w-4 h-4 text-reef-300 flex-shrink-0 animate-pulse" />
                <span className="text-xs text-reef-200">时间到！调查已结束</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggle}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-medium text-sm transition-all min-h-[40px] flex items-center justify-center gap-1.5",
                  running
                    ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30"
                    : "bg-reef-500 hover:bg-reef-600 text-white"
                )}
              >
                {running ? (
                  <>
                    <Pause className="w-4 h-4" /> 暂停
                  </>
                ) : finished ? (
                  <>
                    <Play className="w-4 h-4" /> 继续
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> 开始
                  </>
                )}
              </button>
              <button
                onClick={handleMark}
                disabled={!running}
                className={cn(
                  "py-2.5 px-3 rounded-xl font-medium text-sm transition-all min-h-[40px] flex items-center justify-center gap-1.5 border",
                  running
                    ? "bg-ocean-700/40 border-ocean-600/40 text-ocean-100 hover:bg-ocean-600/40"
                    : "bg-ocean-800/30 border-ocean-700/40 text-ocean-500 cursor-not-allowed"
                )}
                title="标记时间节点"
              >
                <Flag className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="py-2.5 px-3 rounded-xl font-medium text-sm transition-all min-h-[40px] flex items-center justify-center gap-1.5 bg-ocean-800/40 border border-ocean-700/40 text-ocean-300 hover:bg-ocean-700/40 hover:text-white"
                title="重置"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {markers.length > 0 && (
              <div className="space-y-1.5">
                <button
                  onClick={() => setShowMarkers((v) => !v)}
                  className="w-full flex items-center justify-between text-xs text-ocean-300 hover:text-ocean-100 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5 text-reef-400" />
                    标记节点 ({markers.length})
                  </span>
                  {showMarkers ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {showMarkers && (
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {markers.map((m, idx) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between bg-ocean-800/30 rounded-lg px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-reef-500/30 text-reef-300 flex items-center justify-center font-semibold text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="text-ocean-200">{m.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-ocean-400 tabular-nums font-mono">
                            +{formatTime(m.elapsed)}
                          </span>
                          <button
                            onClick={() => handleRemoveMarker(m.id)}
                            className="p-0.5 rounded text-ocean-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
