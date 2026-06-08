export type DashboardCardType =
  | "surveyTrend"
  | "tideSpeciesBar"
  | "recentSurvey"
  | "speciesAbundance"
  | "envGauge";

export interface DashboardCard {
  id: string;
  type: DashboardCardType;
}

export const DASHBOARD_STORAGE_KEY = "intertidal-dashboard-layout";

export const DEFAULT_CARDS: DashboardCard[] = [
  { id: "card-1", type: "surveyTrend" },
  { id: "card-2", type: "tideSpeciesBar" },
  { id: "card-3", type: "recentSurvey" },
  { id: "card-4", type: "speciesAbundance" },
  { id: "card-5", type: "envGauge" },
];

export const CARD_META: Record<
  DashboardCardType,
  { label: string; description: string; defaultCols: number }
> = {
  surveyTrend: {
    label: "调查记录数趋势图",
    description: "显示调查记录数随时间的变化趋势",
    defaultCols: 1,
  },
  tideSpeciesBar: {
    label: "各潮带物种数对比柱状图",
    description: "对比高潮带、中潮带、低潮带的物种数量",
    defaultCols: 1,
  },
  recentSurvey: {
    label: "最近调查摘要",
    description: "显示最近一次调查的关键信息摘要",
    defaultCols: 1,
  },
  speciesAbundance: {
    label: "物种丰度排行榜",
    description: "显示物种数量排名前 N 的物种",
    defaultCols: 1,
  },
  envGauge: {
    label: "环境因子仪表盘",
    description: "显示水温、盐度、pH、溶解氧等环境参数",
    defaultCols: 1,
  },
};

export function loadDashboardLayout(): DashboardCard[] {
  try {
    const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) return DEFAULT_CARDS;
    const parsed = JSON.parse(raw) as DashboardCard[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CARDS;
    return parsed;
  } catch {
    return DEFAULT_CARDS;
  }
}

export function saveDashboardLayout(cards: DashboardCard[]): void {
  try {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // ignore
  }
}
