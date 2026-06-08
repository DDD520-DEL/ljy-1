import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SpeciesAtlasItem, AtlasPatchPackage } from "@/types";
import { speciesAtlas as defaultAtlas } from "@/data/speciesAtlas";

interface AtlasStore {
  atlas: SpeciesAtlasItem[];
  compareList: string[];
  patchVersion: number;
  appliedPatches: number[];
  getSpecies: (id: string) => SpeciesAtlasItem | undefined;
  setCompareList: (ids: string[]) => void;
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  applyPatch: (pkg: AtlasPatchPackage) => { added: number; updated: number; removed: number };
  resetAtlas: () => void;
  filterByTaxon: (taxonPath: Partial<{
    kingdom: string;
    phylum: string;
    className: string;
    order: string;
    family: string;
    genus: string;
  }>) => SpeciesAtlasItem[];
}

export const useAtlasStore = create<AtlasStore>()(
  persist(
    (set, get) => ({
      atlas: defaultAtlas,
      compareList: [],
      patchVersion: 1,
      appliedPatches: [],

      getSpecies: (id) => get().atlas.find((s) => s.id === id),

      setCompareList: (ids) => set({ compareList: ids.slice(0, 2) }),

      addToCompare: (id) => {
        const list = get().compareList;
        if (!list.includes(id)) {
          const next = [...list, id];
          set({ compareList: next.slice(-2) });
        }
      },

      removeFromCompare: (id) => {
        set({ compareList: get().compareList.filter((x) => x !== id) });
      },

      clearCompare: () => set({ compareList: [] }),

      applyPatch: (pkg) => {
        const { atlas, appliedPatches } = get();
        let added = 0;
        let updated = 0;
        let removed = 0;
        const map = new Map(atlas.map((s) => [s.id, s]));

        if (pkg.added) {
          for (const sp of pkg.added) {
            if (!map.has(sp.id)) {
              map.set(sp.id, sp);
              added++;
            }
          }
        }
        if (pkg.updated) {
          for (const sp of pkg.updated) {
            if (map.has(sp.id)) {
              map.set(sp.id, { ...map.get(sp.id)!, ...sp });
              updated++;
            }
          }
        }
        if (pkg.removed) {
          for (const id of pkg.removed) {
            if (map.has(id)) {
              map.delete(id);
              removed++;
            }
          }
        }

        set({
          atlas: Array.from(map.values()),
          patchVersion: pkg.version,
          appliedPatches: [...appliedPatches, pkg.version],
        });
        return { added, updated, removed };
      },

      resetAtlas: () => set({ atlas: defaultAtlas, patchVersion: 1, appliedPatches: [], compareList: [] }),

      filterByTaxon: (taxonPath) => {
        const { atlas } = get();
        return atlas.filter((s) => {
          if (taxonPath.kingdom && s.kingdom !== taxonPath.kingdom) return false;
          if (taxonPath.phylum && s.phylum !== taxonPath.phylum) return false;
          if (taxonPath.className && s.className !== taxonPath.className) return false;
          if (taxonPath.order && s.order !== taxonPath.order) return false;
          if (taxonPath.family && s.family !== taxonPath.family) return false;
          if (taxonPath.genus && s.genus !== taxonPath.genus) return false;
          return true;
        });
      },
    }),
    {
      name: "species-atlas-store",
      partialize: (state) => ({
        atlas: state.atlas,
        patchVersion: state.patchVersion,
        appliedPatches: state.appliedPatches,
      }),
    }
  )
);
