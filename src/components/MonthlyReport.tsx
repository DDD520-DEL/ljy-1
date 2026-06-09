import { useState, useMemo, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Fish,
  Users,
  Waves,
  Calendar,
} from "lucide-react";
import type { SurveyRecord, TideZone } from "@/types";
import { TIDE_LABEL } from "@/lib/diversity";
import { cn } from "@/lib/utils";

interface MonthData {
  monthKey: string;
  label: string;
  surveyCount: number;
  speciesCount: number;
  totalIndividuals: number;
  tideZoneCounts: Record<TideZone, number>;
}

function aggregateMonthlyData(surveys: SurveyRecord[]): MonthData[] {
  const monthMap = new Map<
    string,
    {
      surveys: SurveyRecord[];
      speciesIds: Set<string>;
      totalIndividuals: number;
      tideZoneCounts: Record<TideZone, number>;
    }
  >();

  for (const s of surveys) {
    const monthKey = s.date.slice(0, 7);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        surveys: [],
        speciesIds: new Set(),
        totalIndividuals: 0,
        tideZoneCounts: { high: 0, mid: 0, low: 0 },
      });
    }
    const entry = monthMap.get(monthKey)!;
    entry.surveys.push(s);
    entry.tideZoneCounts[s.tideZone] = (entry.tideZoneCounts[s.tideZone] || 0) + 1;
    for (const sp of s.species) {
      if (sp.count > 0) {
        entry.speciesIds.add(sp.speciesId);
        entry.totalIndividuals += sp.count;
      }
    }
  }

  const result: MonthData[] = [];
  for (const [key, val] of monthMap.entries()) {
    const [year, month] = key.split("-");
    result.push({
      monthKey: key,
      label: `${year}年${Number(month)}月`,
      surveyCount: val.surveys.length,
      speciesCount: val.speciesIds.size,
      totalIndividuals: val.totalIndividuals,
      tideZoneCounts: val.tideZoneCounts,
    });
  }

  result.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  return result;
}

const TIDE_COLORS: Record<TideZone, { bar: string; text: string; bg: string }> = {
  high: {
    bar: "bg-gradient-to-r from-amber-500 to-yellow-400",
    text: "text-amber-300",
    bg: "bg-amber-500/20",
  },
  mid: {
    bar: "bg-gradient-to-r from-ocean-500 to-cyan-400",
    text: "text-ocean-300",
    bg: "bg-ocean-500/20",
  },
  low: {
    bar: "bg-gradient-to-r from-purple-500 to-fuchsia-400",
    text: "text-purple-300",
    bg: "bg-purple-500/20",
  },
};

interface MonthlyReportProps {
  surveys: SurveyRecord[];
  compact?: boolean;
}

export default function MonthlyReport({ surveys, compact = false }: MonthlyReportProps) {
  const monthlyData = useMemo(() => aggregateMonthlyData(surveys), [surveys]);
  const [currentIndex, setCurrentIndex] = useState(monthlyData.length - 1);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (monthlyData.length > 0 && (currentIndex < 0 || currentIndex >= monthlyData.length)) {
      setCurrentIndex(monthlyData.length - 1);
    }
  }, [monthlyData.length, currentIndex]);

  const safeIndex =
    monthlyData.length > 0 && currentIndex >= 0 && currentIndex < monthlyData.length
      ? currentIndex
      : monthlyData.length - 1;
  const currentMonth = monthlyData[safeIndex];
  const hasData = monthlyData.length > 0;

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  const handleNext = () => {
    if (safeIndex < monthlyData.length - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diff = touchStartX.current - touchEndX.current;
      const threshold = 50;
      if (diff > threshold) {
        handleNext();
      } else if (diff < -threshold) {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-ocean-400">
        <Calendar className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm">暂无月度调查数据</p>
      </div>
    );
  }

  const tideTotal =
    currentMonth.tideZoneCounts.high +
    currentMonth.tideZoneCounts.mid +
    currentMonth.tideZoneCounts.low;

  return (
    <div
      ref={containerRef}
      className="select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrev}
          disabled={safeIndex === 0}
          className={cn(
            "p-2 rounded-xl transition-all",
            safeIndex === 0
              ? "text-ocean-600 cursor-not-allowed"
              : "text-ocean-300 hover:text-white hover:bg-ocean-700/50"
          )}
          aria-label="上一个月"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-reef-400" />
          <span className="font-bold text-ocean-100 text-lg">
            {currentMonth.label}
          </span>
          <span className="text-xs text-ocean-400">
            ({safeIndex + 1}/{monthlyData.length})
          </span>
        </div>

        <button
          onClick={handleNext}
          disabled={safeIndex === monthlyData.length - 1}
          className={cn(
            "p-2 rounded-xl transition-all",
            safeIndex === monthlyData.length - 1
              ? "text-ocean-600 cursor-not-allowed"
              : "text-ocean-300 hover:text-white hover:bg-ocean-700/50"
          )}
          aria-label="下一个月"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div
        className={cn(
          "grid gap-3 mb-4",
          compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"
        )}
      >
        <div className={cn("stat-card", compact && "!p-3")}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ClipboardList className="w-4 h-4 text-ocean-400" />
            <span className="text-xs text-ocean-400">调查总次数</span>
          </div>
          <div
            className={cn(
              "font-bold text-ocean-300",
              compact ? "text-2xl" : "text-3xl"
            )}
          >
            {currentMonth.surveyCount}
          </div>
        </div>

        <div className={cn("stat-card", compact && "!p-3")}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Fish className="w-4 h-4 text-reef-400" />
            <span className="text-xs text-ocean-400">累计物种数</span>
          </div>
          <div
            className={cn(
              "font-bold text-reef-300",
              compact ? "text-2xl" : "text-3xl"
            )}
          >
            {currentMonth.speciesCount}
          </div>
        </div>

        <div className={cn("stat-card", compact && "!p-3")}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="w-4 h-4 text-sand-400" />
            <span className="text-xs text-ocean-400">个体总数</span>
          </div>
          <div
            className={cn(
              "font-bold text-sand-300",
              compact ? "text-2xl" : "text-3xl"
            )}
          >
            {currentMonth.totalIndividuals.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-reef-400" />
          <span className="text-sm font-medium text-ocean-200">各潮带调查占比</span>
        </div>

        {(["high", "mid", "low"] as TideZone[]).map((zone) => {
          const count = currentMonth.tideZoneCounts[zone];
          const pct = tideTotal > 0 ? (count / tideTotal) * 100 : 0;
          const colors = TIDE_COLORS[zone];
          return (
            <div key={zone} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ocean-200">{TIDE_LABEL[zone]}</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold", colors.text)}>
                    {count} 次
                  </span>
                  <span className="text-xs text-ocean-400 w-12 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-ocean-900/60 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {monthlyData.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {monthlyData.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === safeIndex
                  ? "bg-reef-400 w-6"
                  : "bg-ocean-600 hover:bg-ocean-500"
              )}
              aria-label={`跳转到第 ${i + 1} 个月`}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-ocean-500 mt-3">
        ← 左右滑动切换月份 →
      </p>
    </div>
  );
}
