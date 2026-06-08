import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Download,
  QrCode,
  Camera,
  Share2,
  X,
  Settings,
  Check,
  Loader2,
  Copy,
  MonitorSmartphone,
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import type { SyncPackage, DataConflict, ConflictResolution } from "@/types";
import { useSyncStore } from "@/store/syncStore";
import { useSurveyStore } from "@/store/surveyStore";
import {
  createSyncPackage,
  validateSyncPackage,
  mergeSyncPackage,
  downloadSyncPackage,
  encodeSyncPackageForQR,
  decodeSyncPackageFromQR,
  detectConflicts,
} from "@/lib/sync";
import ConflictResolver from "./ConflictResolver";
import { cn } from "@/lib/utils";

interface SyncPanelProps {
  onClose: () => void;
}

type TabKey = "export" | "import";

export default function SyncPanel({ onClose }: SyncPanelProps) {
  const { deviceId, deviceName, setDeviceName, setStatus, markSyncComplete, setError } =
    useSyncStore();
  const surveys = useSurveyStore((s) => s.surveys);

  const [tab, setTab] = useState<TabKey>("export");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(deviceName);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [syncPackage, setSyncPackage] = useState<SyncPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<DataConflict[] | null>(null);
  const [pendingPackage, setPendingPackage] = useState<SyncPackage | null>(null);
  const [qrChunks, setQrChunks] = useState<string[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [receivedChunks, setReceivedChunks] = useState<Map<number, string>>(new Map());

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const [pasteInput, setPasteInput] = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (scanTimerRef.current) {
      cancelAnimationFrame(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const scanQRCode = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          handleQRData(code.data);
        }
      }
      scanTimerRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      scanQRCode();
    } catch (err) {
      setMessage("无法访问摄像头，请使用粘贴方式导入");
      console.error("Camera error:", err);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleQRData = (data: string) => {
    if (data.startsWith("sync-chunk:")) {
      const parts = data.slice(11).split("|");
      const index = parseInt(parts[0]);
      const total = parseInt(parts[1]);
      const chunk = parts.slice(2).join("|");

      setTotalChunks(total);
      setReceivedChunks((prev) => {
        const next = new Map(prev);
        next.set(index, chunk);
        if (next.size === total) {
          const combined = Array.from(next.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([, v]) => v)
            .join("");
          try {
            const pkg = decodeSyncPackageFromQR(combined);
            if (pkg) {
              stopCamera();
              handleImportPackage(pkg);
            }
          } catch {
            setMessage("二维码数据解码失败");
          }
        }
        return next;
      });
      return;
    }

    const pkg = decodeSyncPackageFromQR(data);
    if (pkg) {
      stopCamera();
      handleImportPackage(pkg);
    } else {
      const decoded = decodeURIComponent(escape(atob(data)));
      try {
        const parsed = JSON.parse(decoded);
        if (validateSyncPackage(parsed)) {
          stopCamera();
          handleImportPackage(parsed);
        }
      } catch {
        setMessage("无效的二维码数据");
      }
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setStatus("exporting");
    setMessage(null);
    try {
      const pkg = await createSyncPackage(deviceId, deviceName);
      setSyncPackage(pkg);

      const encoded = encodeSyncPackageForQR(pkg);
      const maxChunkSize = 800;
      const chunks: string[] = [];
      for (let i = 0; i < encoded.length; i += maxChunkSize) {
        chunks.push(encoded.slice(i, i + maxChunkSize));
      }

      if (chunks.length === 1) {
        const url = await QRCode.toDataURL(encoded, {
          width: 320,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setQrDataUrl(url);
        setQrChunks(chunks);
        setTotalChunks(1);
        setCurrentChunk(0);
      } else {
        const indexedChunks = chunks.map(
          (c, i) => `sync-chunk:${i}|${chunks.length}|${c}`
        );
        setQrChunks(indexedChunks);
        setTotalChunks(chunks.length);
        setCurrentChunk(0);
        const url = await QRCode.toDataURL(indexedChunks[0], {
          width: 320,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setQrDataUrl(url);
      }

      setMessage(
        `已生成同步包：${pkg.surveys.length} 条记录，${pkg.photos.length} 张照片`
      );
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "导出失败");
      setMessage("导出失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPackage = () => {
    if (syncPackage) {
      downloadSyncPackage(syncPackage);
    }
  };

  const handleNextChunk = async () => {
    if (currentChunk < qrChunks.length - 1) {
      const next = currentChunk + 1;
      setCurrentChunk(next);
      const url = await QRCode.toDataURL(qrChunks[next], {
        width: 320,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrDataUrl(url);
    }
  };

  const handlePrevChunk = async () => {
    if (currentChunk > 0) {
      const prev = currentChunk - 1;
      setCurrentChunk(prev);
      const url = await QRCode.toDataURL(qrChunks[prev], {
        width: 320,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrDataUrl(url);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!validateSyncPackage(parsed)) {
          setMessage("文件格式无效，不是合法的同步包");
          return;
        }
        handleImportPackage(parsed);
      } catch (err) {
        setMessage("文件解析失败：" + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportPackage = async (pkg: SyncPackage) => {
    setLoading(true);
    setStatus("importing");
    setMessage(`正在处理来自 "${pkg.deviceName}" 的同步包...`);

    try {
      const localSurveys = useSurveyStore.getState().surveys;
      const foundConflicts = detectConflicts(localSurveys, pkg.surveys);

      if (foundConflicts.length > 0) {
        setStatus("conflict");
        setConflicts(foundConflicts);
        setPendingPackage(pkg);
        setMessage(`检测到 ${foundConflicts.length} 个数据冲突，请逐条处理`);
        setLoading(false);
        return;
      }

      setStatus("merging");
      const result = await mergeSyncPackage(pkg);
      markSyncComplete(pkg.deviceName);
      setMessage(
        `同步完成：新增 ${result.added} 条，更新 ${result.updated} 条，导入照片 ${result.photosImported} 张`
      );
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "导入失败");
      setMessage("导入失败：" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setLoading(false);
    }
  };

  const handleResolveConflicts = async (resolutions: ConflictResolution[]) => {
    if (!pendingPackage) return;
    setLoading(true);
    setStatus("merging");
    setConflicts(null);
    setMessage("正在合并数据...");

    try {
      const result = await mergeSyncPackage(pendingPackage, resolutions);
      markSyncComplete(pendingPackage.deviceName);
      setPendingPackage(null);
      setMessage(
        `同步完成：新增 ${result.added} 条，更新 ${result.updated} 条，跳过 ${result.skipped} 条，导入照片 ${result.photosImported} 张`
      );
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "合并失败");
      setMessage("合并失败：" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConflicts = () => {
    setConflicts(null);
    setPendingPackage(null);
    setStatus("idle");
    setMessage("已取消同步");
  };

  const handlePasteImport = () => {
    if (!pasteInput.trim()) {
      setMessage("请粘贴同步包数据");
      return;
    }
    try {
      let pkg: SyncPackage | null = null;
      try {
        pkg = decodeSyncPackageFromQR(pasteInput.trim());
      } catch {
        const parsed = JSON.parse(pasteInput.trim());
        if (validateSyncPackage(parsed)) {
          pkg = parsed;
        }
      }
      if (pkg) {
        handleImportPackage(pkg);
        setPasteInput("");
      } else {
        setMessage("粘贴的数据无效");
      }
    } catch (err) {
      setMessage("解析失败：" + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCopyEncoded = async () => {
    if (syncPackage) {
      const encoded = encodeSyncPackageForQR(syncPackage);
      try {
        await navigator.clipboard.writeText(encoded);
        setMessage("同步包数据已复制到剪贴板");
      } catch {
        setMessage("复制失败，请手动复制");
      }
    }
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      setDeviceName(tempName.trim());
    }
    setEditingName(false);
  };

  if (conflicts && pendingPackage) {
    return (
      <ConflictResolver
        conflicts={conflicts}
        onResolve={handleResolveConflicts}
        onCancel={handleCancelConflicts}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-y-auto">
      <div className="card-glass w-full sm:w-[640px] sm:max-h-[90vh] max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden my-auto">
        <div className="flex items-center justify-between p-4 border-b border-ocean-700/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-reef-400" />
            <h3 className="text-lg font-bold text-ocean-100">离线数据同步</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-ocean-700/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="card-glass p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="w-4 h-4 text-ocean-300" />
                <span className="text-sm font-medium text-ocean-100">当前设备</span>
              </div>
              {!editingName ? (
                <button
                  onClick={() => {
                    setTempName(deviceName);
                    setEditingName(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-ocean-700/40 text-ocean-400"
                >
                  <Settings className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSaveName}
                  className="p-1.5 rounded-lg hover:bg-ocean-600/40 text-ocean-200"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
            {editingName ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="input-field text-sm"
                autoFocus
              />
            ) : (
              <>
                <div className="text-sm text-ocean-100">{deviceName}</div>
                <div className="text-xs text-ocean-400 font-mono mt-1">
                  ID: {deviceId}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 p-1 bg-ocean-900/50 rounded-xl">
            <button
              onClick={() => {
                setTab("export");
                setMessage(null);
                setQrDataUrl(null);
                setSyncPackage(null);
              }}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2",
                tab === "export"
                  ? "bg-reef-500 text-white shadow-lg"
                  : "text-ocean-300 hover:text-white"
              )}
            >
              <Download className="w-4 h-4" />
              导出 / 分享
            </button>
            <button
              onClick={() => {
                setTab("import");
                setMessage(null);
                stopCamera();
                setReceivedChunks(new Map());
              }}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2",
                tab === "import"
                  ? "bg-reef-500 text-white shadow-lg"
                  : "text-ocean-300 hover:text-white"
              )}
            >
              <Upload className="w-4 h-4" />
              导入 / 接收
            </button>
          </div>

          {message && (
            <div
              className={cn(
                "text-sm p-3 rounded-xl",
                message.includes("失败") || message.includes("错误")
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : message.includes("冲突")
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                  : message.includes("完成")
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-ocean-500/20 text-ocean-200 border border-ocean-500/30"
              )}
            >
              {message}
            </div>
          )}

          {tab === "export" && (
            <div className="space-y-4">
              {!qrDataUrl ? (
                <button
                  onClick={handleExport}
                  disabled={loading || surveys.length === 0}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed py-4 text-base"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <QrCode className="w-5 h-5" />
                  )}
                  生成同步包 ({surveys.length} 条记录)
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="card-glass p-4 flex flex-col items-center">
                    <div className="bg-white p-3 rounded-xl">
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="Sync QR Code"
                          className="w-64 h-64"
                        />
                      )}
                    </div>
                    {totalChunks > 1 && (
                      <div className="mt-3 w-full">
                        <div className="text-center text-sm text-ocean-200 mb-2">
                          二维码 {currentChunk + 1} / {totalChunks}
                        </div>
                        <div className="h-2 bg-ocean-900 rounded-full overflow-hidden mb-3">
                          <div
                            className="h-full bg-gradient-to-r from-reef-400 to-ocean-400 transition-all"
                            style={{
                              width: `${((currentChunk + 1) / totalChunks) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={handlePrevChunk}
                            disabled={currentChunk === 0}
                            className="btn-ghost disabled:opacity-40 px-4 py-2"
                          >
                            上一张
                          </button>
                          <button
                            onClick={handleNextChunk}
                            disabled={currentChunk === totalChunks - 1}
                            className="btn-ghost disabled:opacity-40 px-4 py-2"
                          >
                            下一张
                          </button>
                        </div>
                        <p className="text-xs text-ocean-400 text-center mt-2">
                          请在接收设备上按顺序扫描所有二维码
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleDownloadPackage}
                      className="btn-secondary py-3 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      下载 JSON 文件
                    </button>
                    <button
                      onClick={handleCopyEncoded}
                      className="btn-secondary py-3 text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      复制同步数据
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setQrDataUrl(null);
                      setSyncPackage(null);
                      setMessage(null);
                    }}
                    className="btn-ghost w-full py-2 text-sm"
                  >
                    重新生成
                  </button>
                </div>
              )}

              <div className="text-xs text-ocean-400 space-y-1 pt-2 border-t border-ocean-700/40">
                <p>• <strong>二维码分享：</strong>用另一台设备扫描二维码（数据较多时会分为多张）</p>
                <p>• <strong>文件传输：</strong>下载 JSON 文件后通过蓝牙、邮件等方式发送</p>
                <p>• <strong>粘贴导入：</strong>复制数据后在接收设备粘贴导入</p>
              </div>
            </div>
          )}

          {tab === "import" && (
            <div className="space-y-4">
              <label className="btn-primary w-full py-4 text-base cursor-pointer disabled:opacity-50">
                <Upload className="w-5 h-5" />
                选择同步包文件 (JSON)
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImportFile}
                  disabled={loading}
                />
              </label>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-ocean-700/40" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-ocean-400 bg-ocean-950/80">或</span>
                </div>
              </div>

              <div className="card-glass p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-ocean-300" />
                  <span className="text-sm font-medium text-ocean-100">扫描二维码</span>
                </div>
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    disabled={loading}
                    className="btn-secondary w-full py-3 text-sm disabled:opacity-50"
                  >
                    <QrCode className="w-4 h-4" />
                    启动摄像头扫描
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-black">
                      <video
                        ref={videoRef}
                        className="w-full aspect-square object-cover"
                        playsInline
                        muted
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-8 border-2 border-reef-400 rounded-xl opacity-80" />
                      </div>
                    </div>
                    {totalChunks > 0 && (
                      <div>
                        <div className="text-sm text-ocean-200 mb-1 text-center">
                          已扫描 {receivedChunks.size} / {totalChunks}
                        </div>
                        <div className="h-2 bg-ocean-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-reef-400 transition-all"
                            style={{
                              width: `${(receivedChunks.size / totalChunks) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={stopCamera}
                      className="btn-ghost w-full py-2 text-sm"
                    >
                      停止扫描
                    </button>
                  </div>
                )}
              </div>

              <div className="card-glass p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Copy className="w-4 h-4 text-ocean-300" />
                  <span className="text-sm font-medium text-ocean-100">粘贴同步数据</span>
                </div>
                <textarea
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder="在此粘贴从另一台设备复制的同步包数据..."
                  rows={3}
                  className="input-field resize-none text-sm font-mono mb-3"
                />
                <button
                  onClick={handlePasteImport}
                  disabled={loading || !pasteInput.trim()}
                  className="btn-secondary w-full py-2 text-sm disabled:opacity-50"
                >
                  解析并导入
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
