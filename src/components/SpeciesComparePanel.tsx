import { useMemo } from "react";
import { X, GitCompare, ArrowLeftRight, AlertCircle } from "lucide-react";
import { useAtlasStore } from "@/store/atlasStore";
import { getPhylumColor } from "@/data/speciesAtlas";
import AtlasImage from "./AtlasImage";
import type { SpeciesAtlasItem, AtlasImage as AtlasImageType } from "@/types";
import { cn } from "@/lib/utils";

interface SpeciesComparePanelProps {
  onClose: () => void;
  onSelectSpecies?: (slot: 0 | 1) => void;
}

const COMPARE_FIELDS: Array<{
  key: keyof SpeciesAtlasItem | string;
  label: string;
  getValue?: (s: SpeciesAtlasItem) => string;
}> = [
  { key: "kingdom", label: "界" },
  { key: "phylum", label: "门" },
  { key: "className", label: "纲" },
  { key: "order", label: "目" },
  { key: "family", label: "科" },
  { key: "genus", label: "属" },
  { key: "scientificName", label: "学名" },
  { key: "distribution", label: "分布" },
  { key: "seasonality", label: "季节性" },
  { key: "conservationStatus", label: "保护状态" },
  { key: "edibility", label: "食用性" },
];

function getFieldValue(s: SpeciesAtlasItem, key: string): string {
  const v = (s as unknown as Record<string, unknown>)[key];
  if (v === undefined || v === null || v === "") return "—";
  return String(v);
}

export default function SpeciesComparePanel({
  onClose,
  onSelectSpecies,
}: SpeciesComparePanelProps) {
  const compareList = useAtlasStore((s) => s.compareList);
  const getSpecies = useAtlasStore((s) => s.getSpecies);
  const removeFromCompare = useAtlasStore((s) => s.removeFromCompare);
  const clearCompare = useAtlasStore((s) => s.clearCompare);

  const speciesA = compareList[0] ? getSpecies(compareList[0]) : undefined;
  const speciesB = compareList[1] ? getSpecies(compareList[1]) : undefined;

  const isDiff = (key: string) => {
    if (!speciesA || !speciesB) return false;
    return getFieldValue(speciesA, key) !== getFieldValue(speciesB, key);
  };

  const isMorphologyDiff = (label: string) => {
    if (!speciesA || !speciesB) return false;
    const a = speciesA.morphology.find((m) => m.label === label);
    const b = speciesB.morphology.find((m) => m.label === label);
    if (!a && !b) return false;
    if (!a || !b) return true;
    return a.value !== b.value;
  };

  const allMorphologyLabels = useMemo(() => {
    const set = new Set<string>();
    if (speciesA) speciesA.morphology.forEach((m) => set.add(m.label));
    if (speciesB) speciesB.morphology.forEach((m) => set.add(m.label));
    return Array.from(set);
  }, [speciesA, speciesB]);

  const isIdKeysDiff = () => {
    if (!speciesA || !speciesB) return false;
    if (speciesA.identificationKeys.length !== speciesB.identificationKeys.length) return true;
    return speciesA.identificationKeys.some(
      (k, i) => k !== speciesB.identificationKeys[i]
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-ocean-700/40">
        <h3 className="text-lg font-bold text-ocean-100 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-reef-400" />
          物种形态对比
        </h3>
        <div className="flex items-center gap-2">
          {(speciesA || speciesB) && (
            <button
              onClick={clearCompare}
              className="text-xs text-ocean-400 hover:text-reef-400 px-2 py-1"
            >
              清空对比
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-ocean-700/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!speciesA && !speciesB ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <ArrowLeftRight className="w-12 h-12 text-ocean-600 mb-3" />
            <h4 className="text-lg font-semibold text-ocean-200 mb-1">
              请选择两个物种进行对比
            </h4>
            <p className="text-sm text-ocean-400">
              在图鉴浏览中点击物种卡片上的"对比"按钮，添加物种到对比列表
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <SpeciesHeaderCard
                species={speciesA}
                onRemove={() => speciesA && removeFromCompare(speciesA.id)}
                onClick={() => onSelectSpecies?.(0)}
              />
              <SpeciesHeaderCard
                species={speciesB}
                onRemove={() => speciesB && removeFromCompare(speciesB.id)}
                onClick={() => onSelectSpecies?.(1)}
              />
            </div>

            {speciesA && speciesB && (
              <>
                <CompareSection title="分类学特征">
                  <table className="w-full text-sm">
                    <tbody>
                      {COMPARE_FIELDS.map((f) => {
                        const diff = isDiff(f.key as string);
                        return (
                          <tr key={f.key as string} className="border-b border-ocean-800/50">
                            <td className="py-2.5 pr-3 text-ocean-400 w-20 align-top">
                              {f.label}
                            </td>
                            <td
                              className={cn(
                                "py-2.5 px-3 align-top",
                                diff && "bg-red-500/10 text-red-300"
                              )}
                            >
                              {getFieldValue(speciesA, f.key as string)}
                            </td>
                            <td
                              className={cn(
                                "py-2.5 px-3 align-top",
                                diff && "bg-red-500/10 text-red-300"
                              )}
                            >
                              {getFieldValue(speciesB, f.key as string)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CompareSection>

                <CompareSection title="形态特征">
                  <table className="w-full text-sm">
                    <tbody>
                      {allMorphologyLabels.map((label) => {
                        const diff = isMorphologyDiff(label);
                        const a = speciesA.morphology.find((m) => m.label === label);
                        const b = speciesB.morphology.find((m) => m.label === label);
                        return (
                          <tr key={label} className="border-b border-ocean-800/50">
                            <td className="py-2.5 pr-3 text-ocean-400 w-20 align-top">
                              {label}
                            </td>
                            <td
                              className={cn(
                                "py-2.5 px-3 align-top",
                                diff && "bg-red-500/10 text-red-300"
                              )}
                            >
                              {a ? (
                                <>
                                  {a.value}
                                  {a.unit && (
                                    <span className="text-ocean-500 ml-0.5">{a.unit}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-ocean-600">—</span>
                              )}
                            </td>
                            <td
                              className={cn(
                                "py-2.5 px-3 align-top",
                                diff && "bg-red-500/10 text-red-300"
                              )}
                            >
                              {b ? (
                                <>
                                  {b.value}
                                  {b.unit && (
                                    <span className="text-ocean-500 ml-0.5">{b.unit}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-ocean-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CompareSection>

                <CompareSection title="栖息环境">
                  <div className="grid grid-cols-2 gap-3">
                    <p className={cn(
                      "text-sm leading-relaxed p-3 rounded-lg",
                      speciesA.habitat !== speciesB.habitat
                        ? "bg-red-500/10 text-red-200"
                        : "bg-ocean-900/40 text-ocean-200"
                    )}>
                      {speciesA.habitat}
                    </p>
                    <p className={cn(
                      "text-sm leading-relaxed p-3 rounded-lg",
                      speciesA.habitat !== speciesB.habitat
                        ? "bg-red-500/10 text-red-200"
                        : "bg-ocean-900/40 text-ocean-200"
                    )}>
                      {speciesB.habitat}
                    </p>
                  </div>
                </CompareSection>

                <CompareSection title="鉴别特征">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn(
                      "p-3 rounded-lg",
                      isIdKeysDiff() ? "bg-red-500/10" : "bg-ocean-900/40"
                    )}>
                      <ul className="space-y-1">
                        {speciesA.identificationKeys.map((k, i) => (
                          <li
                            key={i}
                            className={cn(
                              "text-sm flex items-start gap-1.5",
                              isIdKeysDiff() ? "text-red-200" : "text-ocean-200"
                            )}
                          >
                            <span className="text-reef-400 mt-0.5">•</span>
                            {k}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={cn(
                      "p-3 rounded-lg",
                      isIdKeysDiff() ? "bg-red-500/10" : "bg-ocean-900/40"
                    )}>
                      <ul className="space-y-1">
                        {speciesB.identificationKeys.map((k, i) => (
                          <li
                            key={i}
                            className={cn(
                              "text-sm flex items-start gap-1.5",
                              isIdKeysDiff() ? "text-red-200" : "text-ocean-200"
                            )}
                          >
                            <span className="text-reef-400 mt-0.5">•</span>
                            {k}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CompareSection>

                <CompareSection title="物种描述">
                  <div className="grid grid-cols-2 gap-3">
                    <p className={cn(
                      "text-sm leading-relaxed p-3 rounded-lg",
                      speciesA.description !== speciesB.description
                        ? "bg-red-500/10 text-red-200"
                        : "bg-ocean-900/40 text-ocean-200"
                    )}>
                      {speciesA.description}
                    </p>
                    <p className={cn(
                      "text-sm leading-relaxed p-3 rounded-lg",
                      speciesA.description !== speciesB.description
                        ? "bg-red-500/10 text-red-200"
                        : "bg-ocean-900/40 text-ocean-200"
                    )}>
                      {speciesB.description}
                    </p>
                  </div>
                </CompareSection>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-ocean-800/30 border border-ocean-700/30">
                  <AlertCircle className="w-4 h-4 text-reef-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-ocean-300">
                    高亮的项目（红色背景）表示两个物种之间存在明显差异，是区分它们的关键特征。
                  </p>
                </div>
              </>
            )}

            {(!speciesA || !speciesB) && (
              <div className="p-6 rounded-xl bg-ocean-800/30 border border-dashed border-ocean-600/40 text-center">
                <AlertCircle className="w-8 h-8 text-ocean-500 mx-auto mb-2" />
                <p className="text-sm text-ocean-300">
                  请再选择{!speciesA ? "左侧" : "右侧"}物种进行对比
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SpeciesHeaderCard({
  species,
  onRemove,
  onClick,
}: {
  species?: SpeciesAtlasItem;
  onRemove: () => void;
  onClick: () => void;
}) {
  if (!species) {
    return (
      <button
        onClick={onClick}
        className="card-glass p-3 flex flex-col items-center justify-center min-h-[140px] border-dashed hover:border-reef-400/50 transition-colors"
      >
        <GitCompare className="w-8 h-8 text-ocean-500 mb-2" />
        <p className="text-sm text-ocean-400">点击选择物种</p>
      </button>
    );
  }

  return (
    <div className="card-glass p-3 relative overflow-hidden group">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-ocean-900/80 text-ocean-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="aspect-video rounded-lg overflow-hidden bg-ocean-950 mb-2 relative">
        <AtlasImage
          image={species.thumbnail as AtlasImageType | undefined}
          alt={species.commonName}
          phylum={species.phylum}
          commonName={species.commonName}
          scientificName={species.scientificName}
        />
      </div>
      <div>
        <h4 className="font-semibold text-reef-300 text-sm">{species.commonName}</h4>
        <p className="text-xs text-ocean-400 italic truncate">{species.scientificName}</p>
        <span
          className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: getPhylumColor(species.phylum) + "20",
            color: getPhylumColor(species.phylum),
          }}
        >
          {species.phylum}
        </span>
      </div>
    </div>
  );
}

function CompareSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="section-title text-sm mb-2">{title}</h4>
      {children}
    </div>
  );
}
