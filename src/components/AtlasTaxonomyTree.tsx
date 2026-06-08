import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, TreeDeciduous, Search } from "lucide-react";
import { useAtlasStore } from "@/store/atlasStore";
import { RANK_LABEL, buildTaxonomyTree } from "@/data/speciesCatalog";
import type { TaxonNode } from "@/types";
import { cn } from "@/lib/utils";
import Fuse from "fuse.js";

interface AtlasTaxonomyTreeProps {
  onSelectSpecies: (id: string) => void;
  selectedSpeciesId?: string;
  onFilterChange?: (filters: {
    kingdom?: string;
    phylum?: string;
    className?: string;
    order?: string;
    family?: string;
    genus?: string;
  } | null) => void;
  className?: string;
}

export default function AtlasTaxonomyTree({
  onSelectSpecies,
  selectedSpeciesId,
  onFilterChange,
  className,
}: AtlasTaxonomyTreeProps) {
  const atlas = useAtlasStore((s) => s.atlas);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["root"]));
  const [searchQuery, setSearchQuery] = useState("");

  const taxonomyTree = useMemo(() => buildTaxonomyTree(), []);

  const fuse = useMemo(() => {
    return new Fuse(atlas, {
      keys: ["scientificName", "commonName", "family", "phylum", "className"],
      threshold: 0.4,
    });
  }, [atlas]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return fuse.search(searchQuery).map((r) => r.item.id);
  }, [searchQuery, fuse]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNodeClick = (node: TaxonNode) => {
    if (node.rank === "species") {
      onSelectSpecies(node.id);
    } else {
      toggleExpand(node.id);
      if (onFilterChange) {
        if (expandedIds.has(node.id)) {
          onFilterChange(null);
        } else {
          const filters: {
            kingdom?: string;
            phylum?: string;
            className?: string;
            order?: string;
            family?: string;
          } = {};
          if (node.rank === "kingdom") filters.kingdom = node.scientificName;
          if (node.rank === "phylum") filters.phylum = node.scientificName;
          if (node.rank === "class") filters.className = node.scientificName;
          if (node.rank === "order") filters.order = node.scientificName;
          if (node.rank === "family") filters.family = node.scientificName;
          onFilterChange(filters);
        }
      }
    }
  };

  const isMatch = (nodeId: string, nodeRank: string) => {
    if (!searchResults) return true;
    if (nodeRank === "species") return searchResults.includes(nodeId);
    return true;
  };

  const renderTree = (node: TaxonNode, depth: number): React.ReactNode => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSpecies = node.rank === "species";
    const isSelected = isSpecies && node.id === selectedSpeciesId;
    const match = isMatch(node.id, node.rank);

    if (!match && !hasChildren) return null;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors min-h-[44px] cursor-pointer",
            isSpecies
              ? "hover:bg-ocean-700/40"
              : "hover:bg-ocean-800/30",
            isSelected && "bg-ocean-600/40 ring-1 ring-reef-400/50",
            depth > 0 && "ml-3"
          )}
          onClick={() => handleNodeClick(node)}
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
                  {hasChildren && (
                    <span className="ml-2 text-xs text-ocean-500">
                      ({node.children!.length})
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>{node.children!.map((child) => renderTree(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b border-ocean-700/40">
        <h3 className="text-sm font-bold text-ocean-100 flex items-center gap-2 mb-3">
          <TreeDeciduous className="w-4 h-4 text-reef-400" />
          分类导航
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
          <input
            type="text"
            placeholder="搜索物种..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 py-2 text-sm min-h-[40px]"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {searchResults && searchResults.length === 0 ? (
          <p className="text-center text-ocean-400 py-8 text-sm">未找到匹配物种</p>
        ) : (
          renderTree(taxonomyTree, 0)
        )}
      </div>
    </div>
  );
}
