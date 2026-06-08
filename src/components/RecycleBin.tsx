import { useMemo, useState } from "react";
import {
  Trash2,
  RotateCcw,
  X,
  Calendar,
  MapPin,
  Waves,
  Fish,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Clock,
  History,
} from "lucide-react";
import type { SurveyRecord } from "@/types";
import {
  TIDE_LABEL,
  SUBSTRATE_LABEL,
  calcDiversityIndices,
} from "@/lib/diversity";
import { useSurveyStore } from "@/store/surveyStore";
import { deletePhotosBySurvey } from "@/lib/photoStore";
import { cn } from "@/lib/utils";
import SurveyHistory from "./SurveyHistory";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysRemaining(deletedAt?: number): number {
  if (!deletedAt) return 0;
  const elapsed = Date.now() - deletedAt;
  const remaining = Math.max(0, THIRTY_DAYS_MS - elapsed);
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

function getProgressPercent(deletedAt?: number): number {
  if (!deletedAt) return 0;
  const elapsed = Date.now() - deletedAt;
  return Math.min(100, (elapsed / THIRTY_DAYS_MS) * 100);
}

function DeletedSurveyCard({
  survey,
  onRestore,
  onPermanentlyDelete,
  onViewHistory,
}: {
  survey: SurveyRecord;
  onRestore: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
  onViewHistory: (survey: SurveyRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const indices = useMemo(
    () => calcDiversityIndices(survey.species),
    [survey.species]
  );

  const daysRemaining = getDaysRemaining(survey.deletedAt);
  const progressPercent = getProgressPercent(survey.deletedAt);
  const isExpiringSoon = daysRemaining <= 7;

  const validSpecies = survey.species.filter(
    (sp) => sp.count > 0 || sp.coverage > 0
  );

  const handleRestore = () => {
    onRestore(survey.id);
    setShowRestoreConfirm(false);
  };

  const handlePermanentlyDelete = async () => {
    await deletePhotosBySurvey(survey.id);
    onPermanentlyDelete(survey.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="card-glass border border-red-500/20 overflow-hidden bg-red-500/5">
      <div className="p-4">
        <div
          className="flex items-start justify-between gap-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-bold text-ocean-100 text-base">
                {survey.stationName}
              </span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                  survey.tideZone === "high"
                    ? "bg-tide-high/20 text-tide-high border-tide-high/40"
                    : survey.tideZone === "mid"
                    ? "bg-tide-mid/20 text-tide-mid border-tide-mid/40"
                    : "bg-tide-low/20 text-tide-low border-tide-low/40"
                )}
              >
                {TIDE_LABEL[survey.tideZone]}
              </span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                  isExpiringSoon
                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : "bg-ocean-800/50 text-ocean-300 border-ocean-700/40"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  剩余 {daysRemaining} 天
                </span>
              </span>
            </div>

            <div className="h-1 bg-ocean-800 rounded-full overflow-hidden mt-2 mb-2">
              <div
                className={cn(
                  "h-full transition-all",
                  isExpiringSoon ? "bg-red-500" : "bg-reef-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-ocean-300">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {survey.date}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {survey.location.lat.toFixed(3)}, {survey.location.lng.toFixed(3)}
              </span>
              <span className="flex items-center gap-1">
                <Waves className="w-3.5 h-3.5" />
                {SUBSTRATE_LABEL[survey.substrateType]}
              </span>
              <span className="flex items-center gap-1">
                <Fish className="w-3.5 h-3.5" />
                {indices.speciesCount} 种
              </span>
              <span className="flex items-center gap-1 text-red-300/80 text-xs">
                删除于 {formatDateTime(survey.deletedAt || 0)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory(survey);
              }}
              className="p-2 rounded-lg text-ocean-300 hover:bg-ocean-700/40 hover:text-white transition-colors"
              title="查看历史版本"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRestoreConfirm(true);
              }}
              className="p-2 rounded-lg text-reef-400 hover:bg-reef-500/20 hover:text-reef-300 transition-colors"
              title="恢复记录"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
              title="永久删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-ocean-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-ocean-400" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-ocean-700/40 mt-3 pt-3 space-y-2">
            <div className="text-xs text-ocean-400">物种记录:</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {validSpecies.length === 0 ? (
                <p className="text-ocean-500 text-sm">无有效物种记录</p>
              ) : (
                validSpecies.map((sp) => (
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

            {survey.notes && (
              <div className="pt-2 border-t border-ocean-700/40">
                <div className="text-xs text-ocean-400 mb-1">备注:</div>
                <div className="text-sm text-ocean-200">{survey.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="card-glass w-full sm:w-[420px] rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-reef-500/20 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-6 h-6 text-reef-400" />
                </div>
                <div>
                  <h4 className="font-bold text-ocean-100">恢复记录？</h4>
                  <p className="text-sm text-ocean-400">
                    {survey.stationName} ({survey.date})
                  </p>
                </div>
              </div>
              <div className="card-glass bg-ocean-800/30 p-3 text-sm text-ocean-300">
                恢复后，记录将重新出现在调查记录列表中。
              </div>
            </div>
            <div className="p-4 border-t border-ocean-700/40 flex gap-3">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                className="btn-ghost flex-1"
              >
                取消
              </button>
              <button onClick={handleRestore} className="btn-primary flex-1">
                <RotateCcw className="w-4 h-4" />
                确认恢复
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="card-glass w-full sm:w-[420px] rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold text-red-300">永久删除？</h4>
                  <p className="text-sm text-ocean-400">
                    {survey.stationName} ({survey.date})
                  </p>
                </div>
              </div>
              <div className="card-glass bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
                <p className="font-medium">此操作不可撤销！</p>
                <p className="text-red-400/80 mt-1">
                  记录、所有历史版本和关联照片将被永久删除。
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-ocean-700/40 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost flex-1"
              >
                取消
              </button>
              <button
                onClick={handlePermanentlyDelete}
                className="btn-primary flex-1 !bg-red-600 hover:!bg-red-500"
              >
                <Trash2 className="w-4 h-4" />
                永久删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface RecycleBinProps {
  onClose: () => void;
}

export default function RecycleBin({ onClose }: RecycleBinProps) {
  const [historySurvey, setHistorySurvey] = useState<SurveyRecord | null>(null);
  const restoreSurvey = useSurveyStore((s) => s.restoreSurvey);
  const permanentlyDeleteSurvey = useSurveyStore((s) => s.permanentlyDeleteSurvey);
  const deletedSurveys = useSurveyStore((s) => s.getDeletedSurveys());

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-y-auto">
      <div className="card-glass w-full sm:w-[640px] sm:max-h-[90vh] max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden my-auto">
        <div className="flex items-center justify-between p-4 border-b border-ocean-700/40 flex-shrink-0">
          <h3 className="text-lg font-bold text-ocean-100 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            回收站
            <span className="text-sm font-normal text-ocean-400">
              ({deletedSurveys.length} 条)
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
          {deletedSurveys.length === 0 ? (
            <div className="text-center text-ocean-400 py-16">
              <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">回收站为空</p>
              <p className="text-sm mt-1">删除的记录将在这里保留 30 天</p>
            </div>
          ) : (
            <>
              <div className="card-glass bg-ocean-800/30 p-3 text-xs text-ocean-300">
                <p className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-reef-400 flex-shrink-0 mt-0.5" />
                  删除的记录将在此保留 30 天，到期后将被永久删除。
                  可恢复记录或查看其历史版本。
                </p>
              </div>
              {deletedSurveys.map((s) => (
                <DeletedSurveyCard
                  key={s.id}
                  survey={s}
                  onRestore={restoreSurvey}
                  onPermanentlyDelete={permanentlyDeleteSurvey}
                  onViewHistory={setHistorySurvey}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {historySurvey && (
        <SurveyHistory
          survey={historySurvey}
          onClose={() => setHistorySurvey(null)}
        />
      )}
    </div>
  );
}
