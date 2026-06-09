import type { AudioRecord } from "@/types";

const DB_NAME = "intertidal-survey-audios";
const DB_VERSION = 1;
const STORE_NAME = "audios";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("surveyId", "surveyId", { unique: false });
        store.createIndex("speciesId", "speciesId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

export async function saveAudio(
  audio: Omit<AudioRecord, "id" | "createdAt">
): Promise<AudioRecord> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: AudioRecord = {
      ...audio,
      id: generateId(),
      createdAt: Date.now(),
    };
    const request = store.add(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(record);
    tx.oncomplete = () => db.close();
  });
}

export async function getAudio(id: string): Promise<AudioRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as AudioRecord | undefined);
    tx.oncomplete = () => db.close();
  });
}

export async function getAudiosBySurvey(surveyId: string): Promise<AudioRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("surveyId");
    const request = index.getAll(surveyId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as AudioRecord[]);
    tx.oncomplete = () => db.close();
  });
}

export async function getAudiosBySpecies(speciesId: string): Promise<AudioRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("speciesId");
    const request = index.getAll(speciesId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as AudioRecord[]);
    tx.oncomplete = () => db.close();
  });
}

export async function getAudiosByIds(ids: string[]): Promise<AudioRecord[]> {
  if (ids.length === 0) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const results: AudioRecord[] = [];
    const idSet = new Set(ids);
    const request = store.openCursor();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if (idSet.has(cursor.value.id)) {
          results.push(cursor.value as AudioRecord);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    tx.oncomplete = () => db.close();
  });
}

export async function getAllAudios(): Promise<AudioRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as AudioRecord[]);
    tx.oncomplete = () => db.close();
  });
}

export async function updateAudio(
  id: string,
  updates: Partial<AudioRecord>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const existing = getRequest.result as AudioRecord | undefined;
      if (existing) {
        const putRequest = store.put({ ...existing, ...updates });
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        reject(new Error(`Audio ${id} not found`));
      }
    };
    tx.oncomplete = () => db.close();
  });
}

export async function deleteAudio(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}

export async function deleteAudiosBySurvey(surveyId: string): Promise<void> {
  const audios = await getAudiosBySurvey(surveyId);
  await Promise.all(audios.map((a) => deleteAudio(a.id)));
}

export async function clearAllAudios(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
