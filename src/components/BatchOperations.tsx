import { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  Waves,
  Fish,
} from "lucide-react";
import type { SurveyRecord, TideZone, SubstrateType } from "@/types";
import { useSurveyStore } from "@/store/surveyStore";
import { useFilterStore } from "@/store/filterStore";
import { TIDE_LABEL, SUBSTRATE_LABEL } from "@/lib/diversity";
import {
  exportAsDarwinCore,
  exportAsDarwinCoreWithPhotos,
} from "@/components/ExportPanel";
import { cn } from "@/lib/utils";

const TIDE_ZONES: TideZone[] = ["high", "mid", "low"];
const SUBSTRATES: SubstrateType[] = [
  "rocky",
  "sandy",
  "muddy",
  "pebble",
  "cobble",
  "mixed",
];

type BatchMode = "menu" | "modify_tide" | "modify_substrate" | "confirm_delete";

interface BatchOperationsProps {
  open: boolean;
  onClose: () => void;
  surveys: SurveyRecord[];
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function BatchOperations({
  open,
  onClose,
  surveys,
}: BatchOperationsProps) {
  const { getSelectedIds, deselectAll } = useFilterStore();
  const updateSurvey = useSurveyStore((s) => s.updateSurvey);
  const deleteSurvey = useSurveyStore((s) => s.deleteSurvey);

  const [mode, setMode] = useState<BatchMode>("menu");
  const [processing, setProcessing] = useState(false);
  const [newTideZone, setNewTideZone] = useState<TideZone>("mid");
  const [newSubstrate, setNewSubstrate] = useState<SubstrateType>("rocky");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const selectedIds = getSelectedIds();
  const selectedSurveys = surveys.filter((s) => selectedIds.includes(s.id));

  const handleClose = () => {
    setMode("menu");
    setResult(null);
    onClose();
  };

  const handleExportDwC = () => {
    if (selectedSurveys.length === 0) return;
    const csv = exportAsDarwinCore(selectedSurveys);
    downloadFile(
      csv,
      `batch-dwca-${Date.now()}.csv`,
      "text/csv;charset=utf-8"
    );
    setResult({
      success: true,
      message: `已导出 ${selectedSurveys.length} 条记录的 Darwin Core CSV`,
    });
    deselectAll();
    setTimeout(handleClose, 1500);
  };

  const handleExportDwCWithPhotos = async () => {
    if (selectedSurveys.length === 0) return;
    setProcessing(true);
    try {
      const { csv, photos } = await exportAsDarwinCoreWithPhotos(selectedSurveys);
      const timestamp = Date.now();

      downloadFile(
        csv,
        `batch-dwca-${timestamp}.csv`,
        "text/csv;charset=utf-8"
      );

      for (const photo of photos) {
        const filename =
          photo.path.split("/").pop() || `photo-${Date.now()}.jpg`;
        downloadBlob(photo.blob, filename);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setResult({
        success: true,
        message: `已导出 ${selectedSurveys.length} 条记录和 ${photos.length} 张照片`,
      });
      deselectAll();
      setTimeout(handleClose, 2000);
    } catch (err) {
      console.error("Batch export failed:", err);
      setResult({ success: false, message: "导出失败，请重试" });
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyTideZone = () => {
    if (selectedSurveys.length === 0) return;
    for (const s of selectedSurveys) {
      updateSurvey(s.id, { tideZone: newTideZone });
    }
    setResult({
      success: true,
      message: `已将 ${selectedSurveys.length} 条记录的潮带修改为「${TIDE_LABEL[newTideZone]}」`,
    });
    deselectAll();
    setTimeout(handleClose, 1500);
  };

  const handleApplySubstrate = () => {
    if (selectedSurveys.length === 0) return;
    for (const s of selectedSurveys) {
      updateSurvey(s.id, { substrateType: newSubstrate });
    }
    setResult({
      success: true,
      message: `已将 ${selectedSurveys.length} 条记录的底质修改为「${SUBSTRATE_LABEL[newSubstrate]}」`,
    });
    deselectAll();
    setTimeout(handleClose, 1500);
  };

  const handleBatchDelete = () => {
    if (selectedSurveys.length === 0) return;
    for (const s of selectedSurveys) {
      deleteSurvey(s.id);
    }
    setResult({
      success: true,
      message: `已将 ${selectedSurveys.length} 条记录移入回收站`,
    });
    deselectAll();
    setTimeout(handleClose, 1500);
  };

  if (!open) return null;

  const backToMenu = () => {
    setMode("menu");
    setResult(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-glass w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-ocean-700/40">
          <h3 className="text-lg font-semibold text-ocean-100">
            {mode === "menu" && "批量操作"}
            {mode === "modify_tide" && "批量修改潮带"}
            {mode === "modify_substrate" && "批量修改底质类型"}
            {mode === "confirm_delete" && "确认批量删除"}
          </h3>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-ocean-400 hover:bg-ocean-700/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 text-sm text-ocean-300 bg-ocean-800/30 px-3 py-2 rounded-lg">
            已选择 <span className="font-bold text-reef-300">{selectedSurveys.length}</span> 条记录
          </div>

          {result && (
            <div
              className={cn(
                "mb-4 px-4 py-3 rounded-lg flex items-center gap-2",
                result.success
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              )}
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{result.message}</span>
            </div>
          )}

          {!result && mode === "menu" && (
            <div className="space-y-2">
              <button
                onClick={handleExportDwC}
                disabled={selectedSurveys.length === 0}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">导出 Darwin Core CSV</div>
                  <div className="text-xs font-normal opacity-80">
                    导出所选记录为标准生物多样性数据格式
                  </div>
                </div>
              </button>

              <button
                onClick={handleExportDwCWithPhotos}
                disabled={selectedSurveys.length === 0 || processing}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-left bg-reef-600 hover:bg-reef-700"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
                )}
                <div className="text-left">
                  <div className="font-semibold">导出 DwC + 照片</div>
                  <div className="text-xs font-normal opacity-80">
                    CSV + 照片文件，含 associatedMedia 引用
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode("modify_tide")}
                disabled={selectedSurveys.length === 0}
                className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <Waves className="w-5 h-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">批量修改潮带</div>
                  <div className="text-xs font-normal opacity-80">
                    统一修改所选记录的潮带类型
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode("modify_substrate")}
                disabled={selectedSurveys.length === 0}
                className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <Fish className="w-5 h-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">批量修改底质类型</div>
                  <div className="text-xs font-normal opacity-80">
                    统一修改所选记录的底质类型
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode("confirm_delete")}
                disabled={selectedSurveys.length === 0}
                className="w-full btn-ghost disabled:opacity-50 disabled:cursor-not-allowed text-left text-red-400 hover:bg-red-500/20 hover:text-red-300"
              >
                <Trash2 className="w-5 h-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">批量删除</div>
                  <div className="text-xs font-normal opacity-80">
                    将所选记录移入回收站（30天内可恢复）
                  </div>
                </div>
              </button>
            </div>
          )}

          {!result && mode === "modify_tide" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-ocean-300 mb-2">
                  选择新的潮带类型：
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIDE_ZONES.map((zone) => (
                    <button
                      key={zone}
                      onClick={() => setNewTideZone(zone)}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-all min-h-[40px]",
                        newTideZone === zone
                          ? "bg-reef-500 text-white"
                          : "bg-ocean-800/50 text-ocean-300 hover:text-white"
                      )}
                    >
                      {TIDE_LABEL[zone]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={backToMenu} className="btn-ghost text-sm">
                  返回
                </button>
                <button onClick={handleApplyTideZone} className="btn-primary text-sm">
                  <Edit2 className="w-4 h-4" />
                  确认修改
                </button>
              </div>
            </div>
          )}

          {!result && mode === "modify_substrate" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-ocean-300 mb-2">
                  选择新的底质类型：
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SUBSTRATES.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setNewSubstrate(sub)}
                      className={cn(
                        "px-3 py-2 rounded-lg font-medium text-sm transition-all min-h-[40px]",
                        newSubstrate === sub
                          ? "bg-reef-500 text-white"
                          : "bg-ocean-800/50 text-ocean-300 hover:text-white"
                      )}
                    >
                      {SUBSTRATE_LABEL[sub]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={backToMenu} className="btn-ghost text-sm">
                  返回
                </button>
                <button onClick={handleApplySubstrate} className="btn-primary text-sm">
                  <Edit2 className="w-4 h-4" />
                  确认修改
                </button>
              </div>
            </div>
          )}

          {!result && mode === "confirm_delete" && (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300 text-sm">
                  确定要删除选中的 <span className="font-bold">{selectedSurveys.length}</span> 条记录吗？
                </p>
                <p className="text-red-400 text-xs mt-1">
                  记录将移入回收站，30天内可恢复。
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={backToMenu} className="btn-ghost text-sm">
                  取消
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  确认删除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
