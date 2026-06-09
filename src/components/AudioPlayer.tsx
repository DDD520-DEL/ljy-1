import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Trash2, Volume2, Clock, Calendar } from "lucide-react";
import type { AudioRecord } from "@/types";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface AudioPlayerItemProps {
  audio: AudioRecord;
  onDelete?: (audioId: string) => void;
  showDelete?: boolean;
}

function AudioPlayerItem({ audio, onDelete, showDelete = true }: AudioPlayerItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime);
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audioEl.addEventListener("timeupdate", handleTimeUpdate);
    audioEl.addEventListener("ended", handleEnded);
    audioEl.addEventListener("pause", handlePause);
    audioEl.addEventListener("play", handlePlay);

    return () => {
      audioEl.removeEventListener("timeupdate", handleTimeUpdate);
      audioEl.removeEventListener("ended", handleEnded);
      audioEl.removeEventListener("pause", handlePause);
      audioEl.removeEventListener("play", handlePlay);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (audioEl.paused) {
      audioEl.play();
    } else {
      audioEl.pause();
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const time = parseFloat(e.target.value);
    audioEl.currentTime = time;
    setCurrentTime(time);
  };

  const handleDelete = () => {
    if (onDelete && confirm("确定删除这条语音备注吗？")) {
      onDelete(audio.id);
    }
  };

  const progressPct = audio.duration > 0 ? (currentTime / audio.duration) * 100 : 0;

  return (
    <div className="rounded-xl bg-ocean-800/40 border border-ocean-700/40 p-3 space-y-2">
      <audio ref={audioRef} src={audio.dataUrl} preload="metadata" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={togglePlay}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
              isPlaying
                ? "bg-reef-500 text-white"
                : "bg-ocean-700/50 text-ocean-200 hover:bg-ocean-600/50"
            )}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 text-xs text-ocean-400 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(audio.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDateTime(audio.createdAt)}
              </span>
            </div>
            <div className="h-1.5 bg-ocean-900/60 rounded-full overflow-hidden relative">
              <input
                type="range"
                min={0}
                max={audio.duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="h-full bg-reef-400 rounded-full pointer-events-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-ocean-500 mt-0.5">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(audio.duration)}</span>
            </div>
          </div>
        </div>
        {showDelete && onDelete && (
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-ocean-400 hover:text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
            title="删除语音"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface AudioPlayerProps {
  audios: AudioRecord[];
  onDelete?: (audioId: string) => void;
  showDelete?: boolean;
  className?: string;
}

export default function AudioPlayer({
  audios,
  onDelete,
  showDelete = true,
  className,
}: AudioPlayerProps) {
  if (audios.length === 0) return null;

  const sorted = [...audios].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className={cn("space-y-2", className)}>
      {sorted.map((audio) => (
        <AudioPlayerItem
          key={audio.id}
          audio={audio}
          onDelete={onDelete}
          showDelete={showDelete}
        />
      ))}
    </div>
  );
}

export { AudioPlayerItem };
