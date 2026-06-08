import { useState, useMemo } from "react";
import { GitBranch, ScatterChart, Filter, TrendingUp } from "lucide-react";
import type { SurveyRecord, TideZone } from "@/types";
import {
  calcBrayCurtisMatrix,
  pcoa,
  hclust,
  layoutDendrogram,
  getSeason,
  SEASON_LABEL,
  TIDE_LABEL,
  calcDiversityIndices,
} from "@/lib/diversity";
import { cn } from "@/lib/utils";

interface CommunityChartsProps {
  surveys: SurveyRecord[];
}

type ChartMode = "pcoa" | "dendrogram" | "correlation";

type EnvFactorKey = "waterTemp" | "salinity" | "ph" | "dissolvedOxygen";
type DiversityMetric = "shannonWiener" | "speciesCount";

const ENV_FACTOR_LABEL: Record<EnvFactorKey, string> = {
  waterTemp: "水温 (°C)",
  salinity: "盐度 (‰)",
  ph: "pH 值",
  dissolvedOxygen: "溶解氧 (mg/L)",
};

const DIVERSITY_METRIC_LABEL: Record<DiversityMetric, string> = {
  shannonWiener: "Shannon-Wiener 指数 (H')",
  speciesCount: "物种数 (S)",
};

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

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX) * Math.sqrt(denY);
  return den === 0 ? 0 : num / den;
}

export default function CommunityCharts({ surveys }: CommunityChartsProps) {
  const [mode, setMode] = useState<ChartMode>("pcoa");
  const [colorBy, setColorBy] = useState<"tide" | "season">("tide");
  const [envFactor, setEnvFactor] = useState<EnvFactorKey>("waterTemp");
  const [diversityMetric, setDiversityMetric] = useState<DiversityMetric>(
    "shannonWiener"
  );

  const data = useMemo(() => {
    if (surveys.length < 2) return null;
    const bc = calcBrayCurtisMatrix(surveys);
    const coords = pcoa(bc.matrix);
    const clusterRoot = hclust(bc.matrix, bc.labels);
    const dendro = layoutDendrogram(clusterRoot);
    return { bc, coords, clusterRoot, dendro };
  }, [surveys]);

  const correlationData = useMemo(() => {
    const points: { x: number; y: number; survey: SurveyRecord }[] = [];
    for (const s of surveys) {
      const envVal = s.envFactors?.[envFactor];
      if (envVal === undefined || envVal === null) continue;
      const indices = calcDiversityIndices(s.species);
      const y =
        diversityMetric === "shannonWiener"
          ? indices.shannonWiener
          : indices.speciesCount;
      points.push({ x: envVal, y, survey: s });
    }
    if (points.length < 2) return { points: points, r: 0 };
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const r = pearsonCorrelation(xs, ys);
    return { points, r };
  }, [surveys, envFactor, diversityMetric]);

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
        <div className="flex flex-wrap items-center gap-2">
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
            <button
              onClick={() => setMode("correlation")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all min-h-[40px]",
                mode === "correlation"
                  ? "bg-ocean-500 text-white"
                  : "text-ocean-300 hover:text-white"
              )}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              环境相关性
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

      {mode === "correlation" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-ocean-400" />
              <span className="text-sm text-ocean-300">环境因子：</span>
              <div className="flex bg-ocean-800/50 rounded-xl p-1 flex-wrap">
                {(Object.keys(ENV_FACTOR_LABEL) as EnvFactorKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setEnvFactor(k)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-h-[36px]",
                      envFactor === k
                        ? "bg-reef-500 text-white"
                        : "text-ocean-300 hover:text-white"
                    )}
                  >
                    {ENV_FACTOR_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ocean-300">多样性指标：</span>
              <div className="flex bg-ocean-800/50 rounded-xl p-1">
                {(Object.keys(DIVERSITY_METRIC_LABEL) as DiversityMetric[]).map(
                  (k) => (
                    <button
                      key={k}
                      onClick={() => setDiversityMetric(k)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-h-[36px]",
                        diversityMetric === k
                          ? "bg-reef-500 text-white"
                          : "text-ocean-300 hover:text-white"
                      )}
                    >
                      {DIVERSITY_METRIC_LABEL[k]}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {correlationData.points.length < 2 ? (
            <div className="card-glass p-8 text-center text-ocean-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>至少需要 2 条包含该环境因子的调查记录进行相关性分析</p>
            </div>
          ) : (
            <div>
              <div
                className="relative w-full bg-ocean-950/50 rounded-2xl border border-ocean-700/40 overflow-hidden"
                style={{ height: 440 }}
              >
                <svg viewBox="0 0 600 440" className="w-full h-full">
                  <defs>
                    <pattern
                      id="corrGrid"
                      width="50"
                      height="50"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 50 0 L 0 0 0 50"
                        fill="none"
                        stroke="rgba(14,165,233,0.1)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="600" height="440" fill="url(#corrGrid)" />

                  {(() => {
                    const padL = 70;
                    const padR = 30;
                    const padT = 30;
                    const padB = 60;
                    const w = 600 - padL - padR;
                    const h = 440 - padT - padB;

                    const xs = correlationData.points.map((p) => p.x);
                    const ys = correlationData.points.map((p) => p.y);
                    const xMin = Math.min(...xs);
                    const xMax = Math.max(...xs);
                    const yMin = Math.min(...ys, 0);
                    const yMax = Math.max(...ys);
                    const xRange = Math.max(xMax - xMin, 0.01);
                    const yRange = Math.max(yMax - yMin, 0.01);
                    const xPad = xRange * 0.1;
                    const yPad = yRange * 0.1;

                    const mapX = (v: number) =>
                      padL +
                      ((v - (xMin - xPad)) / (xRange + 2 * xPad)) * w;
                    const mapY = (v: number) =>
                      padT +
                      h -
                      ((v - (yMin - yPad)) / (yRange + 2 * yPad)) * h;

                    const ticks = 5;
                    const xTickEls = [];
                    for (let i = 0; i <= ticks; i++) {
                      const val =
                        xMin - xPad + ((xRange + 2 * xPad) * i) / ticks;
                      const px = mapX(val);
                      xTickEls.push(
                        <g key={`xt-${i}`}>
                          <line
                            x1={px}
                            y1={padT + h}
                            x2={px}
                            y2={padT + h + 5}
                            stroke="rgba(148,163,184,0.5)"
                            strokeWidth="1"
                          />
                          <text
                            x={px}
                            y={padT + h + 20}
                            fill="#94a3b8"
                            fontSize="10"
                            textAnchor="middle"
                          >
                            {val.toFixed(1)}
                          </text>
                        </g>
                      );
                    }
                    const yTickEls = [];
                    for (let i = 0; i <= ticks; i++) {
                      const val =
                        yMin - yPad + ((yRange + 2 * yPad) * i) / ticks;
                      const py = mapY(val);
                      yTickEls.push(
                        <g key={`yt-${i}`}>
                          <line
                            x1={padL - 5}
                            y1={py}
                            x2={padL}
                            y2={py}
                            stroke="rgba(148,163,184,0.5)"
                            strokeWidth="1"
                          />
                          <text
                            x={padL - 10}
                            y={py + 4}
                            fill="#94a3b8"
                            fontSize="10"
                            textAnchor="end"
                          >
                            {val.toFixed(2)}
                          </text>
                        </g>
                      );
                    }

                    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
                    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
                    let slope = 0;
                    let intercept = meanY;
                    let num = 0;
                    let den = 0;
                    for (let i = 0; i < xs.length; i++) {
                      num += (xs[i] - meanX) * (ys[i] - meanY);
                      den += (xs[i] - meanX) ** 2;
                    }
                    if (den > 0) {
                      slope = num / den;
                      intercept = meanY - slope * meanX;
                    }
                    const lineX1 = xMin - xPad;
                    const lineX2 = xMax + xPad;
                    const lineY1 = slope * lineX1 + intercept;
                    const lineY2 = slope * lineX2 + intercept;

                    return (
                      <>
                        <line
                          x1={padL}
                          y1={padT}
                          x2={padL}
                          y2={padT + h}
                          stroke="rgba(148,163,184,0.4)"
                          strokeWidth="1.5"
                        />
                        <line
                          x1={padL}
                          y1={padT + h}
                          x2={padL + w}
                          y2={padT + h}
                          stroke="rgba(148,163,184,0.4)"
                          strokeWidth="1.5"
                        />
                        {xTickEls}
                        {yTickEls}
                        <line
                          x1={mapX(lineX1)}
                          y1={mapY(lineY1)}
                          x2={mapX(lineX2)}
                          y2={mapY(lineY2)}
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="6,4"
                          opacity="0.8"
                        />
                        {correlationData.points.map((p, i) => (
                          <g key={i}>
                            <circle
                              cx={mapX(p.x)}
                              cy={mapY(p.y)}
                              r={10}
                              fill={tideColor(p.survey.tideZone)}
                              opacity="0.25"
                            />
                            <circle
                              cx={mapX(p.x)}
                              cy={mapY(p.y)}
                              r={6}
                              fill={tideColor(p.survey.tideZone)}
                              stroke="white"
                              strokeWidth="2"
                            />
                            <text
                              x={mapX(p.x) + 10}
                              y={mapY(p.y) - 6}
                              fill="#f0f9ff"
                              fontSize="10"
                              fontWeight="500"
                            >
                              {p.survey.stationName}
                            </text>
                          </g>
                        ))}
                        <text
                          x={padL + w / 2}
                          y={padT + h + 45}
                          fill="#94a3b8"
                          fontSize="12"
                          textAnchor="middle"
                          fontWeight="500"
                        >
                          {ENV_FACTOR_LABEL[envFactor]}
                        </text>
                        <text
                          x={18}
                          y={padT + h / 2}
                          fill="#94a3b8"
                          fontSize="12"
                          textAnchor="middle"
                          fontWeight="500"
                          transform={`rotate(-90, 18, ${padT + h / 2})`}
                        >
                          {DIVERSITY_METRIC_LABEL[diversityMetric]}
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>

              <div className="flex flex-wrap gap-4 mt-4 items-center justify-center">
                <div className="card-glass px-5 py-3">
                  <div className="text-xs text-ocean-400">Pearson 相关系数 (r)</div>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      Math.abs(correlationData.r) >= 0.7
                        ? "text-green-400"
                        : Math.abs(correlationData.r) >= 0.4
                        ? "text-yellow-400"
                        : "text-ocean-300"
                    )}
                  >
                    {correlationData.r >= 0 ? "+" : ""}
                    {correlationData.r.toFixed(3)}
                  </div>
                </div>
                <div className="card-glass px-5 py-3">
                  <div className="text-xs text-ocean-400">有效样本数</div>
                  <div className="text-2xl font-bold text-reef-300">
                    {correlationData.points.length}
                  </div>
                </div>
                <span className="chip">
                  <span className="inline-block w-3 h-3 rounded-full bg-tide-high mr-2"></span>
                  高潮带
                </span>
                <span className="chip">
                  <span className="inline-block w-3 h-3 rounded-full bg-tide-mid mr-2"></span>
                  中潮带
                </span>
                <span className="chip">
                  <span className="inline-block w-3 h-3 rounded-full bg-tide-low mr-2"></span>
                  低潮带
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
