import { useState, useMemo } from "react";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  X,
  Square,
  Circle,
  Ruler,
  Trees,
  LandPlot,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ShapeType = "square" | "circle";

interface QuadratDensityCalcProps {
  totalIndividuals: number;
  initialShape?: ShapeType;
  initialSize?: string;
  onClose?: () => void;
  onSizeChange?: (size: string) => void;
}

const SQUARE_PRESETS = [
  { label: "0.25×0.25m", side: 0.25 },
  { label: "0.5×0.5m", side: 0.5 },
  { label: "1×1m", side: 1 },
  { label: "2×2m", side: 2 },
  { label: "5×5m", side: 5 },
];

const CIRCLE_PRESETS = [
  { label: "r=0.28m", radius: 0.28 },
  { label: "r=0.56m", radius: 0.56 },
  { label: "r=1m", radius: 1 },
  { label: "r=1.78m", radius: 1.78 },
  { label: "r=2.82m", radius: 2.82 },
];

export default function QuadratDensityCalc({
  totalIndividuals,
  initialShape = "square",
  initialSize,
  onClose,
  onSizeChange,
}: QuadratDensityCalcProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [shape, setShape] = useState<ShapeType>(initialShape);
  const [customSide, setCustomSide] = useState<string>("");
  const [customRadius, setCustomRadius] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    initialSize || null
  );

  const { areaSqM, areaHa, areaDisplay } = useMemo(() => {
    let area = 0;
    let display = "";

    if (shape === "square") {
      if (customSide) {
        const side = parseFloat(customSide);
        if (!isNaN(side) && side > 0) {
          area = side * side;
          display = `${side}×${side}m 正方形`;
        }
      } else if (selectedPreset) {
        const preset = SQUARE_PRESETS.find((p) => p.label === selectedPreset);
        if (preset) {
          area = preset.side * preset.side;
          display = preset.label + " 正方形";
        }
      }
    } else {
      if (customRadius) {
        const radius = parseFloat(customRadius);
        if (!isNaN(radius) && radius > 0) {
          area = Math.PI * radius * radius;
          display = `r=${radius}m 圆形`;
        }
      } else if (selectedPreset) {
        const preset = CIRCLE_PRESETS.find((p) => p.label === selectedPreset);
        if (preset) {
          area = Math.PI * preset.radius * preset.radius;
          display = preset.label + " 圆形";
        }
      }
    }

    return {
      areaSqM: area,
      areaHa: area / 10000,
      areaDisplay: display,
    };
  }, [shape, customSide, customRadius, selectedPreset]);

  const densityPerSqM = areaSqM > 0 ? totalIndividuals / areaSqM : 0;
  const densityPerHa = areaHa > 0 ? totalIndividuals / areaHa : 0;

  const handleSelectPreset = (label: string) => {
    setSelectedPreset(label);
    if (shape === "square") {
      setCustomSide("");
    } else {
      setCustomRadius("");
    }
    if (onSizeChange) {
      onSizeChange(label);
    }
  };

  const handleShapeChange = (newShape: ShapeType) => {
    setShape(newShape);
    setSelectedPreset(null);
    setCustomSide("");
    setCustomRadius("");
  };

  const handleCustomInput = (value: string) => {
    if (shape === "square") {
      setCustomSide(value);
    } else {
      setCustomRadius(value);
    }
    setSelectedPreset(null);
  };

  const presets = shape === "square" ? SQUARE_PRESETS : CIRCLE_PRESETS;

  return (
    <div className="fixed right-4 bottom-24 z-50 print:hidden">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="card-glass w-14 h-14 flex items-center justify-center hover:ring-2 hover:ring-reef-400/60 transition-all"
          title="样方面积与密度速算"
        >
          <Calculator className="w-6 h-6 text-reef-300" />
        </button>
      ) : (
        <div className="card-glass w-80 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ocean-700/40">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-reef-300" />
              <span className="font-semibold text-ocean-100 text-sm">
                样方密度速算
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-ocean-400 hover:bg-ocean-700/40 hover:text-white transition-colors"
                title="收起"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-ocean-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  title="关闭"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex bg-ocean-800/40 rounded-xl p-0.5">
              <button
                onClick={() => handleShapeChange("square")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-medium transition-all min-h-[36px] flex items-center justify-center gap-1.5",
                  shape === "square"
                    ? "bg-ocean-500 text-white shadow"
                    : "text-ocean-300 hover:text-white"
                )}
              >
                <Square className="w-3.5 h-3.5" /> 正方形
              </button>
              <button
                onClick={() => handleShapeChange("circle")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-medium transition-all min-h-[36px] flex items-center justify-center gap-1.5",
                  shape === "circle"
                    ? "bg-ocean-500 text-white shadow"
                    : "text-ocean-300 hover:text-white"
                )}
              >
                <Circle className="w-3.5 h-3.5" /> 圆形
              </button>
            </div>

            <div>
              <label className="label-text flex items-center gap-1 text-xs">
                <Ruler className="w-3.5 h-3.5" />
                {shape === "square" ? "预设边长" : "预设半径"}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handleSelectPreset(p.label)}
                    className={cn(
                      "py-2 px-1 rounded-lg text-[11px] font-medium transition-all min-h-[34px] border",
                      selectedPreset === p.label &&
                        !(shape === "square" ? customSide : customRadius)
                        ? "bg-reef-500/30 border-reef-400 text-ocean-100"
                        : "bg-ocean-800/30 border-ocean-700/40 text-ocean-300 hover:text-white hover:bg-ocean-700/30"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label-text flex items-center gap-1 text-xs">
                {shape === "square" ? (
                  <>自定义边长 (m)</>
                ) : (
                  <>自定义半径 (m)</>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shape === "square" ? customSide : customRadius}
                onChange={(e) => handleCustomInput(e.target.value)}
                placeholder={
                  shape === "square" ? "如：0.5" : "如：0.56"
                }
                className="input-field py-2 h-10 text-sm"
              />
            </div>

            {areaSqM > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-ocean-400 bg-ocean-800/30 rounded-lg px-3 py-2">
                  <LandPlot className="w-3.5 h-3.5 text-reef-400" />
                  <span>{areaDisplay}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="card-glass p-3 bg-ocean-800/30">
                    <div className="text-[10px] text-ocean-400 mb-1">
                      面积 (m²)
                    </div>
                    <div className="text-lg font-bold text-reef-300 tabular-nums">
                      {areaSqM.toFixed(4)}
                    </div>
                  </div>
                  <div className="card-glass p-3 bg-ocean-800/30">
                    <div className="text-[10px] text-ocean-400 mb-1">
                      面积 (公顷)
                    </div>
                    <div className="text-lg font-bold text-reef-300 tabular-nums">
                      {areaHa.toFixed(6)}
                    </div>
                  </div>
                </div>

                <div className="border-t border-ocean-700/40 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Trees className="w-4 h-4 text-reef-400" />
                    <span className="text-sm font-medium text-ocean-200">
                      密度计算
                    </span>
                    <span className="text-xs text-ocean-400 ml-auto">
                      个体总数:{" "}
                      <span className="text-reef-300 font-medium tabular-nums">
                        {totalIndividuals}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="card-glass p-3 bg-reef-500/10 border-reef-500/30">
                      <div className="text-[10px] text-ocean-400 mb-1">
                        个体 / m²
                      </div>
                      <div className="text-lg font-bold text-reef-300 tabular-nums">
                        {densityPerSqM.toFixed(2)}
                      </div>
                    </div>
                    <div className="card-glass p-3 bg-reef-500/10 border-reef-500/30">
                      <div className="text-[10px] text-ocean-400 mb-1">
                        个体 / 公顷
                      </div>
                      <div className="text-lg font-bold text-reef-300 tabular-nums">
                        {densityPerHa.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {areaSqM === 0 && (
              <div className="text-center text-ocean-400 text-xs py-3">
                请选择预设或输入自定义尺寸
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
