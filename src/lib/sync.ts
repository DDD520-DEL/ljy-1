import type {
  SurveyRecord,
  PhotoRecord,
  SyncPackage,
  SurveySyncData,
  PhotoSyncData,
  DataConflict,
  ConflictResolution,
  MergeResult,
} from "@/types";
import { getAllPhotos, getPhoto, savePhoto } from "./photoStore";
import { useSurveyStore } from "@/store/surveyStore";

const SYNC_VERSION = 1;

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function createSyncPackage(
  deviceId: string,
  deviceName: string
): Promise<SyncPackage> {
  const state = useSurveyStore.getState();
  const surveys = state.surveys;

  const surveySyncData: SurveySyncData[] = surveys.map((s) => ({
    ...s,
    updatedAt: s.createdAt,
  }));

  const allPhotoIds = new Set<string>();
  for (const s of surveys) {
    if (s.photoIds) {
      s.photoIds.forEach((id) => allPhotoIds.add(id));
    }
    for (const sp of s.species) {
      if (sp.photoIds) {
        sp.photoIds.forEach((id) => allPhotoIds.add(id));
      }
    }
  }

  const photos = await getAllPhotos();
  const photoSyncData: PhotoSyncData[] = photos
    .filter((p) => allPhotoIds.has(p.id))
    .map((p) => ({
      id: p.id,
      surveyId: p.surveyId,
      speciesId: p.speciesId,
      dataUrl: p.dataUrl,
      thumbnailUrl: p.thumbnailUrl,
      fileName: p.fileName,
      mimeType: p.mimeType,
      size: p.size,
      caption: p.caption,
      createdAt: p.createdAt,
    }));

  const payload = JSON.stringify({
    surveys: surveySyncData,
    photos: photoSyncData,
  });
  const checksum = simpleHash(payload);

  return {
    version: SYNC_VERSION,
    deviceId,
    deviceName,
    exportedAt: Date.now(),
    surveys: surveySyncData,
    photos: photoSyncData,
    checksum,
  };
}

export function validateSyncPackage(pkg: unknown): pkg is SyncPackage {
  if (!pkg || typeof pkg !== "object") return false;
  const p = pkg as Record<string, unknown>;

  if (typeof p.version !== "number") return false;
  if (typeof p.deviceId !== "string") return false;
  if (typeof p.deviceName !== "string") return false;
  if (typeof p.exportedAt !== "number") return false;
  if (!Array.isArray(p.surveys)) return false;
  if (!Array.isArray(p.photos)) return false;
  if (typeof p.checksum !== "string") return false;

  const payload = JSON.stringify({
    surveys: p.surveys,
    photos: p.photos,
  });
  const expectedChecksum = simpleHash(payload);
  if (p.checksum !== expectedChecksum) return false;

  return true;
}

function deepEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function detectSurveyConflicts(
  local: SurveyRecord,
  remote: SurveySyncData
): DataConflict | null {
  const localFields = {
    date: local.date,
    stationName: local.stationName,
    tideZone: local.tideZone,
    quadratSize: local.quadratSize,
    substrateType: local.substrateType,
    location: local.location,
    notes: local.notes,
  };
  const remoteFields = {
    date: remote.date,
    stationName: remote.stationName,
    tideZone: remote.tideZone,
    quadratSize: remote.quadratSize,
    substrateType: remote.substrateType,
    location: remote.location,
    notes: remote.notes,
  };

  if (!deepEqual(localFields, remoteFields)) {
    return {
      type: "survey",
      id: local.id,
      localVersion: local,
      remoteVersion: remote,
      localUpdatedAt: local.createdAt,
      remoteUpdatedAt: remote.updatedAt,
      description: `调查记录 "${local.stationName}" (${local.date}) 存在差异`,
    };
  }

  return null;
}

function detectSpeciesConflicts(
  localSpecies: SurveyRecord["species"],
  remoteSpecies: SurveySyncData["species"],
  surveyId: string
): DataConflict[] {
  const conflicts: DataConflict[] = [];
  const localMap = new Map(localSpecies.map((s) => [s.speciesId, s]));
  const remoteMap = new Map(remoteSpecies.map((s) => [s.speciesId, s]));

  for (const [spId, localSp] of localMap) {
    const remoteSp = remoteMap.get(spId);
    if (remoteSp && !deepEqual(localSp, remoteSp)) {
      conflicts.push({
        type: "species",
        id: `${surveyId}-${spId}`,
        localVersion: localSp,
        remoteVersion: remoteSp,
        localUpdatedAt: Date.now(),
        remoteUpdatedAt: Date.now(),
        description: `物种 "${localSp.commonName}" 的记录存在差异`,
      });
    }
  }

  return conflicts;
}

export function detectConflicts(
  localSurveys: SurveyRecord[],
  remoteSurveys: SurveySyncData[]
): DataConflict[] {
  const conflicts: DataConflict[] = [];
  const localMap = new Map(localSurveys.map((s) => [s.id, s]));

  for (const remote of remoteSurveys) {
    const local = localMap.get(remote.id);
    if (!local) continue;

    const surveyConflict = detectSurveyConflicts(local, remote);
    if (surveyConflict) {
      conflicts.push(surveyConflict);
    }

    const speciesConflicts = detectSpeciesConflicts(
      local.species,
      remote.species,
      remote.id
    );
    conflicts.push(...speciesConflicts);
  }

  return conflicts;
}

export async function mergeSyncPackage(
  pkg: SyncPackage,
  resolutions: ConflictResolution[] = []
): Promise<MergeResult> {
  const result: MergeResult = {
    added: 0,
    updated: 0,
    conflicts: [],
    photosImported: 0,
    skipped: 0,
  };

  const state = useSurveyStore.getState();
  const localSurveyMap = new Map(state.surveys.map((s) => [s.id, s]));
  const resolutionMap = new Map(
    resolutions.map((r) => [r.conflictId, r])
  );

  for (const remote of pkg.surveys) {
    const local = localSurveyMap.get(remote.id);

    if (!local) {
      state.addSurvey({
        date: remote.date,
        stationName: remote.stationName,
        tideZone: remote.tideZone,
        quadratSize: remote.quadratSize,
        substrateType: remote.substrateType,
        location: remote.location,
        species: remote.species,
        notes: remote.notes,
        photoIds: remote.photoIds,
      });
      const latest = useSurveyStore.getState().surveys.find(
        (s) => s.stationName === remote.stationName && s.date === remote.date
      );
      if (latest && latest.id !== remote.id) {
        useSurveyStore.getState().deleteSurvey(latest.id);
        useSurveyStore.getState().surveys.unshift({
          ...remote,
          createdAt: remote.createdAt || Date.now(),
        });
      }
      result.added++;
      continue;
    }

    const surveyConflict = detectSurveyConflicts(local, remote);
    const speciesConflicts = detectSpeciesConflicts(
      local.species,
      remote.species,
      remote.id
    );
    const allConflicts = surveyConflict
      ? [surveyConflict, ...speciesConflicts]
      : speciesConflicts;

    if (allConflicts.length === 0) {
      if (remote.updatedAt > local.createdAt) {
        state.updateSurvey(local.id, {
          date: remote.date,
          stationName: remote.stationName,
          tideZone: remote.tideZone,
          quadratSize: remote.quadratSize,
          substrateType: remote.substrateType,
          location: remote.location,
          species: remote.species,
          notes: remote.notes,
          photoIds: remote.photoIds,
        });
        result.updated++;
      } else {
        result.skipped++;
      }
      continue;
    }

    const unresolved = allConflicts.filter(
      (c) => !resolutionMap.has(c.id)
    );
    if (unresolved.length > 0) {
      result.conflicts.push(...allConflicts);
      continue;
    }

    let finalSurvey: Partial<SurveyRecord> = {};
    const surveyRes = surveyConflict
      ? resolutionMap.get(surveyConflict.id)
      : null;

    if (surveyRes) {
      if (surveyRes.choice === "remote") {
        finalSurvey = {
          date: remote.date,
          stationName: remote.stationName,
          tideZone: remote.tideZone,
          quadratSize: remote.quadratSize,
          substrateType: remote.substrateType,
          location: remote.location,
          notes: remote.notes,
          photoIds: remote.photoIds,
        };
      }
    }

    let finalSpecies = [...local.species];
    for (const sc of speciesConflicts) {
      const res = resolutionMap.get(sc.id);
      if (!res) continue;
      const speciesId = sc.id.split("-").slice(1).join("-");

      if (res.choice === "remote") {
        finalSpecies = finalSpecies.map((sp) =>
          sp.speciesId === speciesId ? (sc.remoteVersion as typeof sp) : sp
        );
      }
    }

    const remoteOnlySpecies = remote.species.filter(
      (sp) => !local.species.find((ls) => ls.speciesId === sp.speciesId)
    );
    finalSpecies.push(...remoteOnlySpecies);

    if (Object.keys(finalSurvey).length > 0 || finalSpecies.length !== local.species.length) {
      state.updateSurvey(local.id, {
        ...finalSurvey,
        species: finalSpecies,
      });
      result.updated++;
    } else {
      result.skipped++;
    }
  }

  for (const photo of pkg.photos) {
    const existing = await getPhoto(photo.id);
    if (!existing) {
      await savePhoto({
        surveyId: photo.surveyId,
        speciesId: photo.speciesId,
        dataUrl: photo.dataUrl,
        thumbnailUrl: photo.thumbnailUrl,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        size: photo.size,
        caption: photo.caption,
      });
      result.photosImported++;
    }
  }

  return result;
}

export function downloadSyncPackage(pkg: SyncPackage): void {
  const json = JSON.stringify(pkg, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sync-package-${new Date(pkg.exportedAt)
    .toISOString()
    .slice(0, 10)}-${pkg.deviceId.slice(-4)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function encodeSyncPackageForQR(pkg: SyncPackage): string {
  const json = JSON.stringify(pkg);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeSyncPackageFromQR(encoded: string): SyncPackage | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    if (validateSyncPackage(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
