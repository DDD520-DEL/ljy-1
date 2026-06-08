import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  Minus,
  Trash2,
  PlusCircle,
  MapPin,
  Calendar,
  Waves,
  Square,
  Mountain,
  StickyNote,
  Save,
  X,
  Camera as CameraIcon,
  Thermometer,
  Droplets,
  FlaskConical,
  Wind,
  CloudSun,
  BookTemplate,
  FolderDown,
  Table as TableIcon,
  LayoutList,
  Check,
  ChevronDown,
} from "lucide-react";
import type {
  SurveyRecord,
  TideZone,
  SubstrateType,
  SpeciesRecord,
  PhotoRecord,
  WeatherCondition,
  TemplateSpecies,
  SurveyTemplate,
} from "@/types";
import { SUBSTRATE_LABEL, TIDE_LABEL } from "@/lib/diversity";
import { useSurveyStore } from "@/store/surveyStore";
import { useTemplateStore } from "@/store/templateStore";
import {
  getPhotosBySurvey,
  getPhotosBySpecies,
  deletePhoto,
  updatePhoto,
} from "@/lib/photoStore";
import SpeciesPicker from "./SpeciesPicker";
import DiversityIndices from "./DiversityIndices";
import PhotoCapture from "./PhotoCapture";
import PhotoGrid from "./PhotoGrid";
import { cn } from "@/lib/utils";

interface SurveyFormProps {
  onClose: () => void;
  editing?: SurveyRecord | null;
}

const TIDE_OPTIONS: TideZone[] = ["high", "mid", "low"];
const SUBSTRATE_OPTIONS: SubstrateType[] = [
  "rocky",
  "sandy",
  "muddy",
  "pebble",
  "cobble",
  "mixed",
];
const QUADRAT_OPTIONS = ["0.25×0.25m", "0.5×0.5m", "1×1m", "2×2m", "5×5m"];
const WEATHER_OPTIONS: WeatherCondition[] = [
  "sunny",
  "cloudy",
  "rainy",
  "foggy",
  "stormy",
];
const WEATHER_LABEL: Record<WeatherCondition, string> = {
  sunny: "晴天",
  cloudy: "多云",
  rainy: "雨天",
  foggy: "雾天",
  stormy: "暴风雨",
};

export default function SurveyForm({ onClose, editing }: SurveyFormProps) {
  const addSurvey = useSurveyStore((s) => s.addSurvey);
  const updateSurvey = useSurveyStore((s) => s.updateSurvey);

  const [date, setDate] = useState(editing?.date || new Date().toISOString().slice(0, 10));
  const [stationName, setStationName] = useState(editing?.stationName || "");
  const [tideZone, setTideZone] = useState<TideZone>(editing?.tideZone || "mid");
  const [quadratSize, setQuadratSize] = useState(editing?.quadratSize || "1×1m");
  const [substrateType, setSubstrateType] = useState<SubstrateType>(
    editing?.substrateType || "rocky"
  );
  const [lat, setLat] = useState(String(editing?.location.lat || 30.0));
  const [lng, setLng] = useState(String(editing?.location.lng || 121.0));
  const [waterTemp, setWaterTemp] = useState<string>(
    editing?.envFactors?.waterTemp !== undefined ? String(editing.envFactors.waterTemp) : ""
  );
  const [salinity, setSalinity] = useState<string>(
    editing?.envFactors?.salinity !== undefined ? String(editing.envFactors.salinity) : ""
  );
  const [ph, setPh] = useState<string>(
    editing?.envFactors?.ph !== undefined ? String(editing.envFactors.ph) : ""
  );
  const [dissolvedOxygen, setDissolvedOxygen] = useState<string>(
    editing?.envFactors?.dissolvedOxygen !== undefined
      ? String(editing.envFactors.dissolvedOxygen)
      : ""
  );
  const [weather, setWeather] = useState<WeatherCondition | undefined>(
    editing?.envFactors?.weather
  );
  const [notes, setNotes] = useState(editing?.notes || "");
  const [species, setSpecies] = useState<SpeciesRecord[]>(editing?.species || []);
  const [showPicker, setShowPicker] = useState(false);
  const [quickCountMode, setQuickCountMode] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");

  const templates = useTemplateStore((s) => s.templates);
  const createTemplate = useTemplateStore((s) => s.createTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);

  const [surveyPhotos, setSurveyPhotos] = useState<PhotoRecord[]>([]);
  const [speciesPhotos, setSpeciesPhotos] = useState<Map<string, PhotoRecord[]>>(
    new Map()
  );
  const [tempSurveyId] = useState(
    () => `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  );

  useEffect(() => {
    if (editing) {
      loadExistingPhotos(editing.id);
    }
  }, [editing]);

  const loadExistingPhotos = async (surveyId: string) => {
    try {
      const sPhotos = await getPhotosBySurvey(surveyId);
      setSurveyPhotos(sPhotos.sort((a, b) => b.createdAt - a.createdAt));

      const speciesPhotoMap = new Map<string, PhotoRecord[]>();
      for (const sp of editing?.species || []) {
        const spPhotos = await getPhotosBySpecies(sp.speciesId);
        const filtered = spPhotos.filter((p) => p.surveyId === surveyId);
        if (filtered.length > 0) {
          speciesPhotoMap.set(sp.speciesId, filtered);
        }
      }
      setSpeciesPhotos(speciesPhotoMap);
    } catch (err) {
      console.error("Failed to load existing photos:", err);
    }
  };

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("浏览器不支持定位");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      () => alert("定位失败，请手动输入")
    );
  }, []);

  const handleAddSpecies = (sp: SpeciesRecord) => {
    setSpecies((prev) => [...prev, { ...sp, photoIds: [] }]);
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      alert("请输入模板名称");
      return;
    }
    if (species.length === 0) {
      alert("当前没有物种可保存为模板");
      return;
    }
    const templateSpecies: TemplateSpecies[] = species.map((s) => ({
      speciesId: s.speciesId,
      scientificName: s.scientificName,
      commonName: s.commonName,
      kingdom: s.kingdom,
      phylum: s.phylum,
      className: s.className,
      order: s.order,
      family: s.family,
      genus: s.genus,
    }));
    createTemplate(templateName.trim(), templateSpecies, templateDesc.trim() || undefined);
    setTemplateName("");
    setTemplateDesc("");
    setShowSaveTemplate(false);
  };

  const handleLoadTemplate = (template: SurveyTemplate) => {
    const existingIds = new Set(species.map((s) => s.speciesId));
    const newSpecies: SpeciesRecord[] = template.species
      .filter((ts) => !existingIds.has(ts.speciesId))
      .map((ts) => ({
        speciesId: ts.speciesId,
        scientificName: ts.scientificName,
        commonName: ts.commonName,
        count: 0,
        coverage: 0,
        kingdom: ts.kingdom,
        phylum: ts.phylum,
        className: ts.className,
        order: ts.order,
        family: ts.family,
        genus: ts.genus,
        photoIds: [],
      }));
    if (newSpecies.length > 0) {
      setSpecies((prev) => [...prev, ...newSpecies]);
    } else {
      setSpecies(
        template.species.map((ts) => ({
          speciesId: ts.speciesId,
          scientificName: ts.scientificName,
          commonName: ts.commonName,
          count: 0,
          coverage: 0,
          kingdom: ts.kingdom,
          phylum: ts.phylum,
          className: ts.className,
          order: ts.order,
          family: ts.family,
          genus: ts.genus,
          photoIds: [],
        }))
      );
    }
    setShowLoadTemplate(false);
  };

  const updateSpeciesCount = (index: number, delta: number) => {
    setSpecies((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, count: Math.max(0, s.count + delta) } : s
      )
    );
  };

  const updateSpeciesCoverage = (index: number, value: number) => {
    setSpecies((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, coverage: Math.max(0, Math.min(100, value)) } : s
      )
    );
  };

  const removeSpecies = async (index: number) => {
    const sp = species[index];
    const spPhotos = speciesPhotos.get(sp.speciesId) || [];
    for (const photo of spPhotos) {
      try {
        await deletePhoto(photo.id);
      } catch (err) {
        console.error("Failed to delete species photo:", err);
      }
    }
    setSpeciesPhotos((prev) => {
      const next = new Map(prev);
      next.delete(sp.speciesId);
      return next;
    });
    setSpecies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSurveyPhotoAdded = (photo: PhotoRecord) => {
    setSurveyPhotos((prev) => [photo, ...prev]);
  };

  const handleSpeciesPhotoAdded = (speciesId: string, photo: PhotoRecord) => {
    setSpeciesPhotos((prev) => {
      const next = new Map(prev);
      const existing = next.get(speciesId) || [];
      next.set(speciesId, [photo, ...existing]);
      return next;
    });
  };

  const handleDeleteSurveyPhoto = async (photoId: string) => {
    try {
      await deletePhoto(photoId);
      setSurveyPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error("Failed to delete photo:", err);
    }
  };

  const handleDeleteSpeciesPhoto = async (
    speciesId: string,
    photoId: string
  ) => {
    try {
      await deletePhoto(photoId);
      setSpeciesPhotos((prev) => {
        const next = new Map(prev);
        const existing = next.get(speciesId) || [];
        next.set(speciesId, existing.filter((p) => p.id !== photoId));
        return next;
      });
    } catch (err) {
      console.error("Failed to delete species photo:", err);
    }
  };

  const updatePhotosWithSurveyId = async (surveyId: string) => {
    const allPhotos: PhotoRecord[] = [
      ...surveyPhotos,
      ...Array.from(speciesPhotos.values()).flat(),
    ];

    for (const photo of allPhotos) {
      const updates: Partial<PhotoRecord> = { surveyId };
      if (photo.surveyId?.startsWith("temp-")) {
        updates.surveyId = surveyId;
      }
      try {
        await updatePhoto(photo.id, updates);
      } catch (err) {
        console.error("Failed to update photo surveyId:", err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!stationName.trim()) {
      alert("请输入站位名称");
      return;
    }
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      alert("请输入有效的经纬度");
      return;
    }

    const finalSpecies = species
      .filter((s) => s.count > 0 || s.coverage > 0)
      .map((s) => {
        const spPhotos = speciesPhotos.get(s.speciesId) || [];
        return {
          ...s,
          photoIds: spPhotos.map((p) => p.id),
        };
      });

    const envFactors = {
      waterTemp: waterTemp ? parseFloat(waterTemp) : undefined,
      salinity: salinity ? parseFloat(salinity) : undefined,
      ph: ph ? parseFloat(ph) : undefined,
      dissolvedOxygen: dissolvedOxygen ? parseFloat(dissolvedOxygen) : undefined,
      weather,
    };
    const hasEnvFactors = Object.values(envFactors).some(
      (v) => v !== undefined
    );

    const payload = {
      date,
      stationName: stationName.trim(),
      tideZone,
      quadratSize,
      substrateType,
      location: { lat: latNum, lng: lngNum },
      species: finalSpecies,
      envFactors: hasEnvFactors ? envFactors : undefined,
      notes: notes.trim() || undefined,
      photoIds: surveyPhotos.map((p) => p.id),
    };

    if (editing) {
      updateSurvey(editing.id, payload);
      await updatePhotosWithSurveyId(editing.id);
    } else {
      const beforeIds = new Set(useSurveyStore.getState().surveys.map((s) => s.id));
      addSurvey(payload);

      const store = useSurveyStore.getState();
      const newSurvey = store.surveys.find((s) => !beforeIds.has(s.id));

      if (newSurvey) {
        await updatePhotosWithSurveyId(newSurvey.id);
        updateSurvey(newSurvey.id, {
          photoIds: surveyPhotos.map((p) => p.id),
          species: finalSpecies,
        });
      }
    }
    onClose();
  };

  const existingSpeciesIds = species.map((s) => s.speciesId);

  const currentSurveyId = editing?.id || tempSurveyId;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-y-auto">
      <div className="card-glass w-full sm:w-[640px] sm:max-h-[90vh] max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden my-auto">
        <div className="flex items-center justify-between p-4 border-b border-ocean-700/40 flex-shrink-0">
          <h3 className="text-lg font-bold text-ocean-100">
            {editing ? "编辑调查记录" : "新建调查记录"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-ocean-700/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text flex items-center gap-1">
                <Calendar className="w-4 h-4" /> 调查日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text">站位名称</label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="如：青岛栈桥A1"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-text flex items-center gap-1">
              <Waves className="w-4 h-4" /> 潮位带
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIDE_OPTIONS.map((tz) => (
                <button
                  key={tz}
                  onClick={() => setTideZone(tz)}
                  className={cn(
                    "py-3 px-4 rounded-xl font-medium transition-all min-h-[48px] border",
                    tideZone === tz
                      ? tz === "high"
                        ? "bg-tide-high/20 border-tide-high text-ocean-100"
                        : tz === "mid"
                        ? "bg-tide-mid/20 border-tide-mid text-ocean-100"
                        : "bg-tide-low/20 border-tide-low text-ocean-100"
                      : "bg-ocean-800/30 border-ocean-700/40 text-ocean-300 hover:text-white"
                  )}
                >
                  {TIDE_LABEL[tz]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text flex items-center gap-1">
                <Square className="w-4 h-4" /> 样方尺寸
              </label>
              <select
                value={quadratSize}
                onChange={(e) => setQuadratSize(e.target.value)}
                className="select-field"
              >
                {QUADRAT_OPTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text flex items-center gap-1">
                <Mountain className="w-4 h-4" /> 底质类型
              </label>
              <select
                value={substrateType}
                onChange={(e) => setSubstrateType(e.target.value as SubstrateType)}
                className="select-field"
              >
                {SUBSTRATE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {SUBSTRATE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label-text flex items-center gap-1">
              <MapPin className="w-4 h-4" /> 站位坐标
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="纬度 Lat"
                className="input-field"
              />
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="经度 Lng"
                className="input-field"
              />
            </div>
            <button
              onClick={getCurrentLocation}
              className="btn-ghost w-full mt-2 text-sm"
            >
              <MapPin className="w-4 h-4" /> 获取当前位置
            </button>
          </div>

          <div className="card-glass p-4 space-y-3">
            <h4 className="text-sm font-semibold text-reef-300 flex items-center gap-2">
              <FlaskConical className="w-4 h-4" /> 环境因子
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text flex items-center gap-1">
                  <Thermometer className="w-4 h-4" /> 水温 (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={waterTemp}
                  onChange={(e) => setWaterTemp(e.target.value)}
                  placeholder="如：22.5"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text flex items-center gap-1">
                  <Droplets className="w-4 h-4" /> 盐度 (‰)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={salinity}
                  onChange={(e) => setSalinity(e.target.value)}
                  placeholder="如：30.0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text flex items-center gap-1">
                  <FlaskConical className="w-4 h-4" /> pH 值
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={14}
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  placeholder="如：8.10"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text flex items-center gap-1">
                  <Wind className="w-4 h-4" /> 溶解氧 (mg/L)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={dissolvedOxygen}
                  onChange={(e) => setDissolvedOxygen(e.target.value)}
                  placeholder="如：6.5"
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="label-text flex items-center gap-1">
                <CloudSun className="w-4 h-4" /> 天气状况
              </label>
              <div className="grid grid-cols-5 gap-1">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeather(weather === w ? undefined : w)}
                    className={cn(
                      "py-2 px-1 rounded-lg text-xs font-medium transition-all border min-h-[40px]",
                      weather === w
                        ? "bg-reef-500/30 border-reef-500 text-ocean-100"
                        : "bg-ocean-800/30 border-ocean-700/40 text-ocean-300 hover:text-white"
                    )}
                  >
                    {WEATHER_LABEL[w]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label-text flex items-center gap-1">
              <CameraIcon className="w-4 h-4" /> 站位照片 (
              {surveyPhotos.length})
            </label>
            {surveyPhotos.length > 0 && (
              <PhotoGrid
                photos={surveyPhotos}
                onDelete={handleDeleteSurveyPhoto}
                className="mb-3"
                size="sm"
              />
            )}
            <PhotoCapture
              surveyId={currentSurveyId}
              onPhotoAdded={handleSurveyPhotoAdded}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="label-text mb-0 flex items-center gap-1">
                <PlusCircle className="w-4 h-4" /> 物种记录 ({species.length})
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {species.length > 0 && (
                  <button
                    onClick={() => setShowSaveTemplate(true)}
                    className="btn-ghost py-2 px-3 text-sm min-h-[40px]"
                    title="保存当前物种组合为模板"
                  >
                    <BookTemplate className="w-4 h-4" />
                    <span className="hidden sm:inline">保存模板</span>
                  </button>
                )}
                <button
                  onClick={() => setShowLoadTemplate(true)}
                  className="btn-ghost py-2 px-3 text-sm min-h-[40px]"
                  title="加载物种模板"
                >
                  <FolderDown className="w-4 h-4" />
                  <span className="hidden sm:inline">加载模板</span>
                </button>
                {species.length > 0 && (
                  <div className="flex bg-ocean-800/40 rounded-xl p-0.5 mx-1">
                    <button
                      onClick={() => setQuickCountMode(false)}
                      className={cn(
                        "py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all min-h-[36px] flex items-center gap-1",
                        !quickCountMode
                          ? "bg-ocean-500 text-white shadow"
                          : "text-ocean-300 hover:text-white"
                      )}
                      title="标准视图"
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setQuickCountMode(true)}
                      className={cn(
                        "py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all min-h-[36px] flex items-center gap-1",
                        quickCountMode
                          ? "bg-ocean-500 text-white shadow"
                          : "text-ocean-300 hover:text-white"
                      )}
                      title="快速计数表格模式"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setShowPicker(true)}
                  className="btn-secondary py-2 px-4 text-sm min-h-[40px]"
                >
                  <Plus className="w-4 h-4" /> 添加物种
                </button>
              </div>
            </div>

            {species.length === 0 ? (
              <div className="card-glass p-8 text-center text-ocean-400">
                <PlusCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>点击「添加物种」或「加载模板」开始</p>
              </div>
            ) : quickCountMode ? (
              <div className="card-glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ocean-700/40 bg-ocean-800/30">
                        <th className="text-left py-3 px-3 font-medium text-ocean-200">
                          物种
                        </th>
                        <th className="text-center py-3 px-2 font-medium text-ocean-200 w-28">
                          个体数
                        </th>
                        <th className="text-center py-3 px-2 font-medium text-ocean-200 w-24">
                          盖度%
                        </th>
                        <th className="text-center py-3 px-2 font-medium text-ocean-200 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {species.map((sp, i) => (
                        <tr
                          key={sp.speciesId + i}
                          className="border-b border-ocean-800/30 hover:bg-ocean-800/20 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-reef-300 text-sm truncate">
                              {sp.commonName}
                            </div>
                            <div className="text-xs text-ocean-400 italic truncate">
                              {sp.scientificName}
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                onClick={() => updateSpeciesCount(i, -1)}
                                className="w-7 h-7 rounded-lg bg-ocean-800/50 flex items-center justify-center text-ocean-200 hover:bg-ocean-700/50 transition-colors flex-shrink-0"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                value={sp.count}
                                onChange={(e) =>
                                  setSpecies((prev) =>
                                    prev.map((s, idx) =>
                                      idx === i
                                        ? {
                                            ...s,
                                            count: Math.max(
                                              0,
                                              parseInt(e.target.value) || 0
                                            ),
                                          }
                                        : s
                                    )
                                  )
                                }
                                className="w-14 h-8 text-center bg-ocean-900/50 border border-ocean-700/40 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-reef-500"
                              />
                              <button
                                onClick={() => updateSpeciesCount(i, 1)}
                                className="w-7 h-7 rounded-lg bg-ocean-800/50 flex items-center justify-center text-ocean-200 hover:bg-ocean-700/50 transition-colors flex-shrink-0"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={sp.coverage}
                              onChange={(e) =>
                                updateSpeciesCoverage(
                                  i,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-8 text-center bg-ocean-900/50 border border-ocean-700/40 rounded-lg text-ocean-100 text-sm focus:outline-none focus:border-reef-500"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => removeSpecies(i)}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {species.map((sp, i) => {
                  const spPhotos = speciesPhotos.get(sp.speciesId) || [];
                  return (
                    <div
                      key={sp.speciesId + i}
                      className="card-glass p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-reef-300 truncate">
                            {sp.commonName}
                          </div>
                          <div className="text-xs text-ocean-400 italic truncate">
                            {sp.scientificName}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <PhotoCapture
                            surveyId={currentSurveyId}
                            speciesId={sp.speciesId}
                            onPhotoAdded={(photo) =>
                              handleSpeciesPhotoAdded(sp.speciesId, photo)
                            }
                            compact
                          />
                          <button
                            onClick={() => removeSpecies(i)}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {spPhotos.length > 0 && (
                        <PhotoGrid
                          photos={spPhotos}
                          onDelete={(pid) =>
                            handleDeleteSpeciesPhoto(sp.speciesId, pid)
                          }
                          size="sm"
                        />
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-ocean-300 mb-1 block">
                            个体数
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateSpeciesCount(i, -1)}
                              className="w-10 h-10 rounded-xl bg-ocean-800/50 flex items-center justify-center text-ocean-200 hover:bg-ocean-700/50 transition-colors flex-shrink-0"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              value={sp.count}
                              onChange={(e) =>
                                setSpecies((prev) =>
                                  prev.map((s, idx) =>
                                    idx === i
                                      ? {
                                          ...s,
                                          count: Math.max(
                                            0,
                                            parseInt(e.target.value) || 0
                                          ),
                                        }
                                      : s
                                  )
                                )
                              }
                              className="input-field py-2 h-10 text-center"
                            />
                            <button
                              onClick={() => updateSpeciesCount(i, 1)}
                              className="w-10 h-10 rounded-xl bg-ocean-800/50 flex items-center justify-center text-ocean-200 hover:bg-ocean-700/50 transition-colors flex-shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-ocean-300 mb-1 block">
                            盖度 %
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={sp.coverage}
                            onChange={(e) =>
                              updateSpeciesCoverage(
                                i,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="input-field py-2 h-10"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {species.length > 0 && <DiversityIndices species={species} />}

          <div>
            <label className="label-text flex items-center gap-1">
              <StickyNote className="w-4 h-4" /> 备注
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="环境条件、异常情况等..."
              rows={3}
              className="input-field resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-ocean-700/40 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="btn-ghost flex-1">
            取消
          </button>
          <button onClick={handleSubmit} className="btn-primary flex-1">
            <Save className="w-5 h-5" />
            {editing ? "保存修改" : "保存记录"}
          </button>
        </div>
      </div>

      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="card-glass w-full sm:w-[480px] rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-ocean-700/40">
              <h3 className="text-lg font-bold text-ocean-100 flex items-center gap-2">
                <BookTemplate className="w-5 h-5 text-reef-400" />
                保存为模板
              </h3>
              <button
                onClick={() => {
                  setShowSaveTemplate(false);
                  setTemplateName("");
                  setTemplateDesc("");
                }}
                className="p-2 rounded-lg hover:bg-ocean-700/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label-text">模板名称 *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="如：潮间带常见物种"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="label-text">描述（可选）</label>
                <textarea
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="模板用途、适用场景等..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
              <div className="card-glass p-3 bg-ocean-800/30">
                <p className="text-sm text-ocean-300">
                  将保存当前 <span className="text-reef-300 font-medium">{species.length}</span> 个物种到模板中（不含个体数和盖度）。
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-ocean-700/40 flex gap-3">
              <button
                onClick={() => {
                  setShowSaveTemplate(false);
                  setTemplateName("");
                  setTemplateDesc("");
                }}
                className="btn-ghost flex-1"
              >
                取消
              </button>
              <button onClick={handleSaveAsTemplate} className="btn-primary flex-1">
                <Save className="w-5 h-5" />
                保存模板
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="card-glass w-full sm:w-[540px] sm:max-h-[85vh] max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-ocean-700/40 flex-shrink-0">
              <h3 className="text-lg font-bold text-ocean-100 flex items-center gap-2">
                <FolderDown className="w-5 h-5 text-reef-400" />
                加载物种模板
              </h3>
              <button
                onClick={() => setShowLoadTemplate(false)}
                className="p-2 rounded-lg hover:bg-ocean-700/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {templates.length === 0 ? (
                <div className="text-center text-ocean-400 py-12">
                  <BookTemplate className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">暂无保存的模板</p>
                  <p className="text-sm mt-1">在调查中添加物种后可保存为模板</p>
                </div>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="card-glass p-4 hover:bg-ocean-800/40 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleLoadTemplate(tpl)}
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-ocean-100">
                            {tpl.name}
                          </h4>
                          <span className="text-xs text-ocean-500 bg-ocean-800/50 px-2 py-0.5 rounded-full">
                            {tpl.species.length} 种
                          </span>
                        </div>
                        {tpl.description && (
                          <p className="text-sm text-ocean-400 mt-1 line-clamp-2">
                            {tpl.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tpl.species.slice(0, 5).map((s) => (
                            <span
                              key={s.speciesId}
                              className="text-xs bg-ocean-800/50 text-ocean-300 px-2 py-0.5 rounded"
                            >
                              {s.commonName}
                            </span>
                          ))}
                          {tpl.species.length > 5 && (
                            <span className="text-xs text-ocean-500 px-2 py-0.5">
                              +{tpl.species.length - 5} 更多
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleLoadTemplate(tpl)}
                          className="btn-secondary py-2 px-3 text-sm min-h-[40px]"
                        >
                          <Check className="w-4 h-4" />
                          加载
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`确定删除模板「${tpl.name}」吗？`)) {
                              deleteTemplate(tpl.id);
                            }
                          }}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                          title="删除模板"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showPicker && (
        <SpeciesPicker
          onSelect={handleAddSpecies}
          onClose={() => setShowPicker(false)}
          existingIds={existingSpeciesIds}
        />
      )}
    </div>
  );
}
