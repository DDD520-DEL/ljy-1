import { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin, Waves, Image as ImageIcon } from "lucide-react";
import type { SurveyRecord, PhotoRecord } from "@/types";
import { TIDE_LABEL, SUBSTRATE_LABEL, SEASON_LABEL, getSeason } from "@/lib/diversity";
import { usePhotosByIds } from "@/hooks/usePhotos";
import { cn } from "@/lib/utils";

interface StationMapProps {
  surveys: SurveyRecord[];
}

const tideColor = (zone: string) => {
  if (zone === "high") return "#0ea5e9";
  if (zone === "mid") return "#14b8a6";
  return "#f59e0b";
};

function createCustomIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -22],
  });
}

function StationPopup({ surveys }: { surveys: SurveyRecord[] }) {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const primary = surveys[0];

  const selectedSurvey = useMemo(() => {
    if (selectedSurveyId) {
      return surveys.find((s) => s.id === selectedSurveyId) || primary;
    }
    return primary;
  }, [selectedSurveyId, surveys, primary]);

  const allPhotoIds = useMemo(() => {
    const ids: string[] = [];
    for (const s of surveys) {
      if (s.photoIds) {
        ids.push(...s.photoIds);
      }
    }
    return ids;
  }, [surveys]);

  const { photos } = usePhotosByIds(allPhotoIds.length > 0 ? allPhotoIds : undefined);

  const surveyPhotos = useMemo(() => {
    return photos.filter((p) => p.surveyId === selectedSurvey.id);
  }, [photos, selectedSurvey.id]);

  return (
    <div className="text-slate-800" style={{ minWidth: "260px", maxWidth: "320px" }}>
      <div className="font-bold text-base mb-1">{primary.stationName}</div>
      <div className="text-slate-600 text-sm space-y-0.5 mb-2">
        <div>
          <Waves className="inline w-3 h-3" />{" "}
          {TIDE_LABEL[primary.tideZone]}
        </div>
        <div>
          {SUBSTRATE_LABEL[primary.substrateType]} · {primary.quadratSize}
        </div>
      </div>

      {surveys.length > 1 && (
        <div className="mb-2">
          <div className="text-xs font-medium text-slate-500 mb-1">
            选择调查记录:
          </div>
          <div className="flex flex-wrap gap-1">
            {surveys.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSurveyId(s.id)}
                className={cn(
                  "text-xs px-2 py-1 rounded border transition-colors",
                  selectedSurvey.id === s.id
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                )}
              >
                {s.date}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs border-t pt-2">
        <div className="font-medium text-slate-700">
          {selectedSurvey.date} · {SEASON_LABEL[getSeason(selectedSurvey.date)]}
        </div>
        <div className="text-slate-500">
          物种: {selectedSurvey.species.filter((sp) => sp.count > 0).length} 种
        </div>

        {surveyPhotos.length > 0 && (
          <div className="mt-2">
            <div className="text-slate-500 mb-1 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> 照片 ({surveyPhotos.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {surveyPhotos.slice(0, 6).map((photo) => (
                <a
                  key={photo.id}
                  href={photo.dataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-12 h-12 rounded overflow-hidden border border-slate-300 hover:opacity-80 transition-opacity"
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.caption || photo.fileName}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
              {surveyPhotos.length > 6 && (
                <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-600 border border-slate-300">
                  +{surveyPhotos.length - 6}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StationMap({ surveys }: StationMapProps) {
  const center = useMemo(() => {
    if (surveys.length === 0) return [30.0, 121.0] as [number, number];
    const latAvg =
      surveys.reduce((sum, s) => sum + s.location.lat, 0) / surveys.length;
    const lngAvg =
      surveys.reduce((sum, s) => sum + s.location.lng, 0) / surveys.length;
    return [latAvg, lngAvg] as [number, number];
  }, [surveys]);

  const stationGroups = useMemo(() => {
    const groups = new Map<string, SurveyRecord[]>();
    for (const s of surveys) {
      const key = `${s.location.lat.toFixed(4)},${s.location.lng.toFixed(4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return groups;
  }, [surveys]);

  return (
    <div className="card-glass p-5 space-y-3">
      <h3 className="section-title">
        <MapPin className="w-6 h-6 text-reef-400" />
        调查站位分布
        <span className="ml-2 text-sm font-normal text-ocean-400">
          ({surveys.length} 条记录 / {stationGroups.size} 个站位)
        </span>
      </h3>

      <div className="flex flex-wrap gap-3 text-sm mb-2">
        <span className="chip">
          <span className={cn("inline-block w-3 h-3 rounded-full mr-2", "bg-tide-high")}></span>
          高潮带
        </span>
        <span className="chip">
          <span className={cn("inline-block w-3 h-3 rounded-full mr-2", "bg-tide-mid")}></span>
          中潮带
        </span>
        <span className="chip">
          <span className={cn("inline-block w-3 h-3 rounded-full mr-2", "bg-tide-low")}></span>
          低潮带
        </span>
      </div>

      <div
        className="rounded-2xl overflow-hidden border border-ocean-700/40"
        style={{ height: 420 }}
      >
        <MapContainer
          center={center}
          zoom={surveys.length > 0 ? 10 : 5}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {Array.from(stationGroups.entries()).map(([key, group]) => {
            const [lat, lng] = key.split(",").map(parseFloat);
            const primary = group[0];
            return (
              <Marker
                key={key}
                position={[lat, lng]}
                icon={createCustomIcon(tideColor(primary.tideZone))}
              >
                <Popup maxWidth={340} minWidth={280}>
                  <StationPopup surveys={group} />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
