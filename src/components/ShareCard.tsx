import { useState, useRef, useEffect, useMemo } from "react";
import {
  Share2,
  Download,
  Palette,
  MapPin,
  Calendar,
  Fish,
  Activity,
  ChevronDown,
  Check,
} from "lucide-react";
import type { SurveyRecord } from "@/types";
import { calcDiversityIndices } from "@/lib/diversity";
import { cn } from "@/lib/utils";

interface ShareCardProps {
  surveys: SurveyRecord[];
}

type ThemeKey = "ocean" | "coral" | "sand";

interface ThemeColors {
  name: string;
  bgGradient: [string, string];
  accent: string;
  accentLight: string;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  cardBorder: string;
  mapBg: string;
  mapGrid: string;
  mapMarker: string;
  statsBg: string;
  label: string;
}

const THEMES: Record<ThemeKey, ThemeColors> = {
  ocean: {
    name: "海洋蓝",
    bgGradient: ["#082f49", "#0369a1"],
    accent: "#38bdf8",
    accentLight: "#7dd3fc",
    textPrimary: "#f0f9ff",
    textSecondary: "#bae6fd",
    cardBg: "rgba(12, 74, 110, 0.6)",
    cardBorder: "rgba(56, 189, 248, 0.3)",
    mapBg: "#0c4a6e",
    mapGrid: "rgba(56, 189, 248, 0.15)",
    mapMarker: "#38bdf8",
    statsBg: "rgba(14, 165, 233, 0.15)",
    label: "bg-ocean-500",
  },
  coral: {
    name: "珊瑚绿",
    bgGradient: ["#042f2e", "#0f766e"],
    accent: "#2dd4bf",
    accentLight: "#5eead4",
    textPrimary: "#f0fdfa",
    textSecondary: "#99f6e4",
    cardBg: "rgba(17, 94, 89, 0.6)",
    cardBorder: "rgba(45, 212, 191, 0.3)",
    mapBg: "#115e59",
    mapGrid: "rgba(45, 212, 191, 0.15)",
    mapMarker: "#2dd4bf",
    statsBg: "rgba(20, 184, 166, 0.15)",
    label: "bg-reef-500",
  },
  sand: {
    name: "沙滩金",
    bgGradient: ["#78350f", "#b45309"],
    accent: "#fbbf24",
    accentLight: "#fcd34d",
    textPrimary: "#fffbeb",
    textSecondary: "#fde68a",
    cardBg: "rgba(146, 64, 14, 0.6)",
    cardBorder: "rgba(251, 191, 36, 0.3)",
    mapBg: "#92400e",
    mapGrid: "rgba(251, 191, 36, 0.15)",
    mapMarker: "#fbbf24",
    statsBg: "rgba(245, 158, 11, 0.15)",
    label: "bg-sand-500",
  },
};

const CARD_WIDTH = 800;
const CARD_HEIGHT = 500;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  lat: number,
  lng: number,
  theme: ThemeColors
) {
  drawRoundedRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = theme.mapBg;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, x, y, w, h, 16);
  ctx.clip();

  ctx.strokeStyle = theme.mapGrid;
  ctx.lineWidth = 1;
  const gridSize = 20;
  for (let gx = x; gx < x + w; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
  }
  for (let gy = y; gy < y + h; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }

  const latMin = lat - 0.05;
  const latMax = lat + 0.05;
  const lngMin = lng - 0.05;
  const lngMax = lng + 0.05;

  const coastPoints: [number, number][] = [];
  const rand = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const plng = lngMin + t * (lngMax - lngMin);
    const baseLat = latMin + 0.3 * (latMax - latMin);
    const wobble = (rand(i + Math.floor(lat * 100) + Math.floor(lng * 100)) - 0.5) * 0.02;
    coastPoints.push([plng, baseLat + wobble]);
  }

  ctx.fillStyle = theme.accentLight + "22";
  ctx.beginPath();
  const firstLat = y + h - ((coastPoints[0][1] - latMin) / (latMax - latMin)) * h;
  ctx.moveTo(x, firstLat);
  for (const [plng, plat] of coastPoints) {
    const px = x + ((plng - lngMin) / (lngMax - lngMin)) * w;
    const py = y + h - ((plat - latMin) / (latMax - latMin)) * h;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = theme.accent + "66";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < coastPoints.length; i++) {
    const [plng, plat] = coastPoints[i];
    const px = x + ((plng - lngMin) / (lngMax - lngMin)) * w;
    const py = y + h - ((plat - latMin) / (latMax - latMin)) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  const markerX = x + w / 2;
  const markerY = y + h / 2;

  const gradient = ctx.createRadialGradient(markerX, markerY, 0, markerX, markerY, 40);
  gradient.addColorStop(0, theme.mapMarker + "55");
  gradient.addColorStop(1, theme.mapMarker + "00");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(markerX, markerY, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme.mapMarker;
  ctx.beginPath();
  ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(markerX, markerY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x, y, w, h, 16);
  ctx.stroke();

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`, x + w - 12, y + h - 12);
  ctx.textAlign = "left";
}

function drawCard(
  canvas: HTMLCanvasElement,
  survey: SurveyRecord,
  theme: ThemeColors
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CARD_WIDTH * 2;
  canvas.height = CARD_HEIGHT * 2;
  ctx.scale(2, 2);

  const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bgGrad.addColorStop(0, theme.bgGradient[0]);
  bgGrad.addColorStop(1, theme.bgGradient[1]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = theme.accent + "08";
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      const cx = 80 + i * 130;
      const cy = 60 + j * 120;
      ctx.beginPath();
      ctx.arc(cx, cy, 40 + ((i + j) % 3) * 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const padding = 32;
  const contentX = padding;
  const contentY = padding;
  const contentW = CARD_WIDTH - padding * 2;
  const contentH = CARD_HEIGHT - padding * 2;

  drawRoundedRect(ctx, contentX, contentY, contentW, contentH, 24);
  ctx.fillStyle = theme.cardBg;
  ctx.fill();
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = theme.accent;
  ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(survey.stationName, contentX + 28, contentY + 28);

  const indices = calcDiversityIndices(survey.species);

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "15px -apple-system, BlinkMacSystemFont, sans-serif";
  const dateText = survey.date;
  ctx.fillText(dateText, contentX + 28, contentY + 68);

  const tideLabelMap: Record<string, string> = {
    high: "高潮带",
    mid: "中潮带",
    low: "低潮带",
  };
  const substrateLabelMap: Record<string, string> = {
    rocky: "岩礁",
    sandy: "沙滩",
    muddy: "泥滩",
    pebble: "砾石",
    cobble: "卵石",
    mixed: "混合底质",
  };
  const metaText = `${tideLabelMap[survey.tideZone] || survey.tideZone} · ${substrateLabelMap[survey.substrateType] || survey.substrateType} · ${survey.quadratSize}`;
  const metaWidth = ctx.measureText(metaText).width;
  ctx.fillText(metaText, CARD_WIDTH - padding - 28 - metaWidth, contentY + 36);

  const dividerY = contentY + 104;
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX + 28, dividerY);
  ctx.lineTo(contentX + contentW - 28, dividerY);
  ctx.stroke();

  const statsY = dividerY + 24;
  const statWidth = 150;
  const statGap = 20;
  const statsStartX = contentX + 28;

  const stats = [
    {
      label: "物种数",
      value: String(indices.speciesCount),
      suffix: "种",
    },
    {
      label: "Shannon-Wiener",
      value: indices.shannonWiener.toFixed(2),
      suffix: "H'",
    },
    {
      label: "个体总数",
      value: String(indices.totalIndividuals),
      suffix: "个",
    },
  ];

  stats.forEach((stat, i) => {
    const sx = statsStartX + i * (statWidth + statGap);
    drawRoundedRect(ctx, sx, statsY, statWidth, 84, 14);
    ctx.fillStyle = theme.statsBg;
    ctx.fill();

    ctx.fillStyle = theme.textSecondary;
    ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(stat.label, sx + 16, statsY + 16);

    ctx.fillStyle = theme.accentLight;
    ctx.font = "bold 30px -apple-system, BlinkMacSystemFont, sans-serif";
    const valueText = stat.value;
    ctx.fillText(valueText, sx + 16, statsY + 36);

    ctx.fillStyle = theme.textSecondary;
    ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
    const suffixWidth = ctx.measureText(stat.suffix).width;
    ctx.fillText(stat.suffix, sx + statWidth - 16 - suffixWidth, statsY + 54);
  });

  const mapX = contentX + 28;
  const mapY = statsY + 84 + 20;
  const mapW = contentW - 56;
  const mapH = contentH - (mapY - contentY) - 28;

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "13px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillText("站位位置", mapX, mapY - 20);

  drawMiniMap(ctx, mapX, mapY, mapW, mapH, survey.location.lat, survey.location.lng, theme);

  const footerY = contentY + contentH - 24;
  ctx.fillStyle = theme.textSecondary + "99";
  ctx.font = "11px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  ctx.fillText("潮间带生物调查 · 多样性分析系统", contentX + 28, footerY);

  const rightFoot = `生成于 ${new Date().toLocaleDateString("zh-CN")}`;
  const rfWidth = ctx.measureText(rightFoot).width;
  ctx.fillText(rightFoot, CARD_WIDTH - padding - 28 - rfWidth, footerY);
}

export default function ShareCard({ surveys }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedId, setSelectedId] = useState<string>(
    surveys.length > 0 ? surveys[0].id : ""
  );
  const [theme, setTheme] = useState<ThemeKey>("ocean");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSurveyPicker, setShowSurveyPicker] = useState(false);

  const selectedSurvey = useMemo(
    () => surveys.find((s) => s.id === selectedId),
    [surveys, selectedId]
  );

  useEffect(() => {
    if (surveys.length > 0 && !surveys.find((s) => s.id === selectedId)) {
      setSelectedId(surveys[0].id);
    }
  }, [surveys, selectedId]);

  useEffect(() => {
    if (!canvasRef.current || !selectedSurvey) return;
    drawCard(canvasRef.current, selectedSurvey, THEMES[theme]);
  }, [selectedSurvey, theme]);

  const handleExport = () => {
    if (!canvasRef.current || !selectedSurvey) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `survey-card-${selectedSurvey.stationName}-${selectedSurvey.date}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (surveys.length === 0) {
    return (
      <div className="card-glass p-5">
        <h3 className="section-title">
          <Share2 className="w-6 h-6 text-reef-400" />
          调查记录分享卡片
        </h3>
        <div className="text-center py-12 text-ocean-400">
          <Share2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>暂无调查记录，无法生成分享卡片</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-glass p-5">
      <h3 className="section-title mb-4">
        <Share2 className="w-6 h-6 text-reef-400" />
        调查记录分享卡片
      </h3>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <button
            onClick={() => {
              setShowSurveyPicker(!showSurveyPicker);
              setShowThemePicker(false);
            }}
            className="btn-ghost text-sm py-2.5 px-4 min-h-[44px]"
          >
            <MapPin className="w-4 h-4 text-reef-400" />
            <span className="max-w-[200px] truncate">
              {selectedSurvey?.stationName || "选择调查记录"}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                showSurveyPicker && "rotate-180"
              )}
            />
          </button>

          {showSurveyPicker && (
            <div className="absolute top-full left-0 mt-2 w-72 max-h-64 overflow-y-auto card-glass !p-1.5 z-20 shadow-2xl">
              {surveys.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedId(s.id);
                    setShowSurveyPicker(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-2",
                    s.id === selectedId
                      ? "bg-ocean-500/20 text-ocean-100"
                      : "hover:bg-ocean-800/50 text-ocean-200"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {s.stationName}
                    </div>
                    <div className="text-xs text-ocean-400">
                      {s.date} · {s.species.filter((sp) => sp.count > 0).length} 种
                    </div>
                  </div>
                  {s.id === selectedId && (
                    <Check className="w-4 h-4 text-reef-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowThemePicker(!showThemePicker);
              setShowSurveyPicker(false);
            }}
            className="btn-ghost text-sm py-2.5 px-4 min-h-[44px]"
          >
            <Palette className="w-4 h-4" />
            <span>{THEMES[theme].name}</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                showThemePicker && "rotate-180"
              )}
            />
          </button>

          {showThemePicker && (
            <div className="absolute top-full left-0 mt-2 w-56 card-glass !p-1.5 z-20 shadow-2xl">
              {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setTheme(key);
                    setShowThemePicker(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-3",
                    theme === key
                      ? "bg-ocean-500/20 text-ocean-100"
                      : "hover:bg-ocean-800/50 text-ocean-200"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full border-2 border-white/20"
                      style={{
                        background: `linear-gradient(135deg, ${THEMES[key].bgGradient[0]}, ${THEMES[key].bgGradient[1]})`,
                      }}
                    />
                    <span className="font-medium text-sm">{THEMES[key].name}</span>
                  </div>
                  {theme === key && <Check className="w-4 h-4 text-reef-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={handleExport}
          className="btn-primary text-sm py-2.5 px-5 min-h-[44px]"
        >
          <Download className="w-4 h-4" />
          导出图片
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 md:hidden">
        {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
              theme === key
                ? "border-reef-400/50 bg-reef-500/10"
                : "border-ocean-700/40 bg-ocean-800/30"
            )}
          >
            <div
              className="w-4 h-4 rounded-full border border-white/20"
              style={{
                background: `linear-gradient(135deg, ${THEMES[key].bgGradient[0]}, ${THEMES[key].bgGradient[1]})`,
              }}
            />
            <span className="text-sm text-ocean-200">{THEMES[key].name}</span>
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl overflow-hidden border border-ocean-700/40 bg-ocean-950/50"
        onClick={() => {
          setShowSurveyPicker(false);
          setShowThemePicker(false);
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ocean-400">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {selectedSurvey?.date}
        </span>
        <span className="flex items-center gap-1">
          <Fish className="w-3 h-3" />
          {selectedSurvey &&
            calcDiversityIndices(selectedSurvey.species).speciesCount}{" "}
          种
        </span>
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          H' ={" "}
          {selectedSurvey &&
            calcDiversityIndices(selectedSurvey.species).shannonWiener}
        </span>
      </div>
    </div>
  );
}
