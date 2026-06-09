import { useState, useMemo } from "react";
import {
  Shell,
  Plus,
  Waves,
  Fish,
  Activity,
  Menu,
  X,
  RefreshCw,
  BookOpen,
  Filter,
} from "lucide-react";
import { useSurveyStore } from "@/store/surveyStore";
import { useFilterStore } from "@/store/filterStore";
import SurveyForm from "@/components/SurveyForm";
import SurveyList from "@/components/SurveyList";
import SurveyFilter from "@/components/SurveyFilter";
import DiversityIndices from "@/components/DiversityIndices";
import StationMap from "@/components/StationMap";
import CommunityCharts from "@/components/CommunityCharts";
import ExportPanel from "@/components/ExportPanel";
import SyncPanel from "@/components/SyncPanel";
import SyncStatus from "@/components/SyncStatus";
import CustomizableDashboard from "@/components/CustomizableDashboard";
import SpeciesAtlas from "@/components/SpeciesAtlas";
import type { SurveyRecord } from "@/types";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "surveys" | "analysis" | "map" | "export" | "sync" | "atlas";

export default function Home() {
  const allSurveys = useSurveyStore((s) => s.getActiveSurveys());
  const filterSurveys = useFilterStore((s) => s.filterSurveys);
  const hasActiveFilters = useFilterStore((s) => s.hasActiveFilters);
  const resetCriteria = useFilterStore((s) => s.resetCriteria);

  const filteredSurveys = useMemo(
    () => filterSurveys(allSurveys),
    [allSurveys, filterSurveys]
  );

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SurveyRecord | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showAtlas, setShowAtlas] = useState(false);

  const handleEdit = (s: SurveyRecord) => {
    setEditing(s);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const allSpecies = useMemo(() => {
    const merged = new Map<string, { count: number; coverage: number; name: string; sci: string }>();
    for (const s of filteredSurveys) {
      for (const sp of s.species) {
        const existing = merged.get(sp.speciesId);
        if (existing) {
          existing.count += sp.count;
          existing.coverage = Math.max(existing.coverage, sp.coverage);
        } else {
          merged.set(sp.speciesId, {
            count: sp.count,
            coverage: sp.coverage,
            name: sp.commonName,
            sci: sp.scientificName,
          });
        }
      }
    }
    return Array.from(merged.values()).filter((v) => v.count > 0);
  }, [filteredSurveys]);

  const stats = useMemo(() => {
    const stations = new Set(
      filteredSurveys.map(
        (s) => `${s.location.lat.toFixed(4)},${s.location.lng.toFixed(4)}`
      )
    ).size;
    const totalIndividuals = allSpecies.reduce((sum, v) => sum + v.count, 0);
    return {
      surveyCount: filteredSurveys.length,
      stations,
      speciesCount: allSpecies.length,
      totalIndividuals,
    };
  }, [filteredSurveys, allSpecies]);

  const totalStats = useMemo(() => {
    const totalStations = new Set(
      allSurveys.map(
        (s) => `${s.location.lat.toFixed(4)},${s.location.lng.toFixed(4)}`
      )
    ).size;
    return {
      surveyCount: allSurveys.length,
      stations: totalStations,
    };
  }, [allSurveys]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "总览", icon: <Activity className="w-4 h-4" /> },
    { key: "surveys", label: "记录", icon: <Fish className="w-4 h-4" /> },
    { key: "map", label: "地图", icon: <Waves className="w-4 h-4" /> },
    { key: "analysis", label: "分析", icon: <Shell className="w-4 h-4" /> },
    { key: "atlas", label: "图鉴", icon: <BookOpen className="w-4 h-4" /> },
    { key: "export", label: "导出", icon: <Menu className="w-4 h-4" /> },
    { key: "sync", label: "同步", icon: <RefreshCw className="w-4 h-4" /> },
  ];

  const FilterNotice = () => {
    if (!hasActiveFilters()) return null;
    return (
      <div className="card-glass px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4 text-reef-400" />
          <span className="text-ocean-300">
            当前筛选范围：
            <span className="text-reef-300 font-semibold">{filteredSurveys.length}</span>
            <span className="text-ocean-400"> / {totalStats.surveyCount} 条记录</span>
          </span>
        </div>
        <button
          onClick={resetCriteria}
          className="text-xs text-ocean-300 hover:text-white underline"
        >
          清除筛选
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-30 bg-ocean-950/80 backdrop-blur-xl border-b border-ocean-700/40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-400 to-reef-400 flex items-center justify-center shadow-lg">
              <Shell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-ocean-50 text-lg leading-tight">
                潮间带生物调查
              </h1>
              <p className="text-xs text-ocean-400 leading-tight">
                多样性分析系统
              </p>
            </div>
            {hasActiveFilters() && (
              <span className="ml-2 text-xs bg-reef-500/20 text-reef-300 px-2 py-0.5 rounded-full border border-reef-500/30">
                已筛选
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "px-4 py-2 rounded-xl font-medium transition-all min-h-[44px] flex items-center gap-2",
                  activeTab === t.key
                    ? "bg-ocean-500 text-white shadow-lg"
                    : "text-ocean-300 hover:text-white hover:bg-ocean-800/50"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <SyncStatus onClick={() => setShowSync(true)} />
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="btn-primary py-2 px-4 min-h-[44px]"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">新建调查</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-ocean-800/50 text-ocean-200"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-ocean-700/40 p-2 space-y-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2",
                  activeTab === t.key
                    ? "bg-ocean-500 text-white"
                    : "text-ocean-300 hover:bg-ocean-800/50"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        {activeTab === "overview" && (
          <>
            <FilterNotice />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card">
                <div className="text-3xl font-bold text-ocean-300">
                  {stats.surveyCount}
                  {hasActiveFilters() && totalStats.surveyCount !== stats.surveyCount && (
                    <span className="text-sm font-normal text-ocean-500 ml-1">
                      / {totalStats.surveyCount}
                    </span>
                  )}
                </div>
                <div className="stat-label">调查记录</div>
              </div>
              <div className="stat-card">
                <div className="text-3xl font-bold text-reef-300">
                  {stats.stations}
                </div>
                <div className="stat-label">调查站位</div>
              </div>
              <div className="stat-card">
                <div className="text-3xl font-bold text-sand-300">
                  {stats.speciesCount}
                </div>
                <div className="stat-label">累计物种</div>
              </div>
              <div className="stat-card">
                <div className="text-3xl font-bold text-purple-300">
                  {stats.totalIndividuals}
                </div>
                <div className="stat-label">累计个体</div>
              </div>
            </div>

            <CustomizableDashboard surveys={filteredSurveys} />

            <StationMap surveys={filteredSurveys} />
          </>
        )}

        {activeTab === "surveys" && (
          <SurveyList surveys={filteredSurveys} onEdit={handleEdit} />
        )}

        {activeTab === "map" && (
          <>
            <FilterNotice />
            <StationMap surveys={filteredSurveys} />
          </>
        )}

        {activeTab === "analysis" && (
          <div className="space-y-5">
            <FilterNotice />
            <CommunityCharts surveys={filteredSurveys} />
            {filteredSurveys.length > 0 && (
              <div className="grid md:grid-cols-2 gap-5">
                {filteredSurveys.slice(0, 6).map((s) => (
                  <div key={s.id} className="card-glass p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-ocean-100">
                        {s.stationName}
                      </h4>
                      <span className="text-xs text-ocean-400">{s.date}</span>
                    </div>
                    <DiversityIndices species={s.species} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "export" && (
          <>
            <FilterNotice />
            <ExportPanel surveys={filteredSurveys} />
          </>
        )}

        {activeTab === "atlas" && (
          <div className="card-glass p-5">
            <h3 className="section-title">
              <BookOpen className="w-6 h-6 text-reef-400" />
              物种图鉴
            </h3>
            <p className="text-sm text-ocean-300 mb-4">
              浏览潮间带生物图鉴，查看详细描述、栖息环境、鉴别特征。支持选择两个物种进行形态对比，高亮差异项。可通过导入 JSON 补丁包更新图鉴数据。
            </p>
            <button
              onClick={() => setShowAtlas(true)}
              className="btn-primary w-full py-4 text-base"
            >
              <BookOpen className="w-5 h-5" />
              打开物种图鉴
            </button>
          </div>
        )}

        {activeTab === "sync" && (
          <div className="card-glass p-5">
            <h3 className="section-title">
              <RefreshCw className="w-6 h-6 text-reef-400" />
              离线数据同步
            </h3>
            <p className="text-sm text-ocean-300 mb-4">
              在不同设备间同步调查数据。支持通过二维码、文件或蓝牙分享同步包，接收端自动合并，冲突时可逐条选择保留版本。
            </p>
            <button
              onClick={() => setShowSync(true)}
              className="btn-primary w-full py-4 text-base"
            >
              <RefreshCw className="w-5 h-5" />
              打开同步面板
            </button>
          </div>
        )}
      </main>

      <div className="fixed bottom-4 left-0 right-0 md:hidden z-20 px-4">
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary w-full shadow-2xl"
        >
          <Plus className="w-6 h-6" />
          新建调查记录
        </button>
      </div>

      {showForm && <SurveyForm onClose={handleCloseForm} editing={editing} />}
      {showSync && <SyncPanel onClose={() => setShowSync(false)} />}
      {showAtlas && <SpeciesAtlas onClose={() => setShowAtlas(false)} />}
    </div>
  );
}
