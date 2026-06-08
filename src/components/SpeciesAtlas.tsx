import { useState, useMemo } from "react";
import {
  BookOpen,
  GitCompare,
  Package,
  X,
  Waves,
  Grid3x3,
  List,
  Eye,
  Plus,
  Check,
  ChevronLeft,
} from "lucide-react";
import { useAtlasStore } from "@/store/atlasStore";
import { getPhylumColor } from "@/data/speciesAtlas";
import AtlasLayout from "./AtlasLayout";
import AtlasImage from "./AtlasImage";
import SpeciesDetailPanel from "./SpeciesDetailPanel";
import SpeciesComparePanel from "./SpeciesComparePanel";
import AtlasPatchManager from "./AtlasPatchManager";
import type { SpeciesAtlasItem, AtlasImage as AtlasImageType } from "@/types";
import { cn } from "@/lib/utils";
import Fuse from "fuse.js";

type ViewMode = "grid" | "list";
type PanelMode = "none" | "detail" | "compare" | "patch" | "picker";

interface SpeciesAtlasProps {
  onClose?: () => void;
}

export default function SpeciesAtlas({ onClose }: SpeciesAtlasProps) {
  const atlas = useAtlasStore((s) => s.atlas);
  const compareList = useAtlasStore((s) => s.compareList);
  const addToCompare = useAtlasStore((s) => s.addToCompare);
  const removeFromCompare = useAtlasStore((s) => s.removeFromCompare);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [panelMode, setPanelMode] = useState<PanelMode>("none");
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [pickerSlot, setPickerSlot] = useState<0 | 1 | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [taxonFilter, setTaxonFilter] = useState<{
    kingdom?: string;
    phylum?: string;
    className?: string;
    order?: string;
    family?: string;
    genus?: string;
  } | null>(null);

  const fuse = useMemo(() => {
    return new Fuse(atlas, {
      keys: ["scientificName", "commonName", "family", "phylum", "className"],
      threshold: 0.4,
    });
  }, [atlas]);

  const filteredSpecies = useMemo(() => {
    let list = atlas;
    if (taxonFilter) {
      list = list.filter((s) => {
        if (taxonFilter.kingdom && s.kingdom !== taxonFilter.kingdom) return false;
        if (taxonFilter.phylum && s.phylum !== taxonFilter.phylum) return false;
        if (taxonFilter.className && s.className !== taxonFilter.className) return false;
        if (taxonFilter.order && s.order !== taxonFilter.order) return false;
        if (taxonFilter.family && s.family !== taxonFilter.family) return false;
        if (taxonFilter.genus && s.genus !== taxonFilter.genus) return false;
        return true;
      });
    }
    if (searchQuery.trim()) {
      const ids = new Set(fuse.search(searchQuery).map((r) => r.item.id));
      list = list.filter((s) => ids.has(s.id));
    }
    return list;
  }, [atlas, searchQuery, taxonFilter, fuse]);

  const handleSelectSpecies = (id: string) => {
    if (panelMode === "picker" && pickerSlot !== null) {
      const newList = [...compareList];
      newList[pickerSlot] = id;
      useAtlasStore.getState().setCompareList(newList.filter(Boolean) as string[]);
      setPanelMode("compare");
      setPickerSlot(null);
    } else {
      setSelectedSpeciesId(id);
      setPanelMode("detail");
    }
  };

  const handleAddToCompare = (id: string) => {
    addToCompare(id);
  };

  const handlePickForCompare = (slot: 0 | 1) => {
    setPickerSlot(slot);
    setPanelMode("picker");
  };

  const phylaCount = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of filteredSpecies) {
      count.set(s.phylum, (count.get(s.phylum) || 0) + 1);
    }
    return Array.from(count.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredSpecies]);

  const isInCompare = (id: string) => compareList.includes(id);

  const showPanel = panelMode !== "none";
  const showMainView = panelMode === "none" || panelMode === "picker";

  const speciesGrid = (
    <>
      {phylaCount.length > 1 && panelMode !== "picker" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTaxonFilter(null)}
            className={cn(
              "chip text-xs",
              !taxonFilter && "ring-2 ring-reef-400/60"
            )}
          >
            全部 ({filteredSpecies.length})
          </button>
          {phylaCount.map(([phylum, count]) => (
            <button
              key={phylum}
              onClick={() => setTaxonFilter({ phylum })}
              className={cn(
                "chip text-xs",
                taxonFilter?.phylum === phylum && "ring-2 ring-reef-400/60"
              )}
              style={{
                borderColor: getPhylumColor(phylum) + "60",
                color: getPhylumColor(phylum),
              }}
            >
              {phylum} ({count})
            </button>
          ))}
        </div>
      )}

      {filteredSpecies.length === 0 ? (
        <div className="text-center py-16">
          <Waves className="w-12 h-12 text-ocean-600 mx-auto mb-3" />
          <p className="text-ocean-400">没有找到匹配的物种</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredSpecies.map((s) => (
            <SpeciesCard
              key={s.id}
              species={s}
              onClick={() => handleSelectSpecies(s.id)}
              onAddToCompare={() => handleAddToCompare(s.id)}
              inCompare={isInCompare(s.id)}
              onRemoveFromCompare={() => removeFromCompare(s.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSpecies.map((s) => (
            <SpeciesListItem
              key={s.id}
              species={s}
              onClick={() => handleSelectSpecies(s.id)}
              onAddToCompare={() => handleAddToCompare(s.id)}
              inCompare={isInCompare(s.id)}
              onRemoveFromCompare={() => removeFromCompare(s.id)}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 bg-ocean-950/95 backdrop-blur-xl flex flex-col">
      <header className="sticky top-0 z-10 bg-ocean-950/80 backdrop-blur-xl border-b border-ocean-700/40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {showPanel && (
              <button
                onClick={() => setPanelMode("none")}
                className="p-2 rounded-lg bg-ocean-800/50 text-ocean-200 hover:bg-ocean-700/50 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-400 to-reef-400 flex items-center justify-center shadow-lg flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-ocean-50 text-lg leading-tight truncate">
                物种图鉴
              </h1>
              <p className="text-xs text-ocean-400 leading-tight">
                {panelMode === "picker"
                  ? "选择物种加入对比"
                  : `共 ${atlas.length} 种，当前显示 ${filteredSpecies.length} 种`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!showPanel && (
              <div className="hidden sm:flex items-center gap-1 bg-ocean-800/50 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    viewMode === "grid"
                      ? "bg-ocean-500 text-white"
                      : "text-ocean-300 hover:text-white"
                  )}
                  title="网格视图"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    viewMode === "list"
                      ? "bg-ocean-500 text-white"
                      : "text-ocean-300 hover:text-white"
                  )}
                  title="列表视图"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}

            {!showPanel && (
              <button
                onClick={() => setPanelMode("compare")}
                className="relative px-3 py-2 rounded-xl bg-reef-500/20 text-reef-300 hover:bg-reef-500/30 transition-colors flex items-center gap-1.5 min-h-[44px]"
              >
                <GitCompare className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">对比</span>
                {compareList.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-reef-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {compareList.length}
                  </span>
                )}
              </button>
            )}

            {!showPanel && (
              <button
                onClick={() => setPanelMode("patch")}
                className="p-2 rounded-xl bg-ocean-800/50 text-ocean-200 hover:bg-ocean-700/50 transition-colors min-h-[44px]"
                title="补丁管理"
              >
                <Package className="w-5 h-5" />
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-ocean-800/50 text-ocean-200 hover:bg-ocean-700/50 transition-colors min-h-[44px]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {showMainView && (
          <AtlasLayout
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={panelMode === "picker" ? "搜索物种..." : "搜索学名、中文名、科、门..."}
            onSelectSpecies={handleSelectSpecies}
            onFilterChange={setTaxonFilter}
            selectedSpeciesId={selectedSpeciesId ?? undefined}
            headerExtra={
              <div className="md:hidden flex items-center gap-1 bg-ocean-800/50 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    viewMode === "grid"
                      ? "bg-ocean-500 text-white"
                      : "text-ocean-300 hover:text-white"
                  )}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    viewMode === "list"
                      ? "bg-ocean-500 text-white"
                      : "text-ocean-300 hover:text-white"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            }
          >
            {speciesGrid}
          </AtlasLayout>
        )}

        {panelMode === "detail" && selectedSpeciesId && (
          <SpeciesDetailPanel
            speciesId={selectedSpeciesId}
            onClose={() => setPanelMode("none")}
            onAddToCompare={() => handleAddToCompare(selectedSpeciesId)}
            isInCompare={isInCompare(selectedSpeciesId)}
          />
        )}

        {panelMode === "compare" && (
          <SpeciesComparePanel
            onClose={() => setPanelMode("none")}
            onSelectSpecies={handlePickForCompare}
          />
        )}

        {panelMode === "patch" && (
          <AtlasPatchManager onClose={() => setPanelMode("none")} />
        )}
      </div>
    </div>
  );
}

function SpeciesCard({
  species,
  onClick,
  onAddToCompare,
  inCompare,
  onRemoveFromCompare,
}: {
  species: SpeciesAtlasItem;
  onClick: () => void;
  onAddToCompare: () => void;
  inCompare: boolean;
  onRemoveFromCompare: () => void;
}) {
  return (
    <div
      className={cn(
        "card-glass overflow-hidden group cursor-pointer transition-all hover:ring-2 hover:ring-reef-400/50",
        inCompare && "ring-2 ring-reef-400/60"
      )}
      onClick={onClick}
    >
      <div className="aspect-square bg-ocean-950 relative overflow-hidden">
        <AtlasImage
          image={species.thumbnail as AtlasImageType | undefined}
          alt={species.commonName}
          phylum={species.phylum}
          commonName={species.commonName}
          scientificName={species.scientificName}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-60"
          style={{ color: getPhylumColor(species.phylum) }}
        />
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor: getPhylumColor(species.phylum) + "CC",
            color: "white",
          }}
        >
          {species.phylum}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (inCompare) onRemoveFromCompare();
            else onAddToCompare();
          }}
          className={cn(
            "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all",
            inCompare
              ? "bg-reef-500 text-white"
              : "bg-ocean-900/80 text-ocean-200 opacity-0 group-hover:opacity-100 hover:bg-reef-500 hover:text-white"
          )}
        >
          {inCompare ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
        {inCompare && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-reef-500 text-white text-[10px] font-semibold">
            对比中
          </div>
        )}
      </div>
      <div className="p-2.5">
        <div className="font-semibold text-reef-300 text-sm truncate">
          {species.commonName}
        </div>
        <div className="text-xs text-ocean-400 italic truncate">
          {species.scientificName}
        </div>
        <div className="text-[10px] text-ocean-500 mt-1 truncate">
          {species.family}
        </div>
      </div>
    </div>
  );
}

function SpeciesListItem({
  species,
  onClick,
  onAddToCompare,
  inCompare,
  onRemoveFromCompare,
}: {
  species: SpeciesAtlasItem;
  onClick: () => void;
  onAddToCompare: () => void;
  inCompare: boolean;
  onRemoveFromCompare: () => void;
}) {
  return (
    <div
      className={cn(
        "card-glass p-3 flex items-center gap-3 cursor-pointer transition-all hover:ring-2 hover:ring-reef-400/40 group",
        inCompare && "ring-2 ring-reef-400/60"
      )}
      onClick={onClick}
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-ocean-950 flex-shrink-0 relative">
        <AtlasImage
          image={species.thumbnail as AtlasImageType | undefined}
          alt={species.commonName}
          phylum={species.phylum}
          commonName={species.commonName}
          scientificName={species.scientificName}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-reef-300">{species.commonName}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: getPhylumColor(species.phylum) + "20",
              color: getPhylumColor(species.phylum),
            }}
          >
            {species.phylum}
          </span>
          {inCompare && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-reef-500/20 text-reef-400">
              对比中
            </span>
          )}
        </div>
        <div className="text-sm text-ocean-400 italic truncate">
          {species.scientificName}
        </div>
        <div className="text-xs text-ocean-500 mt-0.5 truncate">
          {species.className} · {species.order} · {species.family}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          className="p-2 rounded-lg bg-ocean-800/30 text-ocean-300 hover:bg-ocean-700/50 hover:text-ocean-100 transition-colors"
          title="查看详情"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (inCompare) onRemoveFromCompare();
            else onAddToCompare();
          }}
          className={cn(
            "p-2 rounded-lg transition-colors",
            inCompare
              ? "bg-reef-500 text-white"
              : "bg-ocean-800/30 text-ocean-300 hover:bg-reef-500 hover:text-white"
          )}
          title={inCompare ? "移出对比" : "加入对比"}
        >
          {inCompare ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
