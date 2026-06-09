import { useState, useEffect, useCallback } from "react";
import {
  getAudiosBySurvey,
  getAudiosBySpecies,
  getAudiosByIds,
  deleteAudio,
} from "@/lib/audioStore";
import type { AudioRecord } from "@/types";

export function useSurveyAudios(surveyId: string | undefined) {
  const [audios, setAudios] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAudios = useCallback(async () => {
    if (!surveyId) {
      setAudios([]);
      return;
    }
    setLoading(true);
    try {
      const result = await getAudiosBySurvey(surveyId);
      setAudios(result.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error("Failed to load survey audios:", err);
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    loadAudios();
  }, [loadAudios]);

  const removeAudio = useCallback(async (audioId: string) => {
    await deleteAudio(audioId);
    setAudios((prev) => prev.filter((a) => a.id !== audioId));
  }, []);

  const addAudio = useCallback((audio: AudioRecord) => {
    setAudios((prev) => [audio, ...prev]);
  }, []);

  return { audios, loading, loadAudios, removeAudio, addAudio };
}

export function useSpeciesAudios(speciesId: string | undefined) {
  const [audios, setAudios] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAudios = useCallback(async () => {
    if (!speciesId) {
      setAudios([]);
      return;
    }
    setLoading(true);
    try {
      const result = await getAudiosBySpecies(speciesId);
      setAudios(result.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error("Failed to load species audios:", err);
    } finally {
      setLoading(false);
    }
  }, [speciesId]);

  useEffect(() => {
    loadAudios();
  }, [loadAudios]);

  const removeAudio = useCallback(async (audioId: string) => {
    await deleteAudio(audioId);
    setAudios((prev) => prev.filter((a) => a.id !== audioId));
  }, []);

  const addAudio = useCallback((audio: AudioRecord) => {
    setAudios((prev) => [audio, ...prev]);
  }, []);

  return { audios, loading, loadAudios, removeAudio, addAudio };
}

export function useAudiosByIds(ids: string[] | undefined) {
  const [audios, setAudios] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAudios = useCallback(async () => {
    if (!ids || ids.length === 0) {
      setAudios([]);
      return;
    }
    setLoading(true);
    try {
      const result = await getAudiosByIds(ids);
      const idMap = new Map(ids.map((id, idx) => [id, idx]));
      result.sort((a, b) => (idMap.get(a.id) ?? 0) - (idMap.get(b.id) ?? 0));
      setAudios(result);
    } catch (err) {
      console.error("Failed to load audios:", err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(ids)]);

  useEffect(() => {
    loadAudios();
  }, [loadAudios]);

  return { audios, loading, loadAudios };
}
