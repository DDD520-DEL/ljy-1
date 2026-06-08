import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SurveyRecord, SpeciesRecord, SurveyVersionSnapshot } from "@/types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface SurveyState {
  surveys: SurveyRecord[];
  versions: SurveyVersionSnapshot[];
  addSurvey: (survey: Omit<SurveyRecord, "id" | "createdAt">) => void;
  importSurvey: (survey: SurveyRecord) => void;
  updateSurvey: (id: string, survey: Partial<SurveyRecord>) => void;
  deleteSurvey: (id: string) => void;
  permanentlyDeleteSurvey: (id: string) => void;
  restoreSurvey: (id: string) => void;
  clearExpiredDeleted: () => void;
  clearAll: () => void;
  addSpeciesToSurvey: (surveyId: string, species: SpeciesRecord) => void;
  updateSpeciesInSurvey: (
    surveyId: string,
    speciesId: string,
    updates: Partial<SpeciesRecord>
  ) => void;
  removeSpeciesFromSurvey: (surveyId: string, speciesId: string) => void;
  getVersions: (surveyId: string) => SurveyVersionSnapshot[];
  rollbackToVersion: (surveyId: string, versionId: string) => void;
  getActiveSurveys: () => SurveyRecord[];
  getDeletedSurveys: () => SurveyRecord[];
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSnapshot(
  survey: SurveyRecord,
  allVersions: SurveyVersionSnapshot[]
): SurveyVersionSnapshot {
  const existingVersions = allVersions.filter((v) => v.surveyId === survey.id);
  const nextVersion = existingVersions.length + 1;
  return {
    id: generateId(),
    surveyId: survey.id,
    version: nextVersion,
    data: JSON.parse(JSON.stringify(survey)),
    createdAt: Date.now(),
  };
}

function purgeExpiredDeleted(surveys: SurveyRecord[]): SurveyRecord[] {
  const now = Date.now();
  return surveys.filter(
    (s) => !s.isDeleted || (s.deletedAt && now - s.deletedAt < THIRTY_DAYS_MS)
  );
}

export const useSurveyStore = create<SurveyState>()(
  persist(
    (set, get) => ({
      surveys: [],
      versions: [],
      addSurvey: (survey) =>
        set((state) => {
          const newSurvey: SurveyRecord = {
            ...survey,
            id: generateId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isDeleted: false,
          };
          return {
            surveys: [newSurvey, ...state.surveys],
          };
        }),
      importSurvey: (survey) =>
        set((state) => {
          if (state.surveys.some((s) => s.id === survey.id)) {
            return {
              surveys: state.surveys.map((s) =>
                s.id === survey.id
                  ? { ...s, ...survey, updatedAt: Date.now() }
                  : s
              ),
            };
          }
          return {
            surveys: [
              { ...survey, updatedAt: survey.updatedAt || Date.now() },
              ...state.surveys,
            ],
          };
        }),
      updateSurvey: (id, survey) =>
        set((state) => {
          const current = state.surveys.find((s) => s.id === id);
          if (!current) return state;
          const snapshot = createSnapshot(current, state.versions);
          return {
            surveys: state.surveys.map((s) =>
              s.id === id
                ? { ...s, ...survey, updatedAt: Date.now() }
                : s
            ),
            versions: [...state.versions, snapshot],
          };
        }),
      deleteSurvey: (id) =>
        set((state) => {
          const current = state.surveys.find((s) => s.id === id);
          if (!current) return state;
          const snapshot = createSnapshot(current, state.versions);
          return {
            surveys: state.surveys.map((s) =>
              s.id === id
                ? { ...s, isDeleted: true, deletedAt: Date.now() }
                : s
            ),
            versions: [...state.versions, snapshot],
          };
        }),
      permanentlyDeleteSurvey: (id) =>
        set((state) => ({
          surveys: state.surveys.filter((s) => s.id !== id),
          versions: state.versions.filter((v) => v.surveyId !== id),
        })),
      restoreSurvey: (id) =>
        set((state) => ({
          surveys: state.surveys.map((s) =>
            s.id === id
              ? { ...s, isDeleted: false, deletedAt: undefined, updatedAt: Date.now() }
              : s
          ),
        })),
      clearExpiredDeleted: () =>
        set((state) => ({
          surveys: purgeExpiredDeleted(state.surveys),
        })),
      clearAll: () => set({ surveys: [], versions: [] }),
      addSpeciesToSurvey: (surveyId, species) =>
        set((state) => {
          const current = state.surveys.find((s) => s.id === surveyId);
          if (!current) return state;
          const snapshot = createSnapshot(current, state.versions);
          return {
            surveys: state.surveys.map((s) =>
              s.id === surveyId
                ? {
                    ...s,
                    species: [...s.species, species],
                    updatedAt: Date.now(),
                  }
                : s
            ),
            versions: [...state.versions, snapshot],
          };
        }),
      updateSpeciesInSurvey: (surveyId, speciesId, updates) =>
        set((state) => {
          const current = state.surveys.find((s) => s.id === surveyId);
          if (!current) return state;
          const snapshot = createSnapshot(current, state.versions);
          return {
            surveys: state.surveys.map((s) =>
              s.id === surveyId
                ? {
                    ...s,
                    species: s.species.map((sp) =>
                      sp.speciesId === speciesId ? { ...sp, ...updates } : sp
                    ),
                    updatedAt: Date.now(),
                  }
                : s
            ),
            versions: [...state.versions, snapshot],
          };
        }),
      removeSpeciesFromSurvey: (surveyId, speciesId) =>
        set((state) => {
          const current = state.surveys.find((s) => s.id === surveyId);
          if (!current) return state;
          const snapshot = createSnapshot(current, state.versions);
          return {
            surveys: state.surveys.map((s) =>
              s.id === surveyId
                ? {
                    ...s,
                    species: s.species.filter(
                      (sp) => sp.speciesId !== speciesId
                    ),
                    updatedAt: Date.now(),
                  }
                : s
            ),
            versions: [...state.versions, snapshot],
          };
        }),
      getVersions: (surveyId) => {
        return get()
          .versions.filter((v) => v.surveyId === surveyId)
          .sort((a, b) => b.createdAt - a.createdAt);
      },
      rollbackToVersion: (surveyId, versionId) =>
        set((state) => {
          const version = state.versions.find(
            (v) => v.id === versionId && v.surveyId === surveyId
          );
          if (!version) return state;
          const current = state.surveys.find((s) => s.id === surveyId);
          if (!current) return state;
          const snapshot = createSnapshot(current, state.versions);
          return {
            surveys: state.surveys.map((s) =>
              s.id === surveyId
                ? {
                    ...version.data,
                    updatedAt: Date.now(),
                    isDeleted: false,
                    deletedAt: undefined,
                  }
                : s
            ),
            versions: [...state.versions, snapshot],
          };
        }),
      getActiveSurveys: () => {
        return get()
          .surveys.filter((s) => !s.isDeleted)
          .sort((a, b) => b.createdAt - a.createdAt);
      },
      getDeletedSurveys: () => {
        return get()
          .surveys.filter((s) => s.isDeleted)
          .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
      },
    }),
    {
      name: "intertidal-survey-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.clearExpiredDeleted();
        }
      },
    }
  )
);
