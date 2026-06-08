import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { useSyncStore } from "@/store/syncStore";
import { cn } from "@/lib/utils";

function formatTime(ts: number | null): string {
  if (!ts) return "从未同步";
  const d = new Date(ts);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SyncStatusProps {
  onClick?: () => void;
  className?: string;
}

export default function SyncStatus({ onClick, className }: SyncStatusProps) {
  const { status, lastSyncAt, lastSyncDevice, error } = useSyncStore();

  const statusConfig = {
    idle: {
      icon: Wifi,
      color: "text-ocean-300",
      bg: "bg-ocean-800/40",
      label: "待同步",
    },
    exporting: {
      icon: RefreshCw,
      color: "text-reef-300",
      bg: "bg-reef-800/40",
      label: "正在导出...",
      spin: true,
    },
    importing: {
      icon: RefreshCw,
      color: "text-blue-300",
      bg: "bg-blue-800/40",
      label: "正在导入...",
      spin: true,
    },
    merging: {
      icon: RefreshCw,
      color: "text-purple-300",
      bg: "bg-purple-800/40",
      label: "正在合并...",
      spin: true,
    },
    conflict: {
      icon: AlertTriangle,
      color: "text-yellow-300",
      bg: "bg-yellow-800/40",
      label: "存在冲突",
    },
    success: {
      icon: CheckCircle,
      color: "text-green-300",
      bg: "bg-green-800/40",
      label: "同步成功",
    },
    error: {
      icon: XCircle,
      color: "text-red-300",
      bg: "bg-red-800/40",
      label: "同步失败",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
        config.bg,
        onClick && "hover:bg-ocean-700/50 cursor-pointer",
        className
      )}
      title={error || `上次同步: ${formatTime(lastSyncAt)}`}
    >
      <Icon className={cn("w-4 h-4", config.color, config.spin && "animate-spin")} />
      <div className="text-left">
        <div className={cn("text-xs font-medium", config.color)}>{config.label}</div>
        <div className="text-[10px] text-ocean-400 leading-tight">
          {lastSyncAt
            ? `${formatTime(lastSyncAt)}`
            : "暂无同步记录"}
        </div>
      </div>
      {lastSyncDevice && (
        <WifiOff className="w-3 h-3 text-ocean-500 hidden" />
      )}
    </button>
  );
}
