import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Clock } from "lucide-react";
import { saveAudio, blobToDataUrl } from "@/lib/audioStore";
import type { AudioRecord } from "@/types";
import { cn } from "@/lib/utils";

const MAX_DURATION_SECONDS = 180;

interface AudioRecorderProps {
  surveyId?: string;
  speciesId?: string;
  onAudioAdded: (audio: AudioRecord) => void;
  className?: string;
  compact?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function AudioRecorder({
  surveyId,
  speciesId,
  onAudioAdded,
  className,
  compact = false,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return;
    }

    setIsProcessing(true);
    const recorder = mediaRecorderRef.current;
    const duration = (Date.now() - startTimeRef.current) / 1000;

    try {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });

      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const dataUrl = await blobToDataUrl(blob);
      const fileName = `audio-${Date.now()}.${mimeType.includes("webm") ? "webm" : "ogg"}`;

      const audio = await saveAudio({
        surveyId,
        speciesId,
        dataUrl,
        fileName,
        mimeType,
        size: blob.size,
        duration,
      });

      onAudioAdded(audio);
      setError(null);
    } catch (err) {
      console.error("Failed to save audio:", err);
      setError("录音保存失败，请重试");
    } finally {
      cleanup();
      setIsRecording(false);
      setIsProcessing(false);
      setElapsedSeconds(0);
    }
  }, [surveyId, speciesId, onAudioAdded, cleanup]);

  const startRecording = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("浏览器不支持录音功能");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e) => {
        console.error("Recording error:", e);
        setError("录音出错，请重试");
        cleanup();
        setIsRecording(false);
        setElapsedSeconds(0);
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setElapsedSeconds(elapsed);
        if (elapsed >= MAX_DURATION_SECONDS) {
          stopRecording();
        }
      }, 200);
    } catch (err) {
      console.error("Failed to start recording:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("麦克风权限被拒绝，请在浏览器设置中允许使用麦克风");
      } else {
        setError("无法启动录音，请检查麦克风是否可用");
      }
      cleanup();
    }
  }, [cleanup, stopRecording]);

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <button
          onClick={handleToggle}
          disabled={isProcessing}
          className={cn(
            "p-2 rounded-lg transition-colors flex items-center justify-center",
            isRecording
              ? "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse"
              : "bg-ocean-700/40 hover:bg-ocean-600/50 text-ocean-200",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
          title={isRecording ? "停止录音" : "开始录音"}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isRecording ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>
        {error && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-red-500/90 text-white text-xs rounded-lg z-10 whitespace-normal">
            {error}
          </div>
        )}
      </div>
    );
  }

  const remaining = MAX_DURATION_SECONDS - elapsedSeconds;
  const progressPct = Math.min((elapsedSeconds / MAX_DURATION_SECONDS) * 100, 100);

  if (isProcessing) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 text-ocean-300 p-4 card-glass border-dashed border-2",
          className
        )}
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">正在保存录音...</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div
        className={cn(
          "card-glass border-red-500/40 border-2 p-4 space-y-3",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-red-300 font-medium">正在录音</span>
          </div>
          <div className="flex items-center gap-1.5 text-ocean-300">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">
              {formatDuration(elapsedSeconds)} / {formatDuration(MAX_DURATION_SECONDS)}
            </span>
          </div>
        </div>
        <div className="h-2 bg-ocean-800/50 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              remaining <= 30 ? "bg-red-500" : "bg-reef-400"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {remaining <= 30 && (
          <div className="text-xs text-red-400">
            还剩 {Math.ceil(remaining)} 秒，即将自动停止
          </div>
        )}
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button
          onClick={stopRecording}
          className="btn-danger w-full flex items-center justify-center gap-2"
        >
          <Square className="w-5 h-5 fill-current" />
          停止并保存
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "card-glass border-dashed border-2 p-6 text-center",
        className
      )}
    >
      <div className="text-ocean-300 mb-4">添加语音备注（最长 3 分钟）</div>
      <button
        onClick={startRecording}
        className="btn-primary mx-auto flex items-center justify-center gap-2"
      >
        <Mic className="w-5 h-5" />
        开始录音
      </button>
      <p className="text-xs text-ocean-500 mt-3">录音将存储在本地设备中</p>
      {error && <div className="text-sm text-red-400 mt-3">{error}</div>}
    </div>
  );
}
