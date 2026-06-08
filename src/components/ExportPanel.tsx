import { Download, FileJson, FileSpreadsheet, AlertTriangle } from "lucide-react";
import type { SurveyRecord, TideZone, SubstrateType, SpeciesRecord } from "@/types";
import { useSurveyStore } from "@/store/surveyStore";
import { SEASON_LABEL, TIDE_LABEL, SUBSTRATE_LABEL, getSeason } from "@/lib/diversity";

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
  return JSON.stringify(
    surveys,
    null,
    2
  );
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

export default function ExportPanel({ surveys }: ExportPanelProps) {
  const clearAll = useSurveyStore((s) => s.clearAll);

  const handleExportDwC = () => {
    if (surveys.length === 0) return;
    const csv = exportAsDarwinCore(surveys);
    downloadFile(csv, `intertidal-surveys-dwca-${Date.now()}.csv`, "text/csv;charset=utf-8");
  };

  const handleExportJSON = () => {
    if (surveys.length === 0) return;
    const json = exportAsJSON(surveys);
    downloadFile(json, `intertidal-surveys-${Date.now()}.json`, "application/json;charset=utf-8");
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

  return (
    <div className="card-glass p-5">
      <h3 className="section-title">
        <Download className="w-6 h-6 text-reef-400" />
        数据导出与管理
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleExportDwC}
          disabled={surveys.length === 0}
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
          onClick={handleExportJSON}
          disabled={surveys.length === 0}
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
            onClick={() => {
              if (confirm("确定要清空所有调查数据吗？此操作不可撤销。")) {
                clearAll();
              }
            }}
            className="text-red-400 text-xs hover:text-red-300 underline"
          >
            清空所有数据
          </button>
        </div>
      )}
    </div>
  );
}
