import { useState, useCallback } from "react";
import {
  FileText,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { SurveyRecord } from "@/types";
import { generateReportData, type ReportData } from "@/lib/report";
import ReportPreview from "./ReportPreview";

interface ReportPanelProps {
  surveys: SurveyRecord[];
  compact?: boolean;
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

export default function ReportPanel({
  surveys,
  compact = false,
}: ReportPanelProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerateReport = useCallback(async () => {
    if (surveys.length === 0) return;
    setGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const data = generateReportData(surveys);
      setReportData(data);
      setShowPreview(true);
    } catch (err) {
      console.error("Report generation failed:", err);
      alert("报告生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }, [surveys]);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const handleExportCsv = useCallback(() => {
    if (!reportData) return;
    const timestamp = Date.now();
    downloadFile(
      reportData.rawCsv,
      `survey-raw-data-${timestamp}.csv`,
      "text/csv;charset=utf-8"
    );
  }, [reportData]);

  const handleExportPdfAndCsv = useCallback(async () => {
    if (!reportData) return;

    const timestamp = Date.now();

    downloadFile(
      reportData.rawCsv,
      `survey-appendix-raw-data-${timestamp}.csv`,
      "text/csv;charset=utf-8"
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    window.print();
  }, [reportData]);

  if (compact) {
    return (
      <>
        <button
          onClick={handleGenerateReport}
          disabled={surveys.length === 0 || generating}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          {generating ? (
            <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
          ) : (
            <FileText className="w-5 h-5 flex-shrink-0" />
          )}
          <div className="text-left">
            <div className="font-semibold">生成统计报告</div>
            <div className="text-xs font-normal opacity-80">
              一键生成 HTML 报告，支持导出 PDF
            </div>
          </div>
        </button>

        {showPreview && reportData && (
          <ReportPreview
            data={reportData}
            onClose={handleClosePreview}
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdfAndCsv}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="card-glass p-5">
        <h3 className="section-title">
          <FileText className="w-6 h-6 text-reef-400" />
          调查数据统计报告
        </h3>

        <p className="text-sm text-ocean-300 mb-5">
          基于选定的调查记录，一键生成包含调查概况、多样性指数、群落相似性、物种组成和优势种的完整分析报告。
          报告支持 HTML 预览、PDF 导出，并自动附加原始数据 CSV 作为附录。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="card-glass p-4 bg-ocean-900/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-ocean-300" />
              <span className="font-semibold text-ocean-100">报告内容</span>
            </div>
            <ul className="text-sm text-ocean-300 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-reef-400 flex-shrink-0" />
                调查概况摘要（数量、时间、站位等）
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-reef-400 flex-shrink-0" />
                各站位多样性指数对比表
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-reef-400 flex-shrink-0" />
                Bray-Curtis 相似性热力图
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-reef-400 flex-shrink-0" />
                季节物种组成堆叠柱状图
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-reef-400 flex-shrink-0" />
                潮带物种组成堆叠柱状图
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-reef-400 flex-shrink-0" />
                主要优势种列表
              </li>
            </ul>
          </div>

          <div className="card-glass p-4 bg-ocean-900/30">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="w-5 h-5 text-ocean-300" />
              <span className="font-semibold text-ocean-100">导出格式</span>
            </div>
            <ul className="text-sm text-ocean-300 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-reef-400 flex-shrink-0" />
                HTML 页面实时预览
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-reef-400 flex-shrink-0" />
                PDF 格式导出（通过浏览器打印）
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-reef-400 flex-shrink-0" />
                CSV 原始数据附录（自动下载）
              </li>
            </ul>
          </div>
        </div>

        {surveys.length === 0 ? (
          <div className="card-glass p-6 bg-ocean-900/30 text-center">
            <FileText className="w-10 h-10 mx-auto mb-2 text-ocean-500 opacity-40" />
            <p className="text-ocean-400 text-sm">
              暂无调查记录，无法生成报告
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 card-glass p-4 bg-reef-900/20 border-reef-500/30">
            <div className="text-sm text-ocean-300">
              当前共有 <span className="font-bold text-reef-300 text-base">{surveys.length}</span> 条调查记录将用于生成报告
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {generating ? "正在生成..." : "一键生成报告"}
            </button>
          </div>
        )}
      </div>

      {showPreview && reportData && (
        <ReportPreview
          data={reportData}
          onClose={handleClosePreview}
          onExportCsv={handleExportCsv}
          onExportPdf={handleExportPdfAndCsv}
        />
      )}
    </>
  );
}
