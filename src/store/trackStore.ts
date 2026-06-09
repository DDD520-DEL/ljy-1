import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TrackSession, TrackPoint, QuadratMarker, SurveyLocation } from "@/types";

interface TrackState {
  sessions: TrackSession[];
  markers: QuadratMarker[];
  startSession: (surveyId?: string) => string;
  endSession: (sessionId: string) => void;
  addPoint: (sessionId: string, point: TrackPoint) => void;
  addMarker: (
    surveyId: string,
    sessionId: string | undefined,
    location: SurveyLocation
  ) => QuadratMarker;
  getActiveSession: () => TrackSession | undefined;
  getSession: (sessionId: string) => TrackSession | undefined;
  getMarkersBySurvey: (surveyId: string) => QuadratMarker[];
  getMarkersBySession: (sessionId: string) => QuadratMarker[];
  clearAll: () => void;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useTrackStore = create<TrackState>()(
  persist(
    (set, get) => ({
      sessions: [],
      markers: [],
      startSession: (surveyId) => {
        const sessionId = generateId();
        const session: TrackSession = {
          id: sessionId,
          surveyId,
          startTime: Date.now(),
          points: [],
          isActive: true,
        };
        set((state) => ({
          sessions: [...state.sessions, session],
        }));
        return sessionId;
      },
      endSession: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, isActive: false, endTime: Date.now() }
              : s
          ),
        })),
      addPoint: (sessionId, point) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, points: [...s.points, point] }
              : s
          ),
        })),
      addMarker: (surveyId, sessionId, location) => {
        const existingMarkers = get().getMarkersBySurvey(surveyId);
        const orderIndex = existingMarkers.length;
        const marker: QuadratMarker = {
          id: generateId(),
          surveyId,
          trackSessionId: sessionId,
          location,
          timestamp: Date.now(),
          orderIndex,
        };
        set((state) => ({
          markers: [...state.markers, marker],
        }));
        return marker;
      },
      getActiveSession: () => {
        return get().sessions.find((s) => s.isActive);
      },
      getSession: (sessionId) => {
        return get().sessions.find((s) => s.id === sessionId);
      },
      getMarkersBySurvey: (surveyId) => {
        return get()
          .markers.filter((m) => m.surveyId === surveyId)
          .sort((a, b) => a.orderIndex - b.orderIndex);
      },
      getMarkersBySession: (sessionId) => {
        return get()
          .markers.filter((m) => m.trackSessionId === sessionId)
          .sort((a, b) => a.orderIndex - b.orderIndex);
      },
      clearAll: () => set({ sessions: [], markers: [] }),
    }),
    {
      name: "gps-track-storage",
    }
  )
);
