import { useState, useEffect, useCallback } from "react";
import {
  getPhotosBySurvey,
  getPhotosBySpecies,
  getPhotosByIds,
  deletePhoto,
} from "@/lib/photoStore";
import type { PhotoRecord } from "@/types";

export function useSurveyPhotos(surveyId: string | undefined) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!surveyId) {
      setPhotos([]);
      return;
    }
    setLoading(true);
    try {
      const result = await getPhotosBySurvey(surveyId);
      setPhotos(result.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error("Failed to load survey photos:", err);
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const removePhoto = useCallback(
    async (photoId: string) => {
      await deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    },
    []
  );

  const addPhoto = useCallback((photo: PhotoRecord) => {
    setPhotos((prev) => [photo, ...prev]);
  }, []);

  return { photos, loading, loadPhotos, removePhoto, addPhoto };
}

export function useSpeciesPhotos(speciesId: string | undefined) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!speciesId) {
      setPhotos([]);
      return;
    }
    setLoading(true);
    try {
      const result = await getPhotosBySpecies(speciesId);
      setPhotos(result.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error("Failed to load species photos:", err);
    } finally {
      setLoading(false);
    }
  }, [speciesId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const removePhoto = useCallback(
    async (photoId: string) => {
      await deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    },
    []
  );

  const addPhoto = useCallback((photo: PhotoRecord) => {
    setPhotos((prev) => [photo, ...prev]);
  }, []);

  return { photos, loading, loadPhotos, removePhoto, addPhoto };
}

export function usePhotosByIds(ids: string[] | undefined) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!ids || ids.length === 0) {
      setPhotos([]);
      return;
    }
    setLoading(true);
    try {
      const result = await getPhotosByIds(ids);
      const idMap = new Map(ids.map((id, idx) => [id, idx]));
      result.sort((a, b) => (idMap.get(a.id) ?? 0) - (idMap.get(b.id) ?? 0));
      setPhotos(result);
    } catch (err) {
      console.error("Failed to load photos:", err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(ids)]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  return { photos, loading, loadPhotos };
}
