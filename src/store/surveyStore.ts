import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SurveyRecord, SpeciesRecord } from "@/types";

interface SurveyState {
  surveys: SurveyRecord[];
  addSurvey: (survey: Omit<SurveyRecord, "id" | "createdAt">) => void;
  importSurvey: (survey: SurveyRecord) => void;
  updateSurvey: (id: string, survey: Partial<SurveyRecord>) => void;
  deleteSurvey: (id: string) => void;
  clearAll: () => void;
  addSpeciesToSurvey: (surveyId: string, species: SpeciesRecord) => void;
  updateSpeciesInSurvey: (
    surveyId: string,
    speciesId: string,
    updates: Partial<SpeciesRecord>
  ) => void;
  removeSpeciesFromSurvey: (surveyId: string, speciesId: string) => void;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useSurveyStore = create<SurveyState>()(
  persist(
    (set) => ({
      surveys: [],
      addSurvey: (survey) =>
        set((state) => ({
          surveys: [
            { ...survey, id: generateId(), createdAt: Date.now() },
            ...state.surveys,
          ],
        })),
      importSurvey: (survey) =>
        set((state) => {
          if (state.surveys.some((s) => s.id === survey.id)) {
            return {
              surveys: state.surveys.map((s) =>
                s.id === survey.id ? { ...s, ...survey } : s
              ),
            };
          }
          return { surveys: [survey, ...state.surveys] };
        }),
      updateSurvey: (id, survey) =>
        set((state) => ({
          surveys: state.surveys.map((s) =>
            s.id === id ? { ...s, ...survey } : s
          ),
        })),
      deleteSurvey: (id) =>
        set((state) => ({
          surveys: state.surveys.filter((s) => s.id !== id),
        })),
      clearAll: () => set({ surveys: [] }),
      addSpeciesToSurvey: (surveyId, species) =>
        set((state) => ({
          surveys: state.surveys.map((s) =>
            s.id === surveyId
              ? { ...s, species: [...s.species, species] }
              : s
          ),
        })),
      updateSpeciesInSurvey: (surveyId, speciesId, updates) =>
        set((state) => ({
          surveys: state.surveys.map((s) =>
            s.id === surveyId
              ? {
                  ...s,
                  species: s.species.map((sp) =>
                    sp.speciesId === speciesId ? { ...sp, ...updates } : sp
                  ),
                }
              : s
          ),
        })),
      removeSpeciesFromSurvey: (surveyId, speciesId) =>
        set((state) => ({
          surveys: state.surveys.map((s) =>
            s.id === surveyId
              ? { ...s, species: s.species.filter((sp) => sp.speciesId !== speciesId) }
              : s
          ),
        })),
    }),
    {
      name: "intertidal-survey-storage",
    }
  )
);
