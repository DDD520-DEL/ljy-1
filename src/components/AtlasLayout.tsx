import { ReactNode } from "react";
import { Search } from "lucide-react";
import AtlasTaxonomyTree from "./AtlasTaxonomyTree";

interface AtlasLayoutProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onSelectSpecies: (id: string) => void;
  onFilterChange?: (filters: {
    kingdom?: string;
    phylum?: string;
    className?: string;
    order?: string;
    family?: string;
    genus?: string;
  } | null) => void;
  selectedSpeciesId?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export default function AtlasLayout({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "搜索学名、中文名、科、门...",
  onSelectSpecies,
  onFilterChange,
  selectedSpeciesId,
  headerExtra,
  children,
}: AtlasLayoutProps) {
  return (
    <div className="h-full flex">
      <aside className="hidden md:block w-72 lg:w-80 border-r border-ocean-700/40 bg-ocean-950/40 flex-shrink-0">
        <AtlasTaxonomyTree
          onSelectSpecies={onSelectSpecies}
          selectedSpeciesId={selectedSpeciesId}
          onFilterChange={onFilterChange}
        />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="input-field pl-12"
              />
            </div>
            {headerExtra}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
