import { useState } from "react";
import { AlertTriangle, X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { DataConflict, ConflictResolution, SurveyRecord, SpeciesRecord } from "@/types";
import { cn } from "@/lib/utils";

interface ConflictResolverProps {
  conflicts: DataConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}

function formatValue(val: unknown): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (Array.isArray(val)) {
    return `[${val.length} 项]`;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("commonName" in obj) return String(obj.commonName);
    if ("stationName" in obj) return String(obj.stationName);
    return JSON.stringify(val).slice(0, 80);
  }
  return String(val);
}

function getConflictFields(conflict: DataConflict): { field: string; local: string; remote: string }[] {
  if (conflict.type === "survey") {
    const local = conflict.localVersion as SurveyRecord;
    const remote = conflict.remoteVersion as SurveyRecord;
    const fields: { field: string; local: string; remote: string }[] = [];
    const fieldLabels: Record<string, string> = {
      date: "调查日期",
      stationName: "站位名称",
      tideZone: "潮位带",
      quadratSize: "样方尺寸",
      substrateType: "底质类型",
      notes: "备注",
    };
    for (const key of Object.keys(fieldLabels)) {
      const lv = (local as Record<string, unknown>)[key];
      const rv = (remote as Record<string, unknown>)[key];
      if (JSON.stringify(lv) !== JSON.stringify(rv)) {
        fields.push({
          field: fieldLabels[key],
          local: formatValue(lv),
          remote: formatValue(rv),
        });
      }
    }
    if (JSON.stringify(local.location) !== JSON.stringify(remote.location)) {
      fields.push({
        field: "坐标位置",
        local: `${local.location.lat}, ${local.location.lng}`,
        remote: `${remote.location.lat}, ${remote.location.lng}`,
      });
    }
    if (JSON.stringify(local.species) !== JSON.stringify(remote.species)) {
      fields.push({
        field: "物种记录",
        local: `${local.species.length} 种`,
        remote: `${remote.species.length} 种`,
      });
    }
    return fields;
  }

  if (conflict.type === "species") {
    const local = conflict.localVersion as SpeciesRecord;
    const remote = conflict.remoteVersion as SpeciesRecord;
    const fields: { field: string; local: string; remote: string }[] = [];
    if (local.count !== remote.count) {
      fields.push({ field: "个体数", local: String(local.count), remote: String(remote.count) });
    }
    if (local.coverage !== remote.coverage) {
      fields.push({ field: "盖度 %", local: String(local.coverage), remote: String(remote.coverage) });
    }
    if (JSON.stringify(local.photoIds) !== JSON.stringify(remote.photoIds)) {
      fields.push({
        field: "照片",
        local: `${local.photoIds?.length || 0} 张`,
        remote: `${remote.photoIds?.length || 0} 张`,
      });
    }
    return fields;
  }

  return [];
}

export default function ConflictResolver({
  conflicts,
  onResolve,
  onCancel,
}: ConflictResolverProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<Map<string, "local" | "remote">>(new Map());

  const current = conflicts[currentIndex];
  const fields = getConflictFields(current);
  const currentChoice = choices.get(current.id);

  const handleChoice = (choice: "local" | "remote") => {
    setChoices((prev) => {
      const next = new Map(prev);
      next.set(current.id, choice);
      return next;
    });
  };

  const handleNext = () => {
    if (currentIndex < conflicts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleApplyAll = (choice: "local" | "remote") => {
    const all = new Map<string, "local" | "remote">();
    conflicts.forEach((c) => all.set(c.id, choice));
    setChoices(all);
  };

  const handleSubmit = () => {
    const allResolved = conflicts.every((c) => choices.has(c.id));
    if (!allResolved) return;
    const resolutions: ConflictResolution[] = conflicts.map((c) => ({
      conflictId: c.id,
      choice: choices.get(c.id)!,
    }));
    onResolve(resolutions);
  };

  const allResolved = conflicts.every((c) => choices.has(c.id));
  const progress = ((currentIndex + 1) / conflicts.length) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="card-glass w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-ocean-700/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-ocean-100">数据冲突需要解决</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-ocean-700/40 text-ocean-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-ocean-700/40 bg-ocean-900/50">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-ocean-300">
              进度 {currentIndex + 1} / {conflicts.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleApplyAll("local")}
                className="text-xs px-2 py-1 rounded bg-ocean-800 text-ocean-200 hover:bg-ocean-700"
              >
                全部保留本地
              </button>
              <button
                onClick={() => handleApplyAll("remote")}
                className="text-xs px-2 py-1 rounded bg-reef-800 text-reef-100 hover:bg-reef-700"
              >
                全部使用接收
              </button>
            </div>
          </div>
          <div className="h-2 bg-ocean-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-reef-400 to-ocean-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-ocean-900/50 rounded-xl p-4 border border-ocean-700/40">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded font-medium",
                  current.type === "survey"
                    ? "bg-blue-500/20 text-blue-300"
                    : current.type === "species"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-purple-500/20 text-purple-300"
                )}
              >
                {current.type === "survey" ? "调查记录" : current.type === "species" ? "物种记录" : "照片"}
              </span>
              <span className="font-medium text-ocean-100">{current.description}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleChoice("local")}
                className={cn(
                  "text-left p-4 rounded-xl border-2 transition-all",
                  currentChoice === "local"
                    ? "border-ocean-400 bg-ocean-500/20"
                    : "border-ocean-700/40 bg-ocean-800/30 hover:bg-ocean-700/40"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ocean-100">本地版本</span>
                  {currentChoice === "local" && (
                    <Check className="w-4 h-4 text-ocean-300" />
                  )}
                </div>
                <div className="text-xs text-ocean-400 mb-2">
                  更新于 {new Date(current.localUpdatedAt).toLocaleString("zh-CN")}
                </div>
                <div className="space-y-1 text-sm">
                  {fields.map((f, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="text-ocean-400">{f.field}:</span>
                      <span className="text-ocean-200 text-right truncate max-w-[60%]">
                        {f.local}
                      </span>
                    </div>
                  ))}
                </div>
              </button>

              <button
                onClick={() => handleChoice("remote")}
                className={cn(
                  "text-left p-4 rounded-xl border-2 transition-all",
                  currentChoice === "remote"
                    ? "border-reef-400 bg-reef-500/20"
                    : "border-ocean-700/40 bg-ocean-800/30 hover:bg-ocean-700/40"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-reef-100">接收版本</span>
                  {currentChoice === "remote" && (
                    <Check className="w-4 h-4 text-reef-300" />
                  )}
                </div>
                <div className="text-xs text-ocean-400 mb-2">
                  更新于 {new Date(current.remoteUpdatedAt).toLocaleString("zh-CN")}
                </div>
                <div className="space-y-1 text-sm">
                  {fields.map((f, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="text-ocean-400">{f.field}:</span>
                      <span className="text-reef-200 text-right truncate max-w-[60%]">
                        {f.remote}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            </div>
          </div>

          {!currentChoice && (
            <p className="text-center text-sm text-yellow-300">
              ↑ 请选择要保留的版本
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t border-ocean-700/40">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="btn-ghost disabled:opacity-40 px-4"
          >
            <ArrowLeft className="w-4 h-4" />
            上一个
          </button>

          <button
            onClick={handleSubmit}
            disabled={!allResolved}
            className="btn-primary disabled:opacity-40 px-6"
          >
            <Check className="w-4 h-4" />
            确认合并 ({conflicts.filter((c) => choices.has(c.id)).length}/{conflicts.length})
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === conflicts.length - 1}
            className="btn-ghost disabled:opacity-40 px-4"
          >
            下一个
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
