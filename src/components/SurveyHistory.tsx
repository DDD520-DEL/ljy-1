import { useState, useMemo } from "react";
import {
  X,
  Clock,
  RotateCcw,
  Eye,
  Calendar,
  MapPin,
  Waves,
  Fish,
  ChevronRight,
  ChevronDown,
  History,
  AlertTriangle,
} from "lucide-react";
import type { SurveyRecord, SurveyVersionSnapshot, SpeciesRecord } from "@/types";
import {
  TIDE_LABEL,
  SUBSTRATE_LABEL,
  calcDiversityIndices,
} from "@/lib/diversity";
import { useSurveyStore } from "@/store/surveyStore";
import { cn } from "@/lib/utils";

interface SurveyHistoryProps {
  survey: SurveyRecord;
  onClose: () => void;
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getDaysRemaining(deletedAt?: number): number {
  if (!deletedAt) return 0;
  const elapsed = Date.now() - deletedAt;
  const remaining = Math.max(0, 30 * 24 * 60 * 60 * 1000 - elapsed);
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

function VersionPreview({ snapshot }: { snapshot: SurveyVersionSnapshot }) {
  const [expanded, setExpanded] = useState(false);
  const data = snapshot.data;
  const indices = useMemo(() => calcDiversityIndices(data.species), [data.species]);
  const validSpecies = data.species.filter((sp) => sp.count > 0 || sp.coverage > 0);

  return (
    <div className="card-glass bg-ocean-800/30 border border-reef-500/30 overflow-hidden">
      <div
        className="p-3 cursor-pointer flex items-center justify-between gap-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-reef-300">
          <Eye className="w-4 h-4" />
          <span className="font-medium text-sm">版本数据预览</span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-ocean-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ocean-400" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-ocean-700/40 px-3 py-3 space-y-3 bg-ocean-950/30">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-ocean-400 text-xs">调查日期</div>
              <div className="text-ocean-100 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-ocean-400" />
                {data.date}
              </div>
            </div>
            <div>
              <div className="text-ocean-400 text-xs">站位</div>
              <div className="text-ocean-100">{data.stationName}</div>
            </div>
            <div>
              <div className="text-ocean-400 text-xs">潮位带</div>
              <div className="text-ocean-100 flex items-center gap-1">
                <Waves className="w-3 h-3 text-ocean-400" />
                {TIDE_LABEL[data.tideZone]}
              </div>
            </div>
            <div>
              <div className="text-ocean-400 text-xs">底质</div>
              <div className="text-ocean-100">{SUBSTRATE_LABEL[data.substrateType]}</div>
            </div>
            <div>
              <div className="text-ocean-400 text-xs">样方尺寸</div>
              <div className="text-ocean-100">{data.quadratSize}</div>
            </div>
            <div>
              <div className="text-ocean-400 text-xs">经纬度</div>
              <div className="text-ocean-100 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-ocean-400" />
                {data.location.lat.toFixed(3)}, {data.location.lng.toFixed(3)}
              </div>
            </div>
          </div>

          {data.envFactors && (
            <div className="text-sm">
              <div className="text-ocean-400 text-xs mb-1">环境因子</div>
              <div className="flex flex-wrap gap-2">
                {data.envFactors.waterTemp !== undefined && (
                  <span className="chip text-xs">水温 {data.envFactors.waterTemp}°C</span>
                )}
                {data.envFactors.salinity !== undefined && (
                  <span className="chip text-xs">盐度 {data.envFactors.salinity}‰</span>
                )}
                {data.envFactors.ph !== undefined && (
                  <span className="chip text-xs">pH {data.envFactors.ph}</span>
                )}
                {data.envFactors.dissolvedOxygen !== undefined && (
                  <span className="chip text-xs">DO {data.envFactors.dissolvedOxygen}mg/L</span>
                )}
                {data.envFactors.weather && (
                  <span className="chip text-xs">
                    {data.envFactors.weather === "sunny"
                      ? "晴天"
                      : data.envFactors.weather === "cloudy"
                      ? "多云"
                      : data.envFactors.weather === "rainy"
                      ? "雨天"
                      : data.envFactors.weather === "foggy"
                      ? "雾天"
                      : "暴风雨"}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="text-sm">
            <div className="text-ocean-400 text-xs mb-1 flex items-center gap-1">
              <Fish className="w-3 h-3" /> 物种记录 ({validSpecies.length} 种 / H'=
              {indices.shannonWiener})
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {validSpecies.length === 0 ? (
                <p className="text-ocean-500 text-xs">无有效物种记录</p>
              ) : (
                validSpecies.map((sp: SpeciesRecord) => (
                  <div
                    key={sp.speciesId}
                    className="flex items-center justify-between text-xs bg-ocean-800/30 rounded-lg px-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-reef-300">{sp.commonName}</span>
                      <span className="text-ocean-400 italic ml-1">
                        {sp.scientificName}
                      </span>
                    </div>
                    <span className="text-ocean-200 ml-2 flex-shrink-0">
                      {sp.count}个 / {sp.coverage}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {data.notes && (
            <div className="text-sm">
              <div className="text-ocean-400 text-xs mb-1">备注</div>
              <div className="text-ocean-200 bg-ocean-800/30 rounded-lg p-2">
                {data.notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SurveyHistory({ survey, onClose }: SurveyHistoryProps) {
  const getVersions = useSurveyStore((s) => s.getVersions);
  const rollbackToVersion = useSurveyStore((s) => s.rollbackToVersion);
  const [selectedVersion, setSelectedVersion] = useState<SurveyVersionSnapshot | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const versions = getVersions(survey.id);

  const handleRollback = () => {
    if (!selectedVersion) return;
    rollbackToVersion(survey.id, selectedVersion.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-y-auto">
      <div className="card-glass w-full sm:w-[560px] sm:max-h-[90vh] max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden my-auto">
        <div className="flex items-center justify-between p-4 border-b border-ocean-700/40 flex-shrink-0">
          <h3 className="text-lg font-bold text-ocean-100 flex items-center gap-2">
            <History className="w-5 h-5 text-reef-400" />
            修改历史
            <span className="text-sm font-normal text-ocean-400">
              ({survey.stationName})
            </span>
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-ocean-700/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {survey.isDeleted && (
            <div className="card-glass bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
              <div className="font-medium flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4" />
                此记录已进入回收站
              </div>
              <p className="text-red-400/80 text-xs">
                剩余 {getDaysRemaining(survey.deletedAt)} 天后将永久删除。
                回滚到任一历史版本可自动恢复该记录。
              </p>
            </div>
          )}

          {versions.length === 0 ? (
            <div className="text-center text-ocean-400 py-12">
              <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">暂无修改历史</p>
              <p className="text-sm mt-1">编辑或删除记录时将自动保存快照</p>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-ocean-700/40" />

              {versions.map((v) => (
                <div key={v.id} className="relative mb-4 last:mb-0">
                  <div
                    className={cn(
                      "absolute -left-3.5 top-3 w-3 h-3 rounded-full border-2",
                      selectedVersion?.id === v.id
                        ? "bg-reef-500 border-reef-300"
                        : "bg-ocean-800 border-ocean-600"
                    )}
                  />

                  <div
                    className={cn(
                      "card-glass cursor-pointer transition-all",
                      selectedVersion?.id === v.id
                        ? "border-reef-500/50 bg-reef-500/5"
                        : "hover:bg-ocean-800/30"
                    )}
                    onClick={() =>
                      setSelectedVersion(
                        selectedVersion?.id === v.id ? null : v
                      )
                    }
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Clock className="w-4 h-4 text-ocean-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-ocean-100">
                              版本 v{v.version}
                            </div>
                            <div className="text-xs text-ocean-400">
                              {formatDateTime(v.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs chip">
                            {v.data.species.filter(
                              (s) => s.count > 0 || s.coverage > 0
                            ).length}{" "}
                            种
                          </span>
                          {selectedVersion?.id === v.id ? (
                            <ChevronDown className="w-4 h-4 text-ocean-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-ocean-400" />
                          )}
                        </div>
                      </div>

                      {selectedVersion?.id === v.id && (
                        <div className="mt-3 space-y-3">
                          <VersionPreview snapshot={v} />

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowConfirm(true);
                            }}
                            className="btn-secondary w-full py-2.5 text-sm"
                          >
                            <RotateCcw className="w-4 h-4" />
                            回滚到此版本
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConfirm && selectedVersion && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="card-glass w-full sm:w-[420px] rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-reef-500/20 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-6 h-6 text-reef-400" />
                </div>
                <div>
                  <h4 className="font-bold text-ocean-100">确认回滚？</h4>
                  <p className="text-sm text-ocean-400">
                    将恢复到版本 v{selectedVersion.version}（
                    {formatDateTime(selectedVersion.createdAt)}）
                  </p>
                </div>
              </div>

              <div className="card-glass bg-ocean-800/30 p-3 text-sm text-ocean-300">
                <p>
                  当前数据将自动保存为新的历史版本，您仍可随时回滚。
                </p>
                {survey.isDeleted && (
                  <p className="text-reef-300 mt-1">此操作将同时恢复该记录。</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-ocean-700/40 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-ghost flex-1"
              >
                取消
              </button>
              <button onClick={handleRollback} className="btn-primary flex-1">
                <RotateCcw className="w-4 h-4" />
                确认回滚
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
