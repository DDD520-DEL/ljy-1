import type { PhotoRecord } from "@/types";

const DB_NAME = "intertidal-survey-photos";
const DB_VERSION = 1;
const STORE_NAME = "photos";

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

export async function savePhoto(
  photo: Omit<PhotoRecord, "id" | "createdAt">
): Promise<PhotoRecord> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: PhotoRecord = {
      ...photo,
      id: generateId(),
      createdAt: Date.now(),
    };
    const request = store.add(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(record);
    tx.oncomplete = () => db.close();
  });
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as PhotoRecord | undefined);
    tx.oncomplete = () => db.close();
  });
}

export async function getPhotosBySurvey(surveyId: string): Promise<PhotoRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("surveyId");
    const request = index.getAll(surveyId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as PhotoRecord[]);
    tx.oncomplete = () => db.close();
  });
}

export async function getPhotosBySpecies(speciesId: string): Promise<PhotoRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("speciesId");
    const request = index.getAll(speciesId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as PhotoRecord[]);
    tx.oncomplete = () => db.close();
  });
}

export async function getPhotosByIds(ids: string[]): Promise<PhotoRecord[]> {
  if (ids.length === 0) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const results: PhotoRecord[] = [];
    const idSet = new Set(ids);
    const request = store.openCursor();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if (idSet.has(cursor.value.id)) {
          results.push(cursor.value as PhotoRecord);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    tx.oncomplete = () => db.close();
  });
}

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as PhotoRecord[]);
    tx.oncomplete = () => db.close();
  });
}

export async function updatePhoto(
  id: string,
  updates: Partial<PhotoRecord>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const existing = getRequest.result as PhotoRecord | undefined;
      if (existing) {
        const putRequest = store.put({ ...existing, ...updates });
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        reject(new Error(`Photo ${id} not found`));
      }
    };
    tx.oncomplete = () => db.close();
  });
}

export async function deletePhoto(id: string): Promise<void> {
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

export async function deletePhotosBySurvey(surveyId: string): Promise<void> {
  const photos = await getPhotosBySurvey(surveyId);
  await Promise.all(photos.map((p) => deletePhoto(p.id)));
}

export async function clearAllPhotos(): Promise<void> {
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

export function generateThumbnail(
  file: File,
  maxSize: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const { width, height } = img;
        let scale = 1;
        if (width > height) {
          if (width > maxSize) scale = maxSize / width;
        } else {
          if (height > maxSize) scale = maxSize / height;
        }
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}
