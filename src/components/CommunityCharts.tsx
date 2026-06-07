import { useState, useMemo } from "react";
import { GitBranch, ScatterChart, Filter } from "lucide-react";
import type { SurveyRecord, TideZone } from "@/types";
import {
  calcBrayCurtisMatrix,
  pcoa,
  hclust,
  layoutDendrogram,
  getSeason,
  SEASON_LABEL,
  TIDE_LABEL,
} from "@/lib/diversity";
import { cn } from "@/lib/utils";

interface CommunityChartsProps {
  surveys: SurveyRecord[];
}

type ChartMode = "pcoa" | "dendrogram";

const tideColor = (zone: string) => {
  if (zone === "high") return "#0ea5e9";
  if (zone === "mid") return "#14b8a6";
  return "#f59e0b";
};

const seasonColor = (s: string) => {
  if (s === "spring") return "#22c55e";
  if (s === "summer") return "#f97316";
  if (s === "autumn") return "#dc2626";
  return "#6366f1";
};

export default function CommunityCharts({ surveys }: CommunityChartsProps) {
  const [mode, setMode] = useState<ChartMode>("pcoa");
  const [colorBy, setColorBy] = useState<"tide" | "season">("tide");

  const data = useMemo(() => {
    if (surveys.length < 2) return null;
    const bc = calcBrayCurtisMatrix(surveys);
    const coords = pcoa(bc.matrix);
    const clusterRoot = hclust(bc.matrix, bc.labels);
    const dendro = layoutDendrogram(clusterRoot);
    return { bc, coords, clusterRoot, dendro };
  }, [surveys]);

  if (surveys.length < 2) {
    return (
      <div className="card-glass p-8 text-center text-ocean-400">
        <ScatterChart className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>至少需要2个调查记录进行群落结构分析</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="card-glass p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="section-title mb-0">
          <GitBranch className="w-6 h-6 text-reef-400" />
          群落结构对比分析
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-ocean-800/50 rounded-xl p-1">
            <button
              onClick={() => setMode("pcoa")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all min-h-[40px]",
                mode === "pcoa"
                  ? "bg-ocean-500 text-white"
                  : "text-ocean-300 hover:text-white"
              )}
            >
              <ScatterChart className="w-4 h-4 inline mr-1" />
              PCoA 排序图
            </button>
            <button
              onClick={() => setMode("dendrogram")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all min-h-[40px]",
                mode === "dendrogram"
                  ? "bg-ocean-500 text-white"
                  : "text-ocean-300 hover:text-white"
              )}
            >
              <GitBranch className="w-4 h-4 inline mr-1" />
              聚类树状图
            </button>
          </div>

          {mode === "pcoa" && (
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-ocean-400" />
              <div className="flex bg-ocean-800/50 rounded-xl p-1">
                <button
                  onClick={() => setColorBy("tide")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    colorBy === "tide"
                      ? "bg-reef-500 text-white"
                      : "text-ocean-300 hover:text-white"
                  )}
                >
                  潮带
                </button>
                <button
                  onClick={() => setColorBy("season")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    colorBy === "season"
                      ? "bg-reef-500 text-white"
                      : "text-ocean-300 hover:text-white"
                  )}
                >
                  季节
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {mode === "pcoa" && (
        <div>
          <div className="relative w-full bg-ocean-950/50 rounded-2xl border border-ocean-700/40 overflow-hidden" style={{ height: 480 }}>
            <svg viewBox="0 0 600 480" className="w-full h-full">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(14,165,233,0.1)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="600" height="480" fill="url(#grid)" />
              <line x1="0" y1="240" x2="600" y2="240" stroke="rgba(14,165,233,0.3)" strokeDasharray="4,4" />
              <line x1="300" y1="0" x2="300" y2="480" stroke="rgba(14,165,233,0.3)" strokeDasharray="4,4" />

              {(() => {
                const coords = data.coords;
                const xs = coords.map((c) => c.x);
                const ys = coords.map((c) => c.y);
                const xMin = Math.min(...xs, -0.5);
                const xMax = Math.max(...xs, 0.5);
                const yMin = Math.min(...ys, -0.5);
                const yMax = Math.max(...ys, 0.5);
                const xRange = Math.max(xMax - xMin, 0.01);
                const yRange = Math.max(yMax - yMin, 0.01);
                const pad = 50;
                const w = 600 - pad * 2;
                const h = 480 - pad * 2;

                return surveys.map((s, i) => {
                  const x = pad + ((coords[i].x - xMin) / xRange) * w;
                  const y = 480 - pad - ((coords[i].y - yMin) / yRange) * h;
                  const color =
                    colorBy === "tide"
                      ? tideColor(s.tideZone)
                      : seasonColor(getSeason(s.date));
                  return (
                    <g key={s.id}>
                      <circle cx={x} cy={y} r={12} fill={color} opacity={0.3} />
                      <circle cx={x} cy={y} r={7} fill={color} stroke="white" strokeWidth={2} />
                      <text
                        x={x + 12}
                        y={y - 8}
                        fill="#f0f9ff"
                        fontSize="11"
                        fontWeight="500"
                      >
                        {s.stationName}
                      </text>
                      <text
                        x={x + 12}
                        y={y + 6}
                        fill="#94a3b8"
                        fontSize="10"
                      >
                        {s.date}
                      </text>
                    </g>
                  );
                });
              })()}

              <text x="300" y="470" fill="#94a3b8" fontSize="12" textAnchor="middle">
                PCo 轴 1
              </text>
              <text x="15" y="240" fill="#94a3b8" fontSize="12" textAnchor="middle" transform="rotate(-90,15,240)">
                PCo 轴 2
              </text>
            </svg>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {colorBy === "tide" && (
              <>
                <span className="chip"><span className="inline-block w-3 h-3 rounded-full bg-tide-high mr-2"></span>高潮带</span>
                <span className="chip"><span className="inline-block w-3 h-3 rounded-full bg-tide-mid mr-2"></span>中潮带</span>
                <span className="chip"><span className="inline-block w-3 h-3 rounded-full bg-tide-low mr-2"></span>低潮带</span>
              </>
            )}
            {colorBy === "season" && (
              <>
                <span className="chip"><span className="inline-block w-3 h-3 rounded-full mr-2" style={{background: seasonColor("spring")}}></span>春季</span>
                <span className="chip"><span className="inline-block w-3 h-3 rounded-full mr-2" style={{background: seasonColor("summer")}}></span>夏季</span>
                <span className="chip"><span className="inline-block w-3 h-3 rounded-full mr-2" style={{background: seasonColor("autumn")}}></span>秋季</span>
                <span className="chip"><span className="inline-block w-3 h-3 rounded-full mr-2" style={{background: seasonColor("winter")}}></span>冬季</span>
              </>
            )}
          </div>
        </div>
      )}

      {mode === "dendrogram" && (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${data.dendro.width} ${data.dendro.height}`}
            className="min-w-full"
            style={{ height: Math.min(500, data.dendro.height) }}
          >
            <defs>
              <pattern id="dendroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(14,165,233,0.08)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={data.dendro.width} height={data.dendro.height} fill="url(#dendroGrid)" />

            {data.dendro.links.map((link, i) => (
              <path
                key={i}
                d={link.points}
                fill="none"
                stroke="#14b8a6"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {data.dendro.nodes.map((node) => (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.leaf ? 6 : 4}
                  fill={node.leaf ? "#f59e0b" : "#14b8a6"}
                  stroke="white"
                  strokeWidth={2}
                />
                {node.leaf && node.label && (
                  <text
                    x={node.x}
                    y={node.y + 20}
                    fill="#f0f9ff"
                    fontSize="11"
                    textAnchor="middle"
                    fontWeight="500"
                  >
                    {node.label.split("-").slice(0, 2).join("\n")}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
