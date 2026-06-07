import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import type { SurveyRecord } from "@/types";
import { useSurveyStore } from "@/store/surveyStore";
import { SEASON_LABEL, TIDE_LABEL, SUBSTRATE_LABEL, getSeason } from "@/lib/diversity";

interface ExportPanelProps {
  surveys: SurveyRecord[];
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
        "",
        sp.phylum || "",
        sp.className || "",
        "",
        sp.family || "",
        "",
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
        if (Array.isArray(imported)) {
          const addSurvey = useSurveyStore.getState().addSurvey;
          imported.forEach((s) => {
            const { id, createdAt, ...rest } = s;
            addSurvey(rest);
          });
          alert(`成功导入 ${imported.length} 条记录`);
        } else {
          alert("JSON 格式不正确");
        }
      } catch {
        alert("导入失败，文件格式错误");
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
