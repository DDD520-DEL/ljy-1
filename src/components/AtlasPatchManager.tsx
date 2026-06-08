import { useState, useRef } from "react";
import {
  X,
  Upload,
  Download,
  FileJson,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Package,
} from "lucide-react";
import { useAtlasStore } from "@/store/atlasStore";
import type { AtlasPatchPackage } from "@/types";
import { cn } from "@/lib/utils";

interface AtlasPatchManagerProps {
  onClose: () => void;
}

type ImportStatus = "idle" | "success" | "error";

export default function AtlasPatchManager({ onClose }: AtlasPatchManagerProps) {
  const applyPatch = useAtlasStore((s) => s.applyPatch);
  const resetAtlas = useAtlasStore((s) => s.resetAtlas);
  const atlas = useAtlasStore((s) => s.atlas);
  const patchVersion = useAtlasStore((s) => s.patchVersion);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState<{
    added: number;
    updated: number;
    removed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validatePatch = (data: unknown): data is AtlasPatchPackage => {
    if (!data || typeof data !== "object") return false;
    const d = data as Record<string, unknown>;
    if (typeof d.version !== "number") return false;
    if (typeof d.exportedAt !== "number") return false;
    return true;
  };

  const handleFile = async (file: File) => {
    try {
      setStatus("idle");
      setResult(null);
      const text = await file.text();
      const data = JSON.parse(text);
      if (!validatePatch(data)) {
        setStatus("error");
        setStatusMsg("补丁包格式无效，请检查文件结构");
        return;
      }
      const res = applyPatch(data);
      setResult(res);
      setStatus("success");
      setStatusMsg(
        `补丁 v${data.version} 应用成功：新增 ${res.added}，更新 ${res.updated}，删除 ${res.removed}`
      );
    } catch (err) {
      setStatus("error");
      setStatusMsg(
        `导入失败：${err instanceof Error ? err.message : "未知错误"}`
      );
    }
  };

  const handleExportTemplate = () => {
    const template: AtlasPatchPackage = {
      version: patchVersion + 1,
      exportedAt: Date.now(),
      description: "图鉴数据补丁包模板",
      added: [],
      updated: [],
      removed: [],
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-patch-v${template.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCurrent = () => {
    const pkg: AtlasPatchPackage = {
      version: patchVersion,
      exportedAt: Date.now(),
      description: "当前图鉴完整导出",
      added: atlas,
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-export-v${patchVersion}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-ocean-700/40">
        <h3 className="text-lg font-bold text-ocean-100 flex items-center gap-2">
          <Package className="w-5 h-5 text-reef-400" />
          图鉴补丁管理
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-ocean-700/40 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="card-glass p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-ocean-100">当前状态</h4>
            <span className="chip text-xs">v{patchVersion}</span>
          </div>
          <p className="text-sm text-ocean-300">
            当前图鉴共收录 <span className="text-reef-300 font-semibold">{atlas.length}</span> 个物种。
          </p>
        </div>

        <div className="card-glass p-4 space-y-3">
          <h4 className="font-semibold text-ocean-100">导入补丁包</h4>
          <p className="text-xs text-ocean-400">
            支持导入 JSON 格式的图鉴补丁包，可包含新增、更新或删除的物种数据。
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary w-full"
          >
            <Upload className="w-5 h-5" />
            选择 JSON 补丁包
          </button>

          {status !== "idle" && (
            <div
              className={cn(
                "p-3 rounded-lg flex items-start gap-2",
                status === "success"
                  ? "bg-green-500/15 border border-green-500/30"
                  : "bg-red-500/15 border border-red-500/30"
              )}
            >
              {status === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={cn(
                  "text-sm",
                  status === "success" ? "text-green-300" : "text-red-300"
                )}
              >
                {statusMsg}
              </p>
            </div>
          )}

          {result && (result.added > 0 || result.updated > 0 || result.removed > 0) && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-ocean-900/40 rounded-lg p-2.5 text-center border border-ocean-700/30">
                <div className="text-xl font-bold text-green-400">{result.added}</div>
                <div className="text-xs text-ocean-400">新增</div>
              </div>
              <div className="bg-ocean-900/40 rounded-lg p-2.5 text-center border border-ocean-700/30">
                <div className="text-xl font-bold text-sand-400">{result.updated}</div>
                <div className="text-xs text-ocean-400">更新</div>
              </div>
              <div className="bg-ocean-900/40 rounded-lg p-2.5 text-center border border-ocean-700/30">
                <div className="text-xl font-bold text-red-400">{result.removed}</div>
                <div className="text-xs text-ocean-400">删除</div>
              </div>
            </div>
          )}
        </div>

        <div className="card-glass p-4 space-y-3">
          <h4 className="font-semibold text-ocean-100">导出</h4>
          <button
            onClick={handleExportTemplate}
            className="btn-ghost w-full"
          >
            <FileJson className="w-5 h-5" />
            下载补丁包模板
          </button>
          <button
            onClick={handleExportCurrent}
            className="btn-ghost w-full"
          >
            <Download className="w-5 h-5" />
            导出当前图鉴完整数据
          </button>
        </div>

        <div className="card-glass p-4 space-y-3">
          <h4 className="font-semibold text-ocean-100">重置</h4>
          <p className="text-xs text-ocean-400">
            将图鉴恢复到初始默认数据，所有自定义补丁将被清除。此操作不可撤销。
          </p>
          <button
            onClick={() => {
              if (confirm("确定要重置图鉴到默认数据吗？")) {
                resetAtlas();
                setStatus("success");
                setStatusMsg("图鉴已重置为默认数据");
                setResult(null);
              }
            }}
            className="btn-danger w-full"
          >
            <RotateCcw className="w-5 h-5" />
            重置为默认数据
          </button>
        </div>

        <div className="card-glass p-4 space-y-2">
          <h4 className="font-semibold text-ocean-100">补丁包格式说明</h4>
          <div className="text-xs text-ocean-400 space-y-1.5">
            <p>• <code className="text-ocean-200">version</code>: 补丁版本号（数字）</p>
            <p>• <code className="text-ocean-200">exportedAt</code>: 导出时间戳</p>
            <p>• <code className="text-ocean-200">added</code>: 新增物种数组</p>
            <p>• <code className="text-ocean-200">updated</code>: 更新物种数组（按 id 匹配）</p>
            <p>• <code className="text-ocean-200">removed</code>: 删除的物种 id 数组</p>
          </div>
        </div>
      </div>
    </div>
  );
}
