import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SurveyTemplate, TemplateSpecies } from "@/types";

interface TemplateState {
  templates: SurveyTemplate[];
  createTemplate: (
    name: string,
    species: TemplateSpecies[],
    description?: string
  ) => void;
  updateTemplate: (
    id: string,
    updates: Partial<Pick<SurveyTemplate, "name" | "description" | "species">>
  ) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => SurveyTemplate | undefined;
}

function generateId(): string {
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],
      createTemplate: (name, species, description) =>
        set((state) => ({
          templates: [
            {
              id: generateId(),
              name,
              description,
              species,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            ...state.templates,
          ],
        })),
      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        })),
      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),
      getTemplate: (id) => get().templates.find((t) => t.id === id),
    }),
    {
      name: "intertidal-template-storage",
    }
  )
);
