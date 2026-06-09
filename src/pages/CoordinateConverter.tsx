import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeftRight,
  Compass,
  Copy,
  History,
  Trash2,
  ChevronLeft,
  Check,
  X,
  Navigation,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  type ConversionRecord,
  type CoordinateDecimal,
  type DMS,
  coordinateDecimalToDMS,
  coordinateDMSToDecimal,
  decimalToDMS,
  dmsToDecimal,
  formatDMS,
  formatDecimal,
  isValidLatitude,
  isValidLongitude,
  parseDMSString,
} from "@/lib/coordinate";

type ConvertDirection = "decimalToDms" | "dmsToDecimal";

const HISTORY_KEY = "coord-convert-history";
const MAX_HISTORY = 10;

function loadHistory(): ConversionRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory(records: ConversionRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_HISTORY)));
  } catch {
    // ignore
  }
}

export default function CoordinateConverter() {
  const navigate = useNavigate();

  const [direction, setDirection] = useState<ConvertDirection>("decimalToDms");

  // 十进制度输入
  const [decimalLat, setDecimalLat] = useState<string>("");
  const [decimalLng, setDecimalLng] = useState<string>("");

  // 度分秒输入
  const [dmsLatDeg, setDmsLatDeg] = useState<string>("");
  const [dmsLatMin, setDmsLatMin] = useState<string>("");
  const [dmsLatSec, setDmsLatSec] = useState<string>("");
  const [dmsLatDir, setDmsLatDir] = useState<"N" | "S">("N");

  const [dmsLngDeg, setDmsLngDeg] = useState<string>("");
  const [dmsLngMin, setDmsLngMin] = useState<string>("");
  const [dmsLngSec, setDmsLngSec] = useState<string>("");
  const [dmsLngDir, setDmsLngDir] = useState<"E" | "W">("E");

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversionRecord[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const addToHistory = useCallback((record: ConversionRecord) => {
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // ignore
    }
  };

  // 十进制度 -> 度分秒 结果
  const decimalToDmsResult = useMemo(() => {
    const lat = parseFloat(decimalLat);
    const lng = parseFloat(decimalLng);
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      !isValidLatitude(lat) ||
      !isValidLongitude(lng)
    ) {
      return null;
    }
    const result = coordinateDecimalToDMS({ lat, lng });
    return {
      lat: result.lat,
      lng: result.lng,
      latStr: formatDMS(result.lat),
      lngStr: formatDMS(result.lng),
    };
  }, [decimalLat, decimalLng]);

  // 度分秒 -> 十进制度 结果
  const dmsToDecimalResult = useMemo(() => {
    const latDeg = parseFloat(dmsLatDeg);
    const latMin = parseFloat(dmsLatMin);
    const latSec = parseFloat(dmsLatSec);
    const lngDeg = parseFloat(dmsLngDeg);
    const lngMin = parseFloat(dmsLngMin);
    const lngSec = parseFloat(dmsLngSec);

    if (
      isNaN(latDeg) ||
      isNaN(lngDeg) ||
      isNaN(latMin) ||
      isNaN(lngMin) ||
      isNaN(latSec) ||
      isNaN(lngSec)
    ) {
      return null;
    }

    if (latMin < 0 || latMin >= 60 || lngMin < 0 || lngMin >= 60) return null;
    if (latSec < 0 || latSec >= 60 || lngSec < 0 || lngSec >= 60) return null;
    if (!isValidLatitude(latDeg) || !isValidLongitude(lngDeg)) return null;

    const latDMS: DMS = { degrees: latDeg, minutes: latMin, seconds: latSec, direction: dmsLatDir };
    const lngDMS: DMS = { degrees: lngDeg, minutes: lngMin, seconds: lngSec, direction: dmsLngDir };

    const lat = dmsToDecimal(latDMS);
    const lng = dmsToDecimal(lngDMS);

    return {
      lat,
      lng,
      latStr: formatDecimal(lat),
      lngStr: formatDecimal(lng),
    };
  }, [dmsLatDeg, dmsLatMin, dmsLatSec, dmsLatDir, dmsLngDeg, dmsLngMin, dmsLngSec, dmsLngDir]);

  // 保存转换到历史
  useEffect(() => {
    if (direction === "decimalToDms" && decimalToDmsResult) {
      // debounce: 只有值有效且用户完成输入时才记录，我们通过按钮触发
    }
  }, [direction, decimalToDmsResult]);

  const handleSaveDecimalToDms = () => {
    if (!decimalToDmsResult) return;
    const record: ConversionRecord = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      timestamp: Date.now(),
      fromFormat: "decimal",
      input: { lat: decimalLat, lng: decimalLng },
      output: { lat: decimalToDmsResult.latStr, lng: decimalToDmsResult.lngStr },
    };
    addToHistory(record);
  };

  const handleSaveDmsToDecimal = () => {
    if (!dmsToDecimalResult) return;
    const record: ConversionRecord = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      timestamp: Date.now(),
      fromFormat: "dms",
      input: {
        lat: formatDMS({ degrees: parseFloat(dmsLatDeg), minutes: parseFloat(dmsLatMin) || 0, seconds: parseFloat(dmsLatSec) || 0, direction: dmsLatDir }),
        lng: formatDMS({ degrees: parseFloat(dmsLngDeg), minutes: parseFloat(dmsLngMin) || 0, seconds: parseFloat(dmsLngSec) || 0, direction: dmsLngDir }),
      },
      output: { lat: dmsToDecimalResult.latStr, lng: dmsToDecimalResult.lngStr },
    };
    addToHistory(record);
  };

  const applyHistoryRecord = (record: ConversionRecord) => {
    if (record.fromFormat === "decimal") {
      setDirection("decimalToDms");
      setDecimalLat(record.input.lat);
      setDecimalLng(record.input.lng);
    } else {
      setDirection("dmsToDecimal");
      const latParsed = parseDMSString(record.input.lat, true);
      const lngParsed = parseDMSString(record.input.lng, false);
      if (latParsed) {
        setDmsLatDeg(String(latParsed.degrees));
        setDmsLatMin(String(latParsed.minutes));
        setDmsLatSec(String(latParsed.seconds));
        setDmsLatDir(latParsed.direction as "N" | "S");
      }
      if (lngParsed) {
        setDmsLngDeg(String(lngParsed.degrees));
        setDmsLngMin(String(lngParsed.minutes));
        setDmsLngSec(String(lngParsed.seconds));
        setDmsLngDir(lngParsed.direction as "E" | "W");
      }
    }
  };

  const handleSwapDirection = () => {
    if (direction === "decimalToDms") {
      if (decimalToDmsResult) {
        setDmsLatDeg(String(decimalToDmsResult.lat.degrees));
        setDmsLatMin(String(decimalToDmsResult.lat.minutes));
        setDmsLatSec(String(decimalToDmsResult.lat.seconds));
        setDmsLatDir(decimalToDmsResult.lat.direction as "N" | "S");
        setDmsLngDeg(String(decimalToDmsResult.lng.degrees));
        setDmsLngMin(String(decimalToDmsResult.lng.minutes));
        setDmsLngSec(String(decimalToDmsResult.lng.seconds));
        setDmsLngDir(decimalToDmsResult.lng.direction as "E" | "W");
      }
      setDirection("dmsToDecimal");
    } else {
      if (dmsToDecimalResult) {
        setDecimalLat(String(dmsToDecimalResult.lat));
        setDecimalLng(String(dmsToDecimalResult.lng));
      }
      setDirection("decimalToDms");
    }
  };

  const swapLatLng = () => {
    if (direction === "decimalToDms") {
      const tmpLat = decimalLat;
      setDecimalLat(decimalLng);
      setDecimalLng(tmpLat);
    } else {
      const tmpDeg = dmsLatDeg; setDmsLatDeg(dmsLngDeg); setDmsLngDeg(tmpDeg);
      const tmpMin = dmsLatMin; setDmsLatMin(dmsLngMin); setDmsLngMin(tmpMin);
      const tmpSec = dmsLatSec; setDmsLatSec(dmsLngSec); setDmsLngSec(tmpSec);
      const tmpDir = dmsLatDir;
      setDmsLatDir(dmsLngDir === "E" ? "N" : dmsLngDir === "W" ? "S" : (dmsLngDir as "N" | "S"));
      setDmsLngDir(tmpDir === "N" ? "E" : tmpDir === "S" ? "W" : (tmpDir as "E" | "W"));
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-30 bg-ocean-950/80 backdrop-blur-xl border-b border-ocean-700/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl bg-ocean-800/50 text-ocean-200 hover:bg-ocean-700/50 transition-colors"
            title="返回"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-reef-400 to-orange-400 flex items-center justify-center shadow-lg">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-ocean-50 text-lg leading-tight">
                经纬度格式转换
              </h1>
              <p className="text-xs text-ocean-400 leading-tight">
                十进制度 ↔ 度分秒 互转工具
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        <div className="card-glass p-5">
          <div className="flex items-center justify-center gap-3 mb-5">
            <button
              onClick={() => setDirection("decimalToDms")}
              className={cn(
                "px-4 py-2 rounded-xl font-medium transition-all min-h-[40px]",
                direction === "decimalToDms"
                  ? "bg-ocean-500 text-white shadow"
                  : "text-ocean-300 hover:text-white hover:bg-ocean-800/50"
              )}
            >
              十进制度 → 度分秒
            </button>
            <button
              onClick={handleSwapDirection}
              className="p-2 rounded-xl bg-ocean-800/50 text-ocean-300 hover:bg-ocean-700/50 hover:text-white transition-all"
              title="交换方向并填充当前结果"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDirection("dmsToDecimal")}
              className={cn(
                "px-4 py-2 rounded-xl font-medium transition-all min-h-[40px]",
                direction === "dmsToDecimal"
                  ? "bg-ocean-500 text-white shadow"
                  : "text-ocean-300 hover:text-white hover:bg-ocean-800/50"
              )}
            >
              度分秒 → 十进制度
            </button>
          </div>

          {direction === "decimalToDms" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-text flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-reef-400" />
                    纬度 (Latitude)
                    <span className="text-ocean-500 ml-auto text-xs">范围: -90 ~ 90</span>
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    min="-90"
                    max="90"
                    value={decimalLat}
                    onChange={(e) => setDecimalLat(e.target.value)}
                    placeholder="如: 30.572816"
                    className="input-field h-12 text-sm"
                  />
                  {decimalLat && !isNaN(parseFloat(decimalLat)) && !isValidLatitude(parseFloat(decimalLat)) && (
                    <p className="text-xs text-reef-400 mt-1.5 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      纬度值超出有效范围
                    </p>
                  )}
                </div>
                <div>
                  <label className="label-text flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-sky-400" />
                    经度 (Longitude)
                    <span className="text-ocean-500 ml-auto text-xs">范围: -180 ~ 180</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.00000001"
                      min="-180"
                      max="180"
                      value={decimalLng}
                      onChange={(e) => setDecimalLng(e.target.value)}
                      placeholder="如: 114.298025"
                      className="input-field h-12 text-sm flex-1"
                    />
                    <button
                      onClick={swapLatLng}
                      className="px-3 rounded-xl bg-ocean-800/50 text-ocean-300 hover:bg-ocean-700/50 hover:text-white transition-all text-xs"
                      title="交换经纬度"
                    >
                      交换
                    </button>
                  </div>
                  {decimalLng && !isNaN(parseFloat(decimalLng)) && !isValidLongitude(parseFloat(decimalLng)) && (
                    <p className="text-xs text-reef-400 mt-1.5 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      经度值超出有效范围
                    </p>
                  )}
                </div>
              </div>

              {decimalToDmsResult ? (
                <div className="space-y-3 border-t border-ocean-700/40 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ocean-200 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      转换结果 (度分秒)
                    </h3>
                    <button
                      onClick={handleSaveDecimalToDms}
                      className="text-xs px-3 py-1.5 rounded-lg bg-reef-500/20 text-reef-300 hover:bg-reef-500/30 border border-reef-500/30 transition-all"
                    >
                      保存到历史
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      onClick={() => copyToClipboard(decimalToDmsResult.latStr, "dmsLat")}
                      className="card-glass p-3 bg-ocean-800/30 cursor-pointer hover:ring-2 hover:ring-ocean-500/50 transition-all group"
                    >
                      <div className="text-[11px] text-ocean-400 mb-1 flex items-center gap-1">
                        纬度 DMS
                        <Copy className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        {copiedField === "dmsLat" && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="text-base font-bold text-reef-300 tabular-nums">
                        {decimalToDmsResult.latStr}
                      </div>
                    </div>
                    <div
                      onClick={() => copyToClipboard(decimalToDmsResult.lngStr, "dmsLng")}
                      className="card-glass p-3 bg-ocean-800/30 cursor-pointer hover:ring-2 hover:ring-ocean-500/50 transition-all group"
                    >
                      <div className="text-[11px] text-ocean-400 mb-1 flex items-center gap-1">
                        经度 DMS
                        <Copy className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        {copiedField === "dmsLng" && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="text-base font-bold text-sky-300 tabular-nums">
                        {decimalToDmsResult.lngStr}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (decimalLat || decimalLng) ? (
                <div className="border-t border-ocean-700/40 pt-4 text-center text-ocean-400 text-sm">
                  请输入有效的经纬度值
                </div>
              ) : null}
            </div>
          )}

          {direction === "dmsToDecimal" && (
            <div className="space-y-5">
              <div>
                <label className="label-text flex items-center gap-1.5 mb-2">
                  <Navigation className="w-4 h-4 text-reef-400" />
                  纬度 (Latitude)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={dmsLatDeg}
                    onChange={(e) => setDmsLatDeg(e.target.value)}
                    placeholder="度"
                    className="input-field h-12 text-sm text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={dmsLatMin}
                    onChange={(e) => setDmsLatMin(e.target.value)}
                    placeholder="分"
                    className="input-field h-12 text-sm text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59.9999"
                    step="0.0001"
                    value={dmsLatSec}
                    onChange={(e) => setDmsLatSec(e.target.value)}
                    placeholder="秒"
                    className="input-field h-12 text-sm text-center"
                  />
                  <div className="flex bg-ocean-800/40 rounded-xl p-0.5 h-12">
                    <button
                      onClick={() => setDmsLatDir("N")}
                      className={cn(
                        "flex-1 rounded-lg text-sm font-semibold transition-all",
                        dmsLatDir === "N"
                          ? "bg-ocean-500 text-white"
                          : "text-ocean-300 hover:text-white"
                      )}
                    >
                      N
                    </button>
                    <button
                      onClick={() => setDmsLatDir("S")}
                      className={cn(
                        "flex-1 rounded-lg text-sm font-semibold transition-all",
                        dmsLatDir === "S"
                          ? "bg-ocean-500 text-white"
                          : "text-ocean-300 hover:text-white"
                      )}
                    >
                      S
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-1.5 text-[11px] text-ocean-500">
                  <span className="flex-1 text-center">度 (0-90)</span>
                  <span className="flex-1 text-center">分 (0-59)</span>
                  <span className="flex-1 text-center">秒 (0-59.9999)</span>
                  <span className="flex-1 text-center">方向</span>
                </div>
              </div>

              <div>
                <label className="label-text flex items-center gap-1.5 mb-2">
                  <Navigation className="w-4 h-4 text-sky-400" />
                  经度 (Longitude)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={dmsLngDeg}
                    onChange={(e) => setDmsLngDeg(e.target.value)}
                    placeholder="度"
                    className="input-field h-12 text-sm text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={dmsLngMin}
                    onChange={(e) => setDmsLngMin(e.target.value)}
                    placeholder="分"
                    className="input-field h-12 text-sm text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59.9999"
                    step="0.0001"
                    value={dmsLngSec}
                    onChange={(e) => setDmsLngSec(e.target.value)}
                    placeholder="秒"
                    className="input-field h-12 text-sm text-center"
                  />
                  <div className="flex bg-ocean-800/40 rounded-xl p-0.5 h-12">
                    <button
                      onClick={() => setDmsLngDir("E")}
                      className={cn(
                        "flex-1 rounded-lg text-sm font-semibold transition-all",
                        dmsLngDir === "E"
                          ? "bg-ocean-500 text-white"
                          : "text-ocean-300 hover:text-white"
                      )}
                    >
                      E
                    </button>
                    <button
                      onClick={() => setDmsLngDir("W")}
                      className={cn(
                        "flex-1 rounded-lg text-sm font-semibold transition-all",
                        dmsLngDir === "W"
                          ? "bg-ocean-500 text-white"
                          : "text-ocean-300 hover:text-white"
                      )}
                    >
                      W
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-1.5 text-[11px] text-ocean-500">
                  <span className="flex-1 text-center">度 (0-180)</span>
                  <span className="flex-1 text-center">分 (0-59)</span>
                  <span className="flex-1 text-center">秒 (0-59.9999)</span>
                  <span className="flex-1 text-center">方向</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={swapLatLng}
                  className="text-xs px-3 py-1.5 rounded-lg bg-ocean-800/50 text-ocean-300 hover:bg-ocean-700/50 hover:text-white transition-all"
                >
                  交换经纬度
                </button>
              </div>

              {dmsToDecimalResult ? (
                <div className="space-y-3 border-t border-ocean-700/40 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ocean-200 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      转换结果 (十进制度)
                    </h3>
                    <button
                      onClick={handleSaveDmsToDecimal}
                      className="text-xs px-3 py-1.5 rounded-lg bg-reef-500/20 text-reef-300 hover:bg-reef-500/30 border border-reef-500/30 transition-all"
                    >
                      保存到历史
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      onClick={() => copyToClipboard(dmsToDecimalResult.latStr, "decLat")}
                      className="card-glass p-3 bg-ocean-800/30 cursor-pointer hover:ring-2 hover:ring-ocean-500/50 transition-all group"
                    >
                      <div className="text-[11px] text-ocean-400 mb-1 flex items-center gap-1">
                        纬度 Decimal
                        <Copy className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        {copiedField === "decLat" && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="text-base font-bold text-reef-300 tabular-nums">
                        {dmsToDecimalResult.latStr}°
                      </div>
                    </div>
                    <div
                      onClick={() => copyToClipboard(dmsToDecimalResult.lngStr, "decLng")}
                      className="card-glass p-3 bg-ocean-800/30 cursor-pointer hover:ring-2 hover:ring-ocean-500/50 transition-all group"
                    >
                      <div className="text-[11px] text-ocean-400 mb-1 flex items-center gap-1">
                        经度 Decimal
                        <Copy className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        {copiedField === "decLng" && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="text-base font-bold text-sky-300 tabular-nums">
                        {dmsToDecimalResult.lngStr}°
                      </div>
                    </div>
                  </div>
                </div>
              ) : (dmsLatDeg || dmsLatMin || dmsLatSec || dmsLngDeg || dmsLngMin || dmsLngSec) ? (
                <div className="border-t border-ocean-700/40 pt-4 text-center text-ocean-400 text-sm">
                  请输入有效的度分秒值
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="card-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">
              <History className="w-5 h-5 text-reef-400" />
              转换历史
              <span className="text-xs text-ocean-500 font-normal ml-1">
                (最近 {history.length}/{MAX_HISTORY} 条)
              </span>
            </h3>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清空
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-ocean-400 text-sm">
              暂无历史记录，转换后点击"保存到历史"记录
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="card-glass p-3 bg-ocean-800/20 hover:bg-ocean-800/40 transition-all cursor-pointer group"
                  onClick={() => applyHistoryRecord(record)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="chip text-xs py-0.5">
                      {record.fromFormat === "decimal" ? "十进制度 → 度分秒" : "度分秒 → 十进制度"}
                    </span>
                    <span className="text-[11px] text-ocean-500">
                      {formatTime(record.timestamp)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[11px] text-ocean-500 mb-0.5">输入</div>
                      <div className="text-ocean-200 font-mono text-xs space-y-0.5">
                        <div>纬度: {record.input.lat}</div>
                        <div>经度: {record.input.lng}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ocean-500 mb-0.5">结果</div>
                      <div className="text-reef-300 font-mono text-xs space-y-0.5">
                        <div>纬度: {record.output.lat}</div>
                        <div>经度: {record.output.lng}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-ocean-500 mt-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    点击重新载入此记录
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
