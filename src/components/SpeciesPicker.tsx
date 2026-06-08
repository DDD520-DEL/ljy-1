import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Search, ChevronRight, ChevronDown, TreeDeciduous, X } from "lucide-react";
import { speciesCatalog, buildTaxonomyTree, RANK_LABEL } from "@/data/speciesCatalog";
import type { SpeciesCatalogItem, TaxonNode, SpeciesRecord } from "@/types";
import { cn } from "@/lib/utils";

interface SpeciesPickerProps {
  onSelect: (species: SpeciesRecord) => void;
  onClose: () => void;
  existingIds: string[];
}

type PickerMode = "search" | "tree";

export default function SpeciesPicker({
  onSelect,
  onClose,
  existingIds,
}: SpeciesPickerProps) {
  const [mode, setMode] = useState<PickerMode>("search");
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["root"]));

  const fuse = useMemo(() => {
    return new Fuse(speciesCatalog, {
      keys: ["scientificName", "commonName", "family", "phylum", "className"],
      threshold: 0.4,
      includeScore: true,
    });
  }, []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return speciesCatalog.slice(0, 50);
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (item: SpeciesCatalogItem) => {
    onSelect({
      speciesId: item.id,
      scientificName: item.scientificName,
      commonName: item.commonName,
      count: 1,
      coverage: 0,
      kingdom: item.kingdom,
      phylum: item.phylum,
      className: item.className,
      order: item.order && item.order !== "null" ? item.order : "",
      family: item.family,
      genus: item.genus,
    });
    onClose();
  };

  const renderTree = (node: TaxonNode, depth: number): React.ReactNode => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSpecies = node.rank === "species";
    const isAdded = isSpecies && existingIds.includes(node.id);

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2.5 px-3 rounded-lg transition-colors min-h-[48px]",
            isSpecies
              ? "cursor-pointer hover:bg-ocean-700/40"
              : "cursor-pointer hover:bg-ocean-800/30",
            isSpecies && isAdded && "opacity-50",
            depth > 0 && "ml-3"
          )}
          onClick={() => {
            if (isSpecies) {
              if (!isAdded) {
                const item = speciesCatalog.find((s) => s.id === node.id);
                if (item) handleSelect(item);
              }
            } else {
              toggleExpand(node.id);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-ocean-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-ocean-400 flex-shrink-0" />
            )
          ) : (
            <span className="w-4 h-4 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ocean-100 truncate">
              {isSpecies ? (
                <>
                  <span className="text-reef-300">{node.commonName}</span>
                  <span className="ml-2 text-ocean-400 text-xs italic">
                    {node.scientificName}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sand-300">[{RANK_LABEL[node.rank]}]</span>
                  <span className="ml-1">{node.scientificName}</span>
                </>
              )}
            </div>
          </div>
          {isAdded && (
            <span className="text-xs text-reef-400 font-medium">已添加</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>{node.children!.map((child) => renderTree(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const taxonomyTree = useMemo(() => buildTaxonomyTree(), []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="card-glass w-full sm:w-[540px] sm:max-h-[85vh] max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-ocean-700/40">
          <h3 className="text-lg font-bold text-ocean-100 flex items-center gap-2">
            <TreeDeciduous className="w-5 h-5 text-reef-400" />
            物种名录
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-ocean-700/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 p-2 bg-ocean-950/30">
          <button
            onClick={() => setMode("search")}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl font-medium transition-all min-h-[44px]",
              mode === "search"
                ? "bg-ocean-500 text-white"
                : "text-ocean-300 hover:text-white"
            )}
          >
            <Search className="w-4 h-4 inline mr-1" />
            模糊搜索
          </button>
          <button
            onClick={() => setMode("tree")}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl font-medium transition-all min-h-[44px]",
              mode === "tree"
                ? "bg-ocean-500 text-white"
                : "text-ocean-300 hover:text-white"
            )}
          >
            <TreeDeciduous className="w-4 h-4 inline mr-1" />
            分类树
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mode === "search" ? (
            <div className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-400" />
                <input
                  type="text"
                  placeholder="搜索学名、中文名、科名..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="input-field pl-12"
                  autoFocus
                />
              </div>
              <div className="space-y-1 mt-2">
                {searchResults.length === 0 ? (
                  <p className="text-center text-ocean-400 py-8">未找到匹配的物种</p>
                ) : (
                  searchResults.map((item) => {
                    const added = existingIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => !added && handleSelect(item)}
                        className={cn(
                          "p-3 rounded-xl border transition-all min-h-[56px] flex items-center gap-3",
                          added
                            ? "bg-ocean-900/20 border-ocean-800/30 opacity-50 cursor-not-allowed"
                            : "bg-ocean-800/30 border-ocean-700/40 hover:bg-ocean-700/40 hover:border-ocean-600/50 cursor-pointer"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-reef-300">{item.commonName}</div>
                          <div className="text-sm text-ocean-400 italic truncate">
                            {item.scientificName}
                          </div>
                          <div className="text-xs text-ocean-500 mt-0.5">
                            {item.phylum} · {item.className} · {item.family}
                          </div>
                        </div>
                        {added && (
                          <span className="text-xs text-reef-400 font-medium whitespace-nowrap">
                            已添加
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="p-2">{renderTree(taxonomyTree, 0)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
