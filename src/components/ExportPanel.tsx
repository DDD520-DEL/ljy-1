import { useState } from "react";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import type { SurveyRecord, TideZone, SubstrateType, SpeciesRecord, PhotoRecord } from "@/types";
import { useSurveyStore } from "@/store/surveyStore";
import { SEASON_LABEL, TIDE_LABEL, SUBSTRATE_LABEL, getSeason } from "@/lib/diversity";
import { getAllPhotos, clearAllPhotos, getPhotosBySurvey } from "@/lib/photoStore";

interface ExportPanelProps {
  surveys: SurveyRecord[];
}

const TIDE_ZONES: TideZone[] = ["high", "mid", "low"];
const SUBSTRATES: SubstrateType[] = [
  "rocky",
  "sandy",
  "muddy",
  "pebble",
  "cobble",
  "mixed",
];

const REQUIRED_SURVEY_FIELDS = [
  "date",
  "stationName",
  "tideZone",
  "quadratSize",
  "substrateType",
  "location",
  "species",
] as const;

const REQUIRED_LOCATION_FIELDS = ["lat", "lng"] as const;

const REQUIRED_SPECIES_FIELDS = [
  "speciesId",
  "scientificName",
  "commonName",
  "count",
  "coverage",
] as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSurveyRecord(
  raw: unknown,
  index: number
): ValidationResult {
  const errors: string[] = [];
  const prefix = `第 ${index + 1} 条记录: `;

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: [`${prefix}不是有效的对象`] };
  }

  const obj = raw as Record<string, unknown>;

  for (const field of REQUIRED_SURVEY_FIELDS) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      errors.push(`${prefix}缺少必填字段: ${field}`);
    }
  }

  if (typeof obj.date !== "string" || !obj.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push(`${prefix}date 字段格式错误，应为 YYYY-MM-DD`);
  }

  if (typeof obj.stationName !== "string" || !obj.stationName.trim()) {
    errors.push(`${prefix}stationName 不能为空字符串`);
  }

  if (!TIDE_ZONES.includes(obj.tideZone as TideZone)) {
    errors.push(`${prefix}tideZone 值无效，应为 high/mid/low`);
  }

  if (typeof obj.quadratSize !== "string" || !obj.quadratSize.trim()) {
    errors.push(`${prefix}quadratSize 不能为空`);
  }

  if (!SUBSTRATES.includes(obj.substrateType as SubstrateType)) {
    errors.push(`${prefix}substrateType 值无效`);
  }

  if (obj.location && typeof obj.location === "object") {
    const loc = obj.location as Record<string, unknown>;
    for (const f of REQUIRED_LOCATION_FIELDS) {
      if (!(f in loc)) {
        errors.push(`${prefix}location 缺少字段: ${f}`);
      } else if (typeof loc[f] !== "number") {
        errors.push(`${prefix}location.${f} 必须为数字`);
      }
    }
    if (typeof loc.lat === "number" && (loc.lat < -90 || loc.lat > 90)) {
      errors.push(`${prefix}location.lat 超出有效范围 (-90 ~ 90)`);
    }
    if (typeof loc.lng === "number" && (loc.lng < -180 || loc.lng > 180)) {
      errors.push(`${prefix}location.lng 超出有效范围 (-180 ~ 180)`);
    }
  }

  if (obj.species) {
    if (!Array.isArray(obj.species)) {
      errors.push(`${prefix}species 必须为数组`);
    } else {
      (obj.species as unknown[]).forEach((spRaw, spIdx) => {
        if (!spRaw || typeof spRaw !== "object") {
          errors.push(`${prefix}species[${spIdx}] 不是有效对象`);
          return;
        }
        const sp = spRaw as Record<string, unknown>;
        for (const f of REQUIRED_SPECIES_FIELDS) {
          if (!(f in sp)) {
            errors.push(`${prefix}species[${spIdx}] 缺少字段: ${f}`);
          }
        }
        if (typeof sp.count !== "number" || sp.count < 0) {
          errors.push(`${prefix}species[${spIdx}].count 必须为非负整数`);
        }
        if (
          typeof sp.coverage !== "number" ||
          sp.coverage < 0 ||
          sp.coverage > 100
        ) {
          errors.push(`${prefix}species[${spIdx}].coverage 必须在 0-100 之间`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function getPhotoExtension(mimeType: string): string {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

function getPhotoPath(photo: PhotoRecord, index: number): string {
  const ext = getPhotoExtension(photo.mimeType);
  const safeSurveyId = (photo.surveyId || "unknown").replace(/[^a-zA-Z0-9-_]/g, "_");
  return `photos/${safeSurveyId}/photo_${index.toString().padStart(3, "0")}${ext}`;
}

export async function exportAsDarwinCoreWithPhotos(
  surveys: SurveyRecord[]
): Promise<{ csv: string; photos: { path: string; blob: Blob }[] }> {
  const allPhotos: PhotoRecord[] = [];
  const surveyPhotoMap = new Map<string, PhotoRecord[]>();

  for (const survey of surveys) {
    const photos = await getPhotosBySurvey(survey.id);
    if (photos.length > 0) {
      surveyPhotoMap.set(survey.id, photos);
      allPhotos.push(...photos);
    }
  }

  const headers = [
    "eventID",
    "eventDate",
    "eventTime",
    "samplingProtocol",
    "sampleSizeValue",
    "sampleSizeUnit",
    "locationID",
    "locality",
    "decimalLatitude",
    "decimalLongitude",
    "geodeticDatum",
    "habitat",
    "verbatimHabitat",
    "season",
    "occurrenceID",
    "scientificName",
    "kingdom",
    "phylum",
    "class",
    "order",
    "family",
    "genus",
    "commonName",
    "individualCount",
    "organismQuantity",
    "organismQuantityType",
    "basisOfRecord",
    "associatedMedia",
  ];

  const rows: string[][] = [];
  let photoIndex = 0;
  const photoExports: { path: string; blob: Blob }[] = [];

  for (const survey of surveys) {
    const season = SEASON_LABEL[getSeason(survey.date)];
    const surveyPhotos = surveyPhotoMap.get(survey.id) || [];
    const surveyPhotoPaths: string[] = [];

    for (const photo of surveyPhotos) {
      const path = getPhotoPath(photo, photoIndex);
      surveyPhotoPaths.push(path);
      photoExports.push({
        path,
        blob: dataUrlToBlob(photo.dataUrl),
      });
      photoIndex++;
    }

    for (const sp of survey.species) {
      if (sp.count === 0 && sp.coverage === 0) continue;

      const speciesPhotoPaths: string[] = [];
      for (const photo of surveyPhotos) {
        if (photo.speciesId === sp.speciesId) {
          const path = getPhotoPath(photo, photoExports.findIndex((p) => p.blob === dataUrlToBlob(photo.dataUrl)));
          if (path) speciesPhotoPaths.push(path);
        }
      }

      const allMediaPaths = [...new Set([...surveyPhotoPaths, ...speciesPhotoPaths])];

      rows.push([
        survey.id,
        survey.date,
        "",
        "潮间带样方调查",
        survey.quadratSize,
        "样方",
        survey.stationName,
        survey.stationName,
        String(survey.location.lat),
        String(survey.location.lng),
        "WGS84",
        `潮间带-${TIDE_LABEL[survey.tideZone]}-${SUBSTRATE_LABEL[survey.substrateType]}`,
        `${TIDE_LABEL[survey.tideZone]} ${SUBSTRATE_LABEL[survey.substrateType]}`,
        season,
        `${survey.id}-${sp.speciesId}`,
        sp.scientificName,
        sp.kingdom || "",
        sp.phylum || "",
        sp.className || "",
        sp.order || "",
        sp.family || "",
        sp.genus || "",
        sp.commonName,
        String(sp.count),
        String(sp.coverage),
        "盖度百分比%",
        "HumanObservation",
        allMediaPaths.join(" | "),
      ]);
    }
  }

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");

  return { csv, photos: photoExports };
}

export function exportAsDarwinCore(surveys: SurveyRecord[]): string {
  const headers = [
    "eventID",
    "eventDate",
    "eventTime",
    "samplingProtocol",
    "sampleSizeValue",
    "sampleSizeUnit",
    "locationID",
    "locality",
    "decimalLatitude",
    "decimalLongitude",
    "geodeticDatum",
    "habitat",
    "verbatimHabitat",
    "season",
    "occurrenceID",
    "scientificName",
    "kingdom",
    "phylum",
    "class",
    "order",
    "family",
    "genus",
    "commonName",
    "individualCount",
    "organismQuantity",
    "organismQuantityType",
    "basisOfRecord",
  ];

  const rows: string[][] = [];
  for (const survey of surveys) {
    const season = SEASON_LABEL[getSeason(survey.date)];
    for (const sp of survey.species) {
      if (sp.count === 0 && sp.coverage === 0) continue;
      rows.push([
        survey.id,
        survey.date,
        "",
        "潮间带样方调查",
        survey.quadratSize,
        "样方",
        survey.stationName,
        survey.stationName,
        String(survey.location.lat),
        String(survey.location.lng),
        "WGS84",
        `潮间带-${TIDE_LABEL[survey.tideZone]}-${SUBSTRATE_LABEL[survey.substrateType]}`,
        `${TIDE_LABEL[survey.tideZone]} ${SUBSTRATE_LABEL[survey.substrateType]}`,
        season,
        `${survey.id}-${sp.speciesId}`,
        sp.scientificName,
        sp.kingdom || "",
        sp.phylum || "",
        sp.className || "",
        sp.order || "",
        sp.family || "",
        sp.genus || "",
        sp.commonName,
        String(sp.count),
        String(sp.coverage),
        "盖度百分比%",
        "HumanObservation",
      ]);
    }
  }

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  return csv;
}

export function exportAsJSON(surveys: SurveyRecord[]): string {
  return JSON.stringify(surveys, null, 2);
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportPanel({ surveys }: ExportPanelProps) {
  const clearAll = useSurveyStore((s) => s.clearAll);
  const [exporting, setExporting] = useState(false);

  const handleExportDwC = () => {
    if (surveys.length === 0) return;
    const csv = exportAsDarwinCore(surveys);
    downloadFile(csv, `intertidal-surveys-dwca-${Date.now()}.csv`, "text/csv;charset=utf-8");
  };

  const handleExportDwCWithPhotos = async () => {
    if (surveys.length === 0) return;
    setExporting(true);
    try {
      const { csv, photos } = await exportAsDarwinCoreWithPhotos(surveys);
      const timestamp = Date.now();

      downloadFile(csv, `intertidal-surveys-dwca-${timestamp}.csv`, "text/csv;charset=utf-8");

      for (const photo of photos) {
        const filename = photo.path.split("/").pop() || `photo-${Date.now()}.jpg`;
        downloadBlob(photo.blob, filename);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (photos.length > 0) {
        alert(
          `已导出 ${surveys.length} 条记录和 ${photos.length} 张照片。\n` +
            `CSV 文件包含 associatedMedia 字段，照片文件单独下载。\n` +
            `建议将所有照片放入 photos/ 目录中，与 CSV 文件同级。`
        );
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    if (surveys.length === 0) return;
    const json = exportAsJSON(surveys);
    downloadFile(json, `intertidal-surveys-${Date.now()}.json`, "application/json;charset=utf-8");
  };

  const handleExportPhotosOnly = async () => {
    if (surveys.length === 0) return;
    setExporting(true);
    try {
      const allPhotos = await getAllPhotos();
      const surveyIds = new Set(surveys.map((s) => s.id));
      const filteredPhotos = allPhotos.filter((p) => p.surveyId && surveyIds.has(p.surveyId));

      if (filteredPhotos.length === 0) {
        alert("没有找到关联的照片");
        return;
      }

      for (let i = 0; i < filteredPhotos.length; i++) {
        const photo = filteredPhotos[i];
        const path = getPhotoPath(photo, i);
        const filename = path.split("/").pop() || `photo-${i}.jpg`;
        downloadBlob(dataUrlToBlob(photo.dataUrl), filename);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      alert(`已导出 ${filteredPhotos.length} 张照片`);
    } catch (err) {
      console.error("Photo export failed:", err);
      alert("照片导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        if (!Array.isArray(imported)) {
          alert("导入失败：JSON 根必须为数组");
          return;
        }

        const allErrors: string[] = [];
        const validRecords: SurveyRecord[] = [];
        imported.forEach((raw, idx) => {
          const result = validateSurveyRecord(raw, idx);
          if (!result.valid) {
            allErrors.push(...result.errors);
          } else {
            validRecords.push(raw as SurveyRecord);
          }
        });

        if (allErrors.length > 0) {
          alert(
            `导入失败，存在 ${allErrors.length} 个问题：\n\n` +
              allErrors.slice(0, 15).join("\n") +
              (allErrors.length > 15 ? `\n... 还有 ${allErrors.length - 15} 条` : "")
          );
          return;
        }

        if (validRecords.length === 0) {
          alert("未找到有效记录");
          return;
        }

        const addSurvey = useSurveyStore.getState().addSurvey;
        validRecords.forEach((s) => {
          const { id, createdAt, ...rest } = s;
          addSurvey(rest);
        });
        alert(`成功导入 ${validRecords.length} 条记录`);
      } catch (err) {
        alert(
          `导入失败，文件格式错误：${err instanceof Error ? err.message : String(err)}`
        );
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearAll = async () => {
    if (confirm("确定要清空所有调查数据和照片吗？此操作不可撤销。")) {
      try {
        await clearAllPhotos();
        clearAll();
      } catch (err) {
        console.error("Clear all failed:", err);
        alert("清空失败，请重试");
      }
    }
  };

  return (
    <div className="card-glass p-5">
      <h3 className="section-title">
        <Download className="w-6 h-6 text-reef-400" />
        数据导出与管理
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleExportDwC}
          disabled={surveys.length === 0 || exporting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
          <div className="text-left">
            <div className="font-semibold">Darwin Core CSV</div>
            <div className="text-xs font-normal opacity-80">
              标准生物多样性数据格式
            </div>
          </div>
        </button>

        <button
          onClick={handleExportDwCWithPhotos}
          disabled={surveys.length === 0 || exporting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-left bg-reef-600 hover:bg-reef-700"
        >
          {exporting ? (
            <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
          ) : (
            <ImageIcon className="w-5 h-5 flex-shrink-0" />
          )}
          <div className="text-left">
            <div className="font-semibold">DwC + 照片导出</div>
            <div className="text-xs font-normal opacity-80">
              CSV + 照片文件，含 associatedMedia 引用
            </div>
          </div>
        </button>

        <button
          onClick={handleExportJSON}
          disabled={surveys.length === 0 || exporting}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <FileJson className="w-5 h-5 flex-shrink-0" />
          <div className="text-left">
            <div className="font-semibold">JSON 备份</div>
            <div className="text-xs font-normal opacity-80">
              完整数据，可重新导入
            </div>
          </div>
        </button>

        <button
          onClick={handleExportPhotosOnly}
          disabled={surveys.length === 0 || exporting}
          className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          {exporting ? (
            <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
          ) : (
            <ImageIcon className="w-5 h-5 flex-shrink-0" />
          )}
          <div className="text-left">
            <div className="font-semibold">仅导出照片</div>
            <div className="text-xs font-normal opacity-80">
              单独导出所有现场照片
            </div>
          </div>
        </button>

        <label className="btn-ghost cursor-pointer text-left col-span-1 sm:col-span-2">
          <Download className="w-5 h-5 flex-shrink-0" />
          <div className="text-left">
            <div className="font-semibold">导入 JSON 备份</div>
            <div className="text-xs font-normal opacity-80">
              从备份文件恢复调查数据
            </div>
          </div>
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportJSON}
          />
        </label>
      </div>

      {surveys.length > 0 && (
        <div className="mt-4 pt-4 border-t border-ocean-700/40">
          <p className="text-xs text-ocean-400 mb-2">
            当前共有 <span className="text-reef-300 font-bold">{surveys.length}</span> 条调查记录
          </p>
          <button
            onClick={handleClearAll}
            disabled={exporting}
            className="text-red-400 text-xs hover:text-red-300 underline disabled:opacity-50"
          >
            清空所有数据和照片
          </button>
        </div>
      )}
    </div>
  );
}
