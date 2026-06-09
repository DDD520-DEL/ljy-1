import { useState } from "react";
import {
  Filter,
  X,
  Save,
  Bookmark,
  Trash2,
  Calendar,
  MapPin,
  Waves,
  Fish,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useFilterStore, type FilterCriteria } from "@/store/filterStore";
import { TIDE_LABEL, SUBSTRATE_LABEL, SEASON_LABEL } from "@/lib/diversity";
import type { TideZone, SubstrateType, Season } from "@/types";
import { cn } from "@/lib/utils";

const TIDE_ZONES: TideZone[] = ["high", "mid", "low"];
const SUBSTRATES: SubstrateType[] = [
  "rocky",
  "sandy",
  "muddy",
  "pebble",
  "cobble",
  "mixed",
];
const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

interface MultiSelectChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function MultiSelectChip({ label, active, onClick }: MultiSelectChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-h-[36px]",
        active
          ? "bg-reef-500 text-white"
          : "bg-ocean-800/50 text-ocean-300 hover:text-white hover:bg-ocean-700/50"
      )}
    >
      {label}
    </button>
  );
}

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function FilterSection({ title, icon, children }: FilterSectionProps) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="border-b border-ocean-700/30 pb-3 last:border-b-0 last:pb-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-1.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ocean-200">
          {icon}
          {title}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-ocean-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ocean-400" />
        )}
      </button>
      {expanded && <div className="mt-2">{children}</div>}
    </div>
  );
}

export default function SurveyFilter() {
  const {
    criteria,
    setCriteria,
    resetCriteria,
    savedFilters,
    saveFilter,
    deleteFilter,
    applyFilter,
    hasActiveFilters,
  } = useFilterStore();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");

  const toggleArrayValue = <T extends string>(
    key: "tideZones" | "seasons" | "substrateTypes",
    value: T
  ) => {
    const current = criteria[key] as T[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setCriteria({ [key]: next } as Partial<FilterCriteria>);
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    saveFilter(filterName.trim());
    setFilterName("");
    setShowSaveDialog(false);
  };

  const formatCriteriaSummary = (): string => {
    const parts: string[] = [];
    if (criteria.tideZones.length > 0) {
      parts.push(`潮带: ${criteria.tideZones.map((z) => TIDE_LABEL[z]).join("/")}`);
    }
    if (criteria.seasons.length > 0) {
      parts.push(`季节: ${criteria.seasons.map((s) => SEASON_LABEL[s]).join("/")}`);
    }
    if (criteria.substrateTypes.length > 0) {
      parts.push(`底质: ${criteria.substrateTypes.map((s) => SUBSTRATE_LABEL[s]).join("/")}`);
    }
    if (criteria.dateStart || criteria.dateEnd) {
      parts.push(`日期: ${criteria.dateStart || "..."} ~ ${criteria.dateEnd || "..."}`);
    }
    if (criteria.stationName) {
      parts.push(`站位: ${criteria.stationName}`);
    }
    return parts.join(" | ");
  };

  return (
    <div className="card-glass p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="section-title mb-0 text-base">
          <Filter className="w-5 h-5 text-reef-400" />
          数据筛选
          {hasActiveFilters() && (
            <span className="ml-2 text-xs font-normal text-reef-300 bg-reef-500/20 px-2 py-0.5 rounded-full">
              已筛选
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {savedFilters.length > 0 && (
            <div className="relative group">
              <button className="btn-ghost text-sm py-1.5 px-3 min-h-[36px]">
                <Bookmark className="w-4 h-4" />
                常用筛选器 ({savedFilters.length})
              </button>
              <div className="absolute right-0 top-full mt-1 w-64 bg-ocean-900 border border-ocean-700/50 rounded-xl shadow-2xl z-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="p-2 max-h-64 overflow-y-auto">
                  {savedFilters.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-1 p-2 rounded-lg hover:bg-ocean-800/50"
                    >
                      <button
                        onClick={() => applyFilter(f.id)}
                        className="flex-1 text-left text-sm text-ocean-200 truncate"
                        title={Object.entries(f.criteria)
                          .filter(([, v]) =>
                            Array.isArray(v) ? v.length > 0 : v
                          )
                          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(",") : v}`)
                          .join("; ")}
                      >
                        {f.name}
                      </button>
                      <button
                        onClick={() => deleteFilter(f.id)}
                        className="p-1 text-ocean-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasActiveFilters()}
            className="btn-ghost text-sm py-1.5 px-3 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存筛选
          </button>
          <button
            onClick={resetCriteria}
            disabled={!hasActiveFilters()}
            className="btn-ghost text-sm py-1.5 px-3 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            重置
          </button>
        </div>
      </div>

      {hasActiveFilters() && (
        <div className="text-xs text-ocean-300 bg-ocean-800/30 px-3 py-2 rounded-lg">
          {formatCriteriaSummary()}
        </div>
      )}

      <div className="space-y-3">
        <FilterSection title="潮带" icon={<Waves className="w-4 h-4 text-tide-mid" />}>
          <div className="flex flex-wrap gap-1.5">
            {TIDE_ZONES.map((zone) => (
              <MultiSelectChip
                key={zone}
                label={TIDE_LABEL[zone]}
                active={criteria.tideZones.includes(zone)}
                onClick={() => toggleArrayValue("tideZones", zone)}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection title="季节" icon={<Calendar className="w-4 h-4 text-sand-300" />}>
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((season) => (
              <MultiSelectChip
                key={season}
                label={SEASON_LABEL[season]}
                active={criteria.seasons.includes(season)}
                onClick={() => toggleArrayValue("seasons", season)}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection title="底质类型" icon={<Fish className="w-4 h-4 text-reef-300" />}>
          <div className="flex flex-wrap gap-1.5">
            {SUBSTRATES.map((sub) => (
              <MultiSelectChip
                key={sub}
                label={SUBSTRATE_LABEL[sub]}
                active={criteria.substrateTypes.includes(sub)}
                onClick={() => toggleArrayValue("substrateTypes", sub)}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection title="日期范围" icon={<Calendar className="w-4 h-4 text-ocean-300" />}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={criteria.dateStart || ""}
              onChange={(e) =>
                setCriteria({ dateStart: e.target.value || null })
              }
              className="bg-ocean-800/50 border border-ocean-700/40 rounded-lg px-3 py-1.5 text-sm text-ocean-100 focus:outline-none focus:ring-2 focus:ring-reef-500 min-h-[36px]"
            />
            <span className="text-ocean-400">~</span>
            <input
              type="date"
              value={criteria.dateEnd || ""}
              onChange={(e) =>
                setCriteria({ dateEnd: e.target.value || null })
              }
              className="bg-ocean-800/50 border border-ocean-700/40 rounded-lg px-3 py-1.5 text-sm text-ocean-100 focus:outline-none focus:ring-2 focus:ring-reef-500 min-h-[36px]"
            />
          </div>
        </FilterSection>

        <FilterSection title="站位名称" icon={<MapPin className="w-4 h-4 text-red-300" />}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
            <input
              type="text"
              value={criteria.stationName}
              onChange={(e) => setCriteria({ stationName: e.target.value })}
              placeholder="搜索站位名称..."
              className="w-full bg-ocean-800/50 border border-ocean-700/40 rounded-lg pl-9 pr-3 py-1.5 text-sm text-ocean-100 placeholder:text-ocean-500 focus:outline-none focus:ring-2 focus:ring-reef-500 min-h-[36px]"
            />
          </div>
        </FilterSection>
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass p-5 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-ocean-100 mb-3">保存筛选器</h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="输入筛选器名称..."
              autoFocus
              className="w-full bg-ocean-800/50 border border-ocean-700/40 rounded-lg px-3 py-2 text-ocean-100 placeholder:text-ocean-500 focus:outline-none focus:ring-2 focus:ring-reef-500 mb-4"
              onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setFilterName("");
                }}
                className="btn-ghost text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
