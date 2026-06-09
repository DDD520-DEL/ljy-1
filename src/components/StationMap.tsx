import { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { MapPin, Waves, Image as ImageIcon, Navigation, Flag, Route } from "lucide-react";
import type { SurveyRecord, PhotoRecord, QuadratMarker, TrackPoint } from "@/types";
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

function createQuadratMapIcon(index: number) {
  return L.divIcon({
    className: "quadrat-marker",
    html: `<div style="
      width: 28px;
      height: 28px;
      background: #14b8a6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
    ">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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

  const hasTrack = selectedSurvey.trackPoints && selectedSurvey.trackPoints.length > 0;
  const hasQuadratMarkers = selectedSurvey.quadratMarkers && selectedSurvey.quadratMarkers.length > 0;

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

      {(hasTrack || hasQuadratMarkers) && (
        <div className="text-xs bg-slate-50 rounded-lg p-2 mb-2 space-y-1">
          {hasTrack && (
            <div className="flex items-center gap-1 text-slate-600">
              <Navigation className="w-3 h-3 text-blue-500" />
              <span>轨迹点: <span className="font-medium text-blue-600">{selectedSurvey.trackPoints!.length}</span> 个</span>
            </div>
          )}
          {hasQuadratMarkers && (
            <div className="flex items-center gap-1 text-slate-600">
              <Flag className="w-3 h-3 text-teal-500" />
              <span>样方标记: <span className="font-medium text-teal-600">{selectedSurvey.quadratMarkers!.length}</span> 个</span>
            </div>
          )}
        </div>
      )}

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

interface TrackDisplayData {
  surveyId: string;
  stationName: string;
  trackPoints: TrackPoint[];
  quadratMarkers: QuadratMarker[];
}

export default function StationMap({ surveys }: StationMapProps) {
  const [showTracks, setShowTracks] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

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

  const trackDataList = useMemo<TrackDisplayData[]>(() => {
    return surveys
      .filter((s) => (s.trackPoints && s.trackPoints.length > 0) || (s.quadratMarkers && s.quadratMarkers.length > 0))
      .map((s) => ({
        surveyId: s.id,
        stationName: s.stationName,
        trackPoints: s.trackPoints || [],
        quadratMarkers: s.quadratMarkers || [],
      }));
  }, [surveys]);

  const trackColors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];

  const hasTrackData = trackDataList.length > 0;

  return (
    <div className="card-glass p-5 space-y-3">
      <h3 className="section-title">
        <MapPin className="w-6 h-6 text-reef-400" />
        调查站位分布
        <span className="ml-2 text-sm font-normal text-ocean-400">
          ({surveys.length} 条记录 / {stationGroups.size} 个站位)
        </span>
      </h3>

      <div className="flex flex-wrap gap-3 text-sm">
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
        {hasTrackData && (
          <>
            <div className="h-6 w-px bg-ocean-700/50 mx-1"></div>
            <button
              onClick={() => setShowTracks(!showTracks)}
              className={cn(
                "chip cursor-pointer transition-all",
                showTracks ? "bg-blue-500/20 border-blue-500/40" : "opacity-50"
              )}
            >
              <Navigation className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              GPS轨迹
            </button>
            <button
              onClick={() => setShowRoutes(!showRoutes)}
              className={cn(
                "chip cursor-pointer transition-all",
                showRoutes ? "bg-teal-500/20 border-teal-500/40" : "opacity-50"
              )}
            >
              <Route className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
              调查路线
            </button>
          </>
        )}
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
          {showTracks &&
            trackDataList.map((data, idx) => {
              if (data.trackPoints.length < 2) return null;
              const color = trackColors[idx % trackColors.length];
              const path = data.trackPoints.map((p) => [p.lat, p.lng] as [number, number]);
              return (
                <Polyline
                  key={`track-${data.surveyId}`}
                  positions={path}
                  color={color}
                  weight={3}
                  opacity={0.7}
                />
              );
            })}
          {showRoutes &&
            trackDataList.map((data, idx) => {
              if (data.quadratMarkers.length < 2) return null;
              const color = trackColors[idx % trackColors.length];
              const path = data.quadratMarkers.map((m) => [m.location.lat, m.location.lng] as [number, number]);
              return (
                <Polyline
                  key={`route-${data.surveyId}`}
                  positions={path}
                  color={color}
                  weight={4}
                  opacity={0.9}
                  dashArray="10, 6"
                />
              );
            })}
          {showRoutes &&
            trackDataList.flatMap((data) =>
              data.quadratMarkers.map((marker, i) => (
                <Marker
                  key={`quadrat-${marker.id}`}
                  position={[marker.location.lat, marker.location.lng]}
                  icon={createQuadratMapIcon(i)}
                >
                  <Popup>
                    <div className="text-slate-800 text-sm">
                      <div className="font-medium">{data.stationName}</div>
                      <div className="text-teal-600 font-medium mt-1">样方 #{i + 1}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        {marker.location.lat.toFixed(6)}, {marker.location.lng.toFixed(6)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(marker.timestamp).toLocaleString("zh-CN")}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))
            )}
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

      {hasTrackData && (
        <div className="flex flex-wrap gap-2 text-xs text-ocean-400">
          <span className="text-ocean-300 font-medium">图例:</span>
          {trackDataList.map((data, idx) => (
            <span key={data.surveyId} className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 h-1 rounded-full"
                style={{ backgroundColor: trackColors[idx % trackColors.length] }}
              ></span>
              {data.stationName}
              {data.trackPoints.length > 0 && (
                <span className="text-ocean-500">({data.trackPoints.length}点)</span>
              )}
              {data.quadratMarkers.length > 0 && (
                <span className="text-teal-400">[{data.quadratMarkers.length}样方]</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
