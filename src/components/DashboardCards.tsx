import { useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  FileText,
  Trophy,
  Gauge,
  Thermometer,
  Droplets,
  FlaskConical,
  Wind,
  CloudSun,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SurveyRecord, WeatherCondition } from "@/types";
import { TIDE_LABEL, calcDiversityIndices } from "@/lib/diversity";
import { cn } from "@/lib/utils";

const WEATHER_LABEL: Record<WeatherCondition, string> = {
  sunny: "晴天",
  cloudy: "多云",
  rainy: "雨天",
  foggy: "雾天",
  stormy: "暴风雨",
};

interface CardProps {
  surveys: SurveyRecord[];
}

function EmptyState({ message, icon: Icon }: { message: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-ocean-400">
      <Icon className="w-10 h-10 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function SurveyTrendCard({ surveys }: CardProps) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of surveys) {
      const date = s.date.slice(0, 7);
      map.set(date, (map.get(date) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [surveys]);

  if (surveys.length === 0) {
    return <EmptyState message="暂无调查记录数据" icon={TrendingUp} />;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.15)" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(8,47,73,0.95)",
              border: "1px solid rgba(14,165,233,0.3)",
              borderRadius: "12px",
              color: "#f0f9ff",
            }}
            labelStyle={{ color: "#f0f9ff" }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#14b8a6"
            strokeWidth={3}
            dot={{ fill: "#14b8a6", stroke: "white", strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, fill: "#f59e0b" }}
            name="调查数"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TideSpeciesBarCard({ surveys }: CardProps) {
  const data = useMemo(() => {
    const result: { zone: string; 物种数: number; 个体数: number }[] = [];
    for (const tz of ["high", "mid", "low"] as const) {
      const tzSurveys = surveys.filter((s) => s.tideZone === tz);
      const speciesSet = new Set<string>();
      let individuals = 0;
      for (const s of tzSurveys) {
        for (const sp of s.species) {
          if (sp.count > 0) {
            speciesSet.add(sp.speciesId);
            individuals += sp.count;
          }
        }
      }
      result.push({
        zone: TIDE_LABEL[tz],
        物种数: speciesSet.size,
        个体数: individuals,
      });
    }
    return result;
  }, [surveys]);

  if (surveys.length === 0) {
    return <EmptyState message="暂无调查记录数据" icon={BarChart3} />;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.15)" />
          <XAxis dataKey="zone" stroke="#94a3b8" fontSize={12} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(8,47,73,0.95)",
              border: "1px solid rgba(14,165,233,0.3)",
              borderRadius: "12px",
              color: "#f0f9ff",
            }}
          />
          <Legend wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }} />
          <Bar dataKey="物种数" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
          <Bar dataKey="个体数" fill="#f59e0b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RecentSurveyCard({ surveys }: CardProps) {
  const latest = useMemo(() => {
    if (surveys.length === 0) return null;
    return [...surveys].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }, [surveys]);

  if (!latest) {
    return <EmptyState message="暂无调查记录" icon={FileText} />;
  }

  const indices = calcDiversityIndices(latest.species);

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-ocean-100 text-lg">{latest.stationName}</div>
          <div className="text-sm text-ocean-400">{latest.date} · {TIDE_LABEL[latest.tideZone]}</div>
        </div>
        <span className="chip">{latest.quadratSize}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="stat-card !p-3">
          <div className="text-xl font-bold text-ocean-300">{indices.speciesCount}</div>
          <div className="text-xs text-ocean-400">物种数</div>
        </div>
        <div className="stat-card !p-3">
          <div className="text-xl font-bold text-reef-300">{indices.totalIndividuals}</div>
          <div className="text-xs text-ocean-400">个体数</div>
        </div>
        <div className="stat-card !p-3">
          <div className="text-xl font-bold text-sand-300">{indices.shannonWiener.toFixed(2)}</div>
          <div className="text-xs text-ocean-400">H' 指数</div>
        </div>
      </div>

      {latest.notes && (
        <div className="text-sm text-ocean-300 bg-ocean-800/30 rounded-xl p-3">
          <span className="text-ocean-400">备注：</span>{latest.notes}
        </div>
      )}
    </div>
  );
}

export function SpeciesAbundanceCard({ surveys }: CardProps) {
  const ranking = useMemo(() => {
    const map = new Map<string, { name: string; count: number; sci: string }>();
    for (const s of surveys) {
      for (const sp of s.species) {
        if (sp.count <= 0) continue;
        const existing = map.get(sp.speciesId);
        if (existing) {
          existing.count += sp.count;
        } else {
          map.set(sp.speciesId, {
            name: sp.commonName,
            sci: sp.scientificName,
            count: sp.count,
          });
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [surveys]);

  if (ranking.length === 0) {
    return <EmptyState message="暂无物种数据" icon={Trophy} />;
  }

  const maxCount = ranking[0]?.count || 1;
  const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];

  return (
    <div className="space-y-2 py-1">
      {ranking.map((item, i) => {
        const pct = (item.count / maxCount) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                i < 3 ? medalColors[i] : "text-ocean-400",
                i < 3 ? "bg-ocean-800/50" : "bg-ocean-900/50"
              )}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-ocean-100 truncate" title={item.sci}>
                  {item.name}
                </span>
                <span className="text-sm font-semibold text-reef-300 ml-2">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-ocean-900/60 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    i === 0
                      ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                      : i === 1
                      ? "bg-gradient-to-r from-gray-400 to-gray-300"
                      : i === 2
                      ? "bg-gradient-to-r from-amber-600 to-amber-500"
                      : "bg-gradient-to-r from-ocean-500 to-reef-400"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface GaugeSegmentProps {
  label: string;
  value: number | undefined;
  unit: string;
  min: number;
  max: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  decimals?: number;
}

function GaugeSegment({
  label,
  value,
  unit,
  min,
  max,
  color,
  icon: Icon,
  decimals = 1,
}: GaugeSegmentProps) {
  const pct =
    value === undefined
      ? 0
      : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="stat-card !p-3">
      <div className="flex items-center justify-center gap-1 mb-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-ocean-300">{label}</span>
      </div>
      {value !== undefined ? (
        <>
          <div className={cn("text-xl font-bold", color)}>
            {value.toFixed(decimals)}
            <span className="text-xs font-normal text-ocean-400 ml-1">{unit}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-ocean-900/60 overflow-hidden">
            <div
              className={cn("h-full rounded-full", color.replace("text-", "bg-"))}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : (
        <div className="text-sm text-ocean-500">未测量</div>
      )}
    </div>
  );
}

export function EnvGaugeCard({ surveys }: CardProps) {
  const latest = useMemo(() => {
    if (surveys.length === 0) return null;
    return [...surveys].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }, [surveys]);

  if (!latest || !latest.envFactors) {
    return <EmptyState message="暂无环境因子数据" icon={Gauge} />;
  }

  const env = latest.envFactors;

  return (
    <div className="space-y-3 py-1">
      <div className="text-center text-sm text-ocean-400 mb-2">
        {latest.stationName} · {latest.date}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <GaugeSegment
          label="水温"
          value={env.waterTemp}
          unit="°C"
          min={0}
          max={40}
          color="text-red-400"
          icon={Thermometer}
        />
        <GaugeSegment
          label="盐度"
          value={env.salinity}
          unit="‰"
          min={0}
          max={40}
          color="text-ocean-400"
          icon={Droplets}
        />
        <GaugeSegment
          label="pH"
          value={env.ph}
          unit=""
          min={5}
          max={10}
          color="text-purple-400"
          icon={FlaskConical}
          decimals={2}
        />
        <GaugeSegment
          label="溶解氧"
          value={env.dissolvedOxygen}
          unit="mg/L"
          min={0}
          max={15}
          color="text-cyan-400"
          icon={Wind}
        />
      </div>
      {env.weather && (
        <div className="flex items-center justify-center gap-2 py-2">
          <CloudSun className="w-5 h-5 text-yellow-400" />
          <span className="text-sm text-ocean-200">
            天气：{WEATHER_LABEL[env.weather]}
          </span>
        </div>
      )}
    </div>
  );
}
