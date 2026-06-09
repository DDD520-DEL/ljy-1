import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TideZone, SubstrateType, Season, SurveyRecord } from "@/types";
import { getSeason } from "@/lib/diversity";

export interface FilterCriteria {
  tideZones: TideZone[];
  seasons: Season[];
  substrateTypes: SubstrateType[];
  dateStart: string | null;
  dateEnd: string | null;
  stationName: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  criteria: FilterCriteria;
  createdAt: number;
}

const emptyCriteria: FilterCriteria = {
  tideZones: [],
  seasons: [],
  substrateTypes: [],
  dateStart: null,
  dateEnd: null,
  stationName: "",
};

interface FilterState {
  criteria: FilterCriteria;
  savedFilters: SavedFilter[];
  selectedIds: Set<string>;
  setCriteria: (criteria: Partial<FilterCriteria>) => void;
  resetCriteria: () => void;
  saveFilter: (name: string) => string;
  deleteFilter: (id: string) => void;
  applyFilter: (id: string) => void;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
  getSelectedIds: () => string[];
  filterSurveys: (surveys: SurveyRecord[]) => SurveyRecord[];
  hasActiveFilters: () => boolean;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function matchesFilter(survey: SurveyRecord, criteria: FilterCriteria): boolean {
  if (criteria.tideZones.length > 0 && !criteria.tideZones.includes(survey.tideZone)) {
    return false;
  }
  if (criteria.seasons.length > 0) {
    const season = getSeason(survey.date);
    if (!criteria.seasons.includes(season)) {
      return false;
    }
  }
  if (criteria.substrateTypes.length > 0 && !criteria.substrateTypes.includes(survey.substrateType)) {
    return false;
  }
  if (criteria.dateStart && survey.date < criteria.dateStart) {
    return false;
  }
  if (criteria.dateEnd && survey.date > criteria.dateEnd) {
    return false;
  }
  if (criteria.stationName && !survey.stationName.toLowerCase().includes(criteria.stationName.toLowerCase())) {
    return false;
  }
  return true;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      criteria: { ...emptyCriteria },
      savedFilters: [],
      selectedIds: new Set<string>(),
      setCriteria: (partial) =>
        set((state) => ({
          criteria: { ...state.criteria, ...partial },
        })),
      resetCriteria: () =>
        set({
          criteria: { ...emptyCriteria },
        }),
      saveFilter: (name) => {
        const id = generateId();
        const savedFilter: SavedFilter = {
          id,
          name,
          criteria: { ...get().criteria },
          createdAt: Date.now(),
        };
        set((state) => ({
          savedFilters: [...state.savedFilters, savedFilter],
        }));
        return id;
      },
      deleteFilter: (id) =>
        set((state) => ({
          savedFilters: state.savedFilters.filter((f) => f.id !== id),
        })),
      applyFilter: (id) => {
        const filter = get().savedFilters.find((f) => f.id === id);
        if (filter) {
          set({ criteria: { ...filter.criteria } });
        }
      },
      toggleSelected: (id) =>
        set((state) => {
          const newSet = new Set(state.selectedIds);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return { selectedIds: newSet };
        }),
      selectAll: (ids) =>
        set({ selectedIds: new Set(ids) }),
      deselectAll: () => set({ selectedIds: new Set<string>() }),
      isSelected: (id) => get().selectedIds.has(id),
      getSelectedIds: () => Array.from(get().selectedIds),
      filterSurveys: (surveys) => {
        const criteria = get().criteria;
        return surveys.filter((s) => matchesFilter(s, criteria));
      },
      hasActiveFilters: () => {
        const c = get().criteria;
        return (
          c.tideZones.length > 0 ||
          c.seasons.length > 0 ||
          c.substrateTypes.length > 0 ||
          c.dateStart !== null ||
          c.dateEnd !== null ||
          c.stationName !== ""
        );
      },
    }),
    {
      name: "intertidal-filter-storage",
      partialize: (state) => ({
        criteria: state.criteria,
        savedFilters: state.savedFilters,
      }),
    }
  )
);
