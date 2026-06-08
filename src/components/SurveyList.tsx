import { useMemo, useState, useEffect } from "react";
import {
  List,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  Waves,
  Fish,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import type { SurveyRecord, PhotoRecord, SpeciesRecord } from "@/types";
import {
  TIDE_LABEL,
  SUBSTRATE_LABEL,
  SEASON_LABEL,
  getSeason,
  calcDiversityIndices,
} from "@/lib/diversity";
import { useSurveyStore } from "@/store/surveyStore";
import { deletePhotosBySurvey } from "@/lib/photoStore";
import { useSurveyPhotos, useSpeciesPhotos } from "@/hooks/usePhotos";
import PhotoGrid from "./PhotoGrid";
import { cn } from "@/lib/utils";

interface SurveyListProps {
  surveys: SurveyRecord[];
  onEdit: (survey: SurveyRecord) => void;
}

const tideBadgeColor = (zone: string) => {
  if (zone === "high") return "bg-tide-high/20 text-tide-high border-tide-high/40";
  if (zone === "mid") return "bg-tide-mid/20 text-tide-mid border-tide-mid/40";
  return "bg-tide-low/20 text-tide-low border-tide-low/40";
};

function SurveyCard({
  survey,
  onEdit,
  onDelete,
}: {
  survey: SurveyRecord;
  onEdit: (survey: SurveyRecord) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { photos: surveyPhotos, removePhoto: removeSurveyPhoto } = useSurveyPhotos(
    expanded ? survey.id : undefined
  );

  const indices = useMemo(
    () => calcDiversityIndices(survey.species),
    [survey.species]
  );

  const validSpecies = survey.species.filter(
    (sp) => sp.count > 0 || sp.coverage > 0
  );

  const handleDelete = async () => {
    if (confirm("确定删除这条调查记录吗？相关照片也将被删除。")) {
      await deletePhotosBySurvey(survey.id);
      onDelete(survey.id);
    }
  };

  return (
    <div className="card-glass border border-ocean-700/40 overflow-hidden">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-bold text-ocean-100 text-base">
                {survey.stationName}
              </span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border font-medium",
                  tideBadgeColor(survey.tideZone)
                )}
              >
                {TIDE_LABEL[survey.tideZone]}
              </span>
              <span className="chip text-xs">
                {SEASON_LABEL[getSeason(survey.date)]}
              </span>
              {(survey.photoIds?.length || 0) > 0 && (
                <span className="chip text-xs flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {survey.photoIds?.length || 0}
                </span>
              )}
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
                {indices.speciesCount} 种 / H'={indices.shannonWiener}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(survey);
              }}
              className="p-2 rounded-lg text-ocean-300 hover:bg-ocean-700/40 hover:text-white transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
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
      </div>

      {expanded && (
        <div className="border-t border-ocean-700/40 px-4 py-3 bg-ocean-950/30">
          <div className="grid grid-cols-3 gap-3 text-xs mb-3">
            <div>
              <div className="text-ocean-400">样方尺寸</div>
              <div className="text-ocean-100 font-medium mt-0.5">
                {survey.quadratSize}
              </div>
            </div>
            <div>
              <div className="text-ocean-400">Shannon-Wiener</div>
              <div className="text-reef-300 font-medium mt-0.5">
                {indices.shannonWiener}
              </div>
            </div>
            <div>
              <div className="text-ocean-400">Pielou J</div>
              <div className="text-sand-300 font-medium mt-0.5">
                {indices.pielouEvenness}
              </div>
            </div>
          </div>

          {surveyPhotos.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-ocean-400 mb-1.5 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> 站位照片 ({surveyPhotos.length})
              </div>
              <PhotoGrid
                photos={surveyPhotos}
                onDelete={removeSurveyPhoto}
                size="sm"
                showDelete={false}
              />
            </div>
          )}

          <div className="text-xs text-ocean-400 mb-1.5">物种记录:</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {validSpecies.length === 0 ? (
              <p className="text-ocean-500 text-sm">无有效物种记录</p>
            ) : (
              validSpecies.map((sp) => (
                <SpeciesCard
                  key={sp.speciesId}
                  species={sp}
                  surveyId={survey.id}
                />
              ))
            )}
          </div>

          {survey.notes && (
            <div className="mt-3 pt-3 border-t border-ocean-700/40">
              <div className="text-xs text-ocean-400 mb-1">备注:</div>
              <div className="text-sm text-ocean-200">{survey.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SpeciesCard({
  species,
  surveyId,
}: {
  species: SpeciesRecord;
  surveyId: string;
}) {
  const [showPhotos, setShowPhotos] = useState(false);
  const { photos: speciesPhotos } = useSpeciesPhotos(
    showPhotos ? species.speciesId : undefined
  );

  const filteredPhotos = speciesPhotos.filter((p) => p.surveyId === surveyId);

  return (
    <div className="rounded-lg bg-ocean-800/30 overflow-hidden">
      <div
        className="flex items-center justify-between py-2 px-3 cursor-pointer"
        onClick={() => setShowPhotos(!showPhotos)}
      >
        <div className="min-w-0 flex-1">
          <span className="text-reef-300">{species.commonName}</span>
          <span className="text-ocean-400 italic ml-2 text-xs">
            {species.scientificName}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {(species.photoIds?.length || 0) > 0 && (
            <span className="text-xs text-ocean-300 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {species.photoIds?.length || 0}
            </span>
          )}
          <span className="text-ocean-200 text-xs">
            {species.count} 个 / {species.coverage}%
          </span>
          {showPhotos ? (
            <ChevronDown className="w-4 h-4 text-ocean-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ocean-400" />
          )}
        </div>
      </div>
      {showPhotos && filteredPhotos.length > 0 && (
        <div className="px-3 pb-2">
          <PhotoGrid
            photos={filteredPhotos}
            size="sm"
            showDelete={false}
          />
        </div>
      )}
    </div>
  );
}

export default function SurveyList({ surveys, onEdit }: SurveyListProps) {
  const deleteSurvey = useSurveyStore((s) => s.deleteSurvey);

  const sorted = useMemo(
    () => [...surveys].sort((a, b) => b.createdAt - a.createdAt),
    [surveys]
  );

  if (surveys.length === 0) {
    return (
      <div className="card-glass p-8 text-center">
        <List className="w-12 h-12 mx-auto mb-3 text-ocean-500 opacity-40" />
        <p className="text-ocean-300">暂无调查记录</p>
        <p className="text-ocean-500 text-sm mt-1">
          点击「新建调查」开始记录潮间带生物样方数据
        </p>
      </div>
    );
  }

  return (
    <div className="card-glass p-5">
      <h3 className="section-title">
        <List className="w-6 h-6 text-reef-400" />
        调查记录列表
        <span className="ml-2 text-sm font-normal text-ocean-400">
          ({surveys.length} 条)
        </span>
      </h3>

      <div className="space-y-2">
        {sorted.map((s) => (
          <SurveyCard
            key={s.id}
            survey={s}
            onEdit={onEdit}
            onDelete={deleteSurvey}
          />
        ))}
      </div>
    </div>
  );
}
