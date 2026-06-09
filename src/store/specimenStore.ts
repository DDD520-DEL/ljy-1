import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Specimen, PreservationMethod } from "@/types";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function padSeq(n: number): string {
  return n.toString().padStart(3, "0");
}

export function buildSpecimenNo(
  stationAbbr: string,
  date: string,
  sequenceNo: number
): string {
  return `${stationAbbr.toUpperCase()}-${formatDate(date)}-${padSeq(sequenceNo)}`;
}

interface SpecimenState {
  specimens: Specimen[];
  addSpecimen: (
    data: Omit<Specimen, "id" | "specimenNo" | "sequenceNo" | "createdAt">
  ) => Specimen;
  updateSpecimen: (
    id: string,
    data: Partial<
      Omit<Specimen, "id" | "specimenNo" | "createdAt" | "sequenceNo">
    > & { sequenceNo?: number }
  ) => void;
  deleteSpecimen: (id: string) => void;
  getNextSequenceNo: (stationAbbr: string, date: string) => number;
  getBySpecimenNo: (no: string) => Specimen | undefined;
  search: (query: string) => Specimen[];
  clearAll: () => void;
}

export const useSpecimenStore = create<SpecimenState>()(
  persist(
    (set, get) => ({
      specimens: [],

      getNextSequenceNo: (stationAbbr, date) => {
        const key = `${stationAbbr.toUpperCase()}-${formatDate(date)}`;
        const existing = get().specimens.filter((s) =>
          s.specimenNo.startsWith(key + "-")
        );
        if (existing.length === 0) return 1;
        return Math.max(...existing.map((s) => s.sequenceNo)) + 1;
      },

      addSpecimen: (data) => {
        const sequenceNo = get().getNextSequenceNo(data.stationAbbr, data.date);
        const specimenNo = buildSpecimenNo(data.stationAbbr, data.date, sequenceNo);
        const newSpecimen: Specimen = {
          ...data,
          id: generateId(),
          specimenNo,
          sequenceNo,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          specimens: [newSpecimen, ...state.specimens],
        }));
        return newSpecimen;
      },

      updateSpecimen: (id, data) => {
        set((state) => {
          const current = state.specimens.find((s) => s.id === id);
          if (!current) return state;

          const newStationAbbr = data.stationAbbr ?? current.stationAbbr;
          const newDate = data.date ?? current.date;
          const stationOrDateChanged =
            newStationAbbr !== current.stationAbbr || newDate !== current.date;

          let sequenceNo: number;
          if (data.sequenceNo !== undefined) {
            sequenceNo = data.sequenceNo;
          } else if (stationOrDateChanged) {
            const otherSpecimens = state.specimens.filter((s) => s.id !== id);
            const key = `${newStationAbbr.toUpperCase()}-${formatDate(newDate)}`;
            const existingInNewGroup = otherSpecimens.filter((s) =>
              s.specimenNo.startsWith(key + "-")
            );
            sequenceNo =
              existingInNewGroup.length === 0
                ? 1
                : Math.max(...existingInNewGroup.map((s) => s.sequenceNo)) + 1;
          } else {
            sequenceNo = current.sequenceNo;
          }

          const candidateNo = buildSpecimenNo(newStationAbbr, newDate, sequenceNo);
          const conflict = state.specimens.find(
            (s) => s.id !== id && s.specimenNo === candidateNo
          );
          let finalSequenceNo = sequenceNo;
          let finalSpecimenNo = candidateNo;
          if (conflict) {
            const otherSpecimens = state.specimens.filter((s) => s.id !== id);
            const key = `${newStationAbbr.toUpperCase()}-${formatDate(newDate)}`;
            const existingInGroup = otherSpecimens.filter((s) =>
              s.specimenNo.startsWith(key + "-")
            );
            finalSequenceNo =
              existingInGroup.length === 0
                ? 1
                : Math.max(...existingInGroup.map((s) => s.sequenceNo)) + 1;
            finalSpecimenNo = buildSpecimenNo(
              newStationAbbr,
              newDate,
              finalSequenceNo
            );
          }

          return {
            specimens: state.specimens.map((s) =>
              s.id === id
                ? {
                    ...s,
                    ...data,
                    stationAbbr: newStationAbbr,
                    date: newDate,
                    sequenceNo: finalSequenceNo,
                    specimenNo: finalSpecimenNo,
                    updatedAt: Date.now(),
                  }
                : s
            ),
          };
        });
      },

      deleteSpecimen: (id) => {
        set((state) => ({
          specimens: state.specimens.filter((s) => s.id !== id),
        }));
      },

      getBySpecimenNo: (no) => {
        return get().specimens.find(
          (s) => s.specimenNo.toLowerCase() === no.toLowerCase()
        );
      },

      search: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return get().specimens;
        return get().specimens.filter(
          (s) =>
            s.specimenNo.toLowerCase().includes(q) ||
            s.stationAbbr.toLowerCase().includes(q) ||
            s.location.toLowerCase().includes(q) ||
            (s.speciesName && s.speciesName.toLowerCase().includes(q))
        );
      },

      clearAll: () => set({ specimens: [] }),
    }),
    {
      name: "specimen-storage",
    }
  )
);
