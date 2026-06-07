import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin, Waves } from "lucide-react";
import type { SurveyRecord } from "@/types";
import { TIDE_LABEL, SUBSTRATE_LABEL, SEASON_LABEL, getSeason } from "@/lib/diversity";
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
                <Popup>
                  <div className="text-slate-800 font-bold text-base mb-1">
                    {primary.stationName}
                  </div>
                  <div className="text-slate-600 text-sm space-y-0.5">
                    <div>
                      <Waves className="inline w-3 h-3" />{" "}
                      {TIDE_LABEL[primary.tideZone]}
                    </div>
                    <div>{SUBSTRATE_LABEL[primary.substrateType]} · {primary.quadratSize}</div>
                    <div className="font-medium mt-1">调查记录 ({group.length}):</div>
                    {group.map((s) => (
                      <div key={s.id} className="text-xs border-t pt-1 mt-1">
                        <div className="font-medium">
                          {s.date} · {SEASON_LABEL[getSeason(s.date)]}
                        </div>
                        <div>物种: {s.species.filter((sp) => sp.count > 0).length} 种</div>
                      </div>
                    ))}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
