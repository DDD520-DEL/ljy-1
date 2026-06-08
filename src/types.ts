export type TideZone = "high" | "mid" | "low";

export type SubstrateType =
  | "rocky"
  | "sandy"
  | "muddy"
  | "pebble"
  | "cobble"
  | "mixed";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type WeatherCondition = "sunny" | "cloudy" | "rainy" | "foggy" | "stormy";

export interface EnvironmentalFactors {
  waterTemp?: number;
  salinity?: number;
  ph?: number;
  dissolvedOxygen?: number;
  weather?: WeatherCondition;
}

export interface PhotoRecord {
  id: string;
  surveyId?: string;
  speciesId?: string;
  dataUrl: string;
  thumbnailUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  caption?: string;
  createdAt: number;
}

export interface SpeciesRecord {
  speciesId: string;
  scientificName: string;
  commonName: string;
  count: number;
  coverage: number;
  kingdom?: string;
  phylum?: string;
  className?: string;
  order?: string;
  family?: string;
  genus?: string;
  photoIds?: string[];
}

export interface SurveyLocation {
  lat: number;
  lng: number;
}

export interface SurveyRecord {
  id: string;
  date: string;
  stationName: string;
  tideZone: TideZone;
  quadratSize: string;
  substrateType: SubstrateType;
  location: SurveyLocation;
  species: SpeciesRecord[];
  envFactors?: EnvironmentalFactors;
  notes?: string;
  photoIds?: string[];
  createdAt: number;
}

export interface TaxonNode {
  id: string;
  name: string;
  rank: "kingdom" | "phylum" | "class" | "order" | "family" | "genus" | "species";
  scientificName: string;
  commonName?: string;
  children?: TaxonNode[];
}

export interface SpeciesCatalogItem {
  id: string;
  scientificName: string;
  commonName: string;
  phylum: string;
  className: string;
  order: string;
  family: string;
  genus: string;
  kingdom: string;
}

export interface DiversityIndices {
  shannonWiener: number;
  pielouEvenness: number;
  margalefRichness: number;
  speciesCount: number;
  totalIndividuals: number;
}

export type SyncStatus = "idle" | "exporting" | "importing" | "merging" | "conflict" | "success" | "error";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  lastSyncDevice: string | null;
  pendingCount: number;
  error: string | null;
}

export interface PhotoSyncData {
  id: string;
  surveyId?: string;
  speciesId?: string;
  dataUrl: string;
  thumbnailUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  caption?: string;
  createdAt: number;
}

export interface SurveySyncData extends SurveyRecord {
  updatedAt: number;
}

export interface SyncPackage {
  version: number;
  deviceId: string;
  deviceName: string;
  exportedAt: number;
  surveys: SurveySyncData[];
  photos: PhotoSyncData[];
  checksum: string;
}

export interface DataConflict {
  type: "survey" | "species" | "photo";
  id: string;
  localVersion: unknown;
  remoteVersion: unknown;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  description: string;
}

export interface ConflictResolution {
  conflictId: string;
  choice: "local" | "remote" | "merge";
  mergedData?: unknown;
}

export interface MergeResult {
  added: number;
  updated: number;
  conflicts: DataConflict[];
  photosImported: number;
  skipped: number;
}
