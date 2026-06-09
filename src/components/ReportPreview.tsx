import { useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Printer,
  X,
} from "lucide-react";
import type { ReportData } from "@/lib/report";
import {
  formatDate,
  getTopSpeciesForStackedBar,
} from "@/lib/report";
import {
  SEASON_LABEL,
  TIDE_LABEL,
  SUBSTRATE_LABEL,
} from "@/lib/diversity";
import { cn } from "@/lib/utils";

interface ReportPreviewProps {
  data: ReportData;
  onClose?: () => void;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
}

const SPECIES_COLORS = [
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#22c55e",
  "#f97316",
  "#6366f1",
  "#10b981",
];

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

export default function ReportPreview({
  data,
  onClose,
  onExportPdf,
  onExportCsv,
}: ReportPreviewProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const { summary, stationDiversities, brayCurtis, dominantSpecies } = data;

  const seasonStacked = useMemo(
    () => getTopSpeciesForStackedBar(data.compositionBySeason),
    [data.compositionBySeason]
  );

  const tideStacked = useMemo(
    () => getTopSpeciesForStackedBar(data.compositionByTideZone),
    [data.compositionByTideZone]
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (onExportCsv) {
      onExportCsv();
    } else {
      downloadFile(
        data.rawCsv,
        `survey-raw-data-${Date.now()}.csv`,
        "text/csv;charset=utf-8"
      );
    }
  };

  const heatmapColors = (value: number) => {
    if (value <= 0.2) return "#0ea5e9";
    if (value <= 0.4) return "#14b8a6";
    if (value <= 0.6) return "#f59e0b";
    if (value <= 0.8) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-auto print:bg-white print:overflow-visible print:static print:inset-auto">
      <div className="sticky top-0 z-10 bg-ocean-950/95 backdrop-blur-xl border-b border-ocean-700/40 p-4 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-reef-400" />
            <h2 className="text-xl font-bold text-ocean-100">
              调查数据统计报告
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              className="btn-secondary text-sm py-2 px-3 min-h-[40px]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              导出原始数据 CSV
            </button>
            <button
              onClick={onExportPdf || handlePrint}
              className="btn-primary text-sm py-2 px-3 min-h-[40px]"
            >
              {onExportPdf ? (
                <Download className="w-4 h-4" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {onExportPdf ? "导出 PDF" : "打印 / 导出 PDF"}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-ocean-800/50 text-ocean-300 hover:bg-ocean-700/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        ref={reportRef}
        className="max-w-5xl mx-auto p-6 md:p-10 print:p-8 print:bg-white print:text-gray-900"
      >
        <div className="text-center mb-10 pb-6 border-b-2 border-ocean-700/40 print:border-gray-300">
          <h1 className="text-3xl md:text-4xl font-bold text-ocean-100 print:text-gray-900 mb-3">
            潮间带生物多样性调查统计报告
          </h1>
          <p className="text-ocean-300 print:text-gray-600">
            报告生成时间：{formatDate(data.generatedAt)}
          </p>
          {summary.dateRange && (
            <p className="text-ocean-300 print:text-gray-600 mt-1">
              调查时间范围：{summary.dateRange.start} 至 {summary.dateRange.end}
            </p>
          )}
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-ocean-100 print:text-gray-900 mb-4 flex items-center gap-2 border-l-4 border-reef-500 pl-3">
            一、调查概况
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="card-glass p-4 text-center print:bg-gray-50 print:border print:border-gray-200 print:rounded-lg">
              <div className="text-3xl font-bold text-ocean-300 print:text-blue-700">
                {summary.totalSurveys}
              </div>
              <div className="text-xs text-ocean-400 print:text-gray-500 mt-1">
                调查记录数
              </div>
            </div>
            <div className="card-glass p-4 text-center print:bg-gray-50 print:border print:border-gray-200 print:rounded-lg">
              <div className="text-3xl font-bold text-reef-300 print:text-teal-700">
                {summary.totalStations}
              </div>
              <div className="text-xs text-ocean-400 print:text-gray-500 mt-1">
                调查站位
              </div>
            </div>
            <div className="card-glass p-4 text-center print:bg-gray-50 print:border print:border-gray-200 print:rounded-lg">
              <div className="text-3xl font-bold text-sand-300 print:text-amber-700">
                {summary.totalSpecies}
              </div>
              <div className="text-xs text-ocean-400 print:text-gray-500 mt-1">
                物种总数
              </div>
            </div>
            <div className="card-glass p-4 text-center print:bg-gray-50 print:border print:border-gray-200 print:rounded-lg">
              <div className="text-3xl font-bold text-purple-300 print:text-purple-700">
                {summary.totalIndividuals}
              </div>
              <div className="text-xs text-ocean-400 print:text-gray-500 mt-1">
                个体总数
              </div>
            </div>
          </div>

          <div className="card-glass p-5 print:bg-gray-50 print:border print:border-gray-200 print:rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-ocean-400 print:text-gray-500">
                  调查站位：
                </span>
                <span className="text-ocean-100 print:text-gray-800 font-medium">
                  {summary.stations.join("、")}
                </span>
              </div>
              <div>
                <span className="text-ocean-400 print:text-gray-500">
                  涉及季节：
                </span>
                <span className="text-ocean-100 print:text-gray-800 font-medium">
                  {summary.seasons.map((s) => SEASON_LABEL[s]).join("、")}
                </span>
              </div>
              <div>
                <span className="text-ocean-400 print:text-gray-500">
                  潮带类型：
                </span>
                <span className="text-ocean-100 print:text-gray-800 font-medium">
                  {summary.tideZones.map((t) => TIDE_LABEL[t]).join("、")}
                </span>
              </div>
              <div>
                <span className="text-ocean-400 print:text-gray-500">
                  底质类型：
                </span>
                <span className="text-ocean-100 print:text-gray-800 font-medium">
                  {summary.substrates.map((s) => SUBSTRATE_LABEL[s] || s).join("、")}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-ocean-700/40 print:border-gray-200">
              <div className="text-center">
                <div className="text-xs text-ocean-400 print:text-gray-500 mb-1">
                  平均 Shannon-Wiener
                </div>
                <div className="text-lg font-bold text-ocean-200 print:text-gray-800">
                  {summary.avgShannonWiener}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-ocean-400 print:text-gray-500 mb-1">
                  平均 Pielou 均匀度
                </div>
                <div className="text-lg font-bold text-ocean-200 print:text-gray-800">
                  {summary.avgPielouEvenness}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-ocean-400 print:text-gray-500 mb-1">
                  平均物种数
                </div>
                <div className="text-lg font-bold text-ocean-200 print:text-gray-800">
                  {summary.avgSpeciesCount}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-ocean-100 print:text-gray-900 mb-4 flex items-center gap-2 border-l-4 border-reef-500 pl-3">
            二、各站位多样性指数对比
          </h2>
          <div className="card-glass overflow-hidden print:bg-white print:border print:border-gray-200 print:rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ocean-800/60 print:bg-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                      站位
                    </th>
                    <th className="text-left px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                      日期
                    </th>
                    <th className="text-left px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                      潮带
                    </th>
                    <th className="text-left px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                      季节
                    </th>
                    <th className="text-right px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                      物种数 S
                    </th>
                    <th className="text-right px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                      个体数 N
                    </th>
                    <th className="text-right px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                      Shannon H'
                    </th>
                    <th className="text-right px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                      Pielou J
                    </th>
                    <th className="text-right px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                      Margalef d
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stationDiversities.map((sd, idx) => (
                    <tr
                      key={`${sd.stationName}-${sd.date}-${idx}`}
                      className={cn(
                        "border-t border-ocean-700/30 print:border-gray-200",
                        idx % 2 === 0 && "bg-ocean-900/20 print:bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-2.5 text-ocean-100 print:text-gray-800 font-medium">
                        {sd.stationName}
                      </td>
                      <td className="px-4 py-2.5 text-ocean-300 print:text-gray-600">
                        {sd.date}
                      </td>
                      <td className="px-4 py-2.5 text-ocean-300 print:text-gray-600">
                        {TIDE_LABEL[sd.tideZone]}
                      </td>
                      <td className="px-4 py-2.5 text-ocean-300 print:text-gray-600">
                        {SEASON_LABEL[sd.season]}
                      </td>
                      <td className="px-4 py-2.5 text-right text-ocean-100 print:text-gray-800">
                        {sd.indices.speciesCount}
                      </td>
                      <td className="px-4 py-2.5 text-right text-ocean-100 print:text-gray-800">
                        {sd.indices.totalIndividuals}
                      </td>
                      <td className="px-4 py-2.5 text-right text-reef-300 print:text-teal-700 font-medium">
                        {sd.indices.shannonWiener}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sand-300 print:text-amber-700 font-medium">
                        {sd.indices.pielouEvenness}
                      </td>
                      <td className="px-4 py-2.5 text-right text-ocean-200 print:text-gray-700">
                        {sd.indices.margalefRichness}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {brayCurtis && brayCurtis.labels.length >= 2 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-ocean-100 print:text-gray-900 mb-4 flex items-center gap-2 border-l-4 border-reef-500 pl-3">
              三、Bray-Curtis 相似性热力图
            </h2>
            <div className="card-glass p-5 print:bg-white print:border print:border-gray-200 print:rounded-lg overflow-x-auto">
              <p className="text-xs text-ocean-400 print:text-gray-500 mb-3">
                数值越小表示两个站位群落组成越相似（0 = 完全相同，1 = 完全不同）
              </p>
              <div className="inline-block min-w-full">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-ocean-300 print:text-gray-600 font-semibold border border-ocean-700/40 print:border-gray-200 bg-ocean-800/30 print:bg-gray-50 min-w-[100px]">
                        站位
                      </th>
                      {brayCurtis.labels.map((label, i) => (
                        <th
                          key={`h-${i}`}
                          className="p-2 text-ocean-300 print:text-gray-600 font-semibold border border-ocean-700/40 print:border-gray-200 bg-ocean-800/30 print:bg-gray-50 whitespace-nowrap px-3"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {brayCurtis.matrix.map((row, i) => (
                      <tr key={`r-${i}`}>
                        <td className="p-2 text-ocean-200 print:text-gray-700 font-medium border border-ocean-700/40 print:border-gray-200 bg-ocean-800/20 print:bg-gray-50 whitespace-nowrap">
                          {brayCurtis.labels[i]}
                        </td>
                        {row.map((val, j) => (
                          <td
                            key={`c-${j}`}
                            className="p-2 text-center border border-ocean-700/40 print:border-gray-200 font-medium text-white"
                            style={{ backgroundColor: heatmapColors(val) }}
                          >
                            {val.toFixed(3)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-ocean-400 print:text-gray-500 justify-center flex-wrap">
                <span>相似</span>
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
                  <div
                    key={i}
                    className="w-8 h-4 rounded"
                    style={{ backgroundColor: heatmapColors(v) }}
                  ></div>
                ))}
                <span>不相似</span>
              </div>
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-xl font-bold text-ocean-100 print:text-gray-900 mb-4 flex items-center gap-2 border-l-4 border-reef-500 pl-3">
            四、季节物种组成
          </h2>
          {seasonStacked.species.length === 0 ? (
            <div className="card-glass p-8 text-center text-ocean-400 print:text-gray-500">
              暂无数据
            </div>
          ) : (
            <div className="card-glass p-5 print:bg-white print:border print:border-gray-200 print:rounded-lg">
              <div style={{ width: "100%", height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonStacked.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis
                      dataKey="category"
                      tickFormatter={(v) => SEASON_LABEL[v as keyof typeof SEASON_LABEL] || v}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      stroke="#64748b"
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      stroke="#64748b"
                      label={{
                        value: "个体数量",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#94a3b8",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const sp = seasonStacked.species.find(
                          (s) => s.speciesId === name
                        );
                        return [
                          value,
                          sp ? `${sp.commonName} (${sp.scientificName})` : name,
                        ];
                      }}
                      labelFormatter={(label) =>
                        SEASON_LABEL[label as keyof typeof SEASON_LABEL] || label
                      }
                      contentStyle={{
                        backgroundColor: "rgba(8,47,73,0.95)",
                        border: "1px solid rgba(14,165,233,0.3)",
                        borderRadius: "8px",
                        color: "#f0f9ff",
                      }}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const sp = seasonStacked.species.find(
                          (s) => s.speciesId === value
                        );
                        return sp ? sp.commonName : value;
                      }}
                      wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                    />
                    {seasonStacked.species.map((sp, i) => (
                      <Bar
                        key={sp.speciesId}
                        dataKey={sp.speciesId}
                        stackId="a"
                        fill={SPECIES_COLORS[i % SPECIES_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-ocean-100 print:text-gray-900 mb-4 flex items-center gap-2 border-l-4 border-reef-500 pl-3">
            五、潮带物种组成
          </h2>
          {tideStacked.species.length === 0 ? (
            <div className="card-glass p-8 text-center text-ocean-400 print:text-gray-500">
              暂无数据
            </div>
          ) : (
            <div className="card-glass p-5 print:bg-white print:border print:border-gray-200 print:rounded-lg">
              <div style={{ width: "100%", height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tideStacked.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis
                      dataKey="category"
                      tickFormatter={(v) => TIDE_LABEL[v as keyof typeof TIDE_LABEL] || v}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      stroke="#64748b"
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      stroke="#64748b"
                      label={{
                        value: "个体数量",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#94a3b8",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const sp = tideStacked.species.find(
                          (s) => s.speciesId === name
                        );
                        return [
                          value,
                          sp ? `${sp.commonName} (${sp.scientificName})` : name,
                        ];
                      }}
                      labelFormatter={(label) =>
                        TIDE_LABEL[label as keyof typeof TIDE_LABEL] || label
                      }
                      contentStyle={{
                        backgroundColor: "rgba(8,47,73,0.95)",
                        border: "1px solid rgba(14,165,233,0.3)",
                        borderRadius: "8px",
                        color: "#f0f9ff",
                      }}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const sp = tideStacked.species.find(
                          (s) => s.speciesId === value
                        );
                        return sp ? sp.commonName : value;
                      }}
                      wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                    />
                    {tideStacked.species.map((sp, i) => (
                      <Bar
                        key={sp.speciesId}
                        dataKey={sp.speciesId}
                        stackId="a"
                        fill={SPECIES_COLORS[i % SPECIES_COLORS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-ocean-100 print:text-gray-900 mb-4 flex items-center gap-2 border-l-4 border-reef-500 pl-3">
            六、主要优势种列表
          </h2>
          {dominantSpecies.length === 0 ? (
            <div className="card-glass p-8 text-center text-ocean-400 print:text-gray-500">
              暂无数据
            </div>
          ) : (
            <div className="card-glass overflow-hidden print:bg-white print:border print:border-gray-200 print:rounded-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-ocean-800/60 print:bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                        排名
                      </th>
                      <th className="text-left px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                        中文名
                      </th>
                      <th className="text-left px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                        学名
                      </th>
                      <th className="text-right px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                        总个体数
                      </th>
                      <th className="text-right px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                        最大盖度%
                      </th>
                      <th className="text-right px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                        出现频率
                      </th>
                      <th className="text-right px-4 py-3 text-ocean-200 print:text-gray-700 font-semibold">
                        相对丰度
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dominantSpecies.slice(0, 20).map((sp, idx) => (
                      <tr
                        key={sp.speciesId}
                        className={cn(
                          "border-t border-ocean-700/30 print:border-gray-200",
                          idx % 2 === 0 && "bg-ocean-900/20 print:bg-gray-50"
                        )}
                      >
                        <td className="px-4 py-2.5 text-ocean-300 print:text-gray-600 font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5 text-ocean-100 print:text-gray-800 font-medium">
                          {sp.commonName}
                        </td>
                        <td className="px-4 py-2.5 text-ocean-400 print:text-gray-500 italic">
                          {sp.scientificName}
                        </td>
                        <td className="px-4 py-2.5 text-right text-reef-300 print:text-teal-700 font-semibold">
                          {sp.totalCount}
                        </td>
                        <td className="px-4 py-2.5 text-right text-ocean-200 print:text-gray-700">
                          {sp.totalCoverage}%
                        </td>
                        <td className="px-4 py-2.5 text-right text-ocean-200 print:text-gray-700">
                          {(sp.frequency * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5 text-right text-sand-300 print:text-amber-700 font-medium">
                          {(sp.relativeAbundance * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="pt-6 border-t-2 border-ocean-700/40 print:border-gray-300">
          <p className="text-center text-xs text-ocean-400 print:text-gray-500">
            — 报告结束 —
          </p>
          <p className="text-center text-xs text-ocean-500 print:text-gray-400 mt-2">
            本报告由潮间带生物调查系统自动生成 · {formatDate(data.generatedAt)}
          </p>
        </section>
      </div>
    </div>
  );
}
